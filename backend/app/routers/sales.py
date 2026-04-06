from fastapi import APIRouter, Query
from typing import Optional
from app.services import sales_analysis as svc

router = APIRouter(prefix="/sales", tags=["Sales"])


def _params(date_from, date_to, vendor=None, product_category=None, region=None):
    return {
        "date_from": date_from,
        "date_to": date_to,
        "vendor": vendor,
        "product_category": product_category,
        "region": region,
    }


@router.get("/summary")
def summary(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
    product_category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    return svc.get_sales_summary(_params(date_from, date_to, vendor, product_category, region))


@router.get("/monthly-trend")
def monthly_trend(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
    product_category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    return svc.get_monthly_trend(_params(date_from, date_to, vendor, product_category, region))


@router.get("/by-category")
def by_category(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    return svc.get_by_category({"date_from": date_from, "date_to": date_to, "region": region})


@router.get("/by-region")
def by_region(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    product_category: Optional[str] = Query(None),
):
    return svc.get_by_region({"date_from": date_from, "date_to": date_to,
                               "product_category": product_category})


@router.get("/by-vendor")
def by_vendor(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    product_category: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    top_n: int = Query(20, ge=1, le=100),
):
    return svc.get_by_vendor(
        {"date_from": date_from, "date_to": date_to,
         "product_category": product_category, "region": region},
        top_n=top_n
    )


@router.get("/dimensions")
def dimensions():
    return svc.get_dimensions()
