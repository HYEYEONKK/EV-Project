"""
Excel 4 files -> SQLite ingestion script
Run: python scripts/ingest_all.py  (from backend/ directory)
"""
import sys
import sqlite3
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd

# --- Paths ---
DATA_DIR = Path("C:\\Users\\jkimz022\\OneDrive - PwC\\FY26\\AX Node\\Web \uacfc\uc81c\\ABC Company Sample Data")
DB_PATH = Path(__file__).parent.parent / "data" / "easyview.db"

print(f"[DATA] {DATA_DIR}")
print(f"[DB]   {DB_PATH}")
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")
    return conn


def drop_tables(conn):
    for tbl in ["journal_entries", "trial_balance", "sales_ledger", "business_plan"]:
        conn.execute(f"DROP TABLE IF EXISTS {tbl}")
    conn.commit()


def ingest_je(conn):
    print("\n[1/4] ABC_JE v2.xlsx loading...")
    filepath = DATA_DIR / "ABC_JE v2.xlsx"
    df = pd.read_excel(filepath, engine="openpyxl", dtype=str)

    cols = list(df.columns)
    print(f"  Columns ({len(cols)}): {cols}")

    # Correct mapping (18 cols, 0-indexed)
    # 0:date 1:je_number 2:debit_credit 3:amount 4:department 5:department2
    # 6:description 7:description2 8:account_code 9:classification1
    # 10:classification2 11:classification3 12:classification4
    # 13:cost_center 14:division 15:branch 16:entry_type 17:record_id
    col_map = {}
    if len(cols) >= 17:
        col_map = {
            cols[0]: "date",
            cols[1]: "je_number",
            cols[2]: "debit_credit",
            cols[3]: "amount",
            cols[4]: "department",
            cols[6]: "description",
            cols[8]: "account_code",
            cols[9]: "classification1",
            cols[10]: "classification2",
            cols[11]: "classification3",
            cols[12]: "classification4",
            cols[13]: "cost_center",
            cols[14]: "division",
            cols[15]: "branch",
            cols[16]: "entry_type",
        }
    df = df.rename(columns=col_map)

    keep = ["date", "je_number", "debit_credit", "amount", "department",
            "description", "account_code", "classification1", "classification2",
            "classification3", "classification4", "cost_center", "division",
            "branch", "entry_type"]
    df = df[[c for c in keep if c in df.columns]].copy()

    # Type conversions
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").abs()

    # Normalize debit_credit
    dc_raw = df["debit_credit"].str.strip()
    dc_map = {"D": "D", "C": "C", "d": "D", "c": "C"}
    # Korean variants - map by checking first char
    def normalize_dc(val):
        if pd.isna(val):
            return None
        v = str(val).strip()
        if v in dc_map:
            return dc_map[v]
        # Korean debit = 차변/차입, credit = 대변/대출
        if v and v[0] in ("\ucc28", "\ub300"):
            return "D" if v[0] == "\ucc28" else "C"
        return v[:1].upper() if v else None
    df["debit_credit"] = dc_raw.map(normalize_dc)

    # Strip text columns
    for col in ["account_code", "division", "branch", "entry_type",
                "classification1", "classification2", "classification3",
                "classification4", "cost_center"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"nan": None, "None": None, "": None})

    df = df.dropna(subset=["date", "amount", "account_code"]).reset_index(drop=True)
    df.index.name = "id"
    df = df.reset_index()

    print(f"  Rows after clean: {len(df):,}")
    print(f"  debit_credit unique: {df['debit_credit'].unique()}")
    print(f"  entry_type unique: {df['entry_type'].unique()}")
    print(f"  division sample: {list(df['division'].dropna().unique()[:8])}")

    # Use sqlite3 directly to avoid SQLAlchemy variable limit
    df.to_sql("journal_entries", conn, if_exists="replace", index=False)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(date)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_date_type ON journal_entries(date, entry_type)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_account ON journal_entries(account_code)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_division ON journal_entries(division)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_branch ON journal_entries(branch)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_entry_type ON journal_entries(entry_type)")
    conn.commit()
    print(f"  [OK] journal_entries: {len(df):,} rows")
    return df


def ingest_tb(conn):
    print("\n[2/4] ABC_TB.xlsx loading...")
    filepath = DATA_DIR / "ABC_TB.xlsx"
    df = pd.read_excel(filepath, engine="openpyxl", dtype=str)
    cols = list(df.columns)
    print(f"  Columns ({len(cols)}): {cols}")

    col_map = {
        cols[0]: "classification1",
        cols[1]: "classification2",
        cols[2]: "account_code",
        cols[3]: "cost_center",
        cols[4]: "account_name",
        cols[5]: "entry_type",
        cols[6]: "branch",
        cols[7]: "division",
        cols[8]: "accounting_class",
        cols[9]: "balance",
    }
    df = df.rename(columns=col_map)
    df["account_code"] = df["account_code"].astype(str).str.strip()
    df["balance"] = pd.to_numeric(df["balance"], errors="coerce")
    for col in ["classification1", "classification2", "account_name",
                "branch", "division", "accounting_class", "entry_type"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().replace({"nan": None, "": None})

    df.to_sql("trial_balance", conn, if_exists="replace", index=True, index_label="id")
    conn.commit()
    print(f"  [OK] trial_balance: {len(df):,} rows")
    return df


def ingest_sales(conn):
    print("\n[3/4] Sales ledger loading...")
    filepath = DATA_DIR / "\ub9e4\ucd9c\uc7a5.xlsx"  # 매출장.xlsx
    df = pd.read_excel(filepath, engine="openpyxl", dtype=str)
    cols = list(df.columns)
    print(f"  Columns ({len(cols)}): {cols}")

    col_map = {
        cols[0]: "vendor",
        cols[1]: "product_name",
        cols[2]: "product_category",
        cols[3]: "spec",
        cols[4]: "region",
        cols[5]: "district",
        cols[6]: "date",
        cols[7]: "quantity",
        cols[8]: "amount",
    }
    if len(cols) > 12:
        col_map[cols[12]] = "sales_key"
    if len(cols) > 13:
        col_map[cols[13]] = "period"
    if len(cols) > 14:
        col_map[cols[14]] = "cumulative_amount"

    df = df.rename(columns=col_map)
    keep = ["vendor", "product_name", "product_category", "spec",
            "region", "district", "date", "quantity", "amount",
            "sales_key", "period", "cumulative_amount"]
    df = df[[c for c in keep if c in df.columns]].copy()

    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce")
    if "cumulative_amount" in df.columns:
        df["cumulative_amount"] = pd.to_numeric(df["cumulative_amount"], errors="coerce")

    for col in ["vendor", "product_name", "product_category", "region", "district"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().replace({"nan": None, "": None})

    df = df.dropna(subset=["date"]).reset_index(drop=True)
    print(f"  Rows: {len(df):,}")
    print(f"  product_category unique: {list(df['product_category'].dropna().unique())}")
    print(f"  region unique: {list(df['region'].dropna().unique()[:10])}")

    df.to_sql("sales_ledger", conn, if_exists="replace", index=True, index_label="id",
              chunksize=10000)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_ledger(date)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_vendor ON sales_ledger(vendor)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_category ON sales_ledger(product_category)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_region ON sales_ledger(region)")
    conn.commit()
    print(f"  [OK] sales_ledger: {len(df):,} rows")
    return df


def ingest_plan(conn):
    print("\n[4/4] Business plan loading...")
    filepath = DATA_DIR / "\uc0ac\uc5c5\uacc4\ud68d.xlsx"  # 사업계획.xlsx
    df = pd.read_excel(filepath, engine="openpyxl", dtype=str)
    cols = list(df.columns)

    col_map = {cols[0]: "date", cols[1]: "amount", cols[2]: "item"}
    df = df.rename(columns=col_map)
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["item"] = df["item"].astype(str).str.strip()
    df = df.dropna(subset=["date", "item"]).reset_index(drop=True)

    df.to_sql("business_plan", conn, if_exists="replace", index=True, index_label="id")
    conn.commit()
    print(f"  [OK] business_plan: {len(df):,} rows")
    print(f"  item unique: {list(df['item'].unique())}")
    return df


def verify(conn):
    print("\n[VERIFY] Row counts:")
    for tbl in ["journal_entries", "trial_balance", "sales_ledger", "business_plan"]:
        cnt = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        print(f"  {tbl}: {cnt:,}")

    row = conn.execute("""
        SELECT COUNT(DISTINCT je.account_code) as matched,
               (SELECT COUNT(DISTINCT account_code) FROM trial_balance) as total_tb
        FROM journal_entries je
        INNER JOIN trial_balance tb ON je.account_code = tb.account_code
    """).fetchone()
    print(f"  JE<->TB account match: {row[0]}/{row[1]}")


def print_classification_summary(conn):
    print("\n[INFO] classification1 unique values (for config.py):")
    rows = conn.execute(
        "SELECT DISTINCT classification1 FROM journal_entries WHERE classification1 IS NOT NULL ORDER BY 1"
    ).fetchall()
    for r in rows:
        print(f"  - {r[0]}")
    print("\n[INFO] entry_type distribution:")
    rows = conn.execute(
        "SELECT entry_type, COUNT(*) as cnt FROM journal_entries GROUP BY entry_type ORDER BY cnt DESC"
    ).fetchall()
    for r in rows:
        print(f"  {r[0]}: {r[1]:,}")


if __name__ == "__main__":
    print("=" * 60)
    print("  EasyView - Data Ingestion")
    print("=" * 60)

    conn = get_conn()
    drop_tables(conn)

    ingest_je(conn)
    ingest_tb(conn)
    ingest_sales(conn)
    ingest_plan(conn)
    verify(conn)
    print_classification_summary(conn)
    conn.close()

    print("\n[DONE] All data loaded!")
    print(f"   DB: {DB_PATH}")
