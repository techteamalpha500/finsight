"""
High-accuracy holdings parser for Zerodha, Groww, Upstox, Angel One (and generic)
- Per-broker adapters for CSV / Excel / PDF
- ISIN-first matching, then exact symbol, then fuzzy fallback
- Normalized, DynamoDB-ready records (Decimal-safe)

Output schema (per record):
{
  id: UUID4 string,
  broker: str,                # 'zerodha' | 'groww' | 'upstox' | 'angel'
  symbol: str,                # normalized broker-independent symbol if resolvable
  isin: str,                  # ISIN if present/derived
  name: str,                  # canonical company/instrument name
  quantity: Decimal,          # integer for equities; Decimal retained for MFs/ETFs
  avg_price: Decimal|null,    # average buy price if provided
  updated_at: ISO8601 UTC str,
  source_file: str,           # basename of the ingested file
  raw_row: dict|str           # original parsed row for traceability
}

Notes
- Requires: pandas, pdfplumber, rapidfuzz, python-dateutil
- Optional: boto3 if you want to write to DynamoDB (see `write_to_dynamodb`) 
"""

from __future__ import annotations
import os
import io
import json
import uuid
import math
import decimal
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Iterable, Any

import pandas as pd
import pdfplumber
from rapidfuzz import fuzz, process

# ---------- CONFIG ----------
MASTER_INSTRUMENT_CSV = "instruments_master.csv"
# master CSV columns required: symbol, isin, name
# Example row: RELIANCE,INE002A01018,Reliance Industries Limited

USER_MAPPING_FILE = "user_mappings.json"  # stores name->(symbol, isin, name)

# fuzzy matching thresholds
FUZZY_SCORE_STRONG = 85
FUZZY_SCORE_WEAK = 70

# unified schema fields
SCHEMA_FIELDS = [
    "id",
    "broker",
    "symbol",
    "isin",
    "name",
    "quantity",
    "avg_price",
    "updated_at",
    "source_file",
    "raw_row",
]

# ---------- Utilities ----------

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def to_decimal(val: Any) -> Optional[decimal.Decimal]:
    """
    Convert value to Decimal suitable for DynamoDB.
    - None/""/NaN -> None
    - Strings with commas -> normalized
    - Floats -> quantize safely via string conversion to avoid binary FP issues
    """
    if val is None:
        return None
    if isinstance(val, str):
        s = val.strip()
        if s == "":
            return None
        s = s.replace(",", "")
        # handle possible trailing symbols
        try:
            return decimal.Decimal(s)
        except Exception:
            return None
    if isinstance(val, (int, decimal.Decimal)):
        return decimal.Decimal(val)
    if isinstance(val, float):
        if math.isnan(val):
            return None
        # Convert through repr to keep precision
        return decimal.Decimal(repr(val))
    # other types (e.g., numpy types)
    try:
        return decimal.Decimal(str(val))
    except Exception:
        return None


def to_int_decimal(val: Any) -> Optional[decimal.Decimal]:
    d = to_decimal(val)
    if d is None:
        return None
    # coerce to integral if it looks like an integer
    try:
        return d.quantize(decimal.Decimal(1)) if d == d.to_integral_value() else d
    except Exception:
        return d


def load_master_instruments(path: str = MASTER_INSTRUMENT_CSV) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Master instrument file missing at {path}. Provide symbol/isin/name CSV."
        )
    df = pd.read_csv(path, dtype=str).fillna("")
    # normalized helper columns
    df["symbol_up"] = df["symbol"].str.upper().str.strip()
    df["isin_up"] = df["isin"].str.upper().str.strip()
    df["key_name"] = (
        df["name"]
        .str.lower()
        .str.replace(r"[^a-z0-9 ]", " ", regex=True)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )
    return df


def load_user_mappings(path: str = USER_MAPPING_FILE) -> Dict[str, Dict[str, str]]:
    if os.path.exists(path):
        with open(path, "r", encoding="utf8") as f:
            return json.load(f)
    return {}


def save_user_mappings(m: Dict[str, Dict[str, str]], path: str = USER_MAPPING_FILE):
    with open(path, "w", encoding="utf8") as f:
        json.dump(m, f, ensure_ascii=False, indent=2)

# ---------- Core matcher ----------

@dataclass
class InstrumentMatcher:
    master_df: pd.DataFrame
    user_map: Dict[str, Dict[str, str]]

    def resolve(self, name_raw: str, isin: str | None, symbol_hint: str | None) -> Tuple[str, str, str, bool]:
        """
        Returns (symbol, isin, canonical_name, needs_confirmation)
        Resolution order:
        1) ISIN exact match
        2) User mapping by normalized name
        3) Exact symbol match (case-insensitive)
        4) Fuzzy match by name
        If not found -> return inputs with needs_confirmation=True
        """
        name_raw = (name_raw or "").strip()
        isin = (isin or "").strip()
        symbol_hint = (symbol_hint or "").strip()

        # 1) ISIN exact
        if isin:
            m = self.master_df[self.master_df["isin_up"] == isin.upper()]
            if not m.empty:
                rec = m.iloc[0]
                return rec["symbol"], rec["isin"], rec["name"], False

        # 2) User mapping by name
        name_key = name_raw.lower()
        if name_key in self.user_map:
            um = self.user_map[name_key]
            return um.get("symbol", ""), um.get("isin", isin), um.get("name", name_raw), False

        # 3) Exact symbol match
        if symbol_hint:
            m2 = self.master_df[self.master_df["symbol_up"] == symbol_hint.upper()]
            if not m2.empty:
                rec = m2.iloc[0]
                return rec["symbol"], rec["isin"], rec["name"], False

        # 4) Fuzzy by name
        key_name = (
            name_raw.lower()
            .replace("-", " ")
            .replace("&", " and ")
            .strip()
        )
        choices = self.master_df["key_name"].tolist()
        if choices:
            rez = process.extractOne(key_name, choices, scorer=fuzz.token_sort_ratio)
            if rez:
                _cand, score, idx = rez
                rec = self.master_df.iloc[idx]
                needs = score < FUZZY_SCORE_STRONG
                if score >= FUZZY_SCORE_WEAK:
                    return rec["symbol"], rec["isin"], rec["name"], needs

        # Unresolved
        return symbol_hint, isin, (name_raw or symbol_hint or isin), True

# ---------- File/broker detection ----------

def detect_broker_and_type(filepath: str) -> Tuple[str, str]:
    """Detect broker and file type. Returns (broker, file_type)
    file_type in {csv, excel, pdf, unknown}
    """
    ext = os.path.splitext(filepath)[1].lower()
    if ext in [".csv"]:
        try:
            sample = pd.read_csv(filepath, nrows=2, dtype=str)
        except Exception:
            sample = pd.DataFrame()
        cols = " ".join(sample.columns.astype(str)).lower()
        if any(k in cols for k in ["tradingsymbol", "instrument"]):
            return "zerodha", "csv"
        if "upstox" in cols or "instrument name" in cols:
            return "upstox", "csv"
        if "groww" in cols or "folio" in cols or "scheme name" in cols:
            return "groww", "csv"
        if "scrip" in cols or "angel" in cols:
            return "angel", "csv"
        return "generic", "csv"
    if ext in [".xls", ".xlsx"]:
        try:
            xl = pd.read_excel(filepath, nrows=2, dtype=str)
        except Exception:
            xl = pd.DataFrame()
        cols = " ".join(xl.columns.astype(str)).lower()
        if "instrument name" in cols or "tradingsymbol" in cols:
            return "upstox", "excel"
        if "zerodha" in cols or "kite" in cols:
            return "zerodha", "excel"
        if "angel" in cols or "scrip" in cols:
            return "angel", "excel"
        if "groww" in cols:
            return "groww", "excel"
        return "generic", "excel"
    if ext in [".pdf"]:
        try:
            with pdfplumber.open(filepath) as pdf:
                first = (pdf.pages[0].extract_text() or "").lower()
        except Exception:
            first = ""
        txt = first
        if "zerodha" in txt or "console" in txt or "kite" in txt:
            return "zerodha", "pdf"
        if "groww" in txt:
            return "groww", "pdf"
        if "upstox" in txt:
            return "upstox", "pdf"
        if "angel" in txt:
            return "angel", "pdf"
        return "generic", "pdf"
    return "unknown", ext.strip(".")

# ---------- Column helpers ----------

def pick_first(d: Dict[str, Any], cols: Iterable[str]) -> Any:
    for c in cols:
        if c in d and str(d[c]).strip() != "":
            return d[c]
    return ""


def map_row_values(row: pd.Series, candidates: Dict[str, Iterable[str]]) -> Dict[str, Any]:
    lc = {k.lower(): k for k in row.index}
    out: Dict[str, Any] = {}
    for target, names in candidates.items():
        found_col = None
        for name in names:
            key = name.lower()
            if key in lc:
                found_col = lc[key]
                break
        out[target] = row[found_col] if found_col is not None else ""
    return out

# ---------- Per-broker adapters ----------

class BaseAdapter:
    BROKER = "generic"

    # Map of our targets to potential column names for tabular files
    COLS: Dict[str, Iterable[str]] = {
        "name": ("name",),
        "symbol": ("symbol",),
        "isin": ("isin", "isin code"),
        "quantity": ("quantity", "qty", "units", "no. of shares"),
        "avg_price": ("avg price", "avg_price", "avg cost", "buy price", "avg cost price"),
    }

    def parse_file(self, path: str, file_type: str) -> List[Dict[str, Any]]:
        if file_type == "csv":
            df = pd.read_csv(path, dtype=str).fillna("")
            return self._parse_tabular(df, path)
        if file_type == "excel":
            df = pd.read_excel(path, dtype=str).fillna("")
            return self._parse_tabular(df, path)
        if file_type == "pdf":
            return self._parse_pdf(path)
        raise ValueError(f"Unsupported file type: {file_type}")

    def _parse_tabular(self, df: pd.DataFrame, path: str) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        for _, r in df.iterrows():
            mapped = map_row_values(r, self.COLS)
            rows.append(
                {
                    "broker": self.BROKER,
                    "name": str(mapped.get("name", "")).strip(),
                    "symbol": str(mapped.get("symbol", "")).strip(),
                    "isin": str(mapped.get("isin", "")).strip(),
                    "quantity": mapped.get("quantity", ""),
                    "avg_price": mapped.get("avg_price", ""),
                    "raw_row": r.to_dict(),
                    "source_file": os.path.basename(path),
                }
            )
        return rows

    def _parse_pdf(self, path: str) -> List[Dict[str, Any]]:
        # Default PDF strategy: try tables then fallback lines
        out: List[Dict[str, Any]] = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                # tables
                try:
                    tables = page.extract_tables()
                    for t in tables or []:
                        if not t or len(t) < 2:
                            continue
                        header = [str(x).strip() for x in t[0]]
                        df = pd.DataFrame(t[1:], columns=header).fillna("")
                        out.extend(self._parse_tabular(df, path))
                except Exception:
                    pass
                # lines fallback: very heuristic
                text = (page.extract_text() or "").splitlines()
                for line in text:
                    tokens = line.split()
                    if len(tokens) < 3:
                        continue
                    # attempt: ... NAME ... QTY PRICE
                    qty = tokens[-2].replace(",", "")
                    price = tokens[-1].replace(",", "")
                    name = " ".join(tokens[:-2])
                    try:
                        qv = decimal.Decimal(qty)
                    except Exception:
                        continue
                    try:
                        pv = decimal.Decimal(price)
                    except Exception:
                        pv = None
                    out.append(
                        {
                            "broker": self.BROKER,
                            "name": name.strip(),
                            "symbol": "",
                            "isin": "",
                            "quantity": str(qv),
                            "avg_price": str(pv) if pv is not None else "",
                            "raw_row": line,
                            "source_file": os.path.basename(path),
                        }
                    )
        return out


class ZerodhaAdapter(BaseAdapter):
    BROKER = "zerodha"
    COLS = {
        "name": ("instrument name", "instrument", "name", "product", "security name"),
        "symbol": ("tradingsymbol", "trading symbol", "symbol"),
        "isin": ("isin", "isin code"),
        "quantity": ("qty.", "qty", "quantity", "holdings qty", "no. of shares", "units"),
        "avg_price": ("avg. price", "avg price", "avg_price", "avg cost", "buy price"),
    }


class GrowwAdapter(BaseAdapter):
    BROKER = "groww"
    COLS = {
        "name": ("stock", "name", "instrument name", "scheme name", "security name"),
        "symbol": ("symbol", "trading symbol", "tradingsymbol"),
        "isin": ("isin", "isin code"),
        "quantity": ("qty", "quantity", "units", "no. of shares"),
        "avg_price": ("avg price", "avg_price", "avg cost", "buy price", "avg cost price"),
    }


class UpstoxAdapter(BaseAdapter):
    BROKER = "upstox"
    COLS = {
        "name": ("instrument name", "name", "security name"),
        "symbol": ("tradingsymbol", "trading symbol", "symbol"),
        "isin": ("isin", "isin code"),
        "quantity": ("holdings qty", "qty", "quantity", "units"),
        "avg_price": ("avg price", "avg_price", "avg cost", "buy price"),
    }


class AngelAdapter(BaseAdapter):
    BROKER = "angel"
    COLS = {
        "name": ("scrip name", "instrument name", "name", "security name"),
        "symbol": ("symbol", "trading symbol", "tradingsymbol", "scrip code"),
        "isin": ("isin", "isin code"),
        "quantity": ("qty", "quantity", "units", "no. of shares"),
        "avg_price": ("avg price", "avg_price", "avg cost", "buy price"),
    }


ADAPTERS = {
    "zerodha": ZerodhaAdapter(),
    "groww": GrowwAdapter(),
    "upstox": UpstoxAdapter(),
    "angel": AngelAdapter(),
    "generic": BaseAdapter(),
}

# ---------- Normalization & DynamoDB shaping ----------

def normalize_records(
    rows: List[Dict[str, Any]],
    matcher: InstrumentMatcher,
    persist_user_map: bool = True,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    now = utc_now_iso()
    user_map_changed = False

    for r in rows:
        name_raw = r.get("name", "")
        isin_raw = r.get("isin", "")
        symbol_hint = r.get("symbol", "")

        symbol, isin, canon_name, needs = matcher.resolve(name_raw, isin_raw, symbol_hint)

        qty_dec = to_int_decimal(r.get("quantity")) or decimal.Decimal(0)
        price_dec = to_decimal(r.get("avg_price"))

        # If unresolved and user provided an explicit symbol in input, remember it
        if needs and name_raw.strip():
            key = name_raw.strip().lower()
            if key and key not in matcher.user_map and (symbol or isin):
                matcher.user_map[key] = {"symbol": symbol, "isin": isin, "name": canon_name}
                user_map_changed = True

        out.append(
            {
                "id": str(uuid.uuid4()),
                "broker": r.get("broker"),
                "symbol": (symbol or "").strip(),
                "isin": (isin or "").strip(),
                "name": (canon_name or name_raw or symbol_hint).strip(),
                "quantity": qty_dec,
                "avg_price": price_dec,
                "updated_at": now,
                "source_file": r.get("source_file"),
                "raw_row": r.get("raw_row"),
            }
        )

    if persist_user_map and user_map_changed:
        save_user_mappings(matcher.user_map)

    return out


# ---------- Pipeline ----------

def parse_files(filepaths: List[str], master_csv: str = MASTER_INSTRUMENT_CSV) -> List[Dict[str, Any]]:
    master = load_master_instruments(master_csv)
    user_map = load_user_mappings()
    matcher = InstrumentMatcher(master, user_map)

    consolidated: List[Dict[str, Any]] = []
    for fp in filepaths:
        broker, ftype = detect_broker_and_type(fp)
        adapter = ADAPTERS.get(broker, ADAPTERS["generic"])
        rows = adapter.parse_file(fp, ftype)
        consolidated.extend(rows)

    # Normalize -> DynamoDB shape
    normalized = normalize_records(consolidated, matcher)
    return normalized


# ---------- DynamoDB write (optional) ----------

def write_to_dynamodb(items: List[Dict[str, Any]], table_name: str, region_name: str | None = None):
    """
    Write items to DynamoDB using boto3. Assumes values already use Decimal.
    """
    import boto3
    from boto3.dynamodb.conditions import Key  # noqa: F401

    session = boto3.session.Session(region_name=region_name) if region_name else boto3
    dynamodb = session.resource("dynamodb") if region_name else boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)

    with table.batch_writer(overwrite_by_pkeys=["id"]) as batch:
        for item in items:
            # Ensure Decimal for numeric fields
            for k in ("quantity", "avg_price"):
                if k in item and item[k] is not None and not isinstance(item[k], decimal.Decimal):
                    item[k] = to_decimal(item[k])
            batch.put_item(Item=item)


# ---------- CLI usage ----------
if __name__ == "__main__":
    import argparse

    decimal.getcontext().prec = 28  # sufficient precision for currency

    ap = argparse.ArgumentParser(description="Parse broker holdings into DynamoDB-ready JSON")
    ap.add_argument("files", nargs="+", help="Paths to CSV/XLSX/PDF exports")
    ap.add_argument("--master", default=MASTER_INSTRUMENT_CSV, help="Master instruments CSV (symbol, isin, name)")
    ap.add_argument("--out", default="parsed_holdings_normalized.json", help="Where to save JSON output")
    ap.add_argument("--write-dynamo", action="store_true", help="Write to DynamoDB (requires --table)")
    ap.add_argument("--table", default=None, help="DynamoDB table name")
    ap.add_argument("--region", default=None, help="AWS region for DynamoDB")

    args = ap.parse_args()

    items = parse_files(args.files, master_csv=args.master)

    # Save JSON (Decimal -> string for JSON)
    def _json_default(o):
        if isinstance(o, decimal.Decimal):
            return str(o)
        raise TypeError

    with open(args.out, "w", encoding="utf8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2, default=_json_default)

    print(f"Saved {len(items)} records to {args.out}")

    if args.write_dynamo:
        if not args.table:
            raise SystemExit("--table is required with --write-dynamo")
        write_to_dynamodb(items, args.table, region_name=args.region)
        print(f"Wrote {len(items)} items to DynamoDB table '{args.table}'")
