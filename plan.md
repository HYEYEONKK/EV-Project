# EasyView — 구현 계획 (plan.md)

## 현황 추적

| Phase | 내용 | 상태 |
|-------|------|------|
| Step 1 | CLAUDE.md, plan.md, skills 작성 | ✅ |
| Phase 0 | 프로젝트 셋업 + 데이터 적재 | 🔄 |
| Phase 1 | FastAPI 백엔드 API | ⏳ |
| Phase 2 | 재무제표 (BS/PL/CF) | ⏳ |
| Phase 3 | 대시보드 + 차트 | ⏳ |
| Phase 4 | 크로스필터 + 고급 기능 | ⏳ |
| Phase 5 | 디자인 폴리시 + 최종 검증 | ⏳ |

---

## Phase 0: 프로젝트 셋업 + 데이터 엔지니어링

### 목표
Excel 4개 파일 → SQLite DB 적재, 백엔드/프론트엔드 스캐폴딩

### 작업 목록
- [x] 폴더 구조 생성
- [x] CLAUDE.md 작성
- [ ] backend/requirements.txt
- [ ] backend/app/ 스캐폴딩 (main, config, database, models, schemas, services, routers)
- [ ] scripts/ingest_all.py 작성 및 실행
- [ ] frontend Next.js 생성 (create-next-app)
- [ ] frontend 의존성 설치 (zustand, react-query, recharts, lucide-react)
- [ ] 데이터 적재 검증 (row count 확인)

### DB 스키마

```sql
-- journal_entries
CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    je_number TEXT,
    debit_credit TEXT NOT NULL,   -- 'D' or 'C'
    amount REAL NOT NULL,
    department TEXT,
    description TEXT,
    account_code TEXT NOT NULL,
    classification1 TEXT,
    classification2 TEXT,
    classification3 TEXT,
    classification4 TEXT,
    cost_center TEXT,
    division TEXT,
    branch TEXT,
    entry_type TEXT NOT NULL      -- 'BS', 'PL', 'IT'
);
CREATE INDEX idx_je_date ON journal_entries(date);
CREATE INDEX idx_je_date_type ON journal_entries(date, entry_type);
CREATE INDEX idx_je_account ON journal_entries(account_code);
CREATE INDEX idx_je_division ON journal_entries(division);
CREATE INDEX idx_je_branch ON journal_entries(branch);

-- trial_balance
CREATE TABLE trial_balance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_code TEXT UNIQUE NOT NULL,
    classification1 TEXT,
    classification2 TEXT,
    cost_center TEXT,
    account_name TEXT,
    entry_type TEXT,
    branch TEXT,
    division TEXT,
    accounting_class TEXT,
    balance REAL
);

-- sales_ledger
CREATE TABLE sales_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor TEXT,
    product_name TEXT,
    product_category TEXT,
    spec TEXT,
    region TEXT,
    district TEXT,
    date DATE NOT NULL,
    quantity REAL,
    amount REAL,
    sales_key TEXT,
    period TEXT,
    cumulative_amount REAL
);
CREATE INDEX idx_sales_date ON sales_ledger(date);
CREATE INDEX idx_sales_vendor ON sales_ledger(vendor);
CREATE INDEX idx_sales_category ON sales_ledger(product_category);
CREATE INDEX idx_sales_region ON sales_ledger(region);

-- business_plan
CREATE TABLE business_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    amount REAL,
    item TEXT NOT NULL
);
```

---

## Phase 1: 백엔드 API

### 파일 목록
```
backend/app/
├── main.py
├── config.py        ← ACCOUNT_HIERARCHY, CF_CLASSIFICATION_MAP
├── database.py
├── models/
│   ├── journal_entry.py
│   ├── trial_balance.py
│   ├── sales_ledger.py
│   └── business_plan.py
├── schemas/
│   ├── financial.py
│   └── sales.py
├── services/
│   ├── financial_statements.py  ← 핵심
│   ├── sales_analysis.py
│   └── budget_variance.py
├── routers/
│   ├── journal_entries.py
│   ├── financial_statements.py
│   ├── sales.py
│   └── budget.py
└── utils/
    └── filters.py
```

---

## Phase 2: 재무제표

### 컴포넌트
- `FinancialStatementTable.tsx`: 계층형 테이블, 전기 비교, CSV export
- `/financial/balance-sheet/page.tsx`
- `/financial/income-statement/page.tsx`
- `/financial/cash-flow/page.tsx`

---

## Phase 3: 대시보드 + 차트

### 대시보드 레이아웃
```
┌────────────────────────────────────────┐
│ [KPI] 총매출  [KPI] 영업이익  [KPI] 총자산  [KPI] 순현금 │
├──────────────────────┬─────────────────┤
│  RevenueChart (8col) │ CostPie (4col)  │
├────────────────────────────────────────┤
│       AccountTrendChart (full)          │
├─────────────────────┬──────────────────┤
│ SalesByCategory (6) │ SalesByRegion (6)│
└─────────────────────┴──────────────────┘
```

---

## Phase 4: 고급 기능

- **크로스필터:** Zustand store → queryKey 변경 → React Query 자동 리페치
- **예실 비교:** 사업계획 vs JE 실적, 월별 달성률
- **판매처 드릴다운:** 클릭 → 해당 판매처 상품별 분석

---

## Phase 5: 디자인 폴리시

- Pretendard 폰트 적용
- PwC 오렌지 #D04A02 컬러 시스템
- 사이드바 축소/확장 (localStorage)
- 반응형 레이아웃 (1280px 기준)
- EasyView SVG 텍스트 로고
- favicon.svg 적용
