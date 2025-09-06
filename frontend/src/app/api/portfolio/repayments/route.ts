import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const REPAYMENTS_TABLE = process.env.REPAYMENTS_TABLE || "Repayments";

export async function GET(req: NextRequest) {
  try {
    const sub = await getUserSubFromJwt(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Query all repayments for the user
    const result = await ddb.send(new QueryCommand({
      TableName: REPAYMENTS_TABLE,
      KeyConditionExpression: "user_id = :userId",
      ExpressionAttributeValues: {
        ":userId": sub
      }
    }));

    const repayments = result.Items || [];
    
    // Calculate summary
    const total_outstanding = repayments.reduce((sum, r) => sum + (r.outstanding_balance || 0), 0);
    const total_emi = repayments.reduce((sum, r) => sum + (r.emi_amount || 0), 0);
    const total_repayments = repayments.length;

    return NextResponse.json({
      total_outstanding,
      total_emi,
      total_repayments,
      repayments
    });
  } catch (error) {
    console.error('Error fetching repayments:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sub = await getUserSubFromJwt(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      type,
      institution,
      principal,
      interest_rate,
      emi_amount,
      tenure_months,
      start_date,
      due_date
    } = body;

    // Validate required fields
    if (!type || !institution || !principal || !interest_rate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // For non-EMI loans (like credit cards), emi_amount can be 0
    const finalEmiAmount = emi_amount || 0;

    const repayment_id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Calculate outstanding balance (initially same as principal)
    const outstanding_balance = parseFloat(principal);

    const repayment = {
      user_id: sub,
      repayment_id,
      type,
      institution,
      principal: parseFloat(principal),
      interest_rate: parseFloat(interest_rate),
      emi_amount: finalEmiAmount,
      tenure_months: tenure_months ? parseInt(tenure_months) : 0, // 0 means no fixed tenure (like credit cards)
      outstanding_balance,
      start_date: start_date || now,
      due_date: due_date || now,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    await ddb.send(new PutCommand({
      TableName: REPAYMENTS_TABLE,
      Item: repayment
    }));

    return NextResponse.json({
      repayment_id,
      message: "Repayment created successfully"
    });
  } catch (error) {
    console.error('Error creating repayment:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}