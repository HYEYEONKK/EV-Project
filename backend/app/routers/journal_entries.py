import sqlite3
from pathlib import Path
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/journal-entries", tags=["Journal Entries"])

DB_PATH = Path(__file__).parent.parent.parent / "data" / "easyview.db"


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


@router.get("/monthly-trend")
def monthly_trend(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    division: Optional[list[str]] = Query(default=[]),
    branch: Optional[list[str]] = Query(default=[]),
):
    conn = get_conn()
    try:
        clauses = []
        args = []
        if date_from:
            clauses.append("date >= ?")
            args.append(date_from)
        if date_to:
            clauses.append("date <= ?")
            args.append(date_to)
        if division:
            placeholders = ",".join("?" * len(division))
            clauses.append(f"division IN ({placeholders})")
            args.extend(division)
        if branch:
            placeholders = ",".join("?" * len(branch))
            clauses.append(f"branch IN ({placeholders})")
            args.extend(branch)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

        rows = conn.execute(f"""
            SELECT
                strftime('%Y-%m', date) as month,
                entry_type,
                branch,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE 0 END) as debit_total,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE 0 END) as credit_total,
                COUNT(*) as count
            FROM journal_entries
            {where}
            GROUP BY month, entry_type, branch
            ORDER BY month
        """, args).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/dimensions")
def dimensions():
    conn = get_conn()
    try:
        return {
            "divisions": [r[0] for r in conn.execute(
                "SELECT DISTINCT division FROM journal_entries WHERE division IS NOT NULL ORDER BY division"
            ).fetchall()],
            "branches": [r[0] for r in conn.execute(
                "SELECT DISTINCT branch FROM journal_entries WHERE branch IS NOT NULL ORDER BY branch"
            ).fetchall()],
            "entry_types": [r[0] for r in conn.execute(
                "SELECT DISTINCT entry_type FROM journal_entries WHERE entry_type IS NOT NULL ORDER BY entry_type"
            ).fetchall()],
            "date_range": dict(conn.execute(
                "SELECT MIN(date) as min_date, MAX(date) as max_date FROM journal_entries"
            ).fetchone()),
        }
    finally:
        conn.close()


@router.get("/account-trend")
def account_trend(
    account_codes: Optional[list[str]] = Query(default=[]),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """특정 계정코드들의 월별 추이"""
    conn = get_conn()
    try:
        clauses = []
        args = []
        if date_from:
            clauses.append("date >= ?")
            args.append(date_from)
        if date_to:
            clauses.append("date <= ?")
            args.append(date_to)
        if account_codes:
            placeholders = ",".join("?" * len(account_codes))
            clauses.append(f"account_code IN ({placeholders})")
            args.extend(account_codes)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

        rows = conn.execute(f"""
            SELECT
                strftime('%Y-%m', date) as month,
                account_code,
                classification1,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net_amount
            FROM journal_entries
            {where}
            GROUP BY month, account_code, classification1
            ORDER BY month, account_code
        """, args).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/accounts")
def list_accounts(entry_type: Optional[str] = Query(None)):
    """계정 목록 (필터용)"""
    conn = get_conn()
    try:
        clauses = ["account_code IS NOT NULL"]
        args = []
        if entry_type:
            clauses.append("entry_type = ?")
            args.append(entry_type)
        where = "WHERE " + " AND ".join(clauses)
        rows = conn.execute(f"""
            SELECT DISTINCT account_code, classification1, entry_type
            FROM journal_entries
            {where}
            ORDER BY account_code
        """, args).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
