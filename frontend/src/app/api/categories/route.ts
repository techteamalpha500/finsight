import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ALLOWED_CATEGORIES = [
  "Food","Travel","Entertainment","Shopping","Utilities","Healthcare",
  "Housing","Education","Insurance","Investment","Loans",
  "Grooming","Subscription","Taxes","Gifts","Pet Care","Other"
];

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";

export async function GET() {
  try {
    const scan = await ddb.send(new ScanCommand({ TableName: EXPENSES_TABLE, ProjectionExpression: "#c", ExpressionAttributeNames: { "#c": "category" } }));
    const dyn = Array.from(new Set((scan.Items || []).map((it: any) => String(it.category || "").trim()).filter(Boolean)));
    const union = Array.from(new Set<string>([...ALLOWED_CATEGORIES, ...dyn])).sort((a,b)=> a.localeCompare(b));
    return NextResponse.json({ categories: union });
  } catch {
    return NextResponse.json({ categories: ALLOWED_CATEGORIES });
  }
}

