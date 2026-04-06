"""예실 비교 서비스 (사업계획 vs 실적)"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "easyview.db"


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_monthly_variance(year: int = 2025) -> list:
    """월별 예실 비교: 사업계획 vs JE 실적"""
    conn = get_conn()
    try:
        # 1. 사업계획 데이터
        plan_rows = conn.execute("""
            SELECT
                strftime('%Y-%m', date) as month,
                item,
                SUM(amount) as plan_amount
            FROM business_plan
            WHERE strftime('%Y', date) = ?
            GROUP BY month, item
        """, (str(year),)).fetchall()

        plan_by_month: dict = {}
        for r in plan_rows:
            m = r["month"]
            if m not in plan_by_month:
                plan_by_month[m] = {}
            plan_by_month[m][r["item"]] = r["plan_amount"] or 0

        # 2. 실적 - 매출액 (PL 수익 합계)
        actual_revenue = conn.execute("""
            SELECT
                strftime('%Y-%m', date) as month,
                SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as actual
            FROM journal_entries
            WHERE entry_type='PL'
              AND branch='수익'
              AND strftime('%Y', date) = ?
            GROUP BY month
        """, (str(year),)).fetchall()

        # 3. 실적 - 매출원가 (PL 비용, (제) suffix)
        actual_cogs = conn.execute("""
            SELECT
                strftime('%Y-%m', date) as month,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as actual
            FROM journal_entries
            WHERE entry_type='PL'
              AND branch='비용'
              AND (classification1 LIKE '%(제)' OR classification1 LIKE '%(제%')
              AND strftime('%Y', date) = ?
            GROUP BY month
        """, (str(year),)).fetchall()

        # 4. 실적 - 판관비 (PL 비용, (판) suffix)
        actual_sga = conn.execute("""
            SELECT
                strftime('%Y-%m', date) as month,
                SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as actual
            FROM journal_entries
            WHERE entry_type='PL'
              AND branch='비용'
              AND (classification1 LIKE '%(판)' OR classification1 LIKE '%(판%')
              AND strftime('%Y', date) = ?
            GROUP BY month
        """, (str(year),)).fetchall()

        # dict 변환
        rev_dict = {r["month"]: r["actual"] or 0 for r in actual_revenue}
        cogs_dict = {r["month"]: r["actual"] or 0 for r in actual_cogs}
        sga_dict = {r["month"]: r["actual"] or 0 for r in actual_sga}

        # 월별 통합
        all_months = sorted(set(
            list(plan_by_month.keys()) +
            list(rev_dict.keys()) +
            list(cogs_dict.keys()) +
            list(sga_dict.keys())
        ))

        result = []
        for m in all_months:
            plan = plan_by_month.get(m, {})
            plan_rev = plan.get("매출액", 0)
            plan_cogs = plan.get("매출원가", 0)
            plan_sga = plan.get("판매비와관리비", 0)

            actual_rev = rev_dict.get(m, 0)
            actual_cogs_val = cogs_dict.get(m, 0)
            actual_sga_val = sga_dict.get(m, 0)

            def variance_pct(actual, plan):
                if plan and plan != 0:
                    return round((actual - plan) / abs(plan) * 100, 2)
                return None

            result.append({
                "month": m,
                "revenue": {
                    "plan": plan_rev,
                    "actual": actual_rev,
                    "variance": actual_rev - plan_rev,
                    "variance_pct": variance_pct(actual_rev, plan_rev),
                },
                "cogs": {
                    "plan": plan_cogs,
                    "actual": actual_cogs_val,
                    "variance": actual_cogs_val - plan_cogs,
                    "variance_pct": variance_pct(actual_cogs_val, plan_cogs),
                },
                "sga": {
                    "plan": plan_sga,
                    "actual": actual_sga_val,
                    "variance": actual_sga_val - plan_sga,
                    "variance_pct": variance_pct(actual_sga_val, plan_sga),
                },
            })
        return result
    finally:
        conn.close()
