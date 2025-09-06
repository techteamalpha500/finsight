import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

export async function POST(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name || String(name).trim().length === 0) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  const portfolioId = crypto.randomUUID();
  const now = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: INVEST_TABLE,
    Item: {
      pk: `USER#${sub}`,
      sk: `PORTFOLIO#${portfolioId}`,
      entityType: "PORTFOLIO",
      name: String(name).trim(),
      createdAt: now,
      updatedAt: now,
      GSI1PK: `PORTFOLIO#${portfolioId}`,
      GSI1SK: now,
    }
  }));
  return NextResponse.json({ portfolioId, name: String(name).trim() });
}

export async function GET(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await ddb.send(new QueryCommand({
    TableName: INVEST_TABLE,
    KeyConditionExpression: "pk = :pk AND begins_with(#sk, :sk)",
    ExpressionAttributeValues: { ":pk": `USER#${sub}`, ":sk": "PORTFOLIO#" },
    ExpressionAttributeNames: { "#sk": "sk" },
  }));
  const items = (res.Items || []).map((it: any) => ({
    portfolioId: String(it.sk).split("#")[1],
    name: it.name,
    createdAt: it.createdAt,
  }));
  return NextResponse.json({ items });
}

