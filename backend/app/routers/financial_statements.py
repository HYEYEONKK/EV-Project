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
