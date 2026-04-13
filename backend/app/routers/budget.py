from fastapi import APIRouter, Query
from app.services import budget_variance as svc

router = APIRouter(prefix="/budget", tags=["Budget"])


@router.get("/variance/monthly")
def monthly_variance(year: int = Query(2025, ge=2020, le=2030)):
    return svc.get_monthly_variance(year)
