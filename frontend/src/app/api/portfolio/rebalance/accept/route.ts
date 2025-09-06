import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

export async function POST(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { portfolioId, proposal } = await req.json();
	if (!portfolioId || !proposal) return NextResponse.json({ error: "Missing portfolioId or proposal" }, { status: 400 });
	const now = new Date().toISOString();
	const id = proposal?.id || `REB#${now}`;
	await ddb.send(new PutCommand({
		TableName: INVEST_TABLE,
		Item: {
			pk: `USER#${sub}`,
			sk: `REBALANCE#${portfolioId}#${id}`,
			entityType: "REBALANCE",
			portfolioId,
			proposal: { ...proposal, id, acceptedAt: now },
			updatedAt: now,
			GSI1PK: `PORTFOLIO#${portfolioId}`,
			GSI1SK: `REBALANCE#${now}`,
		}
	}));
	return NextResponse.json({ ok: true, id });
}