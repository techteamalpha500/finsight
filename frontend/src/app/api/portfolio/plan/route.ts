import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../_utils/auth";


const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

function variantKey(portfolioId: string, variant?: string) {
	const v = (variant||"").toLowerCase();
	if (v === "custom") return `ALLOCATION#${portfolioId}#CUSTOM`;
	if (v === "advisor") return `ALLOCATION#${portfolioId}#ADVISOR`;
	return `ALLOCATION#${portfolioId}`;
}

export async function PUT(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { portfolioId, plan } = await req.json();
	if (!portfolioId || !plan) return NextResponse.json({ error: "Missing portfolioId or plan" }, { status: 400 });
	const now = new Date().toISOString();
	const origin = (plan?.origin || '').toLowerCase();
	try {
		const snap = (plan as any)?.answersSnapshot || {}; // Simplified - no pruning needed
		(plan as any).answersSnapshot = snap;
		(plan as any).answersSig = JSON.stringify(snap); // Simplified signature
		(plan as any).policyVersion = (plan as any).policyVersion || 'v1';
		(plan as any).compliance = {
			savedAt: now,
			policyVersion: (plan as any).policyVersion,
			answers: snap,
			drivers: (plan as any).explain?.topDrivers || [],
		};
	} catch {}

	// Idempotency: compare against existing canonical; skip if unchanged
	let existing: any = null;
	try {
		const got = await ddb.send(new GetCommand({ TableName: INVEST_TABLE, Key: { pk: `USER#${sub}`, sk: variantKey(portfolioId) } }));
		existing = (got.Item as any)?.plan || null;
	} catch {}
	const hashPlan = (p:any)=> JSON.stringify({ origin: (p||{}).origin, answersSig: (p||{}).answersSig, buckets: ((p||{}).buckets||[]).map((b:any)=>({ class:b.class, pct:b.pct })) });
	const changed = !existing || (hashPlan(existing) !== hashPlan(plan));

	// 1) Always save the latest selected plan to the canonical key
	if (changed) {
		await ddb.send(new PutCommand({
			TableName: INVEST_TABLE,
			Item: {
				pk: `USER#${sub}`,
				sk: variantKey(portfolioId),
				entityType: "ALLOCATION",
				plan,
				updatedAt: now,
				GSI1PK: `PORTFOLIO#${portfolioId}`,
				GSI1SK: `ALLOCATION#${now}`,
			}
		}));
	}
	// 2) Save variant-specific snapshot
	if (origin === 'custom' || origin === 'engine' || origin === 'ai') {
		const variant = origin === 'custom' ? 'custom' : 'advisor';
		if (changed) {
			await ddb.send(new PutCommand({
				TableName: INVEST_TABLE,
				Item: {
					pk: `USER#${sub}`,
					sk: variantKey(portfolioId, variant),
					entityType: "ALLOCATION",
					plan,
					updatedAt: now,
				}
			}));
		}
	}
	return NextResponse.json({ ok: true, changed });
}

export async function GET(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { searchParams } = new URL(req.url);
	const portfolioId = searchParams.get("portfolioId");
	const variant = searchParams.get("variant") || undefined;
	if (!portfolioId) return NextResponse.json({ error: "Missing portfolioId" }, { status: 400 });
	const res = await ddb.send(new GetCommand({
		TableName: INVEST_TABLE,
		Key: { pk: `USER#${sub}`, sk: variantKey(portfolioId, variant) }
	}));
	const plan = (res.Item as any)?.plan || null;
	return NextResponse.json({ plan });
}

