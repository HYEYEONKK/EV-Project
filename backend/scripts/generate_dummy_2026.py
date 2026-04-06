"""
Generate dummy data for 2025-10 ~ 2026-03 and append to easyview.db
Run from backend/ directory: python scripts/generate_dummy_2026.py
"""
import sys, sqlite3, random
from pathlib import Path
from datetime import date, timedelta
import math

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DB_PATH = Path(__file__).parent.parent / "data" / "easyview.db"
conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=NORMAL")

rng = random.Random(42)   # fixed seed for reproducibility

# ────────────────────────────────────────────────
# 1. Read existing data to sample from
# ────────────────────────────────────────────────
print("[1] Reading existing data...")

# JE accounts (PL)
pl_accounts = conn.execute("""
    SELECT account_code, classification1, classification2, classification3,
           classification4, cost_center, division, branch, debit_credit
    FROM journal_entries
    WHERE entry_type='PL'
    GROUP BY account_code, debit_credit
    HAVING COUNT(*) > 10
""").fetchall()

# JE accounts (BS)
bs_accounts = conn.execute("""
    SELECT account_code, classification1, classification2, classification3,
           classification4, cost_center, division, branch, debit_credit
    FROM journal_entries
    WHERE entry_type='BS'
    GROUP BY account_code, debit_credit
    HAVING COUNT(*) > 10
""").fetchall()

# Monthly PL amounts to use as baseline (2025 monthly averages)
monthly_pl = conn.execute("""
    SELECT substr(date,1,7) as ym,
           AVG(CASE WHEN debit_credit='C' THEN amount END) as avg_credit,
           AVG(CASE WHEN debit_credit='D' THEN amount END) as avg_debit,
           COUNT(*) as cnt
    FROM journal_entries
    WHERE entry_type='PL' AND date >= '2025-01-01'
    GROUP BY ym
""").fetchall()
avg_pl_credit = sum(r[1] for r in monthly_pl if r[1]) / len(monthly_pl)
avg_pl_debit  = sum(r[2] for r in monthly_pl if r[2]) / len(monthly_pl)
avg_pl_cnt    = int(sum(r[3] for r in monthly_pl) / len(monthly_pl))

# Monthly BS amounts
monthly_bs = conn.execute("""
    SELECT AVG(amount) as avg_amt, COUNT(*) as cnt
    FROM journal_entries
    WHERE entry_type='BS' AND date >= '2025-01-01'
""").fetchone()
avg_bs_amt = monthly_bs[0]
avg_bs_cnt = int(monthly_bs[1] / 9)   # per month

# Sales ledger samples
sales_vendors    = [r[0] for r in conn.execute("SELECT DISTINCT vendor FROM sales_ledger").fetchall()]
sales_products   = conn.execute("""
    SELECT product_name, product_category, spec FROM sales_ledger
    GROUP BY product_name HAVING COUNT(*)>5 LIMIT 80
""").fetchall()
sales_districts  = conn.execute("SELECT DISTINCT district, region FROM sales_ledger").fetchall()

monthly_sales = conn.execute("""
    SELECT substr(date,1,7), SUM(amount)/COUNT(*) as avg_amt, COUNT(*) as cnt
    FROM sales_ledger WHERE date >= '2025-01-01'
    GROUP BY 1
""").fetchall()
avg_sale_amt = sum(r[1] for r in monthly_sales) / len(monthly_sales)
avg_sale_cnt = int(sum(r[2] for r in monthly_sales) / len(monthly_sales))

print(f"  PL accounts: {len(pl_accounts)}, BS accounts: {len(bs_accounts)}")
print(f"  avg PL credit/month: {avg_pl_credit:,.0f}, cnt: {avg_pl_cnt}")
print(f"  avg sales/month: {avg_sale_cnt} txns @ {avg_sale_amt:,.0f}")

# ────────────────────────────────────────────────
# 2. Target months
# ────────────────────────────────────────────────
TARGET_MONTHS = [
    (2025, 10), (2025, 11), (2025, 12),
    (2026, 1),  (2026, 2),  (2026, 3),
]

def month_days(y, m):
    """Return list of all dates in month."""
    d = date(y, m, 1)
    days = []
    while d.month == m:
        days.append(d)
        d += timedelta(days=1)
    return days

def last_day(y, m):
    return month_days(y, m)[-1]

# Growth factor per month (slight upward trend ~1.5% month-over-month)
def growth(month_idx):
    return 1.0 + 0.015 * month_idx + rng.uniform(-0.03, 0.03)

# ────────────────────────────────────────────────
# 3. Generate Journal Entries
# ────────────────────────────────────────────────
print("\n[2] Generating Journal Entries...")

# Get max existing id and je_number
max_id = conn.execute("SELECT MAX(id) FROM journal_entries").fetchone()[0] or 0
max_id += 1

new_je_rows = []

for idx, (y, m) in enumerate(TARGET_MONTHS):
    days = month_days(y, m)
    g = growth(idx)

    # PL entries
    pl_cnt = int(avg_pl_cnt * g * rng.uniform(0.92, 1.08))
    for _ in range(pl_cnt):
        acct = rng.choice(pl_accounts)
        acc_code, cls1, cls2, cls3, cls4, cc, div, branch, dc = acct
        d = rng.choice(days)
        # Credit entries tend to be revenue, debit = expense
        if dc == "C":
            amt = abs(rng.gauss(avg_pl_credit * g, avg_pl_credit * 0.3))
        else:
            amt = abs(rng.gauss(avg_pl_debit * g, avg_pl_debit * 0.3))
        amt = max(10000, round(amt / 1000) * 1000)
        je_num = f"{y}{m:02d}01-{max_id:04d}"
        new_je_rows.append((
            max_id, d.strftime("%Y-%m-%d"), je_num, dc, amt,
            None, None, acc_code, cls1, cls2, cls3, cls4, cc, div, branch, "PL"
        ))
        max_id += 1

    # BS entries
    bs_cnt = int(avg_bs_cnt * rng.uniform(0.85, 1.15))
    for _ in range(bs_cnt):
        acct = rng.choice(bs_accounts)
        acc_code, cls1, cls2, cls3, cls4, cc, div, branch, dc = acct
        d = rng.choice(days)
        amt = abs(rng.gauss(avg_bs_amt * g, avg_bs_amt * 0.4))
        amt = max(10000, round(amt / 1000) * 1000)
        # Mirror entry (debit + credit pair)
        je_num = f"{y}{m:02d}02-{max_id:04d}"
        for entry_dc in [dc, "C" if dc == "D" else "D"]:
            new_je_rows.append((
                max_id, d.strftime("%Y-%m-%d"), je_num, entry_dc, amt,
                None, None, acc_code, cls1, cls2, cls3, cls4, cc, div, branch, "BS"
            ))
            max_id += 1

    print(f"  {y}-{m:02d}: {pl_cnt} PL + {bs_cnt*2} BS entries")

print(f"  Total new JE rows: {len(new_je_rows):,}")
conn.executemany("""
    INSERT INTO journal_entries
    (id, date, je_number, debit_credit, amount, department, description,
     account_code, classification1, classification2, classification3,
     classification4, cost_center, division, branch, entry_type)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
""", new_je_rows)
conn.commit()
print("  [OK] JE inserted")

# ────────────────────────────────────────────────
# 4. Generate Sales Ledger
# ────────────────────────────────────────────────
print("\n[3] Generating Sales Ledger...")

max_sale_id = conn.execute("SELECT MAX(id) FROM sales_ledger").fetchone()[0] or 0
max_sale_id += 1

new_sales_rows = []

for idx, (y, m) in enumerate(TARGET_MONTHS):
    days = month_days(y, m)
    # Exclude weekends for B2B bias
    biz_days = [d for d in days if d.weekday() < 5]
    g = growth(idx)
    cnt = int(avg_sale_cnt * rng.uniform(0.88, 1.12))

    for _ in range(cnt):
        vendor  = rng.choice(sales_vendors)
        prod    = rng.choice(sales_products)
        p_name, p_cat, spec = prod
        dist_r  = rng.choice(sales_districts)
        district, region = dist_r
        d       = rng.choice(biz_days if biz_days else days)

        # Amount: lognormal to simulate realistic sales distribution
        base_amt = rng.lognormvariate(math.log(avg_sale_amt * g), 0.8)
        amt = max(5000, round(base_amt / 100) * 100)
        qty = rng.randint(1, 100) if p_cat in ["화장품", "전문의약품"] else rng.randint(1, 20)

        new_sales_rows.append((
            max_sale_id, vendor, p_name, p_cat, spec,
            region, district, d.strftime("%Y-%m-%d"),
            qty, amt
        ))
        max_sale_id += 1

    print(f"  {y}-{m:02d}: {cnt} sales transactions")

print(f"  Total new sales rows: {len(new_sales_rows):,}")
conn.executemany("""
    INSERT INTO sales_ledger
    (id, vendor, product_name, product_category, spec,
     region, district, date, quantity, amount)
    VALUES (?,?,?,?,?,?,?,?,?,?)
""", new_sales_rows)
conn.commit()
print("  [OK] Sales inserted")

# ────────────────────────────────────────────────
# 5. Generate Business Plan (2026 Q1 + extend 2025)
# ────────────────────────────────────────────────
print("\n[4] Generating Business Plan...")

# Get last plan month
last_plan = conn.execute("SELECT MAX(date), MAX(amount) FROM business_plan WHERE item='매출액'").fetchone()
last_plan_date = last_plan[0]   # 2025-12-31
last_revenue   = last_plan[1]

# 2025-10 ~ 2025-12 already in plan, need 2026-01 ~ 2026-03
new_plan_months = [(2026, 1), (2026, 2), (2026, 3)]
plan_dates = {
    (2026, 1): "2026-01-31",
    (2026, 2): "2026-02-28",
    (2026, 3): "2026-03-31",
}

# Grow from last plan value
curr_rev  = last_revenue
curr_cogs_ratio = 0.592
curr_sga_ratio  = 0.518

new_plan_rows = []
max_plan_id = conn.execute("SELECT MAX(id) FROM business_plan").fetchone()[0] or 0
max_plan_id += 1

for y, m in new_plan_months:
    curr_rev  = round(curr_rev * 1.005)   # +0.5% MoM
    cogs      = -round(curr_rev * curr_cogs_ratio)
    sga       = -round(curr_rev * curr_sga_ratio * 0.52)
    dt        = plan_dates[(y, m)]
    new_plan_rows.append((max_plan_id,     dt, curr_rev, "매출액"))
    new_plan_rows.append((max_plan_id + 1, dt, cogs,     "매출원가"))
    new_plan_rows.append((max_plan_id + 2, dt, sga,      "판매비와관리비"))
    max_plan_id += 3
    print(f"  {dt}: 매출 {curr_rev:,.0f} / 매출원가 {cogs:,.0f} / 판관비 {sga:,.0f}")

conn.executemany(
    "INSERT INTO business_plan (id, date, amount, item) VALUES (?,?,?,?)",
    new_plan_rows
)
conn.commit()
print("  [OK] Business plan inserted")

# ────────────────────────────────────────────────
# 6. Verify
# ────────────────────────────────────────────────
print("\n[5] Verification:")
for tbl in ["journal_entries", "sales_ledger", "business_plan"]:
    cnt = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
    mn  = conn.execute(f"SELECT MIN(date) FROM {tbl}").fetchone()[0]
    mx  = conn.execute(f"SELECT MAX(date) FROM {tbl}").fetchone()[0]
    print(f"  {tbl}: {cnt:,} rows  [{mn} ~ {mx}]")

conn.close()
print("\n[DONE] Dummy data for 2025-10 ~ 2026-03 generated!")
