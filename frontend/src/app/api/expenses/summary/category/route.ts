import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";

// 2.6 category_summary(userId, category) → list & total
export async function POST(req: NextRequest) {
  try {
    const { userId, category } = (await req.json()) as { userId: string; category: string };
    if (!userId || !category) return NextResponse.json({ error: "Missing userId or category" }, { status: 400 });

    let items: any[] = [];
    try {
      const res = await ddb.send(new QueryCommand({
        TableName: EXPENSES_TABLE,
        IndexName: "userId-date-index",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId }
      }));
      items = (res.Items || []).filter((it: any) => it.category === category);
    } catch {
      return NextResponse.json({ items: [], total: 0 });
    }
    const total = items.reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0);
    return NextResponse.json({ items, total });
  } catch (err) {
    return NextResponse.json({ error: "Failed to compute category summary" }, { status: 500 });
  }
}

