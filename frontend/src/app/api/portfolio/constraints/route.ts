import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

function constraintsSk(portfolioId: string) { return `CONSTRAINTS#${portfolioId}`; }

export async function GET(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { searchParams } = new URL(req.url);
	const portfolioId = searchParams.get("portfolioId");
	if (!portfolioId) return NextResponse.json({ error: "Missing portfolioId" }, { status: 400 });
	const res = await ddb.send(new GetCommand({ TableName: INVEST_TABLE, Key: { pk: `USER#${sub}`, sk: constraintsSk(portfolioId) } }));
	return NextResponse.json({ constraints: (res.Item as any)?.constraints || null });
}

export async function PUT(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { portfolioId, constraints } = await req.json();
	if (!portfolioId || !constraints) return NextResponse.json({ error: "Missing portfolioId or constraints" }, { status: 400 });
	const now = new Date().toISOString();
	const c = {
		efMonths: Math.max(0, Math.min(24, Math.round(Number(constraints.efMonths)||0))),
		liquidityAmount: Math.max(0, Math.round(Number(constraints.liquidityAmount)||0)),
		liquidityMonths: Math.max(0, Math.min(36, Math.round(Number(constraints.liquidityMonths)||0))),
		notes: String(constraints.notes||""),
		updatedAt: now,
	};
	await ddb.send(new PutCommand({
		TableName: INVEST_TABLE,
		Item: {
			pk: `USER#${sub}`,
			sk: constraintsSk(portfolioId),
			entityType: "CONSTRAINTS",
			portfolioId,
			constraints: c,
			updatedAt: now,
			GSI1PK: `PORTFOLIO#${portfolioId}`,
			GSI1SK: `CONSTRAINTS#${now}`,
		}
	}));
	return NextResponse.json({ ok: true });
}