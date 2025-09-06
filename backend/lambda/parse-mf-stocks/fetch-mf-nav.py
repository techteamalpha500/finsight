import re
import os
import boto3
import requests
import logging
from datetime import datetime
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("MUTUAL_FUND_SCHEMES_TABLE", "MutualFundSchemes"))

NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"

# --- Config via environment ---
KEEP_VARIANTS = os.environ.get("KEEP_VARIANTS", "direct_growth_only")  
# Allowed: "direct_growth_only" | "all"

# --- Regex ---
header_re = re.compile(r"^\s*Open Ended Schemes\((.*?)\)\s*$", re.IGNORECASE)
amc_re = re.compile(r".+Mutual Fund", re.IGNORECASE)
scheme_re = re.compile(r"^\d+;")

# --- Helpers ---
def normalize_quote(s: str) -> str:
    return (s or "").replace("â€™", "'").replace("Ã¢â‚¬â„¢", "'")

def parse_variant(fund_name: str):
    n = (fund_name or "").lower()
    plan   = "Direct"  if "direct"  in n else ("Regular" if "regular" in n else None)
    if re.search(r"(idcw|dividend|payout|reinvest|bonus|unclaimed|withdrawal)", n):
        option = "IDCW"
    elif "growth" in n:
        option = "Growth"
    else:
        option = None
    return plan, option

def detect_etf(scheme_type, scheme_subtype, fund_name: str) -> bool:
    st = (scheme_type or "").lower()
    ss = (scheme_subtype or "").lower() if scheme_subtype else ""
    n  = (fund_name or "").lower()
    return ("etf" in st or "etf" in ss or "etf" in n or "bees" in n)

def map_to_allocation(scheme_type: str, scheme_subtype: str, fund_name: str) -> str:
    st = (scheme_type or "").lower().strip()
    ss = normalize_quote((scheme_subtype or "")).lower().strip()
    n  = (fund_name or "").lower()

    def has_any(text, words): return any(w in text for w in words)

    liquid_kw = ["liquid", "overnight", "1d rate", "one day", "money market", "ultra short"]
    debt_kw   = ["gilt", "g-sec", "gsec", "sdl", "corporate bond", "psu", "sovereign",
                 "treasury", "aaa", "credit risk", "banking and psu", "floater",
                 "long duration", "short duration", "medium duration", "low duration",
                 "dynamic bond", "financial services"]

    # ✅ Global REIT/InvIT detection
    if "reit" in n or "invits" in n or "invit" in n:
        return "Real Estate"

    # 1) Solution Oriented
    if "solution oriented" in st:
        return "Equity MF"

    # 2) Equity / Debt straight
    if "equity" in st:
        return "Equity MF"
    if "debt" in st:
        return "Liquid Fund" if has_any(ss, liquid_kw) or has_any(n, liquid_kw) else "Debt Fund"

    # 3) Hybrid
    if "hybrid" in st:
        if "conservative" in ss: return "Debt Fund"
        if "arbitrage" in ss:    return "Liquid Fund"
        return "Equity MF"

    # 4) Other (Index Funds, ETFs, FoFs, Gold, REITs handled globally above)
    if "other" in st:
        if "gold etf" in ss or "gold" in n or "silver" in n:
            return "Gold"
        if has_any(n, liquid_kw):
            return "Liquid Fund"
        if has_any(n, debt_kw):
            return "Debt Fund"
        if "fof overseas" in ss:
            if has_any(n, debt_kw): return "Debt Fund"
            return "Equity MF"
        if "fof domestic" in ss:
            if "gold" in n: return "Gold"
            if has_any(n, debt_kw): return "Debt Fund"
            if "arbitrage" in n: return "Liquid Fund"
            return "Equity MF"
        return "Equity MF"

    # 5) Legacy labels
    if st in ["income", "money market", "gilt", "growth"]:
        if has_any(ss + " " + n, liquid_kw): return "Liquid Fund"
        if has_any(ss + " " + n, debt_kw):   return "Debt Fund"
        return "Debt Fund"

    return "Equity MF"

# --- Main Lambda ---
def lambda_handler(event, context):
    logger.info("Starting NAV data fetch and processing")
    
    try:
        resp = requests.get(NAV_URL)
        resp.raise_for_status()
        lines = resp.text.splitlines()
        logger.info(f"Fetched {len(lines)} lines from NAV URL")

        curr_category, curr_amc = None, None
        inside_open = False
        items = []
        skipped_no_amc = 0

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect header
            m = header_re.match(line)
            if m:
                inside_open = True
                header = m.group(1).strip()
                parts = [p.strip() for p in header.split(" - ", 1)]
                scheme_type = parts[0].replace("Scheme", "").strip()
                scheme_subtype = parts[1] if len(parts) > 1 else None
                curr_category = (scheme_type, scheme_subtype)
                curr_amc = None
                continue

            if not inside_open:
                continue

            # Detect AMC line
            if ";" not in line and amc_re.match(line):
                curr_amc = line
                continue

            if not scheme_re.match(line):
                continue

            parts = line.split(";")
            if len(parts) < 6:
                continue

            scheme_code, isin_div_payout, isin_growth, fund_name, nav, date = [p.strip() for p in parts[:6]]

            if not curr_amc:
                skipped_no_amc += 1
                continue

            # Normalize
            fund_name = normalize_quote(fund_name)

            # Variant
            plan, option = parse_variant(fund_name)

            # ✅ Default missing values to "NA"
            if not plan:
                plan = "NA"
            if not option:
                option = "NA"

            # ETF detection
            is_etf = detect_etf(curr_category[0], curr_category[1], fund_name)

            # ✅ Variant filter: ETFs bypass restriction
            if KEEP_VARIANTS == "direct_growth_only":
                if not is_etf:  # only apply strict filter to non-ETFs
                    if plan != "Direct" or option != "Growth":
                        continue

            # NAV safe parse
            try:
                nav_value = Decimal(nav)
            except Exception:
                logger.warning(f"Skipping invalid NAV: {fund_name} NAV={nav}")
                continue

            # Asset Class & Portfolio Role
            asset_class = map_to_allocation(curr_category[0], curr_category[1], fund_name)

            if asset_class == "Equity MF":
                portfolio_role = "Equity"
            elif asset_class in ["Debt Fund", "Liquid Fund"]:
                portfolio_role = "Defensive"
            elif asset_class in ["Gold", "Real Estate"]:
                portfolio_role = "Satellite"
            else:
                portfolio_role = "Equity"  # default fallback

            item = {
                "scheme_code": scheme_code,
                "date": date,
                "amc": curr_amc,
                "fund_name": fund_name,
                "scheme_type": curr_category[0],
                "scheme_subtype": curr_category[1],
                "plan": plan,
                "option": option,
                "nav": nav_value,
                "asset_class": asset_class,
                "portfolio_role": portfolio_role,
                "is_etf": "true" if is_etf else "false"
            }
            items.append(item)

        # Batch write
        logger.info(f"Writing {len(items)} items to DynamoDB (skipped {skipped_no_amc} items without AMC)")
        try:
            with table.batch_writer() as batch:
                for item in items:
                    if not all(item.get(field) for field in ['scheme_code', 'amc', 'date']):
                        logger.warning(f"Skipping item with missing required fields: {item}")
                        continue
                    batch.put_item(Item=item)
            
            logger.info("Successfully wrote all items to DynamoDB")
            return {
                "statusCode": 200, 
                "body": {
                    "processed_items": len(items),
                    "skipped_no_amc": skipped_no_amc,
                    "message": "NAV data successfully processed and stored"
                }
            }
            
        except Exception as e:
            logger.error(f"Error writing to DynamoDB: {str(e)}")
            raise

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            "statusCode": 500,
            "body": {
                "error": str(e),
                "message": "Failed to process NAV data"
            }
        }
# --- End of file ---