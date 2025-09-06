import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const USER_BUDGETS_TABLE = process.env.USER_BUDGETS_TABLE || "UserBudgets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const res = await ddb.send(new GetCommand({ TableName: USER_BUDGETS_TABLE, Key: { userId } }));
    const item = (res.Item as any) || {};
    const defaultBudgets = item.defaultBudgets || item.budgets || {};
    const overrides = item.overrides || {};
    return NextResponse.json({ defaultBudgets, overrides });
  } catch (err) {
    return NextResponse.json({ defaultBudgets: {}, overrides: {} });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, defaultBudgets, overrides, budgets } = body as { userId: string; defaultBudgets?: Record<string, number>; overrides?: Record<string, Record<string, number>>; budgets?: Record<string, number> };
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const item: any = { userId, updatedAt: new Date().toISOString() };
    if (defaultBudgets) item.defaultBudgets = defaultBudgets;
    if (overrides) item.overrides = overrides;
    if (!defaultBudgets && !overrides && budgets) item.defaultBudgets = budgets;
    await ddb.send(new PutCommand({ TableName: USER_BUDGETS_TABLE, Item: item }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save budgets" }, { status: 500 });
  }
}