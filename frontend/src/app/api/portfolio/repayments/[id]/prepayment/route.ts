import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../../../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const REPAYMENTS_TABLE = process.env.REPAYMENTS_TABLE || "Repayments";
const REPAYMENT_HISTORY_TABLE = process.env.REPAYMENT_HISTORY_TABLE || "RepaymentHistory";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sub = await getUserSubFromJwt(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { amount, payment_date, type, extra_months } = body;

    if (!amount || !payment_date) {
      return NextResponse.json({ error: "Missing required fields: amount, payment_date" }, { status: 400 });
    }

    // Get the current repayment
    const repaymentResult = await ddb.send(new GetCommand({
      TableName: REPAYMENTS_TABLE,
      Key: {
        user_id: sub,
        repayment_id: id
      }
    }));

    if (!repaymentResult.Item) {
      return NextResponse.json({ error: "Repayment not found" }, { status: 404 });
    }

    const repayment = repaymentResult.Item;
    const prepaymentAmount = parseFloat(amount);
    const now = new Date().toISOString();

    // Create history entry
    const history_id = crypto.randomUUID();
    const historyEntry = {
      user_id: sub,
      repayment_id: id,
      history_id,
      amount: prepaymentAmount,
      payment_date,
      type: type || 'prepayment',
      extra_months: extra_months ? parseInt(extra_months) : undefined,
      created_at: now
    };

    await ddb.send(new PutCommand({
      TableName: REPAYMENT_HISTORY_TABLE,
      Item: historyEntry
    }));

    // Update outstanding balance
    const newOutstandingBalance = Math.max(0, repayment.outstanding_balance - prepaymentAmount);

    await ddb.send(new UpdateCommand({
      TableName: REPAYMENTS_TABLE,
      Key: {
        user_id: sub,
        repayment_id: id
      },
      UpdateExpression: "SET outstanding_balance = :balance, updated_at = :updated_at",
      ExpressionAttributeValues: {
        ":balance": newOutstandingBalance,
        ":updated_at": now
      }
    }));

    return NextResponse.json({
      message: "Prepayment processed successfully",
      new_outstanding_balance: newOutstandingBalance
    });
  } catch (error) {
    console.error('Error processing prepayment:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}