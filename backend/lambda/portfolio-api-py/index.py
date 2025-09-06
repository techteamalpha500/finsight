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
                holding_id = holding.get("id") or str(uuid.uuid4())
                now = datetime.utcnow().isoformat()
                
                # Convert float values to Decimal types for DynamoDB compatibility
                converted_holding = _convert_floats_to_decimals(holding)
                
                # Extract asset class and portfolio role from the holding data
                instrument_class = converted_holding.get("instrumentClass", "Stocks")
                asset_class = converted_holding.get("asset_class", instrument_class)
                portfolio_role = converted_holding.get("portfolio_role", _get_portfolio_role_for_asset_class(asset_class))
                
                # Use the user_id from the holding data if available, otherwise use the JWT user
                user_id = converted_holding.get("user_id", user_sub)
                
                item = {
                    "id": holding_id,
                    "user_id": user_id,
                    "portfolio_id": portfolio_id,
                    "data": converted_holding,
                    "asset_class": asset_class,
                    "portfolio_role": portfolio_role,
                    "created_at": now,
                    "updated_at": now
                }
                
                holdings_table.put_item(Item=item)
                return _response(200, {"holdingId": holding_id})
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

        return _response(404, {"error": "Not found", "routeKey": route_key})
    except Exception as e:
        print("handler error", e)
        return _response(500, {"error": "Internal error"})