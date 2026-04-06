"""
재무제표 계산 서비스
실제 데이터 기반 계층 분류:
  - branch='수익' → 매출액
  - branch='비용' → COGS / SG&A / 기타비용 (keyword 분류)
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "easyview.db"

# ─── 비용 keyword 분류 ────────────────────────────────────────
COGS_KEYWORDS = [
    "매출원가", "원재료비", "재공품", "반제품",
    "재고자산평가손실", "폐기손실",
]
SGA_KEYWORDS_SUFFIX = ["(판)"]  # suffix 기준
SGA_KEYWORDS_INCLUDE = [
    "판매수수료", "판촉", "광고선전비", "운반비",
    "견본비", "샘플", "영업지원",
]
NON_OP_KEYWORDS = [
    "이자수익", "이자비용", "외화환산", "외환차익", "외환차손",
    "기부금", "유형자산처분", "잡이익", "잡손실", "파생상품",
    "(기타)", "법인세",
]


def _classify_expense(cls1: str) -> str:
    """classification1 → 비용 분류"""
    if not cls1:
        return "기타비용"
    c = cls1.strip()
    for kw in NON_OP_KEYWORDS:
        if kw in c:
            return "기타손익"
    for kw in COGS_KEYWORDS:
        if kw in c:
            return "매출원가"
    for suf in SGA_KEYWORDS_SUFFIX:
        if c.endswith(suf) or suf in c:
            return "판매비와관리비"
    for kw in SGA_KEYWORDS_INCLUDE:
        if kw in c:
            return "판매비와관리비"
    if "(제)" in c:
        return "매출원가"
    return "판매비와관리비"  # 나머지 비용은 SG&A로


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# ─── Balance Sheet ───────────────────────────────────────────

def get_balance_sheet(params: dict) -> dict:
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        rows = conn.execute("""
            SELECT
                account_code,
                classification1,
                division,
                branch,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net_movement
            FROM journal_entries
            WHERE entry_type='BS'
              AND date >= ? AND date <= ?
            GROUP BY account_code, classification1, division, branch
        """, (date_from, date_to)).fetchall()

        tb = {r["account_code"]: r["balance"] for r in
              conn.execute("SELECT account_code, balance FROM trial_balance").fetchall()}

        assets_current, assets_noncurrent = [], []
        liab_current, liab_noncurrent = [], []
        equity_items = []

        for row in rows:
            branch = row["branch"] or ""
            division = row["division"] or ""
            cls1 = row["classification1"] or "기타"
            net = row["net_movement"] or 0
            tb_bal = tb.get(row["account_code"], 0) or 0
            amount = tb_bal + net

            if branch == "자산":
                if division == "유동자산":
                    assets_current.append({"account": cls1, "amount": amount})
                else:
                    assets_noncurrent.append({"account": cls1, "amount": amount})
            elif branch == "부채":
                if division == "유동부채":
                    liab_current.append({"account": cls1, "amount": amount})
                else:
                    liab_noncurrent.append({"account": cls1, "amount": amount})
            else:
                equity_items.append({"account": cls1, "amount": amount})

        def sub(items): return sum(i["amount"] for i in items)

        ca = sub(assets_current)
        nca = sub(assets_noncurrent)
        total_assets = ca + nca
        cl = sub(liab_current)
        ncl = sub(liab_noncurrent)
        total_liab = cl + ncl
        total_equity = total_assets - total_liab

        return {
            "assets": {
                "current": {"items": assets_current, "subtotal": ca},
                "noncurrent": {"items": assets_noncurrent, "subtotal": nca},
                "total": total_assets,
            },
            "liabilities": {
                "current": {"items": liab_current, "subtotal": cl},
                "noncurrent": {"items": liab_noncurrent, "subtotal": ncl},
                "total": total_liab,
            },
            "equity": {
                "items": equity_items,
                "total": total_equity,
            },
            "total_liabilities_equity": total_liab + total_equity,
        }
    finally:
        conn.close()


# ─── Income Statement (PL) ───────────────────────────────────

def get_income_statement(params: dict) -> dict:
    conn = get_conn()
    try:
        args = []
        clauses = ["entry_type='PL'"]
        if params.get("date_from"):
            clauses.append("date >= ?")
            args.append(params["date_from"])
        if params.get("date_to"):
            clauses.append("date <= ?")
            args.append(params["date_to"])
        where = "WHERE " + " AND ".join(clauses)

        rows = conn.execute(f"""
            SELECT
                branch,
                classification1,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net_amount
            FROM journal_entries
            {where}
            GROUP BY branch, classification1
            ORDER BY branch, classification1
        """, args).fetchall()

        revenue_items = []
        cogs_items = []
        sga_items = []
        other_items = []  # 기타손익 (비영업)

        for row in rows:
            branch = row["branch"] or ""
            cls1 = row["classification1"] or "기타"
            net = row["net_amount"] or 0

            if branch == "수익":
                revenue_items.append({"account": cls1, "amount": net})
            elif branch == "비용":
                expense_amount = abs(net)  # 비용 = 양수로 표시
                category = _classify_expense(cls1)
                if category == "매출원가":
                    cogs_items.append({"account": cls1, "amount": expense_amount})
                elif category == "판매비와관리비":
                    sga_items.append({"account": cls1, "amount": expense_amount})
                else:  # 기타손익
                    other_items.append({"account": cls1, "amount": -expense_amount})
            # 손익대체는 집계에서 제외 (내부 대체 분개)

        total_revenue = sum(i["amount"] for i in revenue_items)
        total_cogs = sum(i["amount"] for i in cogs_items)
        gross_profit = total_revenue - total_cogs
        total_sga = sum(i["amount"] for i in sga_items)
        operating_income = gross_profit - total_sga
        total_other = sum(i["amount"] for i in other_items)  # 음수 = 비용
        net_income = operating_income + total_other

        return {
            "revenue": {"items": revenue_items, "total": total_revenue},
            "cogs": {"items": cogs_items, "total": total_cogs},
            "gross_profit": gross_profit,
            "gross_margin_pct": round(gross_profit / total_revenue * 100, 2) if total_revenue else 0,
            "sga": {"items": sga_items, "total": total_sga},
            "operating_income": operating_income,
            "operating_margin_pct": round(operating_income / total_revenue * 100, 2) if total_revenue else 0,
            "other": {"items": other_items, "total": total_other},
            "net_income": net_income,
            "net_margin_pct": round(net_income / total_revenue * 100, 2) if total_revenue else 0,
        }
    finally:
        conn.close()


def get_income_statement_monthly(params: dict) -> list:
    """월별 PL 집계 (차트용)"""
    conn = get_conn()
    try:
        args = []
        clauses = ["entry_type='PL'"]
        if params.get("date_from"):
            clauses.append("date >= ?")
            args.append(params["date_from"])
        if params.get("date_to"):
            clauses.append("date <= ?")
            args.append(params["date_to"])
        where = "WHERE " + " AND ".join(clauses)

        rows = conn.execute(f"""
            SELECT
                strftime('%Y-%m', date) as month,
                branch,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net_amount
            FROM journal_entries
            {where}
            GROUP BY month, branch
            ORDER BY month
        """, args).fetchall()

        monthly: dict = {}
        for row in rows:
            m = row["month"]
            if m not in monthly:
                monthly[m] = {"month": m, "revenue": 0, "expense": 0}
            net = row["net_amount"] or 0
            if row["branch"] == "수익":
                monthly[m]["revenue"] += net
            elif row["branch"] == "비용":
                monthly[m]["expense"] += abs(net)

        result = []
        cumulative = 0
        for m, d in sorted(monthly.items()):
            d["gross_profit"] = d["revenue"] - d["expense"]
            cumulative += d["revenue"]
            d["cumulative_revenue"] = cumulative
            result.append(d)
        return result
    finally:
        conn.close()


# ─── Cash Flow ───────────────────────────────────────────────

def get_cash_flow(params: dict) -> dict:
    conn = get_conn()
    try:
        args = []
        clauses = []
        if params.get("date_from"):
            clauses.append("date >= ?")
            args.append(params["date_from"])
        if params.get("date_to"):
            clauses.append("date <= ?")
            args.append(params["date_to"])
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

        rows = conn.execute(f"""
            SELECT
                division,
                branch,
                classification1,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net_flow
            FROM journal_entries
            {where}
            GROUP BY division, branch, classification1
            ORDER BY division, classification1
        """, args).fetchall()

        cf: dict[str, list] = {"영업활동": [], "투자활동": [], "재무활동": []}
        DIVISION_CF_MAP = {
            "유동자산": "영업활동",
            "유동부채": "영업활동",
            "비유동자산": "투자활동",
            "비유동부채": "재무활동",
            "수익": "영업활동",
            "비용": "영업활동",
            "손익대체": "영업활동",
        }

        for row in rows:
            div = row["division"] or ""
            cls1 = row["classification1"] or "기타"
            flow = row["net_flow"] or 0
            category = DIVISION_CF_MAP.get(div, "영업활동")
            cf[category].append({"account": cls1, "division": div, "amount": flow})

        def total(items): return sum(i["amount"] for i in items)

        operating = total(cf["영업활동"])
        investing = total(cf["투자활동"])
        financing = total(cf["재무활동"])

        return {
            "operating": {"items": cf["영업활동"], "total": operating},
            "investing": {"items": cf["투자활동"], "total": investing},
            "financing": {"items": cf["재무활동"], "total": financing},
            "net_change": operating + investing + financing,
        }
    finally:
        conn.close()
