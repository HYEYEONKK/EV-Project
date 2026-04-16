from fastapi import APIRouter, Query
from typing import Optional
from app.services import financial_statements as svc

router = APIRouter(prefix="/financial-statements", tags=["Financial Statements"])

COMMON_PARAMS = {
    "date_from": (Optional[str], Query(None, description="시작일 YYYY-MM-DD")),
    "date_to": (Optional[str], Query(None, description="종료일 YYYY-MM-DD")),
}


def _params(date_from, date_to):
    return {"date_from": date_from, "date_to": date_to}


@router.get("/balance-sheet")
def balance_sheet(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_balance_sheet(_params(date_from, date_to))


@router.get("/income-statement")
def income_statement(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_income_statement(_params(date_from, date_to))


@router.get("/income-statement/monthly")
def income_statement_monthly(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_income_statement_monthly(_params(date_from, date_to))


@router.get("/cash-flow")
def cash_flow(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_cash_flow(_params(date_from, date_to))


# ─── PL 추이분석 ──────────────────────────────────────────────

@router.get("/pl/monthly-by-account")
def pl_monthly_by_account(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_pl_monthly_by_account(_params(date_from, date_to))


@router.get("/pl/vendor-delta")
def pl_vendor_delta(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: str = Query(..., description="계정과목 (classification1)"),
):
    return svc.get_pl_vendor_delta(_params(date_from, date_to), account)


@router.get("/pl/entries")
def pl_entries(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: str = Query(..., description="계정과목 (classification1)"),
    period: str = Query("current", description="current | prior"),
    limit: int = Query(9999),
):
    return svc.get_pl_entries(_params(date_from, date_to), account, period, limit)


@router.get("/pl/kpi-monthly")
def pl_kpi_monthly(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
):
    return svc.get_pl_kpi_monthly(_params(date_from, date_to))


@router.get("/pl/waterfall-monthly")
def pl_waterfall_monthly(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
):
    return svc.get_pl_waterfall_monthly(_params(date_from, date_to))


@router.get("/pl/waterfall-bridge")
def pl_waterfall_bridge(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
):
    return svc.get_pl_waterfall_bridge(_params(date_from, date_to))


# ─── BS 추이분석 ──────────────────────────────────────────────

@router.get("/bs/monthly")
def bs_monthly(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_bs_monthly(_params(date_from, date_to))


@router.get("/bs/account-delta")
def bs_account_delta(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_bs_account_delta(_params(date_from, date_to))


@router.get("/bs/kpi")
def bs_kpi(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_bs_kpi(_params(date_from, date_to))


@router.get("/bs/ratios-monthly")
def bs_ratios_monthly(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_bs_ratios_monthly(_params(date_from, date_to))


@router.get("/bs/activity-monthly")
def bs_activity_monthly(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_bs_activity_monthly(_params(date_from, date_to))


# ─── BS BI 추가 엔드포인트 ───────────────────────────────────

@router.get("/bs/daily-balance")
def bs_daily_balance(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: Optional[str] = Query(None, description="공시용계정 (classification1)"),
):
    return svc.get_bs_daily_balance(_params(date_from, date_to), account)


@router.get("/bs/vendor-composition")
def bs_vendor_composition(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: Optional[str] = Query(None, description="공시용계정"),
    debit_credit: Optional[str] = Query(None, description="D | C"),
):
    return svc.get_bs_vendor_composition(_params(date_from, date_to), account, debit_credit)


@router.get("/bs/counter-accounts")
def bs_counter_accounts(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: Optional[str] = Query(None, description="공시용계정"),
):
    return svc.get_bs_counter_accounts(_params(date_from, date_to), account)


@router.get("/bs/entries")
def bs_entries(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: Optional[str] = Query(None, description="공시용계정"),
    debit_credit: Optional[str] = Query(None, description="D | C"),
    vendor: Optional[str] = Query(None),
    limit: int = Query(500),
):
    return svc.get_bs_entries(_params(date_from, date_to), account, debit_credit, vendor, limit)


@router.get("/bs/detail-table")
def bs_detail_table(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    compare_base: str = Query("연초", description="연초 | 월초"),
):
    return svc.get_bs_detail_table(_params(date_from, date_to), compare_base)


@router.get("/bs/vendor-delta")
def bs_vendor_delta(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: Optional[str] = Query(None, description="공시용계정"),
):
    return svc.get_bs_vendor_delta(_params(date_from, date_to), account)


@router.get("/bs/accounts-list")
def bs_accounts_list():
    return svc.get_bs_accounts_list()


# ─── Cash Flow BI 엔드포인트 ─────────────────────────────────

@router.get("/cash-flow/comparison")
def cash_flow_comparison(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    return svc.get_cash_flow_comparison(_params(date_from, date_to))
