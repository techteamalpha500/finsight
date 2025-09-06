import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";

// 2.6 monthly_summary(userId) → total per category for the current month
export async function POST(req: NextRequest) {
  try {
    const { userId, month } = (await req.json()) as { userId: string; month?: string };
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const now = new Date();
    const ym = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let items: any[] = [];
    try {
      const res = await ddb.send(new QueryCommand({
        TableName: EXPENSES_TABLE,
        IndexName: "userId-date-index",
        KeyConditionExpression: "userId = :uid AND begins_with(#d, :ym)",
        ExpressionAttributeValues: { ":uid": userId, ":ym": ym },
        ExpressionAttributeNames: { "#d": "date" }
      }));
      items = res.Items || [];
    } catch {
      return NextResponse.json({ month: ym, totals: {} });
    }

    const totals: Record<string, number> = {};
    for (const it of items) {
      const cat = it.category || "Misc";
      totals[cat] = (totals[cat] ?? 0) + Number(it.amount || 0);
    }
    return NextResponse.json({ month: ym, totals });
  } catch (err) {
    return NextResponse.json({ error: "Failed to compute monthly summary" }, { status: 500 });
  }
}

