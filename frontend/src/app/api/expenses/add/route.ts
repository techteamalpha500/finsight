import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

// Utilities
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
function extractRuleTerm(rawText: string): string {
  const lower = rawText.toLowerCase();
  // Try preposition phrase
  const m = lower.match(/\b(?:on|for|at|to)\s+([a-z][a-z\s]{1,40})/i);
  if (m && m[1]) {
    let cand = m[1].trim().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");
    const words = cand.split(" ").filter(Boolean);
    if (words.length > 3) cand = words.slice(-3).join(" ");
    return cand;
  }
  // Fallback: last two alpha tokens
  const tokens = (lower.match(/[a-z]+/g) || []);
  if (tokens.length >= 2) return `${tokens[tokens.length-2]} ${tokens[tokens.length-1]}`;
  if (tokens.length === 1) return tokens[0];
  return "";
}
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";
const CATEGORY_RULES_TABLE = process.env.CATEGORY_RULES_TABLE || "CategoryRules";

const ALLOWED_CATEGORIES = [
  "Food","Travel","Entertainment","Shopping","Utilities","Healthcare",
  "Housing","Education","Insurance","Investment","Loans",
  "Grooming","Subscription","Taxes","Gifts","Pet Care","Other"
] as const;

// Step 2.5: Real AI categorization via Groq
async function getCategoryFromAI(rawText: string): Promise<{ category: string; confidence: number }> {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) return { category: "", confidence: 0 };
  try {
    const system = `You are a financial expense categorizer. Allowed categories: ${ALLOWED_CATEGORIES.join(", ")}. Respond ONLY JSON: {"category": string, "confidence": number between 0 and 1}.`;
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": "finsight-next/1.0"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system },
          { role: "user", content: rawText }
        ],
        temperature: 0,
      })
    });
    const data = await res.json();
    const txt = (data?.choices?.[0]?.message?.content as string) || "";
    try {
      const parsed = JSON.parse(txt);
      return { category: String(parsed.category || ""), confidence: Number(parsed.confidence || 0) };
    } catch {
      const mcat = /category\W+([A-Za-z]+)/i.exec(txt);
      const mconf = /confidence\W+(\d+(?:\.\d+)?)/i.exec(txt);
      let conf = mconf ? Number(mconf[1]) : 0.7;
      if (conf > 1) conf = conf / 100;
      return { category: mcat ? mcat[1] : "", confidence: conf };
    }
  } catch {
    return { category: "", confidence: 0 };
  }
}

// Step 2.1: add_expense
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, rawText } = body as { userId: string; rawText: string };
    if (!userId || !rawText) return NextResponse.json({ error: "Missing userId or rawText" }, { status: 400 });

    // 1) Parse amount using regex (₹?\d+(\.\d{1,2})?)
    const amountMatch = rawText.match(/(?:[₹$€£])?\s*(\d+(?:\.\d{1,2})?)/);
    const amount = amountMatch ? Number(amountMatch[1]) : NaN;

    const lower = rawText.toLowerCase();
    const extracted = extractRuleTerm(rawText);

    // 2) Predefined rules
    const predefined: Record<string, string> = {
      groceries: "Food", grocery: "Food", restaurant: "Food", dining: "Food", lunch: "Food", dinner: "Food", pizza: "Food", breakfast: "Food", snacks: "Food", coffee: "Food", swiggy: "Food", zomato: "Food", ubereats: "Food",
      travel: "Travel", transport: "Travel", taxi: "Travel", uber: "Travel", ola: "Travel", bus: "Travel", train: "Travel", flight: "Travel", airline: "Travel", fuel: "Travel", petrol: "Travel", gas: "Travel",
      entertainment: "Entertainment", cinema: "Entertainment", netflix: "Entertainment", movie: "Entertainment", movies: "Entertainment", tv: "Entertainment", hotstar: "Entertainment", sunnxt: "Entertainment", spotify: "Entertainment", prime: "Entertainment", disney: "Entertainment", playstation: "Entertainment", xbox: "Entertainment",
      shopping: "Shopping", amazon: "Shopping", flipkart: "Shopping", myntra: "Shopping", apparel: "Shopping", clothing: "Shopping", mall: "Shopping", electronics: "Shopping", gadget: "Shopping",
      utilities: "Utilities", electricity: "Utilities", water: "Utilities", internet: "Utilities", broadband: "Utilities", jio: "Utilities", airtel: "Utilities", bsnl: "Utilities", bill: "Utilities",
      health: "Healthcare", healthcare: "Healthcare", medicine: "Healthcare", hospital: "Healthcare", doctor: "Healthcare", pharmacy: "Healthcare", apollo: "Healthcare", pharmeasy: "Healthcare", practo: "Healthcare",
    };
    const predefinedKey = Object.keys(predefined).find(k => new RegExp(`\\b${k}\\b`).test(lower));
    let category = predefinedKey ? predefined[predefinedKey] : "";

    // If predefined matched, upsert CategoryRules for extracted term
    if (category && extracted) {
      try {
        await ddb.send(new PutCommand({
          TableName: CATEGORY_RULES_TABLE,
          Item: { rule: extracted, category },
          ConditionExpression: "attribute_not_exists(#r)",
          ExpressionAttributeNames: { "#r": "rule" },
        }));
      } catch {}
    }

    // 3) CategoryRules lookup (exact, then fuzzy by tokens)
    if (!category && extracted) {
      try {
        const r = await ddb.send(new GetCommand({ TableName: CATEGORY_RULES_TABLE, Key: { rule: extracted } }));
        const ruleCat = (r.Item as any)?.category as string | undefined;
        if (ruleCat) category = ruleCat;
      } catch {}
      if (!category) {
        const parts = extracted.split(" ").filter(Boolean);
        if (parts.length >= 2) {
          try {
            // Case-insensitive fallback: scan and filter in code
            const scanAll = await ddb.send(new ScanCommand({
              TableName: CATEGORY_RULES_TABLE,
              ProjectionExpression: "#r, #c",
              ExpressionAttributeNames: { "#r": "rule", "#c": "category" }
            }));
            const lc1 = parts[0].toLowerCase();
            const lc2 = parts[1].toLowerCase();
            const match = (scanAll.Items || []).find((it: any) => {
              const r = String(it.rule || "").toLowerCase();
              return r.includes(lc1) && r.includes(lc2);
            });
            if (match && match.category) category = String(match.category);
          } catch {}
        }
      }
    }

    // 4) If category unknown -> call Groq
    let AIConfidence: number | undefined;
    let options: string[] | undefined;
    if (!category) {
      const ai = await getCategoryFromAI(rawText);
      AIConfidence = ai.confidence;
      const aiCatRaw = (ai.category || "").trim();
      const aiCat = aiCatRaw.toLowerCase();
      // Normalize to nearest allowed category (case-insensitive)
      const matchedAllowed = ALLOWED_CATEGORIES.find(c => c.toLowerCase() === aiCat);
      category = matchedAllowed || "Other";

      // Build options for user acknowledgment: distinct CategoryRules categories + allowed (include AI's raw category)
      try {
        const scan = await ddb.send(new ScanCommand({ TableName: CATEGORY_RULES_TABLE, ProjectionExpression: "#c", ExpressionAttributeNames: { "#c": "category" } }));
        const fromRules = Array.from(new Set((scan.Items || []).map((it: any) => String(it.category || "")).filter(Boolean)));
        const union = Array.from(new Set([aiCatRaw, ...fromRules, ...ALLOWED_CATEGORIES])) as string[];
        options = union;
      } catch {
        options = [aiCatRaw, ...ALLOWED_CATEGORIES];
      }
    }

    const normalizedCategory = category ? category : "Other";

    const message = isFinite(amount)
      ? `Parsed amount ${amount} and category ${normalizedCategory}`
      : `Could not parse amount; suggested category ${normalizedCategory}`;

    // Respond first to frontend for confirmation
    // 4) Return response to frontend: {amount, category, AIConfidence?, message}
    const payload: any = { amount: isFinite(amount) ? amount : undefined, category: normalizedCategory, message };
    if (typeof AIConfidence === "number") payload.AIConfidence = AIConfidence;
    if (options) payload.options = options;
    return NextResponse.json(payload);

  } catch (err) {
    return NextResponse.json({ error: "Failed to parse expense" }, { status: 500 });
  }
}

// 5) After user confirms AI suggestion, save to Expenses and persist global rule mapping
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, amount, category, rawText, date } = body as { userId: string; amount: number; category: string; rawText: string; date?: string };
    if (!userId || !category || !rawText || !isFinite(amount)) return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });

    const expenseId = crypto.randomUUID();
    const isoDate = date ?? new Date().toISOString().slice(0,10);

    // Save expense
    await ddb.send(new PutCommand({
      TableName: EXPENSES_TABLE,
      Item: { expenseId, userId, amount, category, rawText, date: isoDate, createdAt: new Date().toISOString() },
    }));

    const extracted = extractRuleTerm(rawText);

    if (category !== "Uncategorized" && extracted) {
      try {
        await ddb.send(new PutCommand({
          TableName: CATEGORY_RULES_TABLE,
          Item: { rule: extracted, category },
          ConditionExpression: "attribute_not_exists(#r)",
          ExpressionAttributeNames: { "#r": "rule" },
        }));
      } catch {}
    }

    return NextResponse.json({ ok: true, expenseId });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}

