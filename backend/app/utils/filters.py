"""공통 필터 빌더 — 모든 라우터에서 재사용"""
from datetime import date as dt_date


def apply_date_filter(query, model, date_from: str | None, date_to: str | None):
    if date_from:
        query = query.filter(model.date >= date_from)
    if date_to:
        query = query.filter(model.date <= date_to)
    return query


def apply_je_filters(query, model, date_from, date_to, division, branch):
    query = apply_date_filter(query, model, date_from, date_to)
    if division:
        query = query.filter(model.division.in_(division))
    if branch:
        query = query.filter(model.branch.in_(branch))
    return query
