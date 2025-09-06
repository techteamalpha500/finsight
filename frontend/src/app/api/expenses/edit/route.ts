import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";

// 2.3 edit_expense
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expenseId, updates } = body as { expenseId: string; updates: { amount?: number; category?: string; rawText?: string } };
    if (!expenseId || !updates) return NextResponse.json({ error: "Missing expenseId or updates" }, { status: 400 });

    const expressions: string[] = [];
    const values: Record<string, any> = {};
    if (typeof updates.amount === "number") { expressions.push("amount = :amount"); values[":amount"] = updates.amount; }
    if (typeof updates.category === "string") { expressions.push("category = :category"); values[":category"] = updates.category; }
    if (typeof updates.rawText === "string") { expressions.push("rawText = :rawText"); values[":rawText"] = updates.rawText; }

    if (!expressions.length) return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

    await ddb.send(new UpdateCommand({
      TableName: EXPENSES_TABLE,
      Key: { expenseId },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeValues: values,
    }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to edit expense" }, { status: 500 });
  }
}

