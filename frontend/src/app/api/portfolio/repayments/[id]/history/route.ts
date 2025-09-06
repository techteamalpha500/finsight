import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../../../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const REPAYMENT_HISTORY_TABLE = process.env.REPAYMENT_HISTORY_TABLE || "RepaymentHistory";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sub = await getUserSubFromJwt(req);
    if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    // Query repayment history using GSI
    const result = await ddb.send(new QueryCommand({
      TableName: REPAYMENT_HISTORY_TABLE,
      IndexName: "RepaymentHistoryIndex",
      KeyConditionExpression: "repayment_id = :repaymentId",
      ExpressionAttributeValues: {
        ":repaymentId": id
      }
    }));

    const history = result.Items || [];
    
    // Sort by payment date (newest first)
    history.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching repayment history:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}