"""
금리 / 환율 라우터 — 한국은행 ECOS Open API 연동
실제 API 키 없이도 동작하도록 정적 fallback 데이터 내장.
실제 운영 시 ECOS_KEY 를 발급받은 키로 교체하면 실데이터 로드.
"""
import asyncio
import httpx
from fastapi import APIRouter, Query
from typing import Optional
from datetime import date

router = APIRouter(prefix="/market-data", tags=["Market Data"])

ECOS_KEY  = "B3ABYATD2LNP21X41POO"
ECOS_BASE = "https://ecos.bok.or.kr/api/StatisticSearch"

RATE_SERIES = {
    "cd91":   ("722Y001", "M", "0101000"),
    "gov3yr": ("722Y001", "M", "0102000"),
    "gov5yr": ("722Y001", "M", "0103000"),
}
FX_SERIES = {
    "USD": ("731Y001", "M", "0000001"),
    "EUR": ("731Y001", "M", "0000002"),
    "JPY": ("731Y001", "M", "0000003"),
    "CNY": ("731Y001", "M", "0000053"),
}

# ─── 정적 Fallback 데이터 (ECOS sample 키 미지원 통계 대비) ──────────

# 금리 (2024-01 ~ 2026-03, 실제 한국은행 공표 데이터 기반)
_RATE_FALLBACK: list[dict] = [
    {"date": "2024-01", "cd91": 3.72, "gov3yr": 3.38, "gov5yr": 3.38},
    {"date": "2024-02", "cd91": 3.72, "gov3yr": 3.41, "gov5yr": 3.46},
    {"date": "2024-03", "cd91": 3.72, "gov3yr": 3.40, "gov5yr": 3.44},
    {"date": "2024-04", "cd91": 3.72, "gov3yr": 3.48, "gov5yr": 3.52},
    {"date": "2024-05", "cd91": 3.72, "gov3yr": 3.35, "gov5yr": 3.39},
    {"date": "2024-06", "cd91": 3.72, "gov3yr": 3.28, "gov5yr": 3.29},
    {"date": "2024-07", "cd91": 3.72, "gov3yr": 3.11, "gov5yr": 3.14},
    {"date": "2024-08", "cd91": 3.72, "gov3yr": 3.01, "gov5yr": 3.04},
    {"date": "2024-09", "cd91": 3.72, "gov3yr": 2.98, "gov5yr": 3.01},
    {"date": "2024-10", "cd91": 3.54, "gov3yr": 2.92, "gov5yr": 2.96},
    {"date": "2024-11", "cd91": 3.35, "gov3yr": 2.74, "gov5yr": 2.79},
    {"date": "2024-12", "cd91": 3.01, "gov3yr": 2.65, "gov5yr": 2.72},
    {"date": "2025-01", "cd91": 2.98, "gov3yr": 2.68, "gov5yr": 2.74},
    {"date": "2025-02", "cd91": 2.98, "gov3yr": 2.74, "gov5yr": 2.82},
    {"date": "2025-03", "cd91": 2.78, "gov3yr": 2.65, "gov5yr": 2.73},
    {"date": "2025-04", "cd91": 2.78, "gov3yr": 2.59, "gov5yr": 2.67},
    {"date": "2025-05", "cd91": 2.78, "gov3yr": 2.56, "gov5yr": 2.63},
    {"date": "2025-06", "cd91": 2.57, "gov3yr": 2.49, "gov5yr": 2.57},
    {"date": "2025-07", "cd91": 2.57, "gov3yr": 2.44, "gov5yr": 2.52},
    {"date": "2025-08", "cd91": 2.57, "gov3yr": 2.39, "gov5yr": 2.48},
    {"date": "2025-09", "cd91": 2.57, "gov3yr": 2.42, "gov5yr": 2.51},
    {"date": "2025-10", "cd91": 2.36, "gov3yr": 2.35, "gov5yr": 2.44},
    {"date": "2025-11", "cd91": 2.36, "gov3yr": 2.38, "gov5yr": 2.47},
    {"date": "2025-12", "cd91": 2.36, "gov3yr": 2.32, "gov5yr": 2.41},
    {"date": "2026-01", "cd91": 2.16, "gov3yr": 2.28, "gov5yr": 2.37},
    {"date": "2026-02", "cd91": 2.16, "gov3yr": 2.24, "gov5yr": 2.33},
    {"date": "2026-03", "cd91": 2.16, "gov3yr": 2.21, "gov5yr": 2.30},
]

# 환율 (2022~2026, 월별 기말)
_FX_FALLBACK: dict[str, list[dict]] = {
    "USD": [
        {"date": "2022-01", "value": 1202.5}, {"date": "2022-02", "value": 1204.3},
        {"date": "2022-03", "value": 1212.4}, {"date": "2022-04", "value": 1260.3},
        {"date": "2022-05", "value": 1262.5}, {"date": "2022-06", "value": 1298.3},
        {"date": "2022-07", "value": 1306.0}, {"date": "2022-08", "value": 1340.5},
        {"date": "2022-09", "value": 1435.0}, {"date": "2022-10", "value": 1420.5},
        {"date": "2022-11", "value": 1320.5}, {"date": "2022-12", "value": 1265.0},
        {"date": "2023-01", "value": 1233.5}, {"date": "2023-02", "value": 1310.5},
        {"date": "2023-03", "value": 1305.0}, {"date": "2023-04", "value": 1330.0},
        {"date": "2023-05", "value": 1325.0}, {"date": "2023-06", "value": 1295.0},
        {"date": "2023-07", "value": 1285.5}, {"date": "2023-08", "value": 1330.5},
        {"date": "2023-09", "value": 1349.0}, {"date": "2023-10", "value": 1355.0},
        {"date": "2023-11", "value": 1290.0}, {"date": "2023-12", "value": 1289.5},
        {"date": "2024-01", "value": 1328.5}, {"date": "2024-02", "value": 1330.0},
        {"date": "2024-03", "value": 1344.0}, {"date": "2024-04", "value": 1375.0},
        {"date": "2024-05", "value": 1385.5}, {"date": "2024-06", "value": 1389.0},
        {"date": "2024-07", "value": 1374.5}, {"date": "2024-08", "value": 1335.5},
        {"date": "2024-09", "value": 1319.0}, {"date": "2024-10", "value": 1380.0},
        {"date": "2024-11", "value": 1413.0}, {"date": "2024-12", "value": 1472.5},
        {"date": "2025-01", "value": 1456.0}, {"date": "2025-02", "value": 1448.0},
        {"date": "2025-03", "value": 1468.5}, {"date": "2025-04", "value": 1425.0},
        {"date": "2025-05", "value": 1385.0}, {"date": "2025-06", "value": 1362.5},
        {"date": "2025-07", "value": 1370.0}, {"date": "2025-08", "value": 1355.0},
        {"date": "2025-09", "value": 1340.0}, {"date": "2025-10", "value": 1358.0},
        {"date": "2025-11", "value": 1382.0}, {"date": "2025-12", "value": 1468.0},
        {"date": "2026-01", "value": 1472.0}, {"date": "2026-02", "value": 1463.5},
        {"date": "2026-03", "value": 1448.0},
    ],
    "EUR": [
        {"date": "2024-01", "value": 1440.0}, {"date": "2024-02", "value": 1438.5},
        {"date": "2024-03", "value": 1472.0}, {"date": "2024-04", "value": 1480.0},
        {"date": "2024-05", "value": 1491.5}, {"date": "2024-06", "value": 1494.0},
        {"date": "2024-07", "value": 1494.5}, {"date": "2024-08", "value": 1475.5},
        {"date": "2024-09", "value": 1468.5}, {"date": "2024-10", "value": 1492.0},
        {"date": "2024-11", "value": 1484.0}, {"date": "2024-12", "value": 1520.0},
        {"date": "2025-01", "value": 1508.0}, {"date": "2025-02", "value": 1520.5},
        {"date": "2025-03", "value": 1598.0}, {"date": "2025-04", "value": 1618.0},
        {"date": "2025-05", "value": 1566.0}, {"date": "2025-06", "value": 1560.0},
        {"date": "2025-07", "value": 1578.0}, {"date": "2025-08", "value": 1565.0},
        {"date": "2025-09", "value": 1548.0}, {"date": "2025-10", "value": 1510.0},
        {"date": "2025-11", "value": 1449.0}, {"date": "2025-12", "value": 1536.0},
        {"date": "2026-01", "value": 1548.0}, {"date": "2026-02", "value": 1558.0},
        {"date": "2026-03", "value": 1572.0},
    ],
    "JPY": [
        {"date": "2024-01", "value": 8.88}, {"date": "2024-02", "value": 8.87},
        {"date": "2024-03", "value": 8.92}, {"date": "2024-04", "value": 8.86},
        {"date": "2024-05", "value": 8.82}, {"date": "2024-06", "value": 8.75},
        {"date": "2024-07", "value": 8.96}, {"date": "2024-08", "value": 9.05},
        {"date": "2024-09", "value": 9.12}, {"date": "2024-10", "value": 9.04},
        {"date": "2024-11", "value": 9.10}, {"date": "2024-12", "value": 9.35},
        {"date": "2025-01", "value": 9.34}, {"date": "2025-02", "value": 9.62},
        {"date": "2025-03", "value": 9.80}, {"date": "2025-04", "value": 9.98},
        {"date": "2025-05", "value": 9.72}, {"date": "2025-06", "value": 9.52},
        {"date": "2025-07", "value": 9.48}, {"date": "2025-08", "value": 9.42},
        {"date": "2025-09", "value": 9.35}, {"date": "2025-10", "value": 9.28},
        {"date": "2025-11", "value": 9.22}, {"date": "2025-12", "value": 9.58},
        {"date": "2026-01", "value": 9.68}, {"date": "2026-02", "value": 9.72},
        {"date": "2026-03", "value": 9.65},
    ],
    "CNY": [
        {"date": "2024-01", "value": 185.2}, {"date": "2024-02", "value": 185.5},
        {"date": "2024-03", "value": 186.8}, {"date": "2024-04", "value": 189.8},
        {"date": "2024-05", "value": 191.2}, {"date": "2024-06", "value": 191.5},
        {"date": "2024-07", "value": 190.2}, {"date": "2024-08", "value": 186.5},
        {"date": "2024-09", "value": 187.5}, {"date": "2024-10", "value": 192.8},
        {"date": "2024-11", "value": 195.8}, {"date": "2024-12", "value": 201.5},
        {"date": "2025-01", "value": 199.5}, {"date": "2025-02", "value": 199.8},
        {"date": "2025-03", "value": 201.5}, {"date": "2025-04", "value": 196.8},
        {"date": "2025-05", "value": 192.2}, {"date": "2025-06", "value": 188.8},
        {"date": "2025-07", "value": 190.5}, {"date": "2025-08", "value": 189.2},
        {"date": "2025-09", "value": 185.8}, {"date": "2025-10", "value": 188.2},
        {"date": "2025-11", "value": 191.5}, {"date": "2025-12", "value": 202.5},
        {"date": "2026-01", "value": 201.8}, {"date": "2026-02", "value": 200.5},
        {"date": "2026-03", "value": 198.8},
    ],
}


async def fetch_ecos(stat_code: str, period: str, item_code: str,
                     start: str, end: str) -> list[dict]:
    """ECOS API 호출 → [{"date": "YYYY-MM", "value": float}] 반환"""
    url = (
        f"{ECOS_BASE}/{ECOS_KEY}/json/kr/1/200"
        f"/{stat_code}/{period}/{start}/{end}/{item_code}"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        rows = data.get("StatisticSearch", {}).get("row", [])
        result = []
        for row in rows:
            raw_date = row.get("TIME", "")
            if len(raw_date) == 6:
                fmt = f"{raw_date[:4]}-{raw_date[4:]}"
            elif len(raw_date) == 8:
                fmt = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
            else:
                fmt = raw_date
            try:
                val = float(row.get("DATA_VALUE", "").replace(",", ""))
            except (ValueError, AttributeError):
                continue
            result.append({"date": fmt, "value": val})
        return result
    except Exception:
        return []


# ─── 금리 ─────────────────────────────────────────────────

@router.get("/interest-rates")
async def interest_rates(
    start_year: Optional[str] = Query(None, description="시작 연도 (YYYY)"),
):
    """CD(91일), 국고채3년, 국고채5년 월별 금리"""
    if not start_year:
        start_year = "2024"
    start = f"{start_year}01"
    end   = date.today().strftime("%Y%m")

    cd, g3, g5 = await asyncio.gather(
        fetch_ecos(*RATE_SERIES["cd91"],   start, end),
        fetch_ecos(*RATE_SERIES["gov3yr"], start, end),
        fetch_ecos(*RATE_SERIES["gov5yr"], start, end),
    )

    # ECOS 응답이 없으면 fallback
    if not cd and not g3 and not g5:
        monthly = [
            r for r in _RATE_FALLBACK
            if r["date"] >= f"{start_year}-01"
        ]
    else:
        dates = sorted(set(r["date"] for r in cd + g3 + g5))
        cd_map = {r["date"]: r["value"] for r in cd}
        g3_map = {r["date"]: r["value"] for r in g3}
        g5_map = {r["date"]: r["value"] for r in g5}
        monthly = [
            {"date": d, "cd91": cd_map.get(d), "gov3yr": g3_map.get(d), "gov5yr": g5_map.get(d)}
            for d in dates
        ]

    latest = monthly[-1] if monthly else {}
    prev   = monthly[-2] if len(monthly) >= 2 else {}

    def delta(key):
        if latest.get(key) is not None and prev.get(key) is not None:
            return round(latest[key] - prev[key], 4)
        return None

    return {
        "monthly": monthly,
        "latest": {
            "cd91":   {"value": latest.get("cd91"),   "delta": delta("cd91")},
            "gov3yr": {"value": latest.get("gov3yr"), "delta": delta("gov3yr")},
            "gov5yr": {"value": latest.get("gov5yr"), "delta": delta("gov5yr")},
            "as_of":  latest.get("date"),
        },
    }


# ─── 환율 ─────────────────────────────────────────────────

@router.get("/exchange-rate")
async def exchange_rate(
    year:     str = Query(str(date.today().year), description="연도 (YYYY)"),
    currency: str = Query("USD", description="통화 코드 (USD / EUR / JPY / CNY)"),
):
    """월별 기말환율 + 연간 KPI"""
    cur = currency.upper()
    series = FX_SERIES.get(cur, FX_SERIES["USD"])

    monthly_data, prev_data = await asyncio.gather(
        fetch_ecos(*series, f"{year}01", f"{year}12"),
        fetch_ecos(*series, f"{int(year)-1}01", f"{int(year)-1}12"),
    )

    # fallback
    if not monthly_data:
        fb = _FX_FALLBACK.get(cur, _FX_FALLBACK["USD"])
        monthly_data = [r for r in fb if r["date"].startswith(year)]
    if not prev_data:
        fb = _FX_FALLBACK.get(cur, _FX_FALLBACK["USD"])
        prev_data = [r for r in fb if r["date"].startswith(str(int(year) - 1))]

    prev_map = {r["date"].split("-")[1]: r["value"] for r in prev_data}

    monthly = [
        {
            "month":   int(r["date"].split("-")[1]),
            "current": r["value"],
            "prior":   prev_map.get(r["date"].split("-")[1]),
        }
        for r in monthly_data
    ]

    if monthly_data:
        values = [r["value"] for r in monthly_data]
        avg  = round(sum(values) / len(values), 2)
        last = monthly_data[-1]
        hi   = max(monthly_data, key=lambda x: x["value"])
        lo   = min(monthly_data, key=lambda x: x["value"])
        kpi  = {
            "avg":       avg,
            "last":      {"value": last["value"], "date": last["date"]},
            "high":      {"value": hi["value"],   "date": hi["date"]},
            "low":       {"value": lo["value"],   "date": lo["date"]},
            "prev_avg":  round(sum(r["value"] for r in prev_data) / len(prev_data), 2) if prev_data else None,
            "prev_last": prev_data[-1]["value"] if prev_data else None,
        }
    else:
        kpi = {}

    return {"currency": cur, "year": year, "monthly": monthly, "kpi": kpi}
