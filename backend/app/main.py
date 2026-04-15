from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import financial_statements, journal_entries, sales, budget, scenarios, chat, market_data, upload, auth

app = FastAPI(
    title="EasyView API",
    description="ABC Company 재무 분석 BI 대시보드 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(financial_statements.router, prefix=PREFIX)
app.include_router(journal_entries.router, prefix=PREFIX)
app.include_router(sales.router, prefix=PREFIX)
app.include_router(budget.router, prefix=PREFIX)
app.include_router(scenarios.router, prefix=PREFIX)
app.include_router(chat.router, prefix=PREFIX)
app.include_router(market_data.router, prefix=PREFIX)
app.include_router(upload.router, prefix=PREFIX)
app.include_router(auth.router, prefix=PREFIX)


@app.get("/")
def root():
    return {"message": "EasyView API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
