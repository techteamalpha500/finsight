import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const HOLDINGS_TABLE = process.env.HOLDINGS_TABLE || "holdings";

export async function POST(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { portfolioId, holding } = await req.json();
  if (!portfolioId || !holding) return NextResponse.json({ error: "Missing portfolioId or holding" }, { status: 400 });
  const holdingId = holding.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: HOLDINGS_TABLE,
    Item: {
      id: holdingId,
      user_id: sub,
      portfolio_id: portfolioId,
      symbol: holding.symbol,
      data: holding,
      asset_class: holding.asset_class || 'Stocks',
      portfolio_role: holding.portfolio_role || 'Equity',
      created_at: now,
      updated_at: now
    }
  }));
  return NextResponse.json({ holdingId });
}

export async function GET(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get("portfolioId");
  if (!portfolioId) return NextResponse.json({ error: "Missing portfolioId" }, { status: 400 });
  const res = await ddb.send(new QueryCommand({
    TableName: HOLDINGS_TABLE,
    IndexName: 'user_id-portfolio_id-index',
    KeyConditionExpression: "user_id = :user_id AND portfolio_id = :portfolio_id",
    ExpressionAttributeValues: { ":user_id": sub, ":portfolio_id": portfolioId },
  }));
  const items = (res.Items || []).map((it: any) => ({ id: it.id, ...(it.data || {}) }));
  return NextResponse.json({ items });
}

