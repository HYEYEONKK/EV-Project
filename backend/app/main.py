from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import financial_statements, journal_entries, sales, budget

app = FastAPI(
    title="EasyView API",
    description="ABC Company 재무 분석 BI 대시보드 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(financial_statements.router, prefix=PREFIX)
app.include_router(journal_entries.router, prefix=PREFIX)
app.include_router(sales.router, prefix=PREFIX)
app.include_router(budget.router, prefix=PREFIX)


@app.get("/")
def root():
    return {"message": "EasyView API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
