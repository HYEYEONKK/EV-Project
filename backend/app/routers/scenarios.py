"""
시나리오 분석 라우터 — 7가지 이상 전표 탐지 (최적화 버전)
"""
from fastapi import APIRouter, Query
from typing import Optional
from app.database import engine
from sqlalchemy import text

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


def _ensure_indexes():
    """최초 1회 인덱스 생성 (이미 있으면 무시)"""
    with engine.connect() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(date)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_je_date_amount ON journal_entries(date, amount)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_je_jenum ON journal_entries(je_number)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_je_dc ON journal_entries(debit_credit)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_je_dept ON journal_entries(department)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_je_etype ON journal_entries(entry_type)"))
        conn.commit()

_ensure_indexes()


def _w(date_from, date_to, min_amount=None, max_amount=None, pfx=""):
    """WHERE 절 빌더. pfx='j' → j.date >= :date_from ..."""
    p = f"{pfx}." if pfx else ""
    c, a = [], {}
    if date_from: c.append(f"{p}date >= :df"); a["df"] = date_from
    if date_to:   c.append(f"{p}date <= :dt"); a["dt"] = date_to
    if min_amount is not None: c.append(f"{p}amount >= :mn"); a["mn"] = min_amount
    if max_amount is not None: c.append(f"{p}amount <= :mx"); a["mx"] = max_amount
    return (" AND ".join(c) if c else "1=1"), a


def _w2(date_from, date_to, min_amount=None, max_amount=None, pfx=""):
    """두번째 WHERE용 (파라미터 이름 충돌 방지)"""
    p = f"{pfx}." if pfx else ""
    c, a = [], {}
    if date_from: c.append(f"{p}date >= :df2"); a["df2"] = date_from
    if date_to:   c.append(f"{p}date <= :dt2"); a["dt2"] = date_to
    if min_amount is not None: c.append(f"{p}amount >= :mn2"); a["mn2"] = min_amount
    if max_amount is not None: c.append(f"{p}amount <= :mx2"); a["mx2"] = max_amount
    return (" AND ".join(c) if c else "1=1"), a


def _to_list(rows):
    return [dict(r._mapping) for r in rows]


# ─── 시나리오 1: 동일금액 중복전표 (단일 JOIN) ──────────────

def _s1_summary(c, df, dt, mn, mx):
    w1, a1 = _w(df, dt, mn, mx)
    w2, a2 = _w2(df, dt, mn, mx, "j")
    return _to_list(c.execute(text(f"""
        SELECT strftime('%Y-%m', j.date) as month, COUNT(DISTINCT j.je_number) as count, SUM(j.amount) as amount
        FROM journal_entries j
        INNER JOIN (SELECT date, amount FROM journal_entries WHERE {w1} GROUP BY date, amount HAVING COUNT(DISTINCT je_number) > 1) dup
        ON j.date = dup.date AND j.amount = dup.amount
        WHERE {w2} GROUP BY month ORDER BY month
    """), {**a1, **a2}))

def _s1_entries(c, df, dt, mn, mx, lim):
    w1, a1 = _w(df, dt, mn, mx)
    w2, a2 = _w2(df, dt, mn, mx, "j")
    return _to_list(c.execute(text(f"""
        SELECT j.date, j.je_number, j.classification1 as account, j.department as vendor, j.description as memo,
               CASE WHEN j.debit_credit='D' THEN j.amount ELSE 0 END as debit,
               CASE WHEN j.debit_credit='C' THEN j.amount ELSE 0 END as credit
        FROM journal_entries j
        INNER JOIN (SELECT date, amount FROM journal_entries WHERE {w1} GROUP BY date, amount HAVING COUNT(DISTINCT je_number) > 1) dup
        ON j.date = dup.date AND j.amount = dup.amount
        WHERE {w2} ORDER BY j.date DESC, j.je_number LIMIT :lim
    """), {**a1, **a2, "lim": lim}))


# ─── 시나리오 2: 현금지급 후 동일금액 부채인식 ──────────────

def _s2_subquery():
    return """je_number IN (
        SELECT a.je_number FROM journal_entries a
        WHERE a.debit_credit='C' AND (a.classification1 LIKE '%현금%' OR a.classification1 LIKE '%보통예금%')
        INTERSECT
        SELECT b.je_number FROM journal_entries b
        WHERE b.debit_credit='D' AND (b.classification1 LIKE '%부채%' OR b.classification1 LIKE '%미지급%' OR b.classification1 LIKE '%선수%')
    )"""

def _s2_summary(c, df, dt, mn, mx):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"""
        SELECT strftime('%Y-%m', date) as month, COUNT(DISTINCT je_number) as count, SUM(amount) as amount
        FROM journal_entries WHERE {w} AND {_s2_subquery()} GROUP BY month ORDER BY month
    """), a))

def _s2_entries(c, df, dt, mn, mx, lim):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"""
        SELECT date, je_number, classification1 as account, department as vendor, description as memo,
               CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit,
               CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit
        FROM journal_entries WHERE {w} AND {_s2_subquery()} ORDER BY date DESC, je_number LIMIT :lim
    """), {**a, "lim": lim}))


# ─── 시나리오 3: 주말 현금지급 ──────────────────────────────

_S3 = "strftime('%w', date) IN ('0','6') AND debit_credit='C' AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')"

def _s3_summary(c, df, dt, mn, mx):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"SELECT strftime('%Y-%m', date) as month, COUNT(DISTINCT je_number) as count, SUM(amount) as amount FROM journal_entries WHERE {w} AND {_S3} GROUP BY month ORDER BY month"), a))

def _s3_entries(c, df, dt, mn, mx, lim):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"SELECT date, je_number, classification1 as account, department as vendor, description as memo, CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit, CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit FROM journal_entries WHERE {w} AND {_S3} ORDER BY date DESC, je_number LIMIT :lim"), {**a, "lim": lim}))


# ─── 시나리오 4: 고액 현금전표 ──────────────────────────────

_S4 = "amount > 1000000000 AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')"

def _s4_summary(c, df, dt, mn, mx):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"SELECT strftime('%Y-%m', date) as month, COUNT(DISTINCT je_number) as count, SUM(amount) as amount FROM journal_entries WHERE {w} AND {_S4} GROUP BY month ORDER BY month"), a))

def _s4_entries(c, df, dt, mn, mx, lim):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"SELECT date, je_number, classification1 as account, department as vendor, description as memo, CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit, CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit FROM journal_entries WHERE {w} AND {_S4} ORDER BY date DESC, je_number LIMIT :lim"), {**a, "lim": lim}))


# ─── 시나리오 5: 비용인식+현금지급 동시 ─────────────────────

def _s5_subquery():
    return """je_number IN (
        SELECT a.je_number FROM journal_entries a WHERE a.entry_type='PL' AND a.debit_credit='D'
        INTERSECT
        SELECT b.je_number FROM journal_entries b WHERE b.entry_type='BS' AND b.debit_credit='C'
            AND (b.classification1 LIKE '%현금%' OR b.classification1 LIKE '%보통예금%')
    )"""

def _s5_summary(c, df, dt, mn, mx):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"SELECT strftime('%Y-%m', date) as month, COUNT(DISTINCT je_number) as count, SUM(amount) as amount FROM journal_entries WHERE {w} AND {_s5_subquery()} GROUP BY month ORDER BY month"), a))

def _s5_entries(c, df, dt, mn, mx, lim):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"SELECT date, je_number, classification1 as account, department as vendor, description as memo, CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit, CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit FROM journal_entries WHERE {w} AND {_s5_subquery()} ORDER BY date DESC, je_number LIMIT :lim"), {**a, "lim": lim}))


# ─── 시나리오 6: 저빈도 거래처 ──────────────────────────────

def _s6_summary(c, df, dt, mn, mx):
    w1, a1 = _w(df, dt, mn, mx, "j")
    w2, a2 = _w2(df, dt, mn, mx)
    return _to_list(c.execute(text(f"""
        SELECT strftime('%Y-%m', j.date) as month, COUNT(DISTINCT j.je_number) as count, SUM(j.amount) as amount
        FROM journal_entries j
        INNER JOIN (SELECT department FROM journal_entries WHERE {w2} AND department IS NOT NULL AND department != '' GROUP BY department HAVING COUNT(DISTINCT je_number) <= 3) sel
        ON j.department = sel.department
        WHERE {w1} GROUP BY month ORDER BY month
    """), {**a1, **a2}))

def _s6_entries(c, df, dt, mn, mx, lim):
    w1, a1 = _w(df, dt, mn, mx, "j")
    w2, a2 = _w2(df, dt, mn, mx)
    return _to_list(c.execute(text(f"""
        SELECT j.date, j.je_number, j.classification1 as account, j.department as vendor, j.description as memo,
               CASE WHEN j.debit_credit='D' THEN j.amount ELSE 0 END as debit,
               CASE WHEN j.debit_credit='C' THEN j.amount ELSE 0 END as credit
        FROM journal_entries j
        INNER JOIN (SELECT department FROM journal_entries WHERE {w2} AND department IS NOT NULL AND department != '' GROUP BY department HAVING COUNT(DISTINCT je_number) <= 3) sel
        ON j.department = sel.department
        WHERE {w1} ORDER BY j.date DESC, j.je_number LIMIT :lim
    """), {**a1, **a2, "lim": lim}))


# ─── 시나리오 7: 주말/비정상 요일 전표 ──────────────────────

_S7 = "strftime('%w', date) IN ('0','6')"

def _s7_summary(c, df, dt, mn, mx):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"SELECT strftime('%Y-%m', date) as month, COUNT(DISTINCT je_number) as count, SUM(amount) as amount FROM journal_entries WHERE {w} AND {_S7} GROUP BY month ORDER BY month"), a))

def _s7_entries(c, df, dt, mn, mx, lim):
    w, a = _w(df, dt, mn, mx)
    return _to_list(c.execute(text(f"SELECT date, je_number, classification1 as account, department as vendor, description as memo, CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit, CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit FROM journal_entries WHERE {w} AND {_S7} ORDER BY date DESC, je_number LIMIT :lim"), {**a, "lim": lim}))


# ─── 디스패치 ───────────────────────────────────────────────

_SUM = {1: _s1_summary, 2: _s2_summary, 3: _s3_summary, 4: _s4_summary, 5: _s5_summary, 6: _s6_summary, 7: _s7_summary}
_ENT = {1: _s1_entries, 2: _s2_entries, 3: _s3_entries, 4: _s4_entries, 5: _s5_entries, 6: _s6_entries, 7: _s7_entries}


@router.get("/{scenario_id}/summary")
def scenario_summary(
    scenario_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
):
    if scenario_id not in _SUM:
        return []
    with engine.connect() as conn:
        return _SUM[scenario_id](conn, date_from, date_to, min_amount, max_amount)


@router.get("/{scenario_id}/entries")
def scenario_entries(
    scenario_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    limit: int = Query(200),
):
    if scenario_id not in _ENT:
        return []
    with engine.connect() as conn:
        return _ENT[scenario_id](conn, date_from, date_to, min_amount, max_amount, limit)
