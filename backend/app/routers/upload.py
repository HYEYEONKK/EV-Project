"""
Upload API — Excel files -> SQLite ingestion
POST /api/v1/upload
Accepts journalFile (JE) and trialFile (TB) as multipart form data.
Ingests them into easyview.db so the dashboard can display the data.
"""
import sqlite3
from pathlib import Path
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

router = APIRouter(tags=["upload"])

from app.database import DB_PATH  # centralized DB path
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")
    return conn


def ingest_je(conn, filepath: Path):
    """Journal Entry Excel -> journal_entries table"""
    df = pd.read_excel(filepath, engine="openpyxl", dtype=str)
    cols = list(df.columns)

    if len(cols) < 17:
        raise HTTPException(status_code=400, detail=f"분개장 파일의 컬럼 수가 부족합니다 ({len(cols)}개). 최소 17개 필요.")

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

    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").abs()

    def normalize_dc(val):
        if pd.isna(val):
            return None
        v = str(val).strip()
        dc_map = {"D": "D", "C": "C", "d": "D", "c": "C"}
        if v in dc_map:
            return dc_map[v]
        if v and v[0] in ("차", "대"):
            return "D" if v[0] == "차" else "C"
        return v[:1].upper() if v else None

    df["debit_credit"] = df["debit_credit"].str.strip().map(normalize_dc)

    for col in ["account_code", "division", "branch", "entry_type",
                "classification1", "classification2", "classification3",
                "classification4", "cost_center"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"nan": None, "None": None, "": None})

    df = df.dropna(subset=["date", "amount", "account_code"]).reset_index(drop=True)
    df.index.name = "id"
    df = df.reset_index()

    df.to_sql("journal_entries", conn, if_exists="replace", index=False)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(date)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_date_type ON journal_entries(date, entry_type)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_account ON journal_entries(account_code)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_division ON journal_entries(division)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_branch ON journal_entries(branch)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_je_entry_type ON journal_entries(entry_type)")
    conn.commit()
    return len(df)


def ingest_tb(conn, filepath: Path):
    """Trial Balance Excel -> trial_balance table"""
    df = pd.read_excel(filepath, engine="openpyxl", dtype=str)
    cols = list(df.columns)

    if len(cols) < 10:
        raise HTTPException(status_code=400, detail=f"시산표 파일의 컬럼 수가 부족합니다 ({len(cols)}개). 최소 10개 필요.")

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
    return len(df)


@router.post("/upload")
async def upload_files(
    journalFile: UploadFile = File(...),
    trialFile: UploadFile = File(...),
    baseMonth: str = Form(""),
    company: str = Form(""),
):
    """Upload JE + TB Excel files and ingest into SQLite DB"""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Save uploaded files
    je_path = UPLOAD_DIR / "JE.xlsx"
    tb_path = UPLOAD_DIR / "TB.xlsx"

    je_content = await journalFile.read()
    tb_content = await trialFile.read()

    je_path.write_bytes(je_content)
    tb_path.write_bytes(tb_content)

    # Ingest into SQLite
    conn = get_conn()
    try:
        je_rows = ingest_je(conn, je_path)
        tb_rows = ingest_tb(conn, tb_path)
    except HTTPException:
        conn.close()
        raise
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"데이터 처리 중 오류가 발생했습니다: {str(e)}")
    finally:
        conn.close()

    # Parse baseMonth
    try:
        dt = datetime.strptime(baseMonth, "%Y-%m")
        year, month = dt.year, dt.month
    except Exception:
        now = datetime.now()
        year, month = now.year, now.month

    return {
        "success": True,
        "year": year,
        "month": month,
        "company": company,
        "journal_entries": je_rows,
        "trial_balance": tb_rows,
    }
