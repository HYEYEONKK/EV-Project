"""매출 분석 서비스"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "easyview.db"


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _sales_filters(params: dict) -> tuple[str, list]:
    clauses = []
    args = []
    if params.get("date_from"):
        clauses.append("date >= ?")
        args.append(params["date_from"])
    if params.get("date_to"):
        clauses.append("date <= ?")
        args.append(params["date_to"])
    if params.get("vendor"):
        clauses.append("vendor = ?")
        args.append(params["vendor"])
    if params.get("product_category"):
        clauses.append("product_category = ?")
        args.append(params["product_category"])
    if params.get("region"):
        clauses.append("region = ?")
        args.append(params["region"])
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, args


def get_sales_summary(params: dict) -> dict:
    conn = get_conn()
    try:
        where, args = _sales_filters(params)
        row = conn.execute(f"""
            SELECT
                COUNT(*) as transaction_count,
                SUM(amount) as total_revenue,
                AVG(amount) as avg_order_value,
                SUM(quantity) as total_quantity
            FROM sales_ledger {where}
        """, args).fetchone()
        return {
            "total_revenue": row["total_revenue"] or 0,
            "transaction_count": row["transaction_count"] or 0,
            "avg_order_value": row["avg_order_value"] or 0,
            "total_quantity": row["total_quantity"] or 0,
        }
    finally:
        conn.close()


def get_monthly_trend(params: dict) -> list:
    conn = get_conn()
    try:
        where, args = _sales_filters(params)
        rows = conn.execute(f"""
            SELECT
                strftime('%Y-%m', date) as month,
                SUM(amount) as revenue,
                COUNT(*) as transactions,
                SUM(quantity) as quantity
            FROM sales_ledger
            {where}
            GROUP BY month
            ORDER BY month
        """, args).fetchall()
        cumulative = 0
        result = []
        for r in rows:
            cumulative += (r["revenue"] or 0)
            result.append({
                "month": r["month"],
                "revenue": r["revenue"] or 0,
                "transactions": r["transactions"],
                "quantity": r["quantity"] or 0,
                "cumulative_revenue": cumulative,
            })
        return result
    finally:
        conn.close()


def get_by_category(params: dict) -> list:
    conn = get_conn()
    try:
        where, args = _sales_filters(params)
        rows = conn.execute(f"""
            SELECT
                product_category,
                SUM(amount) as revenue,
                COUNT(*) as transactions,
                SUM(quantity) as quantity
            FROM sales_ledger
            {where}
            GROUP BY product_category
            ORDER BY revenue DESC
        """, args).fetchall()
        total = sum(r["revenue"] or 0 for r in rows)
        return [
            {
                "category": r["product_category"],
                "revenue": r["revenue"] or 0,
                "transactions": r["transactions"],
                "quantity": r["quantity"] or 0,
                "share": round((r["revenue"] or 0) / total * 100, 2) if total else 0,
            }
            for r in rows
        ]
    finally:
        conn.close()


def get_by_region(params: dict) -> list:
    conn = get_conn()
    try:
        where, args = _sales_filters(params)
        rows = conn.execute(f"""
            SELECT
                region,
                district,
                SUM(amount) as revenue,
                COUNT(*) as transactions
            FROM sales_ledger
            {where}
            GROUP BY region, district
            ORDER BY revenue DESC
        """, args).fetchall()
        return [
            {
                "region": r["region"],
                "district": r["district"],
                "revenue": r["revenue"] or 0,
                "transactions": r["transactions"],
            }
            for r in rows
        ]
    finally:
        conn.close()


def get_by_vendor(params: dict, top_n: int = 20) -> list:
    conn = get_conn()
    try:
        where, args = _sales_filters(params)
        rows = conn.execute(f"""
            SELECT
                vendor,
                SUM(amount) as revenue,
                COUNT(*) as transactions,
                SUM(quantity) as quantity
            FROM sales_ledger
            {where}
            GROUP BY vendor
            ORDER BY revenue DESC
            LIMIT {top_n}
        """, args).fetchall()
        return [
            {
                "vendor": r["vendor"],
                "revenue": r["revenue"] or 0,
                "transactions": r["transactions"],
                "quantity": r["quantity"] or 0,
            }
            for r in rows
        ]
    finally:
        conn.close()


def get_dimensions() -> dict:
    conn = get_conn()
    try:
        return {
            "vendors": [r[0] for r in conn.execute(
                "SELECT DISTINCT vendor FROM sales_ledger WHERE vendor IS NOT NULL ORDER BY vendor"
            ).fetchall()],
            "product_categories": [r[0] for r in conn.execute(
                "SELECT DISTINCT product_category FROM sales_ledger WHERE product_category IS NOT NULL ORDER BY product_category"
            ).fetchall()],
            "regions": [r[0] for r in conn.execute(
                "SELECT DISTINCT region FROM sales_ledger WHERE region IS NOT NULL ORDER BY region"
            ).fetchall()],
            "districts": [r[0] for r in conn.execute(
                "SELECT DISTINCT district FROM sales_ledger WHERE district IS NOT NULL ORDER BY district"
            ).fetchall()],
        }
    finally:
        conn.close()
