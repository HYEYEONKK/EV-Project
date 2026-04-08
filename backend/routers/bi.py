"""
BI Analysis API Router
GET /api/bi/summary, /api/bi/pl, /api/bi/pl/trend,
     /api/bi/bs,      /api/bi/bs/trend,
     /api/bi/journal, /api/bi/exceptions, /api/bi/counterparties
"""

from fastapi import APIRouter, HTTPException, Query
from engine import bi_engine as be

router = APIRouter()


def _safe(v):
    """numpy int/float → Python 기본형 변환 (JSON 직렬화)"""
    if isinstance(v, dict):
        return {k: _safe(val) for k, val in v.items()}
    if isinstance(v, list):
        return [_safe(i) for i in v]
    try:
        import numpy as np
        if isinstance(v, np.integer):  return int(v)
        if isinstance(v, np.floating): return float(v)
    except ImportError:
        pass
    return v


@router.get("/summary")
def summary(year: int = Query(2025), month: int = Query(9)):
    try:
        return _safe(be.get_summary(year, month))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pl")
def pl(year: int = Query(2025), month: int = Query(9), ytd: bool = Query(True)):
    try:
        return _safe(be.get_pl(year, month, ytd))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pl/trend")
def pl_trend():
    try:
        return _safe(be.get_monthly_pl_trend())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bs")
def bs(year: int = Query(2025), month: int = Query(9)):
    try:
        return _safe(be.get_bs(year, month))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bs/trend")
def bs_trend():
    try:
        return _safe(be.get_bs_trend())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/journal")
def journal():
    try:
        return _safe(be.get_journal_stats())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exceptions")
def exceptions():
    try:
        return _safe(be.get_exceptions())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/counterparties")
def counterparties(
    year:  int = Query(2025),
    month: int = Query(9),
    top_n: int = Query(5),
):
    try:
        return _safe(be.get_top_counterparties(year, month, ytd=True, top_n=top_n))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
