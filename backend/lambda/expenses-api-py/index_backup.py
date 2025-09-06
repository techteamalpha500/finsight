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

def _convert_floats_to_decimals(obj):
    """Convert float values to Decimal types for DynamoDB compatibility"""
    if isinstance(obj, dict):
        return {k: _convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_floats_to_decimals(item) for item in obj]
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj





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
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "User-Agent": "finsight-lambda/1.0 (+https://github.com/arunclementcristiano/finsight)"
            },
            method="POST",
        )
        try:
            with urlrequest.urlopen(req, timeout=10) as resp:
                content = resp.read().decode("utf-8")
                data = json.loads(content)
        except HTTPError as he:
            try:
                err_body = he.read().decode("utf-8")
            except Exception:
                err_body = ""
            print("GROQ_HTTP_ERROR", he.code, err_body[:500])
            # Cloudflare 1010 is often due to missing headers/UA; we added UA/Accept above
            return {"category": "", "confidence": 0.0}
        except URLError as ue:
            print("GROQ_URL_ERROR", str(ue))
            return {"category": "", "confidence": 0.0}
        txt = (
            (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
            if isinstance(data, dict)
            else ""
        )
        try:
            parsed = json.loads(txt)
            cat = parsed.get("category", "")
            conf = parsed.get("confidence", 0.7)
        except Exception:
            # Best-effort extraction
            mcat = re.search(r"category\W+([A-Za-z]+)", txt, re.I)
            mconf = re.search(r"confidence\W+(\d+(?:\.\d+)?)", txt, re.I)
            cat = (mcat.group(1) if mcat else "")
            conf = float(mconf.group(1)) if mconf else 0.7
            if conf > 1:
                conf = conf / 100.0
        return {"category": cat, "confidence": conf}
    except Exception as e:
        print("GROQ_ERROR", str(e))
        return {"category": "", "confidence": 0.0}


def _parse_amount(raw_text: str):
    m = re.search(r"(?:[₹$€£])?\s*(\d+(?:\.\d{1,2})?)", raw_text)
    return float(m.group(1)) if m else None


def _extract_term(raw_text: str) -> str:
    # Prefer a phrase following prepositions; normalize to last up-to-3 tokens to add context (e.g., "dog food" instead of "food")
    m = re.search(r"\b(?:on|for|at|to)\s+([A-Za-z][A-Za-z\s]{1,40})", raw_text, flags=re.IGNORECASE)
    if m:
        cand = m.group(1).strip()
        cand = re.split(r"\b(yesterday|today|tomorrow|\d{4}-\d{2}-\d{2})\b", cand, flags=re.IGNORECASE)[0].strip()
        cand = re.sub(r"[^A-Za-z\s]", "", cand).strip()
        cand = re.sub(r"\s+", " ", cand)
        if cand:
            words = cand.split(" ")
            if len(words) > 3:
                cand = " ".join(words[-3:])
            return cand.lower()
    tokens = re.findall(r"[A-Za-z]+", raw_text)
    if tokens:
        # last two tokens give more context than one
        if len(tokens) >= 2:
            return f"{tokens[-2].lower()} {tokens[-1].lower()}"
        return tokens[-1].lower()
    return ""

# CategoryMemory support removed


def handler(event, context):
    try:
        # Log environment variables for debugging
        print(f"Environment variables:")
        print(f"  MUTUAL_FUND_SCHEMES_TABLE: {os.environ.get('MUTUAL_FUND_SCHEMES_TABLE', 'NOT_SET')}")
        print(f"  HOLDINGS_TABLE: {os.environ.get('HOLDINGS_TABLE', 'NOT_SET')}")
        print(f"  AWS_REGION: {os.environ.get('AWS_REGION', 'NOT_SET')}")
        
        method = (event.get("requestContext", {}).get("http", {}) or {}).get("method") or event.get("httpMethod")
        path = event.get("rawPath") or event.get("resource") or ""
        route_key = event.get("requestContext", {}).get("routeKey") or f"{method} {path}"
        
        print(f"Request: {method} {path}")
        print(f"Route key: {route_key}")

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

        if route_key == "POST /add":
            user_id = body.get("userId")
            raw_text = body.get("rawText", "")
            if not user_id or not raw_text:
                return _response(400, {"error": "Missing userId or rawText"})
            amount = _parse_amount(raw_text)

            # Fixed categories (predefined rules)
            synonyms = {
                # Food
                "groceries": "Food", "grocery": "Food", "restaurant": "Food", "dining": "Food", 
                "lunch": "Food", "dinner": "Food", "pizza": "Food", "breakfast": "Food", 
                "snacks": "Food", "coffee": "Food", "swiggy": "Food", "zomato": "Food", 
                "ubereats": "Food",

                # Travel
                "travel": "Travel", "transport": "Travel", "taxi": "Travel", "uber": "Travel", 
                "ola": "Travel", "bus": "Travel", "train": "Travel", "flight": "Travel", 
                "airline": "Travel", "fuel": "Travel", "petrol": "Travel", "gas": "Travel",

                # Entertainment (experiences & gaming, NOT subscriptions)
                "entertainment": "Entertainment", "cinema": "Entertainment", "movie": "Entertainment", 
                "movies": "Entertainment", "theatre": "Entertainment", "outing": "Entertainment", 
                "playstation": "Entertainment", "xbox": "Entertainment", "gaming": "Entertainment",

                # Shopping
                "shopping": "Shopping", "amazon": "Shopping", "flipkart": "Shopping", "myntra": "Shopping", 
                "apparel": "Shopping", "clothing": "Shopping", "mall": "Shopping", "electronics": "Shopping", 
                "gadget": "Shopping", "laptop": "Shopping", "mobile": "Shopping",

                # Utilities
                "utilities": "Utilities", "electricity": "Utilities", "water": "Utilities", "internet": "Utilities", 
                "broadband": "Utilities", "jio": "Utilities", "airtel": "Utilities", "bsnl": "Utilities", 
                "bill": "Utilities", "phone": "Utilities", "gas bill": "Utilities",

                # Healthcare
                "health": "Healthcare", "healthcare": "Healthcare", "medicine": "Healthcare", 
                "hospital": "Healthcare", "doctor": "Healthcare", "pharmacy": "Healthcare", 
                "apollo": "Healthcare", "pharmeasy": "Healthcare", "practo": "Healthcare",

                # Subscription (recurring digital services)
                "netflix": "Subscription", "spotify": "Subscription", "prime": "Subscription", 
                "disney": "Subscription", "hotstar": "Subscription", "sunnxt": "Subscription", 
                "membership": "Subscription", "subscription": "Subscription", "zee5": "Subscription",
                "apple music": "Subscription", "youtube premium": "Subscription",
            }

            lower = raw_text.lower()
            extracted_term = _extract_term(raw_text)

            # 1) Rule-based (predefined)
            matched_key = next((k for k in synonyms.keys() if k in lower), None)
            matched = synonyms.get(matched_key) if matched_key else None
            final_category = matched if matched else ""
            ai_conf = None

            # If matched by predefined, also upsert into CategoryRules for future
            if final_category:
                try:
                    if extracted_term:
                        # Conditional put to avoid duplicates
                        category_rules_table.put_item(
                            Item={"rule": extracted_term, "category": final_category},
                            ConditionExpression="attribute_not_exists(#r)",
                            ExpressionAttributeNames={"#r": "rule"}
                        )
                except Exception:
                    pass

            # 2) CategoryRules table (global rules configured by you). If matched, return directly without acknowledgment
            if not final_category and extracted_term:
                try:
                    r = category_rules_table.get_item(Key={"rule": extracted_term})
                    rule_cat = (r.get("Item", {}) or {}).get("category")
                    if rule_cat:
                        final_category = rule_cat
                except Exception:
                    pass
                # Fuzzy contains for reversed word order (e.g., "150 laptop repair")
                if not final_category:
                    try:
                        w = extracted_term.split()
                        if len(w) >= 2:
                            scan = category_rules_table.scan(ProjectionExpression="#r, category", ExpressionAttributeNames={"#r": "rule"})
                            items = scan.get("Items", [])
                            for it in items:
                                r = str(it.get("rule", "")).lower()
                                if w[0].lower() in r and w[1].lower() in r:
                                    final_category = it.get("category")
                                    break
                    except Exception:
                        pass

            # 3) Skip CategoryMemory per new requirement (global rules only)

            # 4) Groq fallback
            if not final_category:
                print("GROQ_CALL_START")
                ai = _get_category_from_ai(raw_text)
                print("GROQ_CALL_END", ai)
                ai_cat_raw = (ai.get("category") or "").strip()
                ai_cat = ai_cat_raw.lower()
                ai_conf = ai.get("confidence")
                # Normalize to one of the allowed categories, else "Other"
                matched_allowed = next((c for c in ALLOWED_CATEGORIES if c.lower() == ai_cat), None)
                mapped_ai = matched_allowed or "Other"

                # Always provide acknowledgment when Groq was used
                msg = (
                    f"Could not parse amount; AI suggestion {mapped_ai}. Pick a category."
                    if amount is None
                    else f"Parsed amount {amount}; AI suggestion {mapped_ai}. Pick a category."
                )
                # Optionally include AI's raw suggestion first
                opts = list(dict.fromkeys([ai_cat_raw] + ALLOWED_CATEGORIES))
                return _response(200, {"amount": amount, "category": mapped_ai, "AIConfidence": ai_conf, "options": opts, "message": msg})

            msg = (
                f"Parsed amount {amount} and category {final_category}" if amount is not None
                else f"Could not parse amount; suggested category {final_category}"
            )
            resp = {"amount": amount, "category": final_category, "message": msg}
            if ai_conf is not None:
                resp["AIConfidence"] = ai_conf
            return _response(200, resp)

        if route_key == "GET /budgets":
            user_id = qs.get("userId") or body.get("userId")
            if not user_id:
                return _response(400, {"error": "Missing userId"})
            try:
                res = user_budgets_table.get_item(Key={"userId": user_id})
                budgets = (res.get("Item", {}) or {}).get("budgets", {})
                # Normalize Decimals -> float via _to_json in _response
                return _response(200, {"budgets": budgets})
            except Exception as e:
                print("BUDGETS_GET_ERROR", str(e))
                return _response(200, {"budgets": {}})

        if route_key == "PUT /budgets":
            user_id = body.get("userId")
            budgets = body.get("budgets") or {}
            if not user_id or not isinstance(budgets, dict):
                return _response(400, {"error": "Missing userId or budgets"})
            try:
                # Convert to Decimal for DynamoDB
                put_budgets = {k: Decimal(str(v)) for k, v in budgets.items()}
                user_budgets_table.put_item(Item={
                    "userId": user_id,
                    "budgets": put_budgets,
                    "updatedAt": datetime.utcnow().isoformat(),
                })
                return _response(200, {"ok": True})
            except Exception as e:
                print("BUDGETS_PUT_ERROR", str(e))
                return _response(500, {"error": "Failed to save budgets"})

        if route_key == "PUT /add":
            user_id = body.get("userId")
            amount = body.get("amount")
            category = body.get("category")
            raw_text = body.get("rawText")
            date = body.get("date") or datetime.utcnow().strftime("%Y-%m-%d")
            if not user_id or raw_text is None or category is None or amount is None:
                return _response(400, {"error": "Missing fields"})
            expense_id = str(uuid.uuid4())
            expenses_table.put_item(
                Item={
                    "expenseId": expense_id,
                    "userId": user_id,
                    "amount": Decimal(str(amount)),
                    "category": category,
                    "rawText": raw_text,
                    "date": date,
                    "createdAt": datetime.utcnow().isoformat(),
                }
            )
            # Persist rule->category mapping for future global use
            try:
                if category != "Uncategorized":
                    term = _extract_term(raw_text)
                    if term:
                        category_rules_table.put_item(
                            Item={"rule": term, "category": category},
                            ConditionExpression="attribute_not_exists(#r)",
                            ExpressionAttributeNames={"#r": "rule"}
                        )
            except Exception:
                pass
            return _response(200, {"ok": True, "expenseId": expense_id})

        if route_key == "POST /list":
            user_id = body.get("userId")
            start = body.get("start")
            end = body.get("end")
            category = body.get("category")
            if not user_id:
                return _response(400, {"error": "Missing userId"})
            items = expenses_table.scan().get("Items", [])
            items = [x for x in items if x.get("userId") == user_id]
            def _ok_date(it):
                if not start and not end:
                    return True
                d = datetime.strptime(it.get("date"), "%Y-%m-%d")
                if start and d < datetime.strptime(start, "%Y-%m-%d"):
                    return False
                if end and d > datetime.strptime(end, "%Y-%m-%d"):
                    return False
                return True
            items = [x for x in items if (category is None or x.get("category") == category) and _ok_date(x)]
            return _response(200, {"items": items})

        if route_key == "POST /edit":
            expense_id = body.get("expenseId")
            updates = body.get("updates") or {}
            if not expense_id or not updates:
                return _response(400, {"error": "Missing expenseId or updates"})
            exprs = []
            vals = {}
            if "amount" in updates and updates["amount"] is not None:
                exprs.append("amount = :a")
                vals[":a"] = Decimal(str(updates["amount"]))
            if "category" in updates and updates["category"] is not None:
                exprs.append("category = :c")
                vals[":c"] = updates["category"]
            if "rawText" in updates and updates["rawText"] is not None:
                exprs.append("rawText = :r")
                vals[":r"] = updates["rawText"]
            if not exprs:
                return _response(400, {"error": "No valid updates"})
            expenses_table.update_item(
                Key={"expenseId": expense_id},
                UpdateExpression="SET " + ", ".join(exprs),
                ExpressionAttributeValues=vals,
            )
            return _response(200, {"ok": True})

        if route_key == "POST /delete":
            expense_id = body.get("expenseId")
            if not expense_id:
                return _response(400, {"error": "Missing expenseId"})
            expenses_table.delete_item(Key={"expenseId": expense_id})
            return _response(200, {"ok": True})

        if route_key == "POST /summary/monthly":
            user_id = body.get("userId")
            month = body.get("month")
            if not user_id:
                return _response(400, {"error": "Missing userId"})
            if not month:
                now = datetime.utcnow()
                month = f"{now.year}-{str(now.month).zfill(2)}"
            items = expenses_table.scan().get("Items", [])
            items = [x for x in items if x.get("userId") == user_id and str(x.get("date", "")).startswith(month)]
            totals = {}
            for it in items:
                cat = it.get("category", "Other")
                totals[cat] = float(totals.get(cat, 0)) + float(it.get("amount", 0))
            return _response(200, {"month": month, "totals": totals})

        if route_key == "POST /summary/category":
            user_id = body.get("userId")
            category = body.get("category")
            if not user_id or not category:
                return _response(400, {"error": "Missing userId or category"})
            items = expenses_table.scan().get("Items", [])
            items = [x for x in items if x.get("userId") == user_id and x.get("category") == category]
            total = sum(float(x.get("amount", 0)) for x in items)
            return _response(200, {"items": items, "total": total})

        # ----------------------- PORTFOLIO APIs (JWT-protected via API Gateway) -----------------------
        def _user_from_jwt(evt):
            try:
                claims = (((evt.get("requestContext") or {}).get("authorizer") or {}).get("jwt") or {}).get("claims") or {}
                sub = claims.get("sub")
                return sub
            except Exception:
                return None

        # Create portfolio (POST /portfolio) — body: { name }
        if route_key == "POST /portfolio":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            name = (body.get("name") or "").strip()
            if not name:
                return _response(400, {"error": "Missing name"})
            portfolio_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            invest_table.put_item(Item={
                "pk": f"USER#{user_sub}",
                "sk": f"PORTFOLIO#{portfolio_id}",
                "entityType": "PORTFOLIO",
                "name": name,
                "createdAt": now,
                "updatedAt": now,
                "GSI1PK": f"PORTFOLIO#{portfolio_id}",
                "GSI1SK": now,
            })
            return _response(200, {"portfolioId": portfolio_id, "name": name})

        # Read portfolios (GET /portfolio) — list user's portfolios
        if route_key == "GET /portfolio":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            res = invest_table.query(
                KeyConditionExpression=Key("pk").eq(f"USER#{user_sub}") & Key("sk").begins_with("PORTFOLIO#")
            )
            items = res.get("Items", [])
            portfolios = [{"portfolioId": it["sk"].split("#",1)[1], "name": it.get("name"), "createdAt": it.get("createdAt") } for it in items]
            return _response(200, {"items": portfolios})

        # Save allocation plan (PUT /portfolio/plan) — body: { portfolioId, plan }
        if route_key == "PUT /portfolio/plan":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            portfolio_id = body.get("portfolioId")
            plan = body.get("plan")
            if not portfolio_id or not plan:
                return _response(400, {"error": "Missing portfolioId or plan"})
            now = datetime.utcnow().isoformat()
            invest_table.put_item(Item={
                "pk": f"USER#{user_sub}",
                "sk": f"ALLOCATION#{portfolio_id}",
                "entityType": "ALLOCATION",
                "plan": plan,
                "updatedAt": now,
                "GSI1PK": f"PORTFOLIO#{portfolio_id}",
                "GSI1SK": f"ALLOCATION#{now}",
            })
            return _response(200, {"ok": True})

        # Fetch allocation plan (GET /portfolio/plan?portfolioId=...)
        if route_key == "GET /portfolio/plan":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            portfolio_id = (qs or {}).get("portfolioId")
            if not portfolio_id:
                return _response(400, {"error": "Missing portfolioId"})
            res = invest_table.get_item(Key={"pk": f"USER#{user_sub}", "sk": f"ALLOCATION#{portfolio_id}"})
            item = res.get("Item") or {}
            return _response(200, {"plan": item.get("plan")})

        # Create holding (POST /holdings) — body: { portfolioId, holding }
        if route_key == "POST /holdings":
            # Temporarily allow without authentication for development
            user_sub = _user_from_jwt(event) or "dev_user_123"
            portfolio_id = body.get("portfolioId")
            holding = body.get("holding") or {}
            if not portfolio_id or not isinstance(holding, dict):
                return _response(400, {"error": "Missing portfolioId or holding"})
            
            try:
                print(f"Using holdings table: {HOLDINGS_TABLE}")
                holding_id = holding.get("id") or str(uuid.uuid4())
                now = datetime.utcnow().isoformat()
                
                # Convert float values to Decimal types for DynamoDB compatibility
                print(f"Original holding data: {holding}")
                converted_holding = _convert_floats_to_decimals(holding)
                print(f"Converted holding data: {converted_holding}")
                
                # Extract asset class and determine portfolio role
                instrument_class = converted_holding.get("instrumentClass", "Stocks")
                asset_class = converted_holding.get("allocation_class", instrument_class)
                portfolio_role = _get_portfolio_role_for_asset_class(asset_class)
                
                print(f"Asset Class: {asset_class}, Portfolio Role: {portfolio_role}")
                
                item = {
                    "id": holding_id,
                    "user_id": user_sub,
                    "portfolio_id": portfolio_id,
                    "data": converted_holding,
                    "asset_class": asset_class,
                    "portfolio_role": portfolio_role,
                    "created_at": now,
                    "updated_at": now
                }
                
                print(f"Attempting to save holding: {item}")
                holdings_table.put_item(Item=item)
                print(f"Successfully saved holding with ID: {holding_id}")
                return _response(200, {"holdingId": holding_id})
            except Exception as e:
                print(f"Error creating holding: {e}")
                print(f"Error type: {type(e)}")
                print(f"Error details: {str(e)}")
                print(f"Traceback: {traceback.format_exc()}")
                return _response(500, {"error": f"Failed to create holding: {str(e)}"})

        # List holdings (GET /holdings?portfolioId=...)
        if route_key == "GET /holdings":
            # Temporarily allow without authentication for development
            user_sub = _user_from_jwt(event) or "dev_user_123"
            portfolio_id = (qs or {}).get("portfolioId")
            if not portfolio_id:
                return _response(400, {"error": "Missing portfolioId"})
            
            try:
                print(f"Fetching holdings from table: {HOLDINGS_TABLE}")
                print(f"User ID: {user_sub}")
                print(f"Portfolio ID: {portfolio_id}")
                
                print(f"Using global holdings table: {holdings_table}")
                
                # Query the holdings table
                res = holdings_table.query(
                    IndexName="userId-createdAt-index",
                    KeyConditionExpression=Key("user_id").eq(user_sub)
                )
                print(f"Query result: {res}")
                
                items = res.get("Items", [])
                print(f"Found {len(items)} holding items")
                
                holdings = []
                for it in items:
                    holding_data = it.get("data") or {}
                    # Include asset class and portfolio role from the main item
                    holding_data["asset_class"] = it.get("asset_class", holding_data.get("instrumentClass", "Stocks"))
                    holding_data["portfolio_role"] = it.get("portfolio_role", "Equity")
                    holdings.append({"id": it.get("id"), **holding_data})
                
                print(f"Returning {len(holdings)} holdings")
                return _response(200, {"items": holdings})
            except Exception as e:
                print(f"Error fetching holdings: {e}")
                print(f"Error type: {type(e)}")
                print(f"Traceback: {traceback.format_exc()}")
                return _response(500, {"error": f"Failed to fetch holdings: {str(e)}"})

        # Delete holding (DELETE /holdings/{id})
        if route_key == "DELETE /holdings/{id}":
            try:
                holding_id = path_params.get("id")
                if not holding_id:
                    return _response(400, {"error": "Missing holding ID"})
                
                # Parse request body for portfolio ID
                body = json.loads(event.get("body", "{}"))
                portfolio_id = body.get("portfolioId")
                if not portfolio_id:
                    return _response(400, {"error": "Missing portfolioId"})
                
                # Delete the holding from DynamoDB
                holdings_table.delete_item(
                    Key={
                        "user_id": "dev_user_123",  # Use same user ID as GET endpoint
                        "id": holding_id
                    }
                )
                
                return _response(200, {"message": "Holding deleted successfully"})
            except Exception as e:
                print(f"Error deleting holding: {e}")
                return _response(500, {"error": "Failed to delete holding"})

        # Create transaction (POST /transactions) — body: { portfolioId, txn }
        if route_key == "POST /transactions":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            portfolio_id = body.get("portfolioId")
            txn = body.get("txn") or {}
            if not portfolio_id or not isinstance(txn, dict):
                return _response(400, {"error": "Missing portfolioId or txn"})
            txn_id = txn.get("id") or str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            date = txn.get("date") or now[:10]
            item = {
                "pk": f"USER#{user_sub}",
                "sk": f"TRANSACTION#{portfolio_id}#{date}#{txn_id}",
                "entityType": "TRANSACTION",
                "portfolioId": portfolio_id,
                "transactionId": txn_id,
                "data": txn,
                "createdAt": now,
                "GSI1PK": f"PORTFOLIO#{portfolio_id}",
                "GSI1SK": f"TRANSACTION#{date}#{txn_id}",
            }
            invest_table.put_item(Item=item)
            return _response(200, {"transactionId": txn_id})

        # List transactions (GET /transactions?portfolioId=...&start=YYYY-MM-DD&end=YYYY-MM-DD)
        if route_key == "GET /transactions":
            user_sub = _user_from_jwt(event)
            if not user_sub:
                return _response(401, {"error": "Unauthorized"})
            portfolio_id = (qs or {}).get("portfolioId")
            start = (qs or {}).get("start")
            end = (qs or {}).get("end")
            if not portfolio_id:
                return _response(400, {"error": "Missing portfolioId"})
            # Query by PK and filter SK prefix for TRANSACTION#PORTFOLIOID#
            res = invest_table.query(
                KeyConditionExpression=Key("pk").eq(f"USER#{user_sub}") & Key("sk").begins_with(f"TRANSACTION#{portfolio_id}#")
            )
            items = res.get("Items", [])
            def in_range(sk: str) -> bool:
                try:
                    parts = sk.split("#")
                    date_str = parts[2]
                    if start and date_str < start:
                        return False
                    if end and date_str > end:
                        return False
                    return True
                except Exception:
                    return True
            txns = [{"id": it.get("transactionId"), **(it.get("data") or {})} for it in items if in_range(it.get("sk",""))]
            return _response(200, {"items": txns})

        # Get mutual fund schemes (GET /mutual-funds)
        if route_key == "GET /mutual-funds":
            try:
                print(f"Fetching mutual funds from table: {MUTUAL_FUND_SCHEMES_TABLE}")
                
                print(f"Using global mutual fund schemes table: {mutual_fund_schemes_table}")
                
                res = mutual_fund_schemes_table.scan()
                print(f"Scan result: {res}")
                
                items = res.get("Items", [])
                print(f"Found {len(items)} mutual fund items")
                
                # Transform to match frontend expectations
                funds = []
                for item in items:
                    # NAV safe conversion
                    nav_val = item.get("nav")
                    try:
                        current_nav = float(nav_val) if nav_val is not None else 0.0
                    except Exception:
                        current_nav = 0.0

                    fund = {
                        "schemeCode": item.get("scheme_code", ""),
                        "name": item.get("fund_name", ""),
                        "fullName": item.get("fund_name", ""),
                        "currentNAV": current_nav,
                        "fundType": item.get("asset_class", "Equity MF"),      # Equity / Debt Fund / Liquid Fund / Gold / Real Estate
                        "portfolioRole": item.get("portfolio_role", "Equity"), # Equity / Defensive / Satellite
                        "isETF": item.get("is_etf") == "true",
                        "amc": item.get("amc", ""),
                        "schemeType": item.get("scheme_type", ""),
                        "schemeSubtype": item.get("scheme_subtype", ""),
                        "option": item.get("option", ""),
                        "plan": item.get("plan", ""),
                        "date": item.get("date", "")
                    }
                    funds.append(fund)
                
                # Sort by name for better UX
                funds.sort(key=lambda x: x["name"])
                print(f"Returning {len(funds)} transformed funds")
                return _response(200, {"items": funds})
            except Exception as e:
                print(f"Error fetching mutual funds: {e}")
                print(f"Error type: {type(e)}")
                print(f"Traceback: {traceback.format_exc()}")
                return _response(500, {"error": f"Failed to fetch mutual funds: {str(e)}"})


        # Search mutual funds (GET /mutual-funds/search?q=...&is_etf=...)
        if route_key == "GET /mutual-funds/search":
            try:
                q = (qs or {}).get("q", "").lower()
                is_etf = (qs or {}).get("is_etf")
                
                print(f"Searching mutual funds in table: {MUTUAL_FUND_SCHEMES_TABLE}")
                print(f"Search query: {q}")
                print(f"ETF filter: {is_etf}")
                
                # Scan the mutual fund schemes table
                res = mutual_fund_schemes_table.scan()
                items = res.get("Items", [])
                print(f"Found {len(items)} total mutual fund items")
                
                # Filter by search term and ETF status
                filtered_funds = []
                for item in items:
                    # Check ETF status if specified
                    if is_etf is not None:
                        item_is_etf = item.get("is_etf") == "true"
                        if str(item_is_etf).lower() != str(is_etf).lower():
                            continue
                    
                    # Check search term
                    if q:
                        fund_name = item.get("fund_name", "").lower()
                        scheme_name = item.get("scheme_name", "").lower()
                        if q not in fund_name and q not in scheme_name:
                            continue
                    
                    fund = {
                        "schemeCode": item.get("scheme_code", ""),
                        "name": item.get("fund_name", ""),
                        "fullName": item.get("fund_name", ""),
                        "currentNAV": float(item.get("nav", 0)),
                        "fundType": item.get("asset_class", "Equity MF"),
                        "allocationClass": item.get("portfolio_role", "Equity"),
                        "isETF": item.get("is_etf") == "true",
                        "amc": item.get("amc", ""),
                        "schemeType": item.get("scheme_type", ""),
                        "schemeSubtype": item.get("scheme_subtype", ""),
                        "option": item.get("option", ""),
                        "plan": item.get("plan", ""),
                        "date": item.get("date", "")
                    }
                    filtered_funds.append(fund)
                
                # Sort by name and limit results
                filtered_funds.sort(key=lambda x: x["name"])
                print(f"Returning {len(filtered_funds)} filtered funds")
                return _response(200, {"items": filtered_funds[:10]})
            except Exception as e:
                print(f"Error searching mutual funds: {e}")
                print(f"Error type: {type(e)}")
                print(f"Traceback: {traceback.format_exc()}")
                return _response(500, {"error": f"Failed to search mutual funds: {str(e)}"})

        return _response(404, {"error": "Not found", "routeKey": route_key})
    except Exception as e:
        print("handler error", e)
        return _response(500, {"error": "Internal error"})