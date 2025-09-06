import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

export async function POST(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { portfolioId, holding } = await req.json();
  if (!portfolioId || !holding) return NextResponse.json({ error: "Missing portfolioId or holding" }, { status: 400 });
  const holdingId = holding.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: INVEST_TABLE,
    Item: {
      pk: `USER#${sub}`,
      sk: `HOLDING#${portfolioId}#${holdingId}`,
      entityType: "HOLDING",
      portfolioId,
      holdingId,
      data: holding,
      updatedAt: now,
      GSI1PK: `PORTFOLIO#${portfolioId}`,
      GSI1SK: `HOLDING#${holdingId}`,
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
    TableName: INVEST_TABLE,
    KeyConditionExpression: "pk = :pk AND begins_with(#sk, :sk)",
    ExpressionAttributeValues: { ":pk": `USER#${sub}`, ":sk": `HOLDING#${portfolioId}#` },
    ExpressionAttributeNames: { "#sk": "sk" },
  }));
  const items = (res.Items || []).map((it: any) => ({ id: it.holdingId, ...(it.data || {}) }));
  return NextResponse.json({ items });
}

