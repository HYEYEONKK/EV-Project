# Backend — FastAPI + SQLAlchemy 패턴

## 표준 라우터 패턴

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/resource", tags=["resource"])

@router.get("/summary")
def get_summary(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    division: list[str] = Query(default=[]),
    branch: list[str] = Query(default=[]),
    db: Session = Depends(get_db),
):
    ...
```

## 공통 필터 빌더

```python
# app/utils/filters.py
def apply_common_filters(query, model, date_from, date_to, division, branch):
    if date_from:
        query = query.filter(model.date >= date_from)
    if date_to:
        query = query.filter(model.date <= date_to)
    if division:
        query = query.filter(model.division.in_(division))
    if branch:
        query = query.filter(model.branch.in_(branch))
    return query
```

## SQLAlchemy Core 집계 (ORM보다 10x 빠름)

```python
from sqlalchemy import select, func, text
from app.database import engine

with engine.connect() as conn:
    result = conn.execute(
        select(
            func.strftime('%Y-%m', JournalEntry.date).label('month'),
            func.sum(JournalEntry.amount).label('total')
        )
        .where(JournalEntry.entry_type == 'PL')
        .group_by('month')
        .order_by('month')
    )
    rows = result.mappings().all()
```

## 청크 삽입 (대용량 적재)

```python
chunk_size = 5000
for i in range(0, len(df), chunk_size):
    chunk = df.iloc[i:i+chunk_size].to_dict('records')
    conn.execute(table.insert(), chunk)
conn.commit()
```

## CORS 설정 (main.py)

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## SQLite WAL 모드 활성화

```python
from sqlalchemy import event
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()
```
