import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";

// 2.4 delete_expense
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expenseId } = body as { expenseId: string };
    if (!expenseId) return NextResponse.json({ error: "Missing expenseId" }, { status: 400 });
    await ddb.send(new DeleteCommand({ TableName: EXPENSES_TABLE, Key: { expenseId } }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}

