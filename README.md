# EasyView — PwC 재무 분석 대시보드

ABC Company의 회계 데이터(전표/시산표/매출장/사업계획)를 기반으로 한 PwC 스타일 재무 분석 BI 대시보드입니다.

---

## 기술 스택

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| State | Zustand (글로벌 필터), React Query (서버 상태) |
| Charts | Recharts |
| Backend | FastAPI (Python 3.11+) |
| ORM | SQLAlchemy 2.x |
| DB | SQLite |

---

## 사전 준비

### Python 설치 확인
```bash
python --version
```
Python 3.11 이상이 필요합니다. 없으면 [python.org](https://www.python.org/downloads/)에서 설치하세요.

### Node.js 설치 확인
```bash
node --version
```
Node.js 18 이상이 필요합니다. 없으면 [nodejs.org](https://nodejs.org/)에서 설치하세요.

---

## 실행 방법

### 1. 백엔드

```bash
cd backend

# 패키지 설치 (최초 1회)
python -m pip install -r requirements.txt

# 데이터 적재 (최초 1회)
python scripts/ingest_all.py

# 서버 실행
python -m uvicorn app.main:app --reload --port 8000
```

백엔드 실행 후 → http://localhost:8000/docs 에서 API 문서 확인 가능

### 2. 프론트엔드

새 터미널을 열고:

```bash
cd frontend

# 패키지 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드 실행 후 → http://localhost:3000 접속

---

## 데이터 파일 위치

아래 경로에 원본 Excel 파일을 위치시킨 후 `ingest_all.py`를 실행하세요.

```
backend/data/
├── ABC_JE v2.xlsx    # 전표 데이터
├── ABC_TB.xlsx       # 시산표
├── 매출장.xlsx        # 매출 데이터
└── 사업계획.xlsx      # 예산 데이터
```

---

## 폴더 구조

```
easyview/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 앱 진입점
│   │   ├── database.py      # DB 연결
│   │   ├── models/          # ORM 모델
│   │   ├── schemas/         # Pydantic 스키마
│   │   ├── services/        # 비즈니스 로직
│   │   └── routers/         # API 라우터
│   ├── scripts/
│   │   └── ingest_all.py    # Excel 데이터 적재
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # 페이지 (App Router)
│   │   ├── components/      # UI 컴포넌트
│   │   └── lib/             # API 클라이언트, 스토어, 유틸
│   └── package.json
└── README.md
```
