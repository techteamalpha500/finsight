import json
import os
import re
import traceback
import uuid
from datetime import datetime
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

AWS_REGION = os.environ.get("AWS_REGION") or os.environ.get("REGION") or "us-east-1"
EXPENSES_TABLE = os.environ.get("EXPENSES_TABLE", "Expenses")
CATEGORY_RULES_TABLE = os.environ.get("CATEGORY_RULES_TABLE", "CategoryRules")
USER_BUDGETS_TABLE = os.environ.get("USER_BUDGETS_TABLE", "UserBudgets")
GROQ_API_KEY = (os.environ.get("GROQ_API_KEY") or "").strip()
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-70b-versatile")

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
expenses_table = dynamodb.Table(EXPENSES_TABLE)
category_rules_table = dynamodb.Table(CATEGORY_RULES_TABLE)
user_budgets_table = dynamodb.Table(USER_BUDGETS_TABLE)


def _cors_headers():
    return {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    }


def _response(status, body):
    return {"statusCode": status, "headers": _cors_headers(), "body": json.dumps(body, default=_to_json)}


def _to_json(o):
    if isinstance(o, Decimal):
        return float(o)
    return o


ALLOWED_CATEGORIES = [
    "Food",          # groceries, restaurants, coffee, snacks
    "Travel",        # fuel, cab, flights, metro, parking
    "Shopping",      # clothes, electronics, accessories
    "Utilities",     # electricity, water, gas, internet, phone
    "Housing",       # rent, maintenance, home repairs
    "Healthcare",    # doctor visits, pharmacy, health checkup
    "Entertainment", # movies, OTT, gaming, outings
    "Investment",    # stocks, equity mutual funds, SIP, gold
    "Loans",         # EMI, credit card payment, personal loan
    "Insurance",     # life, health, vehicle, home
    "Grooming",      # haircut, salon, spa, beauty, cosmetics
    "Subscription",  # Netflix, Spotify, news, memberships
    "Education",     # school fees, courses, books
    "Taxes",         # income tax, GST, penalties
    "Gifts",         # birthdays, festivals, anniversaries (incl. donations)
    "Pet Care",      # food, grooming, vet
    "Other",         # uncategorized / misc
]


def _get_category_from_ai(raw_text: str):
    if not GROQ_API_KEY:
        print("GROQ_API_KEY missing")
        return {"category": "", "confidence": 0.0}
    try:
        system_prompt = (
            "You are a financial expense categorizer. Allowed categories: " + ", ".join(ALLOWED_CATEGORIES) + ". "
            "Given a user input, respond ONLY as JSON: {\"category\": one of the allowed, \"confidence\": number 0..1}."
        )
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw_text},
            ],
            "temperature": 0,
        }
        req = urlrequest.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
        )
        with urlrequest.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
            try:
                parsed = json.loads(content)
                return {"category": parsed.get("category", ""), "confidence": float(parsed.get("confidence", 0))}
            except Exception:
                return {"category": "", "confidence": 0.0}
    except Exception as e:
        print(f"AI categorization error: {e}")
        return {"category": "", "confidence": 0.0}


def _user_from_jwt(evt):
    """Extract user ID from JWT token"""
    try:
        claims = (((evt.get("requestContext") or {}).get("authorizer") or {}).get("jwt") or {}).get("claims") or {}
        sub = claims.get("sub")
        return sub
    except Exception:
        return None


def handler(event, context):
    try:
        method = (event.get("requestContext", {}).get("http", {}) or {}).get("method") or event.get("httpMethod")
        path = event.get("rawPath") or event.get("resource") or ""
        route_key = event.get("requestContext", {}).get("routeKey") or f"{method} {path}"

        if method == "OPTIONS":
            return _response(200, {"ok": True})

        body = {}
        if event.get("body"):
            try:
                body = json.loads(event["body"]) or {}
            except Exception:
                body = {}
        qs = event.get("queryStringParameters") or {}
        path_params = event.get("pathParameters") or {}

        # ----------------------- EXPENSE APIs (JWT-protected via API Gateway) -----------------------

        # Create expense (POST /expenses) — body: { amount, category, description, date }
        if route_key == "POST /expenses":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            amount = body.get("amount")
            category = body.get("category", "").strip()
            description = body.get("description", "").strip()
            date = body.get("date", datetime.utcnow().strftime("%Y-%m-%d"))
            
            if not amount or not category:
                return _response(400, {"error": "Missing amount or category"})
            
            # Auto-categorize if category is missing or low confidence
            if not category or category.lower() == "auto":
                ai_result = _get_category_from_ai(description)
                category = ai_result["category"]
            
            expense_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            item = {
                "pk": f"USER#{user_sub}",
                "sk": f"EXPENSE#{date}#{expense_id}",
                "entityType": "EXPENSE",
                "expenseId": expense_id,
                "amount": Decimal(str(amount)),
                "category": category,
                "description": description,
                "date": date,
                "createdAt": now,
                "GSI1PK": f"CATEGORY#{category}",
                "GSI1SK": f"DATE#{date}#{expense_id}",
            }
            
            expenses_table.put_item(Item=item)
            return _response(200, {"expenseId": expense_id})

        # List expenses (GET /expenses?start=YYYY-MM-DD&end=YYYY-MM-DD&category=...)
        if route_key == "GET /expenses":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            start = qs.get("start")
            end = qs.get("end")
            category = qs.get("category")
            
            # Query expenses for the user
            if category:
                # Query by category using GSI
                res = expenses_table.query(
                    IndexName="GSI1",
                    KeyConditionExpression=Key("GSI1PK").eq(f"CATEGORY#{category}"),
                    FilterExpression=Key("pk").eq(f"USER#{user_sub}")
                )
            else:
                # Query by user and date range
                res = expenses_table.query(
                    KeyConditionExpression=Key("pk").eq(f"USER#{user_sub}") & Key("sk").begins_with("EXPENSE#")
                )
            
            items = res.get("Items", [])
            
            # Filter by date range if specified
            if start or end:
                filtered_items = []
                for item in items:
                    item_date = item.get("date", "")
                    if start and item_date < start:
                        continue
                    if end and item_date > end:
                        continue
                    filtered_items.append(item)
                items = filtered_items
            
            # Transform to frontend format
            expenses = []
            for item in items:
                expense = {
                    "id": item.get("expenseId"),
                    "amount": float(item.get("amount", 0)),
                    "category": item.get("category", ""),
                    "description": item.get("description", ""),
                    "date": item.get("date", ""),
                    "createdAt": item.get("createdAt", "")
                }
                expenses.append(expense)
            
            # Sort by date (newest first)
            expenses.sort(key=lambda x: x["date"], reverse=True)
            
            total = sum(float(x.get("amount", 0)) for x in expenses)
            return _response(200, {"items": expenses, "total": total})

        # Get expense categories (GET /categories)
        if route_key == "GET /categories":
            return _response(200, {"categories": ALLOWED_CATEGORIES})

        # Get expense summary (GET /expenses/summary?start=YYYY-MM-DD&end=YYYY-MM-DD)
        if route_key == "GET /expenses/summary":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            start = qs.get("start")
            end = qs.get("end")
            
            # Query all expenses for the user
            res = expenses_table.query(
                KeyConditionExpression=Key("pk").eq(f"USER#{user_sub}") & Key("sk").begins_with("EXPENSE#")
            )
            items = res.get("Items", [])
            
            # Filter by date range if specified
            if start or end:
                filtered_items = []
                for item in items:
                    item_date = item.get("date", "")
                    if start and item_date < start:
                        continue
                    if end and item_date > end:
                        continue
                    filtered_items.append(item)
                items = filtered_items
            
            # Group by category
            category_totals = {}
            for item in items:
                category = item.get("category", "Other")
                amount = float(item.get("amount", 0))
                if category in category_totals:
                    category_totals[category] += amount
                else:
                    category_totals[category] = amount
            
            # Convert to list format
            summary = [{"category": cat, "total": total} for cat, total in category_totals.items()]
            summary.sort(key=lambda x: x["total"], reverse=True)
            
            total_amount = sum(category_totals.values())
            return _response(200, {"summary": summary, "total": total_amount})

        # Create category rule (POST /category-rules) — body: { pattern, category, priority }
        if route_key == "POST /category-rules":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            pattern = body.get("pattern", "").strip()
            category = body.get("category", "").strip()
            priority = body.get("priority", 1)
            
            if not pattern or not category:
                return _response(400, {"error": "Missing pattern or category"})
            
            if category not in ALLOWED_CATEGORIES:
                return _response(400, {"error": "Invalid category"})
            
            rule_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            item = {
                "pk": f"USER#{user_sub}",
                "sk": f"RULE#{rule_id}",
                "entityType": "CATEGORY_RULE",
                "ruleId": rule_id,
                "pattern": pattern,
                "category": category,
                "priority": priority,
                "createdAt": now,
                "GSI1PK": f"PRIORITY#{priority}",
                "GSI1SK": f"RULE#{rule_id}",
            }
            
            category_rules_table.put_item(Item=item)
            return _response(200, {"ruleId": rule_id})

        # List category rules (GET /category-rules)
        if route_key == "GET /category-rules":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            res = category_rules_table.query(
                KeyConditionExpression=Key("pk").eq(f"USER#{user_sub}") & Key("sk").begins_with("RULE#")
            )
            items = res.get("Items", [])
            
            rules = []
            for item in items:
                rule = {
                    "id": item.get("ruleId"),
                    "pattern": item.get("pattern", ""),
                    "category": item.get("category", ""),
                    "priority": item.get("priority", 1),
                    "createdAt": item.get("createdAt", "")
                }
                rules.append(rule)
            
            # Sort by priority (highest first)
            rules.sort(key=lambda x: x["priority"], reverse=True)
            return _response(200, {"items": rules})

        # Delete category rule (DELETE /category-rules/{id})
        if route_key == "DELETE /category-rules/{id}":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            rule_id = path_params.get("id")
            if not rule_id:
                return _response(400, {"error": "Missing rule ID"})
            
            category_rules_table.delete_item(
                Key={"pk": f"USER#{user_sub}", "sk": f"RULE#{rule_id}"}
            )
            
            return _response(200, {"message": "Rule deleted successfully"})

        # Create budget (POST /budgets) — body: { category, amount, period }
        if route_key == "POST /budgets":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            category = body.get("category", "").strip()
            amount = body.get("amount")
            period = body.get("period", "monthly")
            
            if not category or not amount:
                return _response(400, {"error": "Missing category or amount"})
            
            if category not in ALLOWED_CATEGORIES:
                return _response(400, {"error": "Invalid category"})
            
            budget_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            item = {
                "pk": f"USER#{user_sub}",
                "sk": f"BUDGET#{category}",
                "entityType": "BUDGET",
                "budgetId": budget_id,
                "category": category,
                "amount": Decimal(str(amount)),
                "period": period,
                "createdAt": now,
                "updatedAt": now,
            }
            
            user_budgets_table.put_item(Item=item)
            return _response(200, {"budgetId": budget_id})

        # List budgets (GET /budgets)
        if route_key == "GET /budgets":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            res = user_budgets_table.query(
                KeyConditionExpression=Key("pk").eq(f"USER#{user_sub}") & Key("sk").begins_with("BUDGET#")
            )
            items = res.get("Items", [])
            
            budgets = []
            for item in items:
                budget = {
                    "id": item.get("budgetId"),
                    "category": item.get("category", ""),
                    "amount": float(item.get("amount", 0)),
                    "period": item.get("period", "monthly"),
                    "createdAt": item.get("createdAt", ""),
                    "updatedAt": item.get("updatedAt", "")
                }
                budgets.append(budget)
            
            return _response(200, {"items": budgets})

        # Update budget (PUT /budgets/{category})
        if route_key == "PUT /budgets/{category}":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            category = path_params.get("category")
            amount = body.get("amount")
            period = body.get("period")
            
            if not category or not amount:
                return _response(400, {"error": "Missing category or amount"})
            
            now = datetime.utcnow().isoformat()
            
            user_budgets_table.update_item(
                Key={"pk": f"USER#{user_sub}", "sk": f"BUDGET#{category}"},
                UpdateExpression="SET amount = :amount, updatedAt = :updatedAt",
                ExpressionAttributeValues={
                    ":amount": Decimal(str(amount)),
                    ":updatedAt": now
                }
            )
            
            return _response(200, {"message": "Budget updated successfully"})

        # Delete budget (DELETE /budgets/{category})
        if route_key == "DELETE /budgets/{category}":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            
            category = path_params.get("category")
            if not category:
                return _response(400, {"error": "Missing category"})
            
            user_budgets_table.delete_item(
                Key={"pk": f"USER#{user_sub}", "sk": f"BUDGET#{category}"}
            )
            
            return _response(200, {"message": "Budget deleted successfully"})

        return _response(404, {"error": "Not found", "routeKey": route_key})
    except Exception as e:
        print("handler error", e)
        return _response(500, {"error": "Internal error"})