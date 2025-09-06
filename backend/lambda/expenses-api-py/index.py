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


def handler(event, context):
    try:
        # Log environment variables for debugging
        print(f"Environment variables:")
        print(f"  EXPENSES_TABLE: {os.environ.get('EXPENSES_TABLE', 'NOT_SET')}")
        print(f"  CATEGORY_RULES_TABLE: {os.environ.get('CATEGORY_RULES_TABLE', 'NOT_SET')}")
        print(f"  USER_BUDGETS_TABLE: {os.environ.get('USER_BUDGETS_TABLE', 'NOT_SET')}")
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

        if route_key == "GET /categories":
            return _response(200, {"categories": ALLOWED_CATEGORIES})

        return _response(404, {"error": "Not found", "routeKey": route_key})
    except Exception as e:
        print("handler error", e)
        return _response(500, {"error": "Internal error"})