import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

function goalSk(portfolioId: string, goalId: string) {
	return `GOAL#${portfolioId}#${goalId}`;
}

export async function GET(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { searchParams } = new URL(req.url);
	const portfolioId = searchParams.get("portfolioId");
	const goalId = searchParams.get("goalId");
	if (!portfolioId) return NextResponse.json({ error: "Missing portfolioId" }, { status: 400 });
	try {
		if (goalId) {
			const res = await ddb.send(new GetCommand({ TableName: INVEST_TABLE, Key: { pk: `USER#${sub}`, sk: goalSk(portfolioId, goalId) } }));
			return NextResponse.json({ goal: res.Item || null });
		}
		// list goals by portfolio via GSI1
		const res = await ddb.send(new QueryCommand({
			TableName: INVEST_TABLE,
			IndexName: "GSI1", // assumes GSI1PK/GSI1SK
			KeyConditionExpression: "GSI1PK = :g",
			ExpressionAttributeValues: { ":g": `PORTFOLIO#${portfolioId}` },
			ScanIndexForward: false,
		}));
		const items = (res.Items||[]).filter(it => String((it as any)?.sk||"").startsWith(`GOAL#${portfolioId}#`));
		return NextResponse.json({ goals: items });
	} catch (e:any) {
		return NextResponse.json({ error: "Server error", detail: String(e?.message||e) }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { portfolioId, goal } = await req.json();
	if (!portfolioId || !goal?.id) return NextResponse.json({ error: "Missing portfolioId or goal.id" }, { status: 400 });
	const now = new Date().toISOString();
	try {
		await ddb.send(new PutCommand({
			TableName: INVEST_TABLE,
			Item: {
				pk: `USER#${sub}`,
				sk: goalSk(portfolioId, goal.id),
				entityType: "GOAL",
				portfolioId,
				goal: { ...goal, createdAt: now, updatedAt: now },
				updatedAt: now,
				GSI1PK: `PORTFOLIO#${portfolioId}`,
				GSI1SK: `GOAL#${now}`,
			}
		}));
		return NextResponse.json({ ok: true });
	} catch (e:any) {
		return NextResponse.json({ error: "Server error", detail: String(e?.message||e) }, { status: 500 });
	}
}

export async function PUT(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { portfolioId, goal } = await req.json();
	if (!portfolioId || !goal?.id) return NextResponse.json({ error: "Missing portfolioId or goal.id" }, { status: 400 });
	const now = new Date().toISOString();
	try {
		await ddb.send(new PutCommand({
			TableName: INVEST_TABLE,
			Item: {
				pk: `USER#${sub}`,
				sk: goalSk(portfolioId, goal.id),
				entityType: "GOAL",
				portfolioId,
				goal: { ...goal, updatedAt: now },
				updatedAt: now,
				GSI1PK: `PORTFOLIO#${portfolioId}`,
				GSI1SK: `GOAL#${now}`,
			}
		}));
		return NextResponse.json({ ok: true });
	} catch (e:any) {
		return NextResponse.json({ error: "Server error", detail: String(e?.message||e) }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { searchParams } = new URL(req.url);
	const portfolioId = searchParams.get("portfolioId");
	const goalId = searchParams.get("goalId");
	if (!portfolioId || !goalId) return NextResponse.json({ error: "Missing portfolioId or goalId" }, { status: 400 });
	try {
		await ddb.send(new DeleteCommand({ TableName: INVEST_TABLE, Key: { pk: `USER#${sub}`, sk: goalSk(portfolioId, goalId) } }));
		return NextResponse.json({ ok: true });
	} catch (e:any) {
		return NextResponse.json({ error: "Server error", detail: String(e?.message||e) }, { status: 500 });
	}
}