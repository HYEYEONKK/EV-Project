import sqlite3
from pathlib import Path
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/journal-entries", tags=["Journal Entries"])

from app.database import DB_PATH  # centralized DB path


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


# ── 전표분석 전용 엔드포인트 ──────────────────────────────────

def _base_clauses(date_from, date_to):
    clauses, args = [], []
    if date_from:
        clauses.append("date >= ?"); args.append(date_from)
    if date_to:
        clauses.append("date <= ?"); args.append(date_to)
    return clauses, args


@router.get("/kpi-summary")
def kpi_summary(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: Optional[str] = Query(None),
):
    conn = get_conn()
    try:
        clauses, args = _base_clauses(date_from, date_to)
        if account and account != "모두":
            clauses.append("classification1 = ?"); args.append(account)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        row = conn.execute(f"""
            SELECT
                COUNT(DISTINCT je_number) as je_count,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE 0 END) as debit_total,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE 0 END) as credit_total
            FROM journal_entries {where}
        """, args).fetchone()
        return dict(row)
    finally:
        conn.close()


@router.get("/daily-trend")
def daily_trend(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: Optional[str] = Query(None),
):
    conn = get_conn()
    try:
        clauses, args = _base_clauses(date_from, date_to)
        if account and account != "모두":
            clauses.append("classification1 = ?"); args.append(account)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = conn.execute(f"""
            SELECT
                date,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE 0 END) as debit_total,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE 0 END) as credit_total,
                COUNT(*) as count
            FROM journal_entries {where}
            GROUP BY date ORDER BY date
        """, args).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/by-account")
def by_account(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_n: int = Query(10),
    account: Optional[str] = Query(None),
    metric: Optional[str] = Query("credit"),  # "credit" | "debit" | "count"
):
    conn = get_conn()
    try:
        clauses, args = _base_clauses(date_from, date_to)
        if account and account != "모두":
            clauses.append("classification1 = ?"); args.append(account)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        order_col = "credit_total" if metric == "credit" else ("debit_total" if metric == "debit" else "count")
        rows = conn.execute(f"""
            SELECT
                classification1 as account,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE 0 END) as credit_total,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE 0 END) as debit_total,
                COUNT(*) as count
            FROM journal_entries {where}
            GROUP BY classification1
            ORDER BY {order_col} DESC
            LIMIT ?
        """, args + [top_n]).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/by-vendor")
def by_vendor(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_n: int = Query(10),
    account: Optional[str] = Query(None),
    metric: Optional[str] = Query("credit"),  # "credit" | "debit" | "count"
):
    conn = get_conn()
    try:
        clauses, args = _base_clauses(date_from, date_to)
        if account and account != "모두":
            clauses.append("classification1 = ?"); args.append(account)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        order_col = "credit_total" if metric == "credit" else ("debit_total" if metric == "debit" else "count")
        rows = conn.execute(f"""
            SELECT
                department as vendor,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE 0 END) as credit_total,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE 0 END) as debit_total,
                COUNT(*) as count
            FROM journal_entries {where}
            GROUP BY department
            ORDER BY {order_col} DESC
            LIMIT ?
        """, args + [top_n]).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/list")
def list_entries(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(200),
):
    conn = get_conn()
    try:
        clauses, args = _base_clauses(date_from, date_to)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = conn.execute(f"""
            SELECT date, je_number, classification1 as account, department as vendor,
                   '' as vendor_translated, description as memo, '' as memo_translated,
                   CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit,
                   CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit
            FROM journal_entries {where}
            ORDER BY date DESC, je_number
            LIMIT ?
        """, args + [limit]).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/search")
def search_entries(
    account: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(200),
):
    conn = get_conn()
    try:
        clauses, args = _base_clauses(date_from, date_to)
        if account and account != "모두":
            clauses.append("classification1 = ?"); args.append(account)
        if vendor and vendor != "모두":
            clauses.append("department = ?"); args.append(vendor)
        if keyword:
            clauses.append("(classification1 LIKE ? OR department LIKE ? OR description LIKE ?)")
            args += [f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"]
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = conn.execute(f"""
            SELECT date, je_number, classification1 as account, department as vendor,
                   description as memo,
                   CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit,
                   CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit
            FROM journal_entries {where}
            ORDER BY date DESC, je_number
            LIMIT ?
        """, args + [limit]).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/counter-accounts")
def counter_accounts(
    je_numbers: Optional[list[str]] = Query(default=[]),
    exclude_account: Optional[str] = Query(None),
):
    """주어진 전표번호들의 상대계정 집계"""
    if not je_numbers:
        return []
    conn = get_conn()
    try:
        placeholders = ",".join("?" * len(je_numbers))
        clauses = [f"je_number IN ({placeholders})"]
        args = list(je_numbers)
        if exclude_account:
            clauses.append("classification1 != ?"); args.append(exclude_account)
        where = "WHERE " + " AND ".join(clauses)
        rows = conn.execute(f"""
            SELECT
                classification1 as account,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE 0 END) as debit_total,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE 0 END) as credit_total,
                COUNT(*) as count
            FROM journal_entries {where}
            GROUP BY classification1
            ORDER BY (debit_total + credit_total) DESC
        """, args).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/counter-entries")
def counter_entries(
    je_numbers: Optional[list[str]] = Query(default=[]),
    account: Optional[str] = Query(None),
    limit: int = Query(200),
):
    """상대계정 전표 상세"""
    if not je_numbers:
        return []
    conn = get_conn()
    try:
        placeholders = ",".join("?" * len(je_numbers))
        clauses = [f"je_number IN ({placeholders})"]
        args = list(je_numbers)
        if account:
            clauses.append("classification1 = ?"); args.append(account)
        where = "WHERE " + " AND ".join(clauses)
        rows = conn.execute(f"""
            SELECT date, je_number, classification1 as account, department as vendor,
                   '' as vendor_translated, description as memo, '' as memo_translated,
                   CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit,
                   CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit
            FROM journal_entries {where}
            ORDER BY date DESC, je_number
            LIMIT ?
        """, args + [limit]).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/voucher-dimensions")
def voucher_dimensions(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """전표검색용 계정/거래처 목록"""
    conn = get_conn()
    try:
        clauses, args = _base_clauses(date_from, date_to)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        acct_clauses = clauses + ["classification1 IS NOT NULL"]
        acct_where = "WHERE " + " AND ".join(acct_clauses)
        accounts = [r[0] for r in conn.execute(f"""
            SELECT DISTINCT classification1 FROM journal_entries {acct_where}
            ORDER BY classification1
        """, args).fetchall()]
        dept_clauses = clauses + ["department IS NOT NULL"]
        dept_where = "WHERE " + " AND ".join(dept_clauses)
        vendors = [r[0] for r in conn.execute(f"""
            SELECT DISTINCT department FROM journal_entries {dept_where}
            ORDER BY department
        """, args).fetchall()]
        return {"accounts": accounts, "vendors": vendors}
    finally:
        conn.close()
