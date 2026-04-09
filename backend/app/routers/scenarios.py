"""
시나리오 분석 라우터 — 7가지 이상 전표 탐지
"""
from fastapi import APIRouter, Query
from typing import Optional
import sqlite3
from pathlib import Path

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

DB_PATH = Path(__file__).parent.parent.parent / "data" / "easyview.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _build_where(date_from, date_to, extra_clauses=None):
    args, clauses = [], []
    if date_from:
        clauses.append("date >= ?")
        args.append(date_from)
    if date_to:
        clauses.append("date <= ?")
        args.append(date_to)
    if extra_clauses:
        clauses.extend(extra_clauses)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, args


# ─── 공통 월별 집계 헬퍼 ──────────────────────────────────────

def _monthly_from_ids(conn, je_ids: list[int], date_from, date_to) -> list:
    """je_ids 목록으로 월별 건수/금액 집계"""
    if not je_ids:
        return []
    placeholders = ",".join("?" * len(je_ids))
    rows = conn.execute(f"""
        SELECT strftime('%Y-%m', date) as month,
               COUNT(DISTINCT je_number) as count,
               SUM(amount) as amount
        FROM journal_entries
        WHERE id IN ({placeholders})
        GROUP BY month ORDER BY month
    """, je_ids).fetchall()
    return [{"month": r["month"], "count": r["count"], "amount": r["amount"] or 0} for r in rows]


# ─── 시나리오 1: 동일금액 중복전표 ───────────────────────────

def _scenario1_ids(conn, date_from, date_to) -> list[int]:
    where, args = _build_where(date_from, date_to)
    dup_keys = conn.execute(f"""
        SELECT date, amount FROM journal_entries {where}
        GROUP BY date, amount
        HAVING COUNT(DISTINCT je_number) > 1
    """, args).fetchall()
    if not dup_keys:
        return []
    id_rows = []
    for dk in dup_keys:
        a2, c2 = list(args) + [dk["date"], dk["amount"]], []
        if date_from: c2.append("date >= ?")
        if date_to: c2.append("date <= ?")
        c2 += ["date=?", "amount=?"]
        w2 = "WHERE " + " AND ".join(c2)
        rows = conn.execute(f"SELECT id FROM journal_entries {w2}", a2).fetchall()
        id_rows.extend(r["id"] for r in rows)
    return list(set(id_rows))


# ─── 시나리오 2: 현금지급 후 동일금액 부채인식 ──────────────

def _scenario2_ids(conn, date_from, date_to) -> list[int]:
    where, args = _build_where(date_from, date_to)
    # 같은 전표번호에 현금(C) + 부채계정(D) 동시 존재
    rows = conn.execute(f"""
        SELECT DISTINCT a.id, b.id as bid
        FROM journal_entries a
        JOIN journal_entries b ON a.je_number = b.je_number AND a.amount = b.amount
        {where.replace('WHERE', 'WHERE a.date >=') if date_from else ''}
    """, args).fetchall() if False else []  # simpler approach below

    # simpler: je_numbers that have both C+현금 and D+부채
    cash_credit = conn.execute(f"""
        SELECT je_number FROM journal_entries {where}
        AND debit_credit='C' AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')
    """.replace(f"{where}\n        AND", f"{where} AND" if where else "WHERE"), args).fetchall() if False else []

    # cleanest approach
    base_where, base_args = _build_where(date_from, date_to)
    cash_je = set()
    if base_where:
        rows = conn.execute(f"""
            SELECT je_number FROM journal_entries {base_where}
            AND debit_credit='C' AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')
        """, base_args).fetchall()
    else:
        rows = conn.execute("""
            SELECT je_number FROM journal_entries
            WHERE debit_credit='C' AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')
        """).fetchall()
    cash_je = {r["je_number"] for r in rows}
    if not cash_je:
        return []

    liability_je = set()
    plh = ",".join("?" * len(cash_je))
    rows2 = conn.execute(f"""
        SELECT je_number FROM journal_entries
        WHERE je_number IN ({plh}) AND debit_credit='D'
        AND (classification1 LIKE '%부채%' OR classification1 LIKE '%미지급%' OR classification1 LIKE '%선수%')
    """, list(cash_je)).fetchall()
    liability_je = {r["je_number"] for r in rows2}

    matched = cash_je & liability_je
    if not matched:
        return []
    plh2 = ",".join("?" * len(matched))
    id_rows = conn.execute(f"SELECT id FROM journal_entries WHERE je_number IN ({plh2})", list(matched)).fetchall()
    return [r["id"] for r in id_rows]


# ─── 시나리오 3: 주말 현금지급 ──────────────────────────────

def _scenario3_ids(conn, date_from, date_to) -> list[int]:
    base_where, base_args = _build_where(date_from, date_to)
    extra = "strftime('%w', date) IN ('0','6') AND debit_credit='C' AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')"
    if base_where:
        sql = f"SELECT id FROM journal_entries {base_where} AND {extra}"
    else:
        sql = f"SELECT id FROM journal_entries WHERE {extra}"
    return [r["id"] for r in conn.execute(sql, base_args).fetchall()]


# ─── 시나리오 4: 고액 현금전표 ──────────────────────────────

def _scenario4_ids(conn, date_from, date_to) -> list[int]:
    base_where, base_args = _build_where(date_from, date_to)
    extra = "amount > 1000000000 AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')"
    if base_where:
        sql = f"SELECT id FROM journal_entries {base_where} AND {extra}"
    else:
        sql = f"SELECT id FROM journal_entries WHERE {extra}"
    return [r["id"] for r in conn.execute(sql, base_args).fetchall()]


# ─── 시나리오 5: 비용인식+현금지급 동시 ─────────────────────

def _scenario5_ids(conn, date_from, date_to) -> list[int]:
    base_where, base_args = _build_where(date_from, date_to)
    # 같은 je_number에 비용(D, entry_type=PL) + 현금(C, entry_type=BS)
    if base_where:
        expense_je = conn.execute(f"""
            SELECT je_number FROM journal_entries {base_where} AND entry_type='PL' AND debit_credit='D'
        """, base_args).fetchall()
    else:
        expense_je = conn.execute("SELECT je_number FROM journal_entries WHERE entry_type='PL' AND debit_credit='D'").fetchall()
    exp_set = {r["je_number"] for r in expense_je}
    if not exp_set:
        return []
    plh = ",".join("?" * len(exp_set))
    cash_rows = conn.execute(f"""
        SELECT je_number FROM journal_entries
        WHERE je_number IN ({plh}) AND entry_type='BS' AND debit_credit='C'
        AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')
    """, list(exp_set)).fetchall()
    matched = {r["je_number"] for r in cash_rows} & exp_set
    if not matched:
        return []
    plh2 = ",".join("?" * len(matched))
    id_rows = conn.execute(f"SELECT id FROM journal_entries WHERE je_number IN ({plh2})", list(matched)).fetchall()
    return [r["id"] for r in id_rows]


# ─── 시나리오 6: 저빈도 거래처 ──────────────────────────────

def _scenario6_ids(conn, date_from, date_to) -> list[int]:
    base_where, base_args = _build_where(date_from, date_to)
    if base_where:
        sql = f"""
            SELECT id FROM journal_entries {base_where}
            AND department IN (
                SELECT department FROM journal_entries {base_where}
                AND department IS NOT NULL AND department != ''
                GROUP BY department HAVING COUNT(DISTINCT je_number) <= 3
            )
        """
        return [r["id"] for r in conn.execute(sql, base_args + base_args).fetchall()]
    else:
        sql = """
            SELECT id FROM journal_entries
            WHERE department IN (
                SELECT department FROM journal_entries
                WHERE department IS NOT NULL AND department != ''
                GROUP BY department HAVING COUNT(DISTINCT je_number) <= 3
            )
        """
        return [r["id"] for r in conn.execute(sql).fetchall()]


# ─── 시나리오 7: 주말/비정상 요일 전표 ──────────────────────

def _scenario7_ids(conn, date_from, date_to) -> list[int]:
    base_where, base_args = _build_where(date_from, date_to)
    extra = "strftime('%w', date) IN ('0','6')"
    if base_where:
        sql = f"SELECT id FROM journal_entries {base_where} AND {extra}"
    else:
        sql = f"SELECT id FROM journal_entries WHERE {extra}"
    return [r["id"] for r in conn.execute(sql, base_args).fetchall()]


SCENARIO_FUNCS = {
    1: _scenario1_ids,
    2: _scenario2_ids,
    3: _scenario3_ids,
    4: _scenario4_ids,
    5: _scenario5_ids,
    6: _scenario6_ids,
    7: _scenario7_ids,
}


# ─── 엔드포인트 ──────────────────────────────────────────────

@router.get("/{scenario_id}/summary")
def scenario_summary(
    scenario_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    if scenario_id not in SCENARIO_FUNCS:
        return []
    conn = get_conn()
    try:
        ids = SCENARIO_FUNCS[scenario_id](conn, date_from, date_to)
        return _monthly_from_ids(conn, ids, date_from, date_to)
    finally:
        conn.close()


@router.get("/{scenario_id}/entries")
def scenario_entries(
    scenario_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(200),
):
    if scenario_id not in SCENARIO_FUNCS:
        return []
    conn = get_conn()
    try:
        ids = SCENARIO_FUNCS[scenario_id](conn, date_from, date_to)
        if not ids:
            return []
        plh = ",".join("?" * len(ids))
        rows = conn.execute(f"""
            SELECT date, je_number, classification1 as account,
                   department as vendor, description as memo,
                   CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit,
                   CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit
            FROM journal_entries
            WHERE id IN ({plh})
            ORDER BY date DESC, je_number
            LIMIT ?
        """, ids + [limit]).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
