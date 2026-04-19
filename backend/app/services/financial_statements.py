"""
재무제표 계산 서비스
실제 데이터 기반 계층 분류:
  - branch='수익' → 매출액
  - branch='비용' → COGS / SG&A / 기타비용 (keyword 분류)
"""
import sqlite3
import datetime
import calendar
from pathlib import Path

from app.database import DB_PATH  # centralized DB path

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


# ─── 공통 헬퍼 ──────────────────────────────────────────────

def _shift_year(date_str: str | None, years: int) -> str | None:
    if not date_str:
        return date_str
    yr = int(date_str[:4]) + years
    return f"{yr}{date_str[4:]}"


# ─── PL 추이분석 ─────────────────────────────────────────────

def get_pl_monthly_by_account(params: dict) -> list:
    """계정별 월별 PL 집계 — 당기 + 전기 비교"""
    conn = get_conn()
    try:
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        prior_from = _shift_year(date_from, -1)
        prior_to = _shift_year(date_to, -1)

        def fetch(df, dt, label):
            args, clauses = ["PL"], ["entry_type=?"]
            if df:
                clauses.append("date >= ?"); args.append(df)
            if dt:
                clauses.append("date <= ?"); args.append(dt)
            where = "WHERE " + " AND ".join(clauses)
            rows = conn.execute(f"""
                SELECT strftime('%Y-%m', date) as month, branch, classification1,
                       SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net_amount
                FROM journal_entries {where}
                GROUP BY month, branch, classification1
                ORDER BY month, classification1
            """, args).fetchall()
            data: dict = {}
            for r in rows:
                key = r["classification1"] or "기타"
                if key not in data:
                    data[key] = {"account": key, "branch": r["branch"] or "", "months": {}}
                m = r["month"]
                if label == "prior":
                    yr = int(m[:4]) + 1
                    m = f"{yr}{m[4:]}"  # prior → current year slot
                data[key]["months"][m] = data[key]["months"].get(m, 0) + (r["net_amount"] or 0)
            return data

        current = fetch(date_from, date_to, "current")
        prior = fetch(prior_from, prior_to, "prior")

        all_accounts = set(current.keys()) | set(prior.keys())
        result = []
        for acct in sorted(all_accounts):
            cd = current.get(acct, {"account": acct, "branch": "", "months": {}})
            pd_ = prior.get(acct, {"months": {}})
            branch = cd.get("branch") or prior.get(acct, {}).get("branch", "")
            all_months = sorted(set(cd["months"]) | set(pd_["months"]))
            monthly = [{"month": m, "current": cd["months"].get(m, 0), "prior": pd_["months"].get(m, 0)} for m in all_months]
            cur_total = sum(cd["months"].values())
            pri_total = sum(pd_["months"].values())
            chg = round((cur_total - pri_total) / abs(pri_total) * 100, 1) if pri_total else 0
            result.append({
                "account": acct, "branch": branch,
                "current_total": cur_total, "prior_total": pri_total,
                "change_pct": chg, "monthly": monthly,
            })
        # PL 계정만 (수익/비용 branch만, 손익대체 등 제외)
        result = [r for r in result if r["branch"] in ("수익", "비용")]

        # category 추가
        CAT_ORDER = {"매출액": 0, "매출원가": 1, "판관비": 2, "금융수익": 3, "금융비용": 4, "기타수익": 5, "기타비용": 6}
        for item in result:
            item["category"] = _classify_7cat(item["branch"], item["account"], item["current_total"])

        # Sort: category order, then by abs(current_total) desc
        result.sort(key=lambda x: (CAT_ORDER.get(x["category"], 99), -abs(x["current_total"])))
        return result
    finally:
        conn.close()


def get_pl_vendor_delta(params: dict, account: str) -> list:
    """선택 계정의 거래처별 당기/전기 증감"""
    conn = get_conn()
    try:
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        prior_from = _shift_year(date_from, -1)
        prior_to = _shift_year(date_to, -1)

        def fetch(df, dt):
            args, clauses = ["PL"], ["entry_type=?"]
            if account:
                clauses.append("classification1=?"); args.append(account)
            if df:
                clauses.append("date >= ?"); args.append(df)
            if dt:
                clauses.append("date <= ?"); args.append(dt)
            where = "WHERE " + " AND ".join(clauses)
            rows = conn.execute(f"""
                SELECT department,
                       SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net
                FROM journal_entries {where}
                GROUP BY department
            """, args).fetchall()
            return {(r["department"] or "미상"): (r["net"] or 0) for r in rows}

        cur = fetch(date_from, date_to)
        pri = fetch(prior_from, prior_to)
        all_vendors = set(cur) | set(pri)
        result = [{"vendor": v, "current": cur.get(v, 0), "prior": pri.get(v, 0), "delta": cur.get(v, 0) - pri.get(v, 0)} for v in all_vendors if v]
        result.sort(key=lambda x: abs(x["delta"]), reverse=True)
        return result[:20]
    finally:
        conn.close()


def get_pl_entries(params: dict, account: str, period: str, limit: int = 100) -> list:
    """계정별 기표 내역 (당기/전기)"""
    conn = get_conn()
    try:
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        if period == "prior":
            date_from = _shift_year(date_from, -1)
            date_to = _shift_year(date_to, -1)
        args, clauses = ["PL"], ["entry_type=?"]
        if account:
            clauses.append("classification1=?"); args.append(account)
        if date_from:
            clauses.append("date >= ?"); args.append(date_from)
        if date_to:
            clauses.append("date <= ?"); args.append(date_to)
        where = "WHERE " + " AND ".join(clauses)
        rows = conn.execute(f"""
            SELECT date, je_number, department as vendor, description as memo,
                   CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit,
                   CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit
            FROM journal_entries {where}
            ORDER BY date DESC LIMIT ?
        """, args + [limit]).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ─── PL KPI 월별 요약 ─────────────────────────────────────────

def get_pl_kpi_monthly(params: dict) -> dict:
    """PL KPI 요약 — 당기/전기 월별 비교"""
    conn = get_conn()
    try:
        date_from = params.get("date_from")
        date_to   = params.get("date_to")
        prior_from = _shift_year(date_from, -1)
        prior_to   = _shift_year(date_to, -1)

        def fetch_monthly(df, dt):
            args, clauses = ["PL"], ["entry_type=?"]
            if df: clauses.append("date >= ?"); args.append(df)
            if dt: clauses.append("date <= ?"); args.append(dt)
            where = "WHERE " + " AND ".join(clauses)
            rows = conn.execute(f"""
                SELECT strftime('%Y-%m', date) as month, branch, classification1,
                       SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net_amount
                FROM journal_entries {where}
                GROUP BY month, branch, classification1
                ORDER BY month
            """, args).fetchall()
            data = {}
            for r in rows:
                m = r["month"]
                if m not in data:
                    data[m] = {"revenue": 0, "cogs": 0, "sga": 0, "other": 0}
                net = r["net_amount"] or 0
                branch = r["branch"] or ""
                cls1 = r["classification1"] or "기타"
                if branch == "수익":
                    data[m]["revenue"] += net
                elif branch == "비용":
                    cat = _classify_expense(cls1)
                    if cat == "매출원가":
                        data[m]["cogs"] += abs(net)
                    elif cat == "판매비와관리비":
                        data[m]["sga"] += abs(net)
                    else:
                        data[m]["other"] += -abs(net)
            result = []
            for m in sorted(data):
                d = data[m]
                rev = d["revenue"]
                gp  = rev - d["cogs"]
                op  = gp - d["sga"]
                net = op + d["other"]
                result.append({
                    "month": m,
                    "revenue": rev,
                    "gross_profit": gp,
                    "operating_income": op,
                    "net_income": net,
                })
            return result

        curr_monthly = fetch_monthly(date_from, date_to)
        prior_monthly_raw = fetch_monthly(prior_from, prior_to)
        prior_map = {}
        for r in prior_monthly_raw:
            m = r["month"]
            yr = int(m[:4]) + 1
            shifted = f"{yr}{m[4:]}"
            prior_map[shifted] = r

        all_months = sorted(set(r["month"] for r in curr_monthly) | set(prior_map.keys()))
        monthly = []
        for m in all_months:
            curr = next((r for r in curr_monthly if r["month"] == m), {})
            prior = prior_map.get(m, {})
            monthly.append({
                "month": m,
                "revenue":          curr.get("revenue", 0),
                "gross_profit":     curr.get("gross_profit", 0),
                "operating_income": curr.get("operating_income", 0),
                "net_income":       curr.get("net_income", 0),
                "prior_revenue":          prior.get("revenue", 0),
                "prior_gross_profit":     prior.get("gross_profit", 0),
                "prior_operating_income": prior.get("operating_income", 0),
                "prior_net_income":       prior.get("net_income", 0),
            })

        def total(lst, key): return sum(r.get(key, 0) for r in lst)
        curr_rev = total(curr_monthly, "revenue")
        curr_gp  = total(curr_monthly, "gross_profit")
        curr_op  = total(curr_monthly, "operating_income")
        curr_net = total(curr_monthly, "net_income")
        prior_rev = total(prior_monthly_raw, "revenue")
        prior_gp  = total(prior_monthly_raw, "gross_profit")
        prior_op  = total(prior_monthly_raw, "operating_income")
        prior_net = total(prior_monthly_raw, "net_income")

        def pct(a, b): return round((a - b) / abs(b) * 100, 1) if b else 0
        def margin(a, r): return round(a / r * 100, 1) if r else 0

        return {
            "summary": {
                "revenue":          {"current": curr_rev,  "prior": prior_rev,  "change_pct": pct(curr_rev,  prior_rev)},
                "gross_profit":     {"current": curr_gp,   "prior": prior_gp,   "change_pct": pct(curr_gp,   prior_gp),  "margin": margin(curr_gp,  curr_rev)},
                "operating_income": {"current": curr_op,   "prior": prior_op,   "change_pct": pct(curr_op,   prior_op),  "margin": margin(curr_op,  curr_rev)},
                "net_income":       {"current": curr_net,  "prior": prior_net,  "change_pct": pct(curr_net,  prior_net), "margin": margin(curr_net, curr_rev)},
            },
            "monthly": monthly,
        }
    finally:
        conn.close()


# ─── PL Waterfall 월별 ───────────────────────────────────────

def get_pl_waterfall_monthly(params: dict) -> list:
    """월별 손익 Waterfall 데이터 — classification1 항목별 분해"""
    conn = get_conn()
    try:
        date_from = params.get("date_from")
        date_to   = params.get("date_to")
        args, clauses = ["PL"], ["entry_type=?"]
        if date_from: clauses.append("date >= ?"); args.append(date_from)
        if date_to:   clauses.append("date <= ?"); args.append(date_to)
        where = "WHERE " + " AND ".join(clauses)

        rows = conn.execute(f"""
            SELECT strftime('%Y-%m', date) as month, branch, classification1,
                   SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net_amount
            FROM journal_entries {where}
            GROUP BY month, branch, classification1
            ORDER BY month, branch, classification1
        """, args).fetchall()

        # 월별 계정 집계
        months: dict = {}
        for r in rows:
            m = r["month"]
            if m not in months:
                months[m] = {}
            cls1   = r["classification1"] or "기타"
            branch = r["branch"] or ""
            net    = r["net_amount"] or 0
            cat    = _classify_expense(cls1) if branch == "비용" else branch

            key = (cls1, cat)
            months[m][key] = months[m].get(key, 0) + net

        result = []
        for m in sorted(months):
            items = []
            rev_total  = 0
            cogs_total = 0
            sga_total  = 0
            other_total = 0

            # 수익 항목
            for (cls1, cat), val in sorted(months[m].items()):
                if cat == "수익":
                    items.append({"label": cls1, "value": val, "type": "revenue"})
                    rev_total += val

            # 비용: 매출원가
            for (cls1, cat), val in sorted(months[m].items()):
                if cat == "매출원가":
                    items.append({"label": cls1, "value": -abs(val), "type": "cogs"})
                    cogs_total += abs(val)

            # 비용: 판관비
            for (cls1, cat), val in sorted(months[m].items()):
                if cat == "판매비와관리비":
                    items.append({"label": cls1, "value": -abs(val), "type": "sga"})
                    sga_total += abs(val)

            # 기타손익
            for (cls1, cat), val in sorted(months[m].items()):
                if cat not in ("수익", "매출원가", "판매비와관리비"):
                    items.append({"label": cls1, "value": val if val > 0 else -abs(val), "type": "other"})
                    other_total += val

            net_income = rev_total - cogs_total - sga_total + other_total
            result.append({
                "month":      m,
                "items":      items,
                "revenue":    rev_total,
                "cogs":       cogs_total,
                "sga":        sga_total,
                "other":      other_total,
                "net_income": net_income,
            })
        return result
    finally:
        conn.close()


# ─── PL Waterfall Bridge (7-category) ───────────────────────

FINANCE_INCOME_KW = ["이자수익", "외환차익", "외화환산이익", "파생상품평가이익", "당기손익인식금융자산"]
FINANCE_EXPENSE_KW = ["이자비용", "외환차손", "외화환산손실", "파생상품평가손실"]
TAX_KW = ["법인세"]


def _classify_7cat(branch: str, cls1: str, net_amount: float) -> str:
    """branch + classification1 → 7개 카테고리 분류"""
    if branch == "수익":
        c = cls1.strip()
        for kw in FINANCE_INCOME_KW:
            if kw in c:
                return "금융수익"
        return "매출액"
    # branch == "비용"
    cat = _classify_expense(cls1)
    if cat == "매출원가":
        return "매출원가"
    if cat == "판매비와관리비":
        return "판관비"
    # 기타손익 → 금융/기타 세분화
    c = cls1.strip()
    for kw in FINANCE_INCOME_KW:
        if kw in c:
            return "금융수익"
    for kw in FINANCE_EXPENSE_KW:
        if kw in c:
            return "금융비용"
    if net_amount >= 0:
        return "기타수익"
    return "기타비용"


def get_pl_waterfall_bridge(params: dict) -> list:
    """손익 Waterfall Bridge — 매출액→매출총이익→영업이익→당기순이익 단계별 분해.

    Uses classification1 keywords to separate financial vs other non-operating
    income/expense. Tax is identified by '법인세' keyword.
    """
    conn = get_conn()
    try:
        date_from = params.get("date_from")
        date_to   = params.get("date_to")
        args, clauses = ["PL"], ["entry_type=?"]
        if date_from: clauses.append("date >= ?"); args.append(date_from)
        if date_to:   clauses.append("date <= ?"); args.append(date_to)
        where = "WHERE " + " AND ".join(clauses)

        rows = conn.execute(f"""
            SELECT branch, classification1,
                   SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net_amount
            FROM journal_entries {where}
            GROUP BY branch, classification1
        """, args).fetchall()

        revenue = 0.0
        cogs = 0.0
        sga = 0.0
        financial_income = 0.0
        financial_expense = 0.0
        other_income = 0.0
        other_expense = 0.0
        income_tax = 0.0

        for r in rows:
            branch = r["branch"] or ""
            cls1 = r["classification1"] or "기타"
            net = r["net_amount"] or 0

            if branch == "수익":
                # Check if this revenue item is actually financial income
                c = cls1.strip()
                if any(kw in c for kw in FINANCE_INCOME_KW):
                    financial_income += net
                else:
                    revenue += net
            elif branch == "비용":
                expense_amount = abs(net)
                cat = _classify_expense(cls1)
                if cat == "매출원가":
                    cogs += expense_amount
                elif cat == "판매비와관리비":
                    sga += expense_amount
                else:
                    # 기타손익 → sub-classify into financial / tax / other
                    c = cls1.strip()
                    if any(kw in c for kw in TAX_KW):
                        income_tax += expense_amount
                    elif any(kw in c for kw in FINANCE_INCOME_KW):
                        financial_income += expense_amount
                    elif any(kw in c for kw in FINANCE_EXPENSE_KW):
                        financial_expense += expense_amount
                    elif net >= 0:
                        other_income += expense_amount
                    else:
                        other_expense += expense_amount

        gross_profit = revenue - cogs
        operating_income = gross_profit - sga
        financial_net = financial_income - financial_expense
        other_net = other_income - other_expense
        net_income = operating_income + financial_net + other_net - income_tax

        return [
            {"name": "매출액",     "value": revenue,          "type": "total"},
            {"name": "매출원가",   "value": -cogs,            "type": "decrease"},
            {"name": "매출총이익", "value": gross_profit,      "type": "subtotal"},
            {"name": "판관비",     "value": -sga,             "type": "decrease"},
            {"name": "영업이익",   "value": operating_income,  "type": "subtotal"},
            {"name": "금융순손익", "value": financial_net,      "type": "increase" if financial_net >= 0 else "decrease"},
            {"name": "기타순손익", "value": other_net,          "type": "increase" if other_net >= 0 else "decrease"},
            {"name": "법인세",     "value": -income_tax,       "type": "decrease"},
            {"name": "당기순이익", "value": net_income,         "type": "total"},
        ]
    finally:
        conn.close()


def get_pl_waterfall_bridge_monthly(params: dict) -> list:
    """월별 손익 Waterfall Bridge — 7개 카테고리 월별 데이터"""
    conn = get_conn()
    try:
        date_from = params.get("date_from")
        date_to   = params.get("date_to")
        args, clauses = ["PL"], ["entry_type=?"]
        if date_from: clauses.append("date >= ?"); args.append(date_from)
        if date_to:   clauses.append("date <= ?"); args.append(date_to)
        where = "WHERE " + " AND ".join(clauses)

        rows = conn.execute(f"""
            SELECT strftime('%Y-%m', date) as month, branch, classification1,
                   SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net_amount
            FROM journal_entries {where}
            GROUP BY month, branch, classification1
            ORDER BY month
        """, args).fetchall()

        months: dict = {}
        for r in rows:
            m = r["month"]
            if m not in months:
                months[m] = {"매출액": 0, "매출원가": 0, "판관비": 0,
                             "금융수익": 0, "금융비용": 0, "기타수익": 0, "기타비용": 0}
            branch = r["branch"] or ""
            cls1 = r["classification1"] or "기타"
            net = r["net_amount"] or 0
            cat = _classify_7cat(branch, cls1, net)

            if cat == "매출액":
                months[m]["매출액"] += net
            elif cat == "매출원가":
                months[m]["매출원가"] += abs(net)
            elif cat == "판관비":
                months[m]["판관비"] += abs(net)
            elif cat == "금융수익":
                months[m]["금융수익"] += abs(net)
            elif cat == "금융비용":
                months[m]["금융비용"] += abs(net)
            elif cat == "기타수익":
                months[m]["기타수익"] += abs(net) if net > 0 else 0
            elif cat == "기타비용":
                months[m]["기타비용"] += abs(net)

        result = []
        for m in sorted(months):
            d = months[m]
            net_income = (d["매출액"] + d["금융수익"] + d["기타수익"]
                          - d["매출원가"] - d["판관비"] - d["금융비용"] - d["기타비용"])
            result.append({
                "month": m,
                "매출액": d["매출액"],
                "매출원가": d["매출원가"],
                "판관비": d["판관비"],
                "금융수익": d["금융수익"],
                "금융비용": d["금융비용"],
                "기타수익": d["기타수익"],
                "기타비용": d["기타비용"],
                "net_income": net_income,
            })
        return result
    finally:
        conn.close()


# ─── BS 추이분석 ─────────────────────────────────────────────

def get_bs_monthly(params: dict) -> list:
    """월별 BS 카테고리별 잔액 (기초 + 누적 증감)"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        # TB 기초잔액
        tb = {r["account_code"]: {"balance": r["balance"] or 0, "branch": r["branch"] or "", "division": r["division"] or ""}
              for r in conn.execute("SELECT account_code, balance, branch, division FROM trial_balance").fetchall()}

        # 월별 JE 변동
        je_rows = conn.execute("""
            SELECT account_code, strftime('%Y-%m', date) as month,
                   SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries
            WHERE entry_type='BS' AND date >= ? AND date <= ?
            GROUP BY account_code, month ORDER BY account_code, month
        """, (date_from, date_to)).fetchall()

        # account별 월별 변동 집계
        acct_monthly: dict[str, dict[str, float]] = {}
        all_months: set[str] = set()
        for r in je_rows:
            ac = r["account_code"]
            m = r["month"]
            all_months.add(m)
            acct_monthly.setdefault(ac, {})[m] = r["net"] or 0

        result = []
        for month in sorted(all_months):
            cat: dict[tuple, float] = {}
            for ac, tb_info in tb.items():
                branch = tb_info["branch"]
                division = tb_info["division"]
                if not branch:
                    continue
                cum = sum(v for m, v in acct_monthly.get(ac, {}).items() if m <= month)
                bal = tb_info["balance"] + cum
                key = (branch, division)
                cat[key] = cat.get(key, 0) + bal
            for (branch, division), balance in cat.items():
                result.append({"month": month, "branch": branch, "division": division, "balance": balance})
        return result
    finally:
        conn.close()


def get_bs_account_delta(params: dict) -> list:
    """계정별 BS 증감 (기초 vs 기말)"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        tb = {r["account_code"]: dict(r) for r in
              conn.execute("SELECT account_code, balance, branch, division, classification1 FROM trial_balance").fetchall()}

        movements = {r["account_code"]: r["net"] or 0 for r in conn.execute("""
            SELECT account_code, SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='BS' AND date >= ? AND date <= ?
            GROUP BY account_code
        """, (date_from, date_to)).fetchall()}

        result = []
        for ac, info in tb.items():
            branch = info.get("branch") or ""
            cls1 = info.get("classification1") or ""
            if not branch or not cls1:
                continue
            tb_bal = info.get("balance") or 0
            net = movements.get(ac, 0)
            if net == 0:
                continue
            result.append({
                "account": cls1, "branch": branch,
                "division": info.get("division") or "",
                "opening": tb_bal, "closing": tb_bal + net, "delta": net,
            })
        result.sort(key=lambda x: abs(x["delta"]), reverse=True)
        return result
    finally:
        conn.close()


def _compute_bs_totals_at(conn, tb: dict, up_to: str) -> dict:
    """Compute BS balances at a given date = TB opening + all movements up to that date"""
    rows = conn.execute("""
        SELECT account_code, SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
        FROM journal_entries WHERE entry_type='BS' AND date <= ?
        GROUP BY account_code
    """, (up_to,)).fetchall()
    movements = {r["account_code"]: r["net"] or 0 for r in rows}

    totals = {"유동자산": 0.0, "비유동자산": 0.0, "유동부채": 0.0, "비유동부채": 0.0}
    for ac, info in tb.items():
        branch = info["branch"]
        division = info["division"]
        if not branch:
            continue
        bal = info["balance"] + movements.get(ac, 0)
        if branch == "자산":
            if "비유동" in division:
                totals["비유동자산"] += bal
            else:
                totals["유동자산"] += bal
        elif branch == "부채":
            if "비유동" in division:
                totals["비유동부채"] += bal
            else:
                totals["유동부채"] += bal

    ca, nca = totals["유동자산"], totals["비유동자산"]
    cl, ncl = totals["유동부채"], totals["비유동부채"]
    total_a = ca + nca
    total_l = cl + ncl
    total_e = total_a - total_l
    return {"자산": total_a, "부채": total_l, "자본": total_e,
            "유동자산": ca, "비유동자산": nca, "유동부채": cl, "비유동부채": ncl}


def get_bs_kpi(params: dict) -> dict:
    """BS KPI: 자산/부채/자본 with 당기기초(연초)/당월기초 비교"""
    conn = get_conn()
    try:
        date_to = params.get("date_to") or datetime.date.today().isoformat()
        year = int(date_to[:4])
        month = int(date_to[5:7])

        # 당기 기초 = end of previous year
        ytd_start = f"{year - 1}-12-31"
        # 당월 기초 = end of previous month
        if month == 1:
            mtd_start = f"{year - 1}-12-31"
        else:
            prev_last = calendar.monthrange(year, month - 1)[1]
            mtd_start = f"{year}-{month - 1:02d}-{prev_last}"

        tb = {r["account_code"]: {"balance": r["balance"] or 0, "branch": r["branch"] or "", "division": r["division"] or ""}
              for r in conn.execute("SELECT account_code, balance, branch, division FROM trial_balance").fetchall()}

        curr = _compute_bs_totals_at(conn, tb, date_to)
        ytd = _compute_bs_totals_at(conn, tb, ytd_start)
        mtd = _compute_bs_totals_at(conn, tb, mtd_start)

        def pct(c, b):
            return round((c - b) / abs(b) * 100, 1) if b else None

        result = {}
        for key in ["자산", "부채", "자본"]:
            result[key] = {
                "current": curr[key],
                "ytd_start": ytd[key],
                "ytd_pct": pct(curr[key], ytd[key]),
                "mtd_start": mtd[key],
                "mtd_pct": pct(curr[key], mtd[key]),
            }
        result["유동자산"] = curr["유동자산"]
        result["유동부채"] = curr["유동부채"]
        return result
    finally:
        conn.close()


def get_bs_ratios_monthly(params: dict) -> list:
    """월별 재무비율: 유동비율, 당좌비율, 부채비율"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        tb = {r["account_code"]: {"balance": r["balance"] or 0, "branch": r["branch"] or "",
                                   "division": r["division"] or "", "classification1": r["classification1"] or ""}
              for r in conn.execute("SELECT account_code, balance, branch, division, classification1 FROM trial_balance").fetchall()}

        je_rows = conn.execute("""
            SELECT account_code, strftime('%Y-%m', date) as month,
                   SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='BS' AND date >= ? AND date <= ?
            GROUP BY account_code, month ORDER BY month
        """, (date_from, date_to)).fetchall()

        acct_monthly: dict = {}
        all_months: set = set()
        for r in je_rows:
            acct_monthly.setdefault(r["account_code"], {})[r["month"]] = r["net"] or 0
            all_months.add(r["month"])

        # 재고자산 계정: 정확히 일치하거나 "(..."로 시작하는 변형 포함, 충당금 제외
        INV_EXACT = {"제품", "원재료", "재공품", "반제품", "상품", "저장품"}

        def _is_inventory(cls1: str) -> bool:
            if "충당금" in cls1:
                return False
            base = cls1.split("(")[0].strip()
            return base in INV_EXACT

        result = []
        for month in sorted(all_months):
            t = {"유동자산": 0.0, "비유동자산": 0.0, "유동부채": 0.0, "비유동부채": 0.0, "재고자산": 0.0}
            for ac, info in tb.items():
                branch, division, cls1 = info["branch"], info["division"], info["classification1"]
                if not branch:
                    continue
                cum = sum(v for m, v in acct_monthly.get(ac, {}).items() if m <= month)
                bal = info["balance"] + cum
                if branch == "자산":
                    if "비유동" in division:
                        t["비유동자산"] += bal
                    else:
                        t["유동자산"] += bal
                        # 재고자산 = 제품/원재료/재공품/반제품/상품 (충당금 제외)
                        if _is_inventory(cls1):
                            t["재고자산"] += bal
                elif branch == "부채":
                    if "비유동" in division:
                        t["비유동부채"] += bal
                    else:
                        t["유동부채"] += bal

            ca, cl = t["유동자산"], t["유동부채"]
            inv = t["재고자산"]
            tl = t["유동부채"] + t["비유동부채"]
            te = (t["유동자산"] + t["비유동자산"]) - tl
            result.append({
                "month": month,
                "유동비율": round(ca / cl * 100, 1) if cl else 0,
                "당좌비율": round((ca - inv) / cl * 100, 1) if cl else 0,
                "부채비율": round(tl / te * 100, 1) if te else 0,
            })
        return result
    finally:
        conn.close()


def get_bs_activity_monthly(params: dict) -> dict:
    """활동성 지표 — 매출채권/재고자산 회전일수 월별 + 요약"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        tb = {r["account_code"]: {"balance": r["balance"] or 0, "branch": r["branch"] or "", "classification1": r["classification1"] or ""}
              for r in conn.execute("SELECT account_code, balance, branch, classification1 FROM trial_balance").fetchall()}

        je_bs = conn.execute("""
            SELECT account_code, strftime('%Y-%m', date) as month,
                   SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='BS' AND date >= ? AND date <= ?
            GROUP BY account_code, month
        """, (date_from, date_to)).fetchall()

        acct_monthly: dict = {}
        all_months: set = set()
        for r in je_bs:
            acct_monthly.setdefault(r["account_code"], {})[r["month"]] = r["net"] or 0
            all_months.add(r["month"])

        je_pl = conn.execute("""
            SELECT strftime('%Y-%m', date) as month, classification1, branch,
                   SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='PL' AND date >= ? AND date <= ?
            GROUP BY month, classification1, branch
        """, (date_from, date_to)).fetchall()

        monthly_pl: dict = {}
        for r in je_pl:
            m = r["month"]
            monthly_pl.setdefault(m, {"revenue": 0.0, "cogs": 0.0})
            net = r["net"] or 0
            if r["branch"] == "수익":
                monthly_pl[m]["revenue"] += net
            elif r["branch"] == "비용":
                if _classify_expense(r["classification1"] or "") == "매출원가":
                    monthly_pl[m]["cogs"] += abs(net)

        # 매출채권 = 외상매출금 + 받을어음 (충당금 제외)
        RECV_KEYWORDS = ["외상매출금", "받을어음"]
        # 재고자산: base name exact match (충당금 제외)
        INV_EXACT_ACT = {"제품", "원재료", "재공품", "반제품", "상품", "저장품"}

        def _is_inv_act(cls1: str) -> bool:
            if "충당금" in cls1:
                return False
            return cls1.split("(")[0].strip() in INV_EXACT_ACT

        monthly_result = []
        for month in sorted(all_months):
            recv, inv = 0.0, 0.0
            for ac, info in tb.items():
                if info["branch"] != "자산":
                    continue
                cls1 = info["classification1"]
                cum = sum(v for m, v in acct_monthly.get(ac, {}).items() if m <= month)
                bal = info["balance"] + cum
                if any(k in cls1 for k in RECV_KEYWORDS) and "충당금" not in cls1:
                    recv += bal
                if _is_inv_act(cls1):
                    inv += bal

            yr, mo = int(month[:4]), int(month[5:7])
            days = calendar.monthrange(yr, mo)[1]
            pl = monthly_pl.get(month, {})
            daily_rev = pl.get("revenue", 0) / days if days else 0
            daily_cogs = pl.get("cogs", 0) / days if days else 0

            monthly_result.append({
                "month": month,
                "매출채권잔액": recv,
                "재고자산잔액": inv,
                "일평균매출": daily_rev,
                "일평균매출원가": daily_cogs,
                "매출채권회전일수": round(recv / daily_rev, 1) if daily_rev else 0,
                "재고자산회전일수": round(inv / daily_cogs, 1) if daily_cogs else 0,
            })

        n = len(monthly_result)
        avg_recv = sum(r["매출채권잔액"] for r in monthly_result) / n if n else 0
        avg_inv = sum(r["재고자산잔액"] for r in monthly_result) / n if n else 0
        total_rev = sum(pl.get("revenue", 0) for pl in monthly_pl.values())
        total_cogs = sum(pl.get("cogs", 0) for pl in monthly_pl.values())
        try:
            d1 = datetime.date.fromisoformat(date_from)
            d2 = datetime.date.fromisoformat(date_to)
            total_days = (d2 - d1).days + 1
        except Exception:
            total_days = 365
        daily_rev_ttl = total_rev / total_days if total_days else 0
        daily_cogs_ttl = total_cogs / total_days if total_days else 0

        return {
            "monthly": monthly_result,
            "summary": {
                "매출채권회전일수": round(avg_recv / daily_rev_ttl, 1) if daily_rev_ttl else 0,
                "재고자산회전일수": round(avg_inv / daily_cogs_ttl, 1) if daily_cogs_ttl else 0,
                "평균매출채권잔액": avg_recv,
                "평균재고자산잔액": avg_inv,
                "일평균매출액": daily_rev_ttl,
                "일평균매출원가": daily_cogs_ttl,
            }
        }
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


# ─── BS BI 추가 서비스 ──────────────────────────────────────────


def get_bs_daily_balance(params: dict, account: str | None) -> list:
    """일별 잔액 추이 — 특정 공시용계정(classification1)의 일별 잔액"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        # TB 기초잔액 (해당 계정만)
        tb_clause = ""
        tb_args: list = []
        if account:
            tb_clause = "WHERE classification1 = ?"
            tb_args = [account]

        tb_rows = conn.execute(
            f"SELECT account_code, balance FROM trial_balance {tb_clause}",
            tb_args,
        ).fetchall()
        tb_opening = sum(r["balance"] or 0 for r in tb_rows)
        tb_codes = [r["account_code"] for r in tb_rows]

        if not tb_codes:
            return []

        placeholders = ",".join("?" * len(tb_codes))
        rows = conn.execute(f"""
            SELECT date,
                   SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries
            WHERE entry_type='BS' AND date >= ? AND date <= ?
              AND account_code IN ({placeholders})
            GROUP BY date ORDER BY date
        """, [date_from, date_to] + tb_codes).fetchall()

        result = []
        cum = tb_opening
        for r in rows:
            cum += r["net"] or 0
            result.append({"date": r["date"], "balance": cum})
        return result
    finally:
        conn.close()


def get_bs_vendor_composition(params: dict, account: str | None, debit_credit: str | None) -> list:
    """거래처 구성 — 특정 계정의 차변/대변 거래처별 금액"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        args: list = []
        clauses = ["entry_type='BS'", "date >= ?", "date <= ?"]
        args.extend([date_from, date_to])

        if account:
            clauses.append("classification1 = ?")
            args.append(account)
        if debit_credit:
            clauses.append("debit_credit = ?")
            args.append(debit_credit)

        where = "WHERE " + " AND ".join(clauses)
        rows = conn.execute(f"""
            SELECT COALESCE(department, '미상') as vendor,
                   SUM(amount) as total
            FROM journal_entries {where}
            GROUP BY vendor
            ORDER BY total DESC
        """, args).fetchall()

        return [{"vendor": r["vendor"], "amount": r["total"] or 0} for r in rows if r["total"]]
    finally:
        conn.close()


def get_bs_counter_accounts(params: dict, account: str | None) -> list:
    """상대계정 분석 — 특정 BS 계정 전표에서 반대편 계정 구성"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        if not account:
            return []

        # 해당 계정이 포함된 전표번호 목록
        je_rows = conn.execute("""
            SELECT DISTINCT je_number FROM journal_entries
            WHERE classification1 = ? AND date >= ? AND date <= ?
        """, (account, date_from, date_to)).fetchall()
        je_numbers = [r["je_number"] for r in je_rows]

        if not je_numbers:
            return []

        placeholders = ",".join("?" * len(je_numbers))
        # 같은 전표에서 다른 계정의 합계
        rows = conn.execute(f"""
            SELECT classification1 as account, debit_credit,
                   SUM(amount) as total, COUNT(*) as cnt
            FROM journal_entries
            WHERE je_number IN ({placeholders})
              AND classification1 != ?
              AND date >= ? AND date <= ?
            GROUP BY classification1, debit_credit
            ORDER BY total DESC
        """, je_numbers + [account, date_from, date_to]).fetchall()

        # 계정별로 집계
        acct_map: dict = {}
        for r in rows:
            acct = r["account"] or "기타"
            if acct not in acct_map:
                acct_map[acct] = {"account": acct, "debit_total": 0, "credit_total": 0, "count": 0}
            if r["debit_credit"] == "D":
                acct_map[acct]["debit_total"] += r["total"] or 0
            else:
                acct_map[acct]["credit_total"] += r["total"] or 0
            acct_map[acct]["count"] += r["cnt"] or 0

        result = list(acct_map.values())
        result.sort(key=lambda x: x["debit_total"] + x["credit_total"], reverse=True)
        return result[:30]
    finally:
        conn.close()


def get_bs_entries(params: dict, account: str | None, debit_credit: str | None,
                   vendor: str | None, limit: int = 500) -> list:
    """전표 상세내역 — BS 계정 전표 조회"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        args: list = []
        clauses = ["entry_type='BS'", "date >= ?", "date <= ?"]
        args.extend([date_from, date_to])

        if account:
            clauses.append("classification1 = ?")
            args.append(account)
        if debit_credit:
            clauses.append("debit_credit = ?")
            args.append(debit_credit)
        if vendor:
            clauses.append("department = ?")
            args.append(vendor)

        where = "WHERE " + " AND ".join(clauses)
        rows = conn.execute(f"""
            SELECT date, je_number, classification1 as account,
                   COALESCE(department, '') as vendor,
                   COALESCE(description, '') as memo,
                   CASE WHEN debit_credit='D' THEN amount ELSE 0 END as debit,
                   CASE WHEN debit_credit='C' THEN amount ELSE 0 END as credit
            FROM journal_entries {where}
            ORDER BY date DESC LIMIT ?
        """, args + [limit]).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_bs_detail_table(params: dict, compare_base: str = "연초") -> list:
    """재무항목 테이블 — 공시용계정별 기초/기말/증감"""
    conn = get_conn()
    try:
        date_to = params.get("date_to") or "2025-12-31"
        year = int(date_to[:4])
        month = int(date_to[5:7])

        if compare_base == "월초":
            if month == 1:
                base_date = f"{year - 1}-12-31"
            else:
                prev_last = calendar.monthrange(year, month - 1)[1]
                base_date = f"{year}-{month - 1:02d}-{prev_last}"
        else:  # 연초
            base_date = f"{year - 1}-12-31"

        tb = {r["account_code"]: {
            "balance": r["balance"] or 0, "branch": r["branch"] or "",
            "division": r["division"] or "", "classification1": r["classification1"] or ""
        } for r in conn.execute(
            "SELECT account_code, balance, branch, division, classification1 FROM trial_balance"
        ).fetchall()}

        # 기초 = TB + movements up to base_date
        base_movements = {}
        rows = conn.execute("""
            SELECT account_code, SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='BS' AND date <= ?
            GROUP BY account_code
        """, (base_date,)).fetchall()
        for r in rows:
            base_movements[r["account_code"]] = r["net"] or 0

        # 기말 = TB + movements up to date_to
        end_movements = {}
        rows = conn.execute("""
            SELECT account_code, SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='BS' AND date <= ?
            GROUP BY account_code
        """, (date_to,)).fetchall()
        for r in rows:
            end_movements[r["account_code"]] = r["net"] or 0

        # classification1별 집계
        acct_map: dict = {}
        for ac, info in tb.items():
            cls1 = info["classification1"]
            branch = info["branch"]
            division = info["division"]
            if not cls1 or not branch:
                continue
            tb_bal = info["balance"]
            opening = tb_bal + base_movements.get(ac, 0)
            closing = tb_bal + end_movements.get(ac, 0)

            if cls1 not in acct_map:
                acct_map[cls1] = {"account": cls1, "branch": branch, "division": division,
                                  "opening": 0, "closing": 0}
            acct_map[cls1]["opening"] += opening
            acct_map[cls1]["closing"] += closing

        result = []
        for item in acct_map.values():
            item["delta"] = item["closing"] - item["opening"]
            item["delta_pct"] = round((item["delta"] / abs(item["opening"])) * 100, 1) if item["opening"] else 0
            result.append(item)

        result.sort(key=lambda x: (
            0 if x["branch"] == "자산" else 1 if x["branch"] == "부채" else 2,
            0 if "유동" in x["division"] else 1,
            -abs(x["closing"])
        ))
        return result
    finally:
        conn.close()


def get_bs_vendor_delta(params: dict, account: str | None) -> list:
    """거래처별 증감 — 특정 계정의 거래처별 net flow"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        args: list = []
        clauses = ["entry_type='BS'", "date >= ?", "date <= ?"]
        args.extend([date_from, date_to])

        if account:
            clauses.append("classification1 = ?")
            args.append(account)

        where = "WHERE " + " AND ".join(clauses)
        rows = conn.execute(f"""
            SELECT COALESCE(department, '미상') as vendor,
                   SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries {where}
            GROUP BY vendor
            ORDER BY ABS(net) DESC
            LIMIT 20
        """, args).fetchall()

        return [{"vendor": r["vendor"], "amount": r["net"] or 0} for r in rows if r["net"]]
    finally:
        conn.close()


def get_bs_accounts_list() -> list:
    """BS 공시용계정 목록"""
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT DISTINCT classification1 as account, branch, division
            FROM trial_balance
            WHERE branch IN ('자산', '부채')
            ORDER BY branch, division, classification1
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ─── Cash Flow 비교 (당기/전기) ─────────────────────────────────

def get_ccc_monthly(params: dict) -> list:
    """월별 CCC(Cash Conversion Cycle): DSO + DIO - DPO

    NOTE: DPO uses daily COGS as proxy for daily purchases since purchase
    data is not available. In practice, DPO = AP / daily purchases is more
    accurate.
    """
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        tb = {r["account_code"]: {
            "balance": r["balance"] or 0, "branch": r["branch"] or "",
            "division": r["division"] or "", "classification1": r["classification1"] or ""
        } for r in conn.execute(
            "SELECT account_code, balance, branch, division, classification1 FROM trial_balance"
        ).fetchall()}

        je_bs = conn.execute("""
            SELECT account_code, strftime('%Y-%m', date) as month,
                   SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='BS' AND date >= ? AND date <= ?
            GROUP BY account_code, month
        """, (date_from, date_to)).fetchall()

        acct_monthly: dict = {}
        all_months: set = set()
        for r in je_bs:
            acct_monthly.setdefault(r["account_code"], {})[r["month"]] = r["net"] or 0
            all_months.add(r["month"])

        je_pl = conn.execute("""
            SELECT strftime('%Y-%m', date) as month, classification1, branch,
                   SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='PL' AND date >= ? AND date <= ?
            GROUP BY month, classification1, branch
        """, (date_from, date_to)).fetchall()

        monthly_pl: dict = {}
        for r in je_pl:
            m = r["month"]
            monthly_pl.setdefault(m, {"revenue": 0.0, "cogs": 0.0})
            net = r["net"] or 0
            if r["branch"] == "수익":
                monthly_pl[m]["revenue"] += net
            elif r["branch"] == "비용":
                if _classify_expense(r["classification1"] or "") == "매출원가":
                    monthly_pl[m]["cogs"] += abs(net)

        RECV_KEYWORDS = ["외상매출금", "받을어음"]
        INV_EXACT = {"제품", "원재료", "재공품", "반제품", "상품", "저장품"}
        AP_KEYWORDS = ["외상매입금", "매입채무", "지급어음"]

        def _is_inv(cls1: str) -> bool:
            if "충당금" in cls1:
                return False
            return cls1.split("(")[0].strip() in INV_EXACT

        def _is_ap(cls1: str) -> bool:
            return any(k in cls1 for k in AP_KEYWORDS) and "충당금" not in cls1

        result = []
        for month in sorted(all_months):
            recv, inv, ap = 0.0, 0.0, 0.0
            for ac, info in tb.items():
                cls1 = info["classification1"]
                cum = sum(v for m, v in acct_monthly.get(ac, {}).items() if m <= month)
                bal = info["balance"] + cum

                if info["branch"] == "자산":
                    if any(k in cls1 for k in RECV_KEYWORDS) and "충당금" not in cls1:
                        recv += bal
                    if _is_inv(cls1):
                        inv += bal
                if info["branch"] == "부채":
                    if _is_ap(cls1):
                        ap += abs(bal)

            yr, mo = int(month[:4]), int(month[5:7])
            days = calendar.monthrange(yr, mo)[1]
            pl = monthly_pl.get(month, {})
            daily_rev = pl.get("revenue", 0) / days if days else 0
            daily_cogs = pl.get("cogs", 0) / days if days else 0

            dso = round(recv / daily_rev, 1) if daily_rev else 0
            dio = round(inv / daily_cogs, 1) if daily_cogs else 0
            # DPO ideally uses daily purchases, but we use daily COGS as proxy
            dpo = round(ap / daily_cogs, 1) if daily_cogs else 0
            ccc = round(dso + dio - dpo, 1)

            result.append({
                "month": month,
                "dso": dso, "dio": dio, "dpo": dpo, "ccc": ccc,
                "매출채권": recv, "재고자산": inv, "매입채무": ap,
                "revenue": pl.get("revenue", 0), "cogs": pl.get("cogs", 0),
            })
        return result
    finally:
        conn.close()


def get_bs_snapshot(params: dict) -> dict:
    """BS 스냅샷 — 기말/기초 잔액 + 개별 계정 잔액 (Summary BI용)"""
    conn = get_conn()
    try:
        date_to = params.get("date_to") or "2025-12-31"
        date_from = params.get("date_from") or "2024-01-01"
        year = int(date_to[:4])
        base_date = f"{year - 1}-12-31"

        tb = {r["account_code"]: {
            "balance": r["balance"] or 0, "branch": r["branch"] or "",
            "division": r["division"] or "", "classification1": r["classification1"] or ""
        } for r in conn.execute(
            "SELECT account_code, balance, branch, division, classification1 FROM trial_balance"
        ).fetchall()}

        def compute_at(up_to):
            rows = conn.execute("""
                SELECT account_code, SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
                FROM journal_entries WHERE entry_type='BS' AND date <= ?
                GROUP BY account_code
            """, (up_to,)).fetchall()
            movements = {r["account_code"]: r["net"] or 0 for r in rows}

            totals = {"currentAssets": 0, "nonCurrentAssets": 0,
                      "currentLiabilities": 0, "nonCurrentLiabilities": 0}
            accounts = {}
            for ac, info in tb.items():
                branch, division, cls1 = info["branch"], info["division"], info["classification1"]
                if not branch:
                    continue
                bal = info["balance"] + movements.get(ac, 0)
                if cls1:
                    accounts[cls1] = accounts.get(cls1, 0) + bal
                if branch == "자산":
                    if "비유동" in division:
                        totals["nonCurrentAssets"] += bal
                    else:
                        totals["currentAssets"] += bal
                elif branch == "부채":
                    if "비유동" in division:
                        totals["nonCurrentLiabilities"] += bal
                    else:
                        totals["currentLiabilities"] += bal

            totals["totalAssets"] = totals["currentAssets"] + totals["nonCurrentAssets"]
            totals["totalLiabilities"] = totals["currentLiabilities"] + totals["nonCurrentLiabilities"]
            totals["totalEquity"] = totals["totalAssets"] - totals["totalLiabilities"]
            return {**totals, **accounts}

        current = compute_at(date_to)
        opening = compute_at(base_date)

        return {"current": current, "opening": opening}
    finally:
        conn.close()


def get_pl_profitability_monthly(params: dict) -> list:
    """월별 수익성 비율 (당기/전기) — Summary BI용"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")

        rows = conn.execute("""
            SELECT strftime('%Y-%m', date) as month, branch, classification1,
                   SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net_amount
            FROM journal_entries WHERE entry_type='PL' AND date >= ? AND date <= ?
            GROUP BY month, branch, classification1
        """, (date_from, date_to)).fetchall()

        monthly: dict = {}
        for r in rows:
            m = r["month"]
            if m not in monthly:
                monthly[m] = {"revenue": 0, "cogs": 0, "sga": 0, "other": 0}
            net = r["net_amount"] or 0
            branch = r["branch"] or ""
            cls1 = r["classification1"] or "기타"
            if branch == "수익":
                monthly[m]["revenue"] += net
            elif branch == "비용":
                cat = _classify_expense(cls1)
                if cat == "매출원가":
                    monthly[m]["cogs"] += abs(net)
                elif cat == "판매비와관리비":
                    monthly[m]["sga"] += abs(net)
                else:
                    monthly[m]["other"] += -abs(net)

        result = []
        for m in sorted(monthly):
            d = monthly[m]
            rev = d["revenue"]
            gp = rev - d["cogs"]
            op = gp - d["sga"]
            ni = op + d["other"]
            result.append({
                "month": m,
                "revenue": rev,
                "cogs": d["cogs"],
                "sga": d["sga"],
                "grossProfit": gp,
                "operatingIncome": op,
                "netIncome": ni,
                "gpm": round(gp / rev * 100, 1) if rev else 0,
                "opm": round(op / rev * 100, 1) if rev else 0,
                "npm": round(ni / rev * 100, 1) if rev else 0,
            })
        return result
    finally:
        conn.close()


def get_cash_flow_comparison(params: dict) -> dict:
    """현금흐름 당기/전기 비교"""
    conn = get_conn()
    try:
        date_from = params.get("date_from", "2024-01-01")
        date_to = params.get("date_to", "2025-12-31")
        prior_from = _shift_year(date_from, -1)
        prior_to = _shift_year(date_to, -1)

        DIVISION_CF_MAP = {
            "유동자산": "영업활동", "유동부채": "영업활동",
            "비유동자산": "투자활동", "비유동부채": "재무활동",
            "수익": "영업활동", "비용": "영업활동", "손익대체": "영업활동",
        }

        def fetch_cf(df, dt):
            args, clauses = [], []
            if df:
                clauses.append("date >= ?"); args.append(df)
            if dt:
                clauses.append("date <= ?"); args.append(dt)
            where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
            rows = conn.execute(f"""
                SELECT division, classification1,
                       SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net_flow
                FROM journal_entries {where}
                GROUP BY division, classification1
            """, args).fetchall()
            cf: dict[str, list] = {"영업활동": [], "투자활동": [], "재무활동": []}
            for r in rows:
                div = r["division"] or ""
                cls1 = r["classification1"] or "기타"
                flow = r["net_flow"] or 0
                cat = DIVISION_CF_MAP.get(div, "영업활동")
                cf[cat].append({"account": cls1, "amount": flow})
            return cf

        curr_cf = fetch_cf(date_from, date_to)
        prior_cf = fetch_cf(prior_from, prior_to)

        def total(items):
            return sum(i["amount"] for i in items)

        def merge_items(curr_items, prior_items):
            """당기/전기 항목을 account 기준으로 합침"""
            curr_map = {}
            for it in curr_items:
                curr_map[it["account"]] = it["amount"]
            prior_map = {}
            for it in prior_items:
                prior_map[it["account"]] = it["amount"]
            all_accounts = sorted(set(curr_map) | set(prior_map),
                                  key=lambda a: abs(curr_map.get(a, 0)), reverse=True)
            return [{"account": a,
                      "current": curr_map.get(a, 0),
                      "prior": prior_map.get(a, 0)} for a in all_accounts]

        result = {}
        for cat in ["영업활동", "투자활동", "재무활동"]:
            items = merge_items(curr_cf[cat], prior_cf[cat])
            result[cat] = {
                "items": items,
                "current_total": total(curr_cf[cat]),
                "prior_total": total(prior_cf[cat]),
            }

        curr_net = sum(result[c]["current_total"] for c in result)
        prior_net = sum(result[c]["prior_total"] for c in result)

        return {
            "operating": result["영업활동"],
            "investing": result["투자활동"],
            "financing": result["재무활동"],
            "current_net_change": curr_net,
            "prior_net_change": prior_net,
        }
    finally:
        conn.close()
