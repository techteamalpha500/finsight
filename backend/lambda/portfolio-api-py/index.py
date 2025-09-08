import json
import os
import uuid
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

AWS_REGION = os.environ.get("AWS_REGION") or os.environ.get("REGION") or "us-east-1"
INVEST_TABLE = os.environ.get("INVEST_TABLE", "InvestApp")
MUTUAL_FUND_SCHEMES_TABLE = os.environ.get("MUTUAL_FUND_SCHEMES_TABLE", "MutualFundSchemes")
HOLDINGS_TABLE = os.environ.get("HOLDINGS_TABLE", "holdings")
ASSET_CLASS_MAPPING_TABLE = os.environ.get("ASSET_CLASS_MAPPING_TABLE", "AssetClassMapping")
STOCK_COMPANIES_TABLE = os.environ.get("STOCK_COMPANIES_TABLE", "StockCompanies")
REPAYMENTS_TABLE = os.environ.get("REPAYMENTS_TABLE", "Repayments")
REPAYMENT_HISTORY_TABLE = os.environ.get("REPAYMENT_HISTORY_TABLE", "RepaymentHistory")

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
invest_table = dynamodb.Table(INVEST_TABLE)
mutual_fund_schemes_table = dynamodb.Table(MUTUAL_FUND_SCHEMES_TABLE)
holdings_table = dynamodb.Table(HOLDINGS_TABLE)
asset_class_mapping_table = dynamodb.Table(ASSET_CLASS_MAPPING_TABLE)
stock_companies_table = dynamodb.Table(STOCK_COMPANIES_TABLE)
repayments_table = dynamodb.Table(REPAYMENTS_TABLE)
repayment_history_table = dynamodb.Table(REPAYMENT_HISTORY_TABLE)


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


def _get_company_name_by_isin(isin):
    """Get standardized company name from StockCompanies table by ISIN"""
    try:
        if not isin:
            return None
            
        response = stock_companies_table.scan(
            FilterExpression='isin = :isin',
            ExpressionAttributeValues={':isin': isin}
        )
        
        items = response.get('Items', [])
        if items:
            # Return the first match (should be unique by ISIN)
            return items[0].get('name', items[0].get('company_name', ''))
        
        return None
    except Exception as e:
        print(f"Error looking up company name for ISIN {isin}: {e}")
        return None

def _is_symbol_company_match(symbol, company_name):
    """Check if a symbol matches a company name (e.g., TATAMOTORS -> Tata Motors Limited)"""
    try:
        symbol = symbol.lower().strip()
        company_name = company_name.lower().strip()
        
        # Remove common suffixes and prefixes
        symbol_clean = symbol.replace('ltd', '').replace('limited', '').replace('inc', '').replace('corp', '').strip()
        company_clean = company_name.replace('ltd', '').replace('limited', '').replace('inc', '').replace('corp', '').strip()
        
        # Split into words
        symbol_words = set(symbol_clean.split())
        company_words = set(company_clean.split())
        
        # Check if there's significant word overlap
        common_words = symbol_words.intersection(company_words)
        
        # If symbol has 2+ words and shares 1+ words with company, it's likely a match
        if len(symbol_words) >= 2 and len(common_words) >= 1:
            return True
        
        # Check for partial matches (e.g., TATAMOTORS contains "tata" and "motor")
        if len(symbol_words) == 1:  # Single word symbol like TATAMOTORS
            symbol_word = list(symbol_words)[0]
            for company_word in company_words:
                if len(company_word) >= 4 and company_word in symbol_word:
                    return True
                if len(symbol_word) >= 4 and symbol_word in company_word:
                    return True
        
        return False
        
    except Exception as e:
        print(f"Error in symbol-company matching: {e}")
        return False

def _is_broker_compatible(existing_broker, import_broker):
    """Check if brokers are compatible for finding existing holdings"""
    if not import_broker:
        return True
    
    # Only find holdings with same broker or manual entries
    if existing_broker == 'manual' or existing_broker.lower() == import_broker.lower():
        return True
    
    return False

def _find_existing_holding(user_id, stock, import_broker=None):
    """Find existing holding using broker + ISIN + symbol matching"""
    try:
        print(f"🔍 _find_existing_holding called for: {stock.get('name', 'Unknown')} (ISIN: {stock.get('isin', 'None')}, Symbol: {stock.get('symbol', 'None')}, Broker: {import_broker})")
        
        # Get all holdings for this user
        scan_response = holdings_table.scan(
            FilterExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': user_id}
        )
        
        all_holdings = scan_response.get('Items', [])
        print(f"🔍 Found {len(all_holdings)} total holdings for user")
        
        # Look for matching holdings
        for holding in all_holdings:
            holding_data = holding.get('data', {})
            existing_broker = holding_data.get('broker', 'manual')
            existing_isin = holding_data.get('isin', '')
            existing_symbol = holding_data.get('symbol', '')
            
            print(f"🔍 Checking holding: {holding_data.get('name', 'Unknown')} (broker: {existing_broker}, isin: {existing_isin}, symbol: {existing_symbol})")
            
            # Match by broker + ISIN + symbol (normalize case)
            broker_match = existing_broker.lower() == import_broker.lower() if import_broker else True
            isin_match = stock.get('isin') and existing_isin and stock['isin'] == existing_isin
            symbol_match = stock.get('symbol') and existing_symbol and stock['symbol'].upper() == existing_symbol.upper()
            
            if broker_match and (isin_match or symbol_match):
                print(f"✅ Match found: {holding_data.get('name', 'Unknown')} (Broker: {existing_broker}, ISIN: {isin_match}, Symbol: {symbol_match})")
                return holding
        
        print(f"❌ No existing holding found for {stock.get('name', 'Unknown')}")
        return None
        
    except Exception as e:
        print(f"Error in _find_existing_holding: {e}")
        return None

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

def _store_holding_unified(user_id, holding_data, source="ui"):
    """Unified function to store holdings data consistently from UI or import"""
    try:
        holding_id = holding_data.get('id', str(uuid.uuid4()))
        now = datetime.utcnow().isoformat()
        
        # Handle broker correctly - use the broker from the form data
        broker = holding_data.get('broker', 'manual')
        
        # Try to get ISIN if not provided
        isin = holding_data.get('isin', '')
        if not isin and holding_data.get('symbol'):
            # Try to find ISIN by symbol
            try:
                response = stock_companies_table.scan(
                    FilterExpression='symbol = :symbol',
                    ExpressionAttributeValues={':symbol': holding_data['symbol']}
                )
                items = response.get('Items', [])
                if items:
                    isin = items[0].get('isinNumber', items[0].get('isin', ''))
                    print(f"🔍 Found ISIN {isin} for symbol {holding_data['symbol']}")
            except Exception as e:
                print(f"Could not find ISIN for symbol {holding_data.get('symbol')}: {e}")
        
        # Create standardized holding structure
        holding_item = {
            'id': holding_id,
            'user_id': user_id,
            'portfolio_id': user_id,  # Using user_id as portfolio_id for consistency
            'symbol': holding_data.get('symbol', ''),
            'data': _convert_floats_to_decimals({
                'id': holding_id,
                'instrumentClass': holding_data.get('instrumentClass', 'Stocks'),
                'name': holding_data.get('name', ''),
                'symbol': holding_data.get('symbol', ''),
                'isin': isin,
                'sector': holding_data.get('sector', ''),
                'units': holding_data.get('units', 0),
                'price': holding_data.get('price', 0),  # Average price
                'currentPrice': holding_data.get('currentPrice', holding_data.get('price', 0)),  # Current market price
                'investedAmount': holding_data.get('investedAmount', 0),
                'currentValue': holding_data.get('currentValue', 0),
                'asset_class': holding_data.get('asset_class', 'Stocks'),
                'portfolio_role': holding_data.get('portfolio_role', 'Equity'),
                'broker': broker,
                'source': source,
                'created_at': holding_data.get('created_at', now),
                'updated_at': now
            }),
            'asset_class': holding_data.get('asset_class', 'Stocks'),
            'portfolio_role': holding_data.get('portfolio_role', 'Equity'),
            'created_at': holding_data.get('created_at', now),
            'updated_at': now
        }
        
        holdings_table.put_item(Item=holding_item)
        print(f"✅ Stored holding: {holding_data.get('name', 'Unknown')} (Broker: {broker}, ISIN: {isin}, Source: {source})")
        return holding_item
        
    except Exception as e:
        print(f"❌ Error storing holding: {e}")
        raise e

def _get_asset_class_mapping():
    """Get asset class to portfolio role mapping from DynamoDB"""
    try:
        default_mapping = {
            "Stocks": "Equity",
            "Equity MF": "Equity", 
            "Liquid Funds": "Defensive",
            "Debt Funds": "Defensive",
            "Bonds": "Defensive",
            "FD": "Defensive",
            "Gold": "Satellite",
            "Real Estate": "Satellite"
        }
        
        # Try to get from DynamoDB table
        response = asset_class_mapping_table.scan()
        items = response.get("Items", [])
        
        # Update default mapping with any custom mappings from DB
        for item in items:
            asset_class = item.get("asset_class")
            portfolio_role = item.get("portfolio_role")
            if asset_class and portfolio_role:
                default_mapping[asset_class] = portfolio_role
        
        return default_mapping
    except Exception as e:
        print(f"Error getting asset class mapping: {e}")
        # Return default mapping if DB lookup fails
        return {
            "Stocks": "Equity",
            "Equity MF": "Equity", 
            "Liquid Funds": "Defensive",
            "Debt Funds": "Defensive",
            "Bonds": "Defensive",
            "FD": "Defensive",
            "Gold": "Satellite",
            "Real Estate": "Satellite"
        }


def _get_portfolio_role_for_asset_class(asset_class):
    """Get portfolio role for a given asset class"""
    mapping = _get_asset_class_mapping()
    return mapping.get(asset_class, "Equity")  # Default to Equity if not found


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

        # ----------------------- PORTFOLIO APIs (JWT-protected via API Gateway) -----------------------

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
                # Use the user_id from the holding data if available, otherwise use the JWT user
                user_id = holding.get("user_id", user_sub)
                
                # Check if existing holding exists for UI entry (should merge, not override)
                existing_holding = _find_existing_holding(user_id, holding, holding.get('broker'))
                
                if existing_holding:
                    # MERGE UI entry with existing holding
                    existing_data = existing_holding.get('data', {})
                    
                    # Calculate new values (merge, not override)
                    current_units = float(existing_data.get('units', 0))
                    current_invested = float(existing_data.get('investedAmount', 0))
                    current_value = float(existing_data.get('currentValue', 0))
                    
                    new_units = current_units + float(holding.get('units', 0))
                    new_invested = current_invested + float(holding.get('investedAmount', 0))
                    new_current = current_value + float(holding.get('currentValue', 0))
                    
                    print(f"🔢 MERGING UI entry with existing holding for {holding.get('name', 'Unknown')}:")
                    print(f"   Existing: {current_units} units, ₹{current_invested} invested, ₹{current_value} value")
                    print(f"   UI Entry: {holding.get('units', 0)} units, ₹{holding.get('investedAmount', 0)} invested, ₹{holding.get('currentValue', 0)} value")
                    print(f"   Result: {new_units} units, ₹{new_invested} invested, ₹{new_current} value")
                    
                    # Update existing holding
                    now = datetime.utcnow().isoformat()
                    holdings_table.update_item(
                        Key={'id': existing_holding['id']},
                        UpdateExpression="SET #data.units = :units, #data.investedAmount = :invested, #data.currentValue = :current, #data.updated_at = :updated_at, updated_at = :updated_at",
                        ExpressionAttributeNames={'#data': 'data'},
                        ExpressionAttributeValues={
                            ':units': Decimal(str(new_units)),
                            ':invested': Decimal(str(new_invested)),
                            ':current': Decimal(str(new_current)),
                            ':updated_at': now
                        }
                    )
                    
                    return _response(200, {
                       "holdingId": existing_holding["id"], 
                       "action": "merged",
                       "breakdown": {
                           "operation": "Merged with existing",
                           "holding_name": holding.get('name', 'Unknown'),
                           "broker": holding.get('broker', 'Unknown'),
                           "previous_units": current_units,
                           "previous_invested": current_invested,
                           "previous_value": current_value,
                           "added_units": float(holding.get('units', 0)),
                           "added_invested": float(holding.get('investedAmount', 0)),
                           "added_value": float(holding.get('currentValue', 0)),
                           "new_units": new_units,
                           "new_invested": new_invested,
                           "new_value": new_current,
                           "timestamp": now
                       }
                   })
                else:
                    # Create new holding using unified function
                    stored_holding = _store_holding_unified(user_id, holding, source="ui")
                    return _response(200, {
                        "holdingId": stored_holding["id"], 
                        "action": "created",
                        "breakdown": {
                            "operation": "New UI Entry Created",
                            "holding_name": holding.get('name', 'Unknown'),
                            "broker": holding.get('broker', 'Unknown'),
                            "units": float(holding.get('units', 0)),
                            "invested_amount": float(holding.get('investedAmount', 0)),
                            "current_value": float(holding.get('currentValue', 0)),
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    })
                    
            except Exception as e:
                return _response(500, {"error": f"Failed to create holding: {str(e)}"})

        # List holdings (GET /holdings?portfolioId=...)
        if route_key == "GET /holdings":
            # Temporarily allow without authentication for development
            user_sub = _user_from_jwt(event) or "dev_user_123"
            portfolio_id = (qs or {}).get("portfolioId")
            if not portfolio_id:
                return _response(400, {"error": "Missing portfolioId"})
            
            try:
                # Query the holdings table - use the user_id from the portfolio_id for now
                # In production, this should come from JWT authentication
                user_id = portfolio_id  # Since portfolio_id is being used as user_id in frontend
                
                # Use scan with filter to ensure we get all fields
                # The GSI might not be returning all the main item fields
                res = holdings_table.scan(
                    FilterExpression=Key("user_id").eq(user_id)
                )
                
                items = res.get("Items", [])
                
                holdings = []
                for it in items:
                    holding_data = it.get("data") or {}
                    
                    # Include asset class and portfolio role from the main item
                    holding_data["asset_class"] = it.get("asset_class", holding_data.get("instrumentClass", "Stocks"))
                    holding_data["portfolio_role"] = it.get("portfolio_role", "Equity")
                    
                    holdings.append({"id": it.get("id"), **holding_data})
                
                return _response(200, {"items": holdings})
            except Exception as e:
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
                        "id": holding_id
                    }
                )
                
                return _response(200, {"message": "Holding deleted successfully"})
            except Exception as e:
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
                res = mutual_fund_schemes_table.scan()
                items = res.get("Items", [])
                
                # Transform to match frontend expectations
                funds = []
                for item in items:
                    fund = {
                        "schemeCode": item.get("scheme_code", ""),
                        "name": item.get("fund_name", ""),
                        "fullName": item.get("fund_name", ""),
                        "currentNAV": float(item.get("nav", 0)),
                        "asset_class": item.get("asset_class", "Equity MF"),
                        "portfolioRole": item.get("portfolio_role", "Equity"),
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
                return _response(200, {"items": funds})
            except Exception as e:
                return _response(500, {"error": f"Failed to fetch mutual funds: {str(e)}"})

        # Search mutual funds (GET /mutual-funds/search?q=...&is_etf=...)
        if route_key == "GET /mutual-funds/search":
            try:
                q = (qs or {}).get("q", "").lower()
                is_etf = (qs or {}).get("is_etf")
                
                # Scan the mutual fund schemes table
                res = mutual_fund_schemes_table.scan()
                items = res.get("Items", [])
                
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
                        "asset_class": item.get("asset_class", "Equity MF"),
                        "portfolioRole": item.get("portfolio_role", "Equity"),
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
                return _response(200, {"items": filtered_funds[:10]})
            except Exception as e:
                return _response(500, {"error": f"Failed to search mutual funds: {str(e)}"})

        # Get stock companies (GET /stocks)
        if route_key == "GET /stocks":
            try:
                res = stock_companies_table.scan()
                items = res.get("Items", [])
                
                # Transform to match frontend expectations
                stocks = []
                for item in items:
                    stock = {
                        "symbol": item.get("symbol", ""),
                        "companyName": item.get("companyName", ""),
                        "listingDate": item.get("listingDate"),
                        "isinNumber": item.get("isinNumber", ""),
                        "exchange": item.get("exchange", "")
                    }
                    stocks.append(stock)
                
                # Sort by company name
                stocks.sort(key=lambda x: x["companyName"])
                return _response(200, {"items": stocks})
            except Exception as e:
                return _response(500, {"error": f"Failed to fetch stocks: {str(e)}"})

        # Search stock companies (GET /stocks/search?q=...&exchange=...)
        if route_key == "GET /stocks/search":
            try:
                q = (qs or {}).get("q", "").lower()
                exchange = (qs or {}).get("exchange")
                
                # Scan the stock companies table
                res = stock_companies_table.scan()
                items = res.get("Items", [])
                
                # Filter results
                filtered_stocks = []
                for item in items:
                    company_name = item.get("companyName", "").lower()
                    symbol = item.get("symbol", "").lower()
                    
                    # Check if query matches company name or symbol
                    if q and q not in company_name and q not in symbol:
                        continue
                    
                    # Filter by exchange if specified
                    if exchange and item.get("exchange", "").upper() != exchange.upper():
                        continue
                    
                    stock = {
                        "symbol": item.get("symbol", ""),
                        "companyName": item.get("companyName", ""),
                        "listingDate": item.get("listingDate"),
                        "isinNumber": item.get("isinNumber", ""),
                        "exchange": item.get("exchange", "")
                    }
                    filtered_stocks.append(stock)
                
                # Sort by company name and limit results
                filtered_stocks.sort(key=lambda x: x["companyName"])
                return _response(200, {"items": filtered_stocks[:20]})
            except Exception as e:
                return _response(500, {"error": f"Failed to search stocks: {str(e)}"})

        # Repayments endpoints
        # Get all repayments (GET /repayments)
        if route_key == "GET /repayments":
            try:
                user_id = "user-123"  # TODO: Get from auth context
                
                response = repayments_table.query(
                    KeyConditionExpression='user_id = :user_id',
                    ExpressionAttributeValues={':user_id': user_id}
                )
                
                repayments = response.get('Items', [])
                
                # Calculate summary metrics
                total_outstanding = sum(float(r.get('outstanding_balance', 0)) for r in repayments)
                total_emi = sum(float(r.get('emi_amount', 0)) for r in repayments)
                total_repayments = len(repayments)
                
                summary = {
                    'total_outstanding': total_outstanding,
                    'total_emi': total_emi,
                    'total_repayments': total_repayments,
                    'repayments': repayments
                }
                
                return _response(200, summary)
            except Exception as e:
                return _response(500, {"error": f"Failed to fetch repayments: {str(e)}"})

        # Create repayment (POST /repayments)
        if route_key == "POST /repayments":
            try:
                user_id = "user-123"  # TODO: Get from auth context
                repayment_id = str(uuid.uuid4())
                
                # Calculate derived fields
                principal = float(body.get('principal', 0))
                interest_rate = float(body.get('interest_rate', 0))
                tenure_months = int(body.get('tenure_months', 0))
                emi_amount = float(body.get('emi_amount', 0))
                
                # Calculate outstanding balance (initially same as principal)
                outstanding_balance = principal
                
                repayment = {
                    'user_id': user_id,
                    'repayment_id': repayment_id,
                    'type': body.get('type', ''),
                    'institution': body.get('institution', ''),
                    'principal': Decimal(str(principal)),
                    'interest_rate': Decimal(str(interest_rate)),
                    'emi_amount': Decimal(str(emi_amount)),
                    'tenure_months': tenure_months,
                    'outstanding_balance': Decimal(str(outstanding_balance)),
                    'start_date': body.get('start_date', ''),
                    'due_date': body.get('due_date', ''),
                    'status': 'active',
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                repayments_table.put_item(Item=repayment)
                
                return _response(201, {'repayment_id': repayment_id, 'message': 'Repayment created successfully'})
            except Exception as e:
                return _response(500, {"error": f"Failed to create repayment: {str(e)}"})

        # Get specific repayment (GET /repayments/{id})
        if route_key.startswith("GET /repayments/") and not route_key.endswith("/history"):
            try:
                user_id = "user-123"  # TODO: Get from auth context
                repayment_id = path.split('/')[-1]
                
                response = repayments_table.get_item(
                    Key={'user_id': user_id, 'repayment_id': repayment_id}
                )
                
                if 'Item' not in response:
                    return _response(404, {'error': 'Repayment not found'})
                
                return _response(200, response['Item'])
            except Exception as e:
                return _response(500, {"error": f"Failed to fetch repayment: {str(e)}"})

        # Update repayment (PUT /repayments/{id})
        if route_key.startswith("PUT /repayments/"):
            try:
                user_id = "user-123"  # TODO: Get from auth context
                repayment_id = path.split('/')[-1]
                
                # Get existing repayment
                response = repayments_table.get_item(
                    Key={'user_id': user_id, 'repayment_id': repayment_id}
                )
                
                if 'Item' not in response:
                    return _response(404, {'error': 'Repayment not found'})
                
                existing = response['Item']
                
                # Update fields
                update_expression = "SET updated_at = :updated_at"
                expression_values = {':updated_at': datetime.utcnow().isoformat()}
                
                for field in ['type', 'institution', 'principal', 'interest_rate', 'emi_amount', 'tenure_months', 'outstanding_balance', 'start_date', 'due_date', 'status']:
                    if field in body:
                        if field in ['principal', 'interest_rate', 'emi_amount', 'outstanding_balance']:
                            expression_values[f':{field}'] = Decimal(str(body[field]))
                        else:
                            expression_values[f':{field}'] = body[field]
                        update_expression += f", {field} = :{field}"
                
                repayments_table.update_item(
                    Key={'user_id': user_id, 'repayment_id': repayment_id},
                    UpdateExpression=update_expression,
                    ExpressionAttributeValues=expression_values
                )
                
                return _response(200, {'message': 'Repayment updated successfully'})
            except Exception as e:
                return _response(500, {"error": f"Failed to update repayment: {str(e)}"})

        # Delete repayment (DELETE /repayments/{id})
        if route_key.startswith("DELETE /repayments/"):
            try:
                user_id = "user-123"  # TODO: Get from auth context
                repayment_id = path.split('/')[-1]
                
                repayments_table.delete_item(
                    Key={'user_id': user_id, 'repayment_id': repayment_id}
                )
                
                return _response(200, {'message': 'Repayment deleted successfully'})
            except Exception as e:
                return _response(500, {"error": f"Failed to delete repayment: {str(e)}"})

        # Add prepayment (POST /repayments/{id}/prepayment)
        if route_key.endswith("/prepayment"):
            try:
                user_id = "user-123"  # TODO: Get from auth context
                repayment_id = path.split('/')[-2]
                history_id = str(uuid.uuid4())
                
                prepayment = {
                    'user_id': user_id,
                    'repayment_id': repayment_id,
                    'history_id': history_id,
                    'amount': Decimal(str(body.get('amount', 0))),
                    'payment_date': body.get('payment_date', datetime.utcnow().isoformat()),
                    'type': 'prepayment',
                    'principal_component': Decimal(str(body.get('principal_component', body.get('amount', 0)))),
                    'interest_component': Decimal(str(body.get('interest_component', 0))),
                    'created_at': datetime.utcnow().isoformat()
                }
                
                repayment_history_table.put_item(Item=prepayment)
                
                # Update outstanding balance in main repayment
                response = repayments_table.get_item(
                    Key={'user_id': user_id, 'repayment_id': repayment_id}
                )
                
                if 'Item' in response:
                    existing = response['Item']
                    new_outstanding = float(existing.get('outstanding_balance', 0)) - float(prepayment['principal_component'])
                    
                    repayments_table.update_item(
                        Key={'user_id': user_id, 'repayment_id': repayment_id},
                        UpdateExpression="SET outstanding_balance = :outstanding, updated_at = :updated_at",
                        ExpressionAttributeValues={
                            ':outstanding': Decimal(str(max(0, new_outstanding))),
                            ':updated_at': datetime.utcnow().isoformat()
                        }
                    )
                
                return _response(201, {'message': 'Prepayment added successfully'})
            except Exception as e:
                return _response(500, {"error": f"Failed to add prepayment: {str(e)}"})

        # Get repayment history (GET /repayments/{id}/history)
        if route_key.endswith("/history"):
            try:
                user_id = "user-123"  # TODO: Get from auth context
                repayment_id = path.split('/')[-2]
                
                response = repayment_history_table.query(
                    KeyConditionExpression='user_id = :user_id AND begins_with(repayment_id, :repayment_id)',
                    ExpressionAttributeValues={
                        ':user_id': user_id,
                        ':repayment_id': repayment_id
                    }
                )
                
                history = response.get('Items', [])
                
                return _response(200, history)
            except Exception as e:
                return _response(500, {"error": f"Failed to fetch repayment history: {str(e)}"})

        # CAS Import endpoint (POST /holdings/import)
        if route_key == "POST /holdings/import":
            try:
                user_id = "user-123"  # TODO: Get from auth context
                body = json.loads(event.get('body', '{}'))
                
                # Validate required fields
                required_fields = ['broker', 'stocks']
                for field in required_fields:
                    if field not in body:
                        return _response(400, {"error": f"Missing required field: {field}"})
                
                broker = body['broker']
                stocks_data = body['stocks']
                
                # Validate broker
                valid_brokers = ['Zerodha', 'Groww', 'Upstox', 'Angel', 'Other']
                if broker not in valid_brokers:
                    return _response(400, {"error": f"Invalid broker. Must be one of: {valid_brokers}"})
                
                imported_count = 0
                updated_count = 0
                errors = []
                
                for stock in stocks_data:
                    try:
                        # Validate stock data
                        print(f"🔍 Validating stock: {stock.get('name', 'Unknown')}")
                        print(f"🔍 Stock data: {stock}")
                        
                        required_stock_fields = ['name', 'symbol', 'units', 'price', 'currentValue', 'investedAmount']
                        for field in required_stock_fields:
                            if field not in stock:
                                error_msg = f"Stock {stock.get('name', 'Unknown')}: Missing field {field}"
                                print(f"❌ Validation error: {error_msg}")
                                errors.append(error_msg)
                                continue
                        
                        # Validate data types
                        try:
                            float(stock['units'])
                            float(stock['price'])
                            float(stock['investedAmount'])
                            float(stock['currentValue'])
                        except (ValueError, TypeError) as e:
                            error_msg = f"Stock {stock.get('name', 'Unknown')}: Invalid numeric data - {str(e)}"
                            print(f"❌ Data type error: {error_msg}")
                            errors.append(error_msg)
                            continue
                        
                        # Find existing holding using comprehensive matching
                        print(f"🔍 Looking for existing holding for stock: {stock.get('name', 'Unknown')} (Symbol: {stock.get('symbol', 'Unknown')}, ISIN: {stock.get('isin', 'None')})")
                        existing_holding = _find_existing_holding(user_id, stock, broker.lower())
                        
                        if existing_holding:
                            print(f"✅ Found existing holding: {existing_holding.get('data', {}).get('name', 'Unknown')} (ID: {existing_holding.get('id', 'Unknown')})")
                        else:
                            print(f"❌ No existing holding found, will create new one")
                        
                        if existing_holding:
                            # ALWAYS OVERRIDE existing holdings with import data
                            existing = existing_holding
                            existing_data = existing.get('data', {})
                            
                            # Use import data directly (override, not merge)
                            new_units = float(stock['units'])
                            new_invested = float(stock['investedAmount'])
                            new_current = float(stock['currentValue'])
                            
                            print(f"🔄 OVERRIDING existing holding for {stock.get('name', 'Unknown')}:")
                            print(f"   Existing: {existing_data.get('units', 0)} units, ₹{existing_data.get('investedAmount', 0)} invested")
                            print(f"   Import: {new_units} units, ₹{new_invested} invested, ₹{new_current} value")
                            print(f"   Result: OVERRIDE with import data")
                            
                            now = datetime.utcnow().isoformat()
                            
                            # Get standardized company name if ISIN is available
                            standardized_name = None
                            if 'isin' in stock and stock['isin']:
                                standardized_name = _get_company_name_by_isin(stock['isin'])
                            
                            # Update in holdings table
                            update_expression = "SET #data.units = :units, #data.investedAmount = :invested, #data.currentValue = :current, #data.updated_at = :updated_at, updated_at = :updated_at"
                            expression_values = {
                                ':units': Decimal(str(new_units)),
                                ':invested': Decimal(str(new_invested)),
                                ':current': Decimal(str(new_current)),
                                ':updated_at': now
                            }
                            
                            # Add ISIN if available and missing
                            if 'isin' in stock and stock['isin'] and not existing_data.get('isin'):
                                update_expression += ", #data.isin = :isin"
                                expression_values[':isin'] = stock['isin']
                            
                            # Add sector if available and missing
                            if 'sector' in stock and stock['sector'] and not existing_data.get('sector'):
                                update_expression += ", #data.sector = :sector"
                                expression_values[':sector'] = stock['sector']
                            
                            # Update name to standardized name if available
                            if standardized_name and standardized_name != existing_data.get('name'):
                                update_expression += ", #data.name = :name"
                                expression_values[':name'] = standardized_name
                            
                            holdings_table.update_item(
                                Key={'id': existing['id']},
                                UpdateExpression=update_expression,
                                ExpressionAttributeNames={
                                    '#data': 'data'
                                },
                                ExpressionAttributeValues=expression_values
                            )
                            updated_count += 1
                        else:
                            # Add new holding using unified function
                            # Get standardized company name if ISIN is available
                            standardized_name = None
                            if 'isin' in stock and stock['isin']:
                                standardized_name = _get_company_name_by_isin(stock['isin'])
                            
                            # Use standardized name if available, otherwise use broker name
                            display_name = standardized_name if standardized_name else stock['name']
                            
                            # Create holding data object for unified function
                            holding_data = {
                                'instrumentClass': 'Stocks',
                                'name': display_name,  # Use standardized name
                                'symbol': stock['symbol'],
                                'isin': stock.get('isin', ''),  # Add ISIN if available
                                'sector': stock.get('sector', ''),  # Add sector if available
                                'units': stock['units'],
                                'price': stock['price'],
                                'investedAmount': stock['investedAmount'],
                                'currentValue': stock['currentValue'],
                                'asset_class': 'Stocks',
                                'portfolio_role': 'Equity',
                                'broker': broker.lower()  # Use broker from import
                            }
                            
                            # Use unified function to store
                            _store_holding_unified(user_id, holding_data, source="import")
                            imported_count += 1
                            
                    except Exception as stock_error:
                        error_msg = f"Stock {stock.get('name', 'Unknown')}: {str(stock_error)}"
                        print(f"❌ Stock processing error: {error_msg}")
                        print(f"❌ Stock data: {stock}")
                        errors.append(error_msg)
                        continue
                
                response_data = {
                    'message': f'CAS import completed for {broker}',
                    'imported': imported_count,
                    'updated': updated_count,
                    'total_processed': len(stocks_data),
                    'errors': errors,
                    'breakdown': {
                        'operation': 'Import Override',
                        'broker': broker,
                        'total_stocks': len(stocks_data),
                        'successful_imports': imported_count,
                        'updated_existing': updated_count,
                        'failed_imports': len(errors),
                        'timestamp': datetime.utcnow().isoformat(),
                        'details': {
                            'imported_stocks': [stock.get('name', 'Unknown') for stock in stocks_data if stock.get('name')],
                            'failed_stocks': [error.split(':')[0].replace('Stock ', '') for error in errors if 'Stock ' in error]
                        }
                    }
                }
                
                if errors:
                    response_data['warning'] = f'{len(errors)} stocks had errors during import'
                
                return _response(200, response_data)
                
            except Exception as e:
                return _response(500, {"error": f"Failed to import CAS data: {str(e)}"})

        return _response(404, {"error": "Not found", "routeKey": route_key})
    except Exception as e:
        print("handler error", e)
        return _response(500, {"error": "Internal error"})