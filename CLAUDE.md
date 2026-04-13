# EasyView — 프로젝트 종합 가이드

## 프로젝트 개요
ABC Company의 회계 데이터(전표/시산표/매출장/사업계획)를 기반으로 한 PwC 스타일 재무 분석 BI 대시보드.

---

## 기술 스택

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State | Zustand (글로벌 필터), React Query (서버 상태) |
| Charts | Recharts |
| Backend | FastAPI (Python 3.11+) |
| ORM | SQLAlchemy 2.x |
| DB | SQLite (WAL mode) — PostgreSQL 마이그레이션 준비 완료 |
| Data | pandas + openpyxl (Excel 적재) |

---

## 폴더 구조

```
easyview/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 진입점 (CORS 설정 포함)
│   │   ├── config.py            # 계정 계층 맵, CF 분류 맵, 예실 매핑
│   │   ├── database.py          # SQLAlchemy engine + get_db 의존성
│   │   ├── models/              # ORM 모델 (journal_entry, trial_balance, sales_ledger, business_plan)
│   │   ├── schemas/             # Pydantic 스키마 (요청/응답)
│   │   ├── services/            # 비즈니스 로직 (financial_statements, budget_variance, sales_analysis)
│   │   └── routers/             # API 라우터
│   ├── scripts/
│   │   └── ingest_all.py        # Excel 4개 → SQLite 일괄 적재
│   ├── data/
│   │   └── easyview.db          # SQLite DB (gitignore)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router 페이지
│   │   ├── components/          # UI 컴포넌트
│   │   └── lib/                 # API 클라이언트, 훅, 스토어, 유틸
│   └── public/                  # 정적 에셋 (로고, 파비콘)
└── CLAUDE.md
```

---

## 데이터 구조

### 원본 파일 위치
```
C:\Users\jkimz022\OneDrive - PwC\FY26\AX Node\Web 과제\ABC Company Sample Data\
├── ABC_JE v2.xlsx    # 전표 134,784행
├── ABC_TB.xlsx       # 시산표 83행
├── 매출장.xlsx        # 매출 29,999행
└── 사업계획.xlsx      # 예산 36행 (2025 월별)
```

### DB 테이블 & 핵심 컬럼
| 테이블 | PK | 주요 필터 컬럼 | Join Key |
|--------|-----|--------------|----------|
| journal_entries | id | date, entry_type(BS/PL/IT), division, branch | account_code → trial_balance |
| trial_balance | account_code | division, branch | — |
| sales_ledger | id | date, vendor, product_category, region | — |
| business_plan | id | date, item | — |

### 재무 로직 핵심
- **BS:** TB 잔액 + JE net 증감 (entry_type='BS') → classification 계층 합산
- **PL:** JE entry_type='PL', 대변=수익, 차변=비용 → classification 계층
- **CF:** 나부분류='현금' 계정 → config.py의 CF_CLASSIFICATION_MAP으로 영업/투자/재무 분류
- **차대(D/C):** D=차변(debit), C=대변(credit), amount는 항상 양수

---

## API 규격

**Base URL:** `http://localhost:8000/api/v1`

**공통 쿼리 파라미터:**
```
date_from: YYYY-MM-DD
date_to: YYYY-MM-DD
division: str (나부분류, 반복 가능)
branch: str (지점, 반복 가능)
```

**주요 엔드포인트:**
```
GET /financial-statements/balance-sheet
GET /financial-statements/income-statement
GET /financial-statements/cash-flow
GET /financial-statements/income-statement/monthly
GET /journal-entries/monthly-trend
GET /journal-entries/dimensions
GET /sales/summary
GET /sales/monthly-trend
GET /sales/by-category
GET /sales/by-region
GET /sales/by-vendor
GET /sales/dimensions
GET /budget/variance/monthly
```

---

## 프론트엔드 컨벤션

### 파일 네이밍
- 컴포넌트: `PascalCase.tsx`
- 훅: `use{Name}.ts`
- 유틸: `camelCase.ts`
- 페이지: `app/{route}/page.tsx`

### 필터 상태 관리 (Zustand)
```typescript
// lib/store/filterStore.ts
// dateFrom, dateTo, divisions[], branches[]
// activeMonth, activeCostCategory, activeProductCategory, activeVendor (크로스필터)
```

### React Query 캐싱
```typescript
staleTime: 5 * 60 * 1000   // 5분
gcTime: 30 * 60 * 1000      // 30분
placeholderData: keepPreviousData  // 필터 전환시 플리커 방지
```

### KRW 포맷터
```typescript
// lib/utils/formatters.ts
formatKRW(value: number): string  // 1,234억 / 12.3조 형식
formatKRWFull(value: number): string  // ₩1,234,567,890
```

---

## 디자인 시스템

### 컬러
```css
--pwc-orange: #D04A02;
--pwc-orange-light: #FD5108;
--sidebar: #1A1A2E;
--surface: #F7F8FC;
--positive: #059669;
--negative: #DC2626;
```

### 폰트
- **Pretendard** (한국어+영문 통합)
- CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css`

### 차트 색상 팔레트
```typescript
['#D04A02', '#1A1A2E', '#EB8C00', '#295477', '#688FA8', '#C9A84C', '#7A3B1E', '#4A4A6A']
```

### 레이아웃
- 사이드바: 240px (축소시 64px), 배경 #1A1A2E
- 활성 메뉴: PwC 오렌지 2px 왼쪽 border + 연한 오렌지 배경
- 헤더: sticky, 흰 배경, border-bottom
- 콘텐츠: 배경 #F7F8FC, padding 24px

---

## 실행 방법

### 백엔드
```bash
cd backend
pip install -r requirements.txt
python scripts/ingest_all.py  # 최초 1회
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### API 문서
`http://localhost:8000/docs` (Swagger UI)

---

## 스킬 파일
- `.claude/skills/backend.md` — FastAPI/SQLAlchemy 패턴
- `.claude/skills/frontend.md` — Next.js/React 패턴
- `.claude/skills/design-guide.md` — PwC 디자인 컴포넌트 가이드
- `.claude/skills/data.md` — 데이터 구조 & 재무 로직
