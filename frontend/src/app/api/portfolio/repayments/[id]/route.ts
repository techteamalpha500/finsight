import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const REPAYMENTS_TABLE = process.env.REPAYMENTS_TABLE || "Repayments";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sub = await getUserSubFromJwt(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await ddb.send(new GetCommand({
      TableName: REPAYMENTS_TABLE,
      Key: {
        user_id: sub,
        repayment_id: id
      }
    }));

    if (!result.Item) {
      return NextResponse.json({ error: "Repayment not found" }, { status: 404 });
    }

    return NextResponse.json(result.Item);
  } catch (error) {
    console.error('Error fetching repayment:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sub = await getUserSubFromJwt(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const {
      type,
      institution,
      principal,
      interest_rate,
      emi_amount,
      tenure_months,
      outstanding_balance,
      start_date,
      due_date,
      status
    } = body;

    const now = new Date().toISOString();

    const repayment = {
      user_id: sub,
      repayment_id: id,
      type: type || undefined,
      institution: institution || undefined,
      principal: principal ? parseFloat(principal) : undefined,
      interest_rate: interest_rate ? parseFloat(interest_rate) : undefined,
      emi_amount: emi_amount ? parseFloat(emi_amount) : undefined,
      tenure_months: tenure_months ? parseInt(tenure_months) : undefined,
      outstanding_balance: outstanding_balance ? parseFloat(outstanding_balance) : undefined,
      start_date: start_date || undefined,
      due_date: due_date || undefined,
      status: status || undefined,
      updated_at: now
    };

    // Remove undefined values
    const cleanRepayment = Object.fromEntries(
      Object.entries(repayment).filter(([_, value]) => value !== undefined)
    );

    await ddb.send(new PutCommand({
      TableName: REPAYMENTS_TABLE,
      Item: cleanRepayment
    }));

    return NextResponse.json({
      message: "Repayment updated successfully"
    });
  } catch (error) {
    console.error('Error updating repayment:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sub = await getUserSubFromJwt(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await ddb.send(new DeleteCommand({
      TableName: REPAYMENTS_TABLE,
      Key: {
        user_id: sub,
        repayment_id: id
      }
    }));

    return NextResponse.json({
      message: "Repayment deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting repayment:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}