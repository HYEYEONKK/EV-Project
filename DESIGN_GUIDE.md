# EasyView 디자인 가이드

> 모든 페이지/컴포넌트는 이 가이드를 기준으로 통일한다.
> 기준 페이지: **Summary (`/summary`)** — 새 컴포넌트를 만들 때 반드시 Summary 페이지와 비교해 일관성을 확인할 것.

---

## 목차

1. [컬러 시스템](#1-컬러-시스템)
2. [타이포그래피](#2-타이포그래피)
3. [레이아웃 & 간격](#3-레이아웃--간격)
4. [필터 바](#4-필터-바)
5. [카드 & 패널](#5-카드--패널)
6. [테이블](#6-테이블)
7. [차트 (Recharts)](#7-차트-recharts)
8. [날짜 선택기](#8-날짜-선택기)
9. [KPI 카드](#9-kpi-카드)
10. [증감 표현](#10-증감-표현)
11. [로딩 & 빈 상태](#11-로딩--빈-상태)
12. [금지 사항 요약](#12-금지-사항-요약)

---

## 1. 컬러 시스템

> **기준**: PwC 공식 컬러 팔레트. 아래 색상 외 다른 색 사용 금지.

### PwC 공식 컬러 팔레트 (Accent colours for charts and tables)

#### 오렌지 계열 (Primary Accent)

| 이름 | 헥스 | RGB | 용도 |
|------|------|-----|------|
| Orange | `#FD5108` | 253-81-8 | 버튼, 활성 상태, KPI 1번, 매출액 |
| Medium Orange | `#FE7C39` | 254-124-57 | KPI 2번, 매출총이익 |
| Light Orange | `#FFAA72` | 255-170-114 | KPI 3번, 영업이익, 기타이익 |
| Tint 4 | `#FFCDA8` | — | 배지 테두리, 연한 강조 |
| Tint 5 | `#FFE8D4` | — | 연한 배경 강조 |
| Tint 6 | `#FFF5ED` | — | 강조 행 배경, 선택 항목 배경 |

#### 회색 계열 (Secondary Accent)

| 이름 | 헥스 | RGB | 용도 |
|------|------|-----|------|
| Grey | `#A1A8B3` | 161-168-179 | KPI 4번, 당기순이익, 보조 레이블, 전기비교 |
| Medium Grey | `#B5BCC4` | 181-188-196 | 비용 항목 바, 전기 계열 비교선 |
| Light Grey | `#CBD1D6` | 203-209-214 | 기타손실 바, 3번째 비교 계열 |
| Tint 4 | `#DFE3E6` | — | 카드/필터 바 테두리 |
| Tint 5 | `#EEEFF1` | — | 테이블 행 구분선, 카드 내부 구분선 |
| Tint 6 | `#F5F7F8` | — | 필터 바 배경, 테이블 헤더 배경 |

#### 텍스트 & 배경

| 이름 | 헥스 | RGB | 용도 |
|------|------|-----|------|
| Black Text | `#000000` | 0-0-0 | 본문 진한 텍스트 |
| Black Text (Soft) | `#1A1A2E` | — | 섹션 제목, 사이드바 배경 |
| Background | `#EBEBEB` | 235-235-235 | 페이지 배경 |
| White | `#FFFFFF` | 255-255-255 | 카드 배경 |

### 브랜드 컬러 (UI 전용)

| 토큰 | 헥스 | 용도 |
|------|------|------|
| `--pwc-orange` | `#D04A02` | 브랜드 주색 (로고, 강조 텍스트) |
| `--pwc-orange-light` | `#FD5108` | 버튼, 선택 상태, 활성 아이콘 |
| `--sidebar` | `#1A1A2E` | 사이드바 배경, 본문 진한 텍스트 |
| `--surface` | `#F5F7F8` | 페이지 전체 배경 |

### 텍스트 컬러

| 용도 | 컬러 |
|------|------|
| 주요 텍스트 | `#1A1A2E` |
| 보조 텍스트 / 레이블 | `#A1A8B3` |
| 일반 본문 | `#374151` |
| 비활성 / 플레이스홀더 | `#D1D5DB` |

### 보더 & 서피스 컬러

| 용도 | 컬러 |
|------|------|
| 카드/필터 바 테두리 | `#DFE3E6` |
| 테이블 행 구분선 | `#EEEFF1` |
| 필터 바 배경 | `#F5F7F8` |
| 카드 배경 | `#ffffff` |
| 테이블 헤더 배경 | `#F5F7F8` |
| 강조 행(합계/볼드) 배경 | `#FFF5ED` |
| 강조 행 텍스트 | `#FD5108` |
| 오렌지 배지 배경 | `#FFF5ED` |
| 오렌지 배지 테두리 | `#FFCDA8` |

### 증감(Delta) 컬러 — 절대 다른 색 사용 금지

> ⚠️ 아래 색상은 PwC 공식 팔레트에 없으나, 증감 표현 전용으로만 사용 허용

| 방향 | 컬러 | 비고 |
|------|------|------|
| 양수 (증가) | `#16C784` | 밝은 연두 — 증감 텍스트/아이콘 전용 |
| 음수 (감소) | `#FF4747` | 밝은 빨강 — 증감 텍스트/아이콘 전용 |
| 중립 / 해당 없음 | `#A1A8B3` | PwC Grey |

```typescript
// 증감 텍스트/화살표 색상 (불변 규칙)
const deltaColor = delta > 0 ? "#16C784" : delta < 0 ? "#FF4747" : "#A1A8B3";
```

### 차트 팔레트 (PwC KPI 색상 할당)

```typescript
// KPI / 차트 계열 색상 — 순서 고정 (PwC 팔레트 기준)
const KPI_COLORS = {
  revenue:          "#FD5108",  // PwC Orange      → 매출액
  gross_profit:     "#FE7C39",  // PwC Medium Orange → 매출총이익
  operating_income: "#FFAA72",  // PwC Light Orange  → 영업이익
  net_income:       "#374151",  // Dark Gray          → 당기순이익 (흰 배경 가시성 확보. #A1A8B3은 대비 부족으로 금지)
};

// 전기(Prior Period) 비교 색상
const PRIOR_COLOR = "#B5BCC4"; // PwC Medium Grey — 모든 페이지에서 동일

// Waterfall 차트 색상
// 매출액 바:   #FD5108 (PwC Orange)
// 비용 바:     #B5BCC4 (PwC Medium Grey)
// 기타이익 바: #FFAA72 (PwC Light Orange)
// 기타손실 바: #CBD1D6 (PwC Light Grey)
// 순이익 바:   #374151 (Dark Gray)
```

---

## 2. 타이포그래피

### 폰트

- **Pretendard** — 한국어+영문 통합 폰트
- CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css`

### 폰트 사이즈 규칙

| 요소 | 크기 | 굵기 | 참고 |
|------|------|------|------|
| 섹션 제목 | `16px` | `600` | **Summary 기준 — 절대 더 작게 쓰지 말 것** |
| 카드 헤더 | `14px` | `600` | |
| 테이블 내용 | `14px (text-sm)` | `400` | **text-xs 사용 금지** |
| 테이블 헤더 | `14px (text-sm)` | `600` | |
| 차트 축 레이블 | `11px` | `400` | `AXIS_STYLE = { fontSize: 11, fill: "#A1A8B3" }` |
| **KPI 주요 수치** | **`30px (text-3xl)`** | **`700`** | **기준: 손익지표 퍼센트. KPI 카드 수치도 동일 적용** |
| KPI 레이블 | `12px` | `400` | |
| 보조 텍스트 | `12px` | `400` | |
| 배지 / 태그 | `11px` | `400~500` | |

> **KPI 수치 통일 규칙**: 매출액·영업이익·자산·부채 카드와 손익지표·유동성지표 % 수치는 모두 `text-3xl font-bold letterSpacing -0.5px`로 통일. **기준은 손익지표 퍼센트.**

```typescript
// 섹션 제목 — 항상 이 값
{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }

// 카드 헤더
{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }

// KPI 수치 — Summary 기준, 모든 페이지 동일
// Tailwind: className="text-xl font-bold"
{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }
```

---

## 3. 레이아웃 & 간격

### 전체 구조

```
┌─────────────────────────────────────────────┐
│  Sidebar (240px / 축소 64px) #1A1A2E        │
│  ┌───────────────────────────────────────┐  │
│  │  TopNav (sticky, 흰 배경)             │  │
│  │  필터 바 (페이지별 고정)               │  │
│  │  ─────────────────────────────────── │  │
│  │  콘텐츠 영역  bg:#F7F8FC  p-6        │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 사이드바 활성 메뉴 스타일

```css
/* 활성 항목 */
border-left: 2px solid #FD5108;
background: rgba(253, 81, 8, 0.08);
color: #FD5108;
```

### 그리드 간격

| 용도 | 클래스 |
|------|--------|
| 카드 그리드 | `gap-4` |
| 섹션 간격 | `space-y-5` 또는 `space-y-6` |
| 페이지 패딩 | `p-6` |

---

## 4. 필터 바

### 구조 & 스타일 — Summary 기준 통일

```tsx
// 필터 바 컨테이너
<div
  className="flex items-center gap-3 rounded-lg px-4 py-3"
  style={{
    backgroundColor: "#F5F7F8",
    border: "1px solid #DFE3E6",
    borderRadius: 8,
  }}
>
  <span style={{ fontSize: 14, color: "#A1A8B3" }}>분석 기간</span>
  <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6" }} />
  <DatePicker value={dateFrom} onChange={...} />
  <span style={{ fontSize: 14, color: "#A1A8B3" }}>~</span>
  <DatePicker value={dateTo} onChange={...} />
</div>
```

### 토글 버튼 그룹 — 폰트 크기 규칙 ⚠️

> 같은 필터 바 안의 모든 토글/버튼 그룹은 **fontSize: 13으로 통일**. 그룹마다 다른 폰트 크기 절대 금지.

```tsx
// ✅ 올바른 예 — 대변/차변/전표수, 모두/일자별/계정과목별/거래처별 모두 동일
<button style={{ fontSize: 13, padding: "4px 12px", ... }}>대변</button>
<button style={{ fontSize: 13, padding: "4px 10px", ... }}>일자별</button>

// ❌ 틀린 예 — 같은 필터 바 내 그룹별로 12/13 혼용
<button style={{ fontSize: 13 }}>대변</button>   // 13
<button style={{ fontSize: 12 }}>일자별</button> // 12 ← 금지
```

| 요소 | 폰트 크기 | 패딩 |
|------|-----------|------|
| 메트릭 토글 (대변/차변/전표수 등) | `13px` | `4px 16px` |
| 집계 토글 (모두/일자별/계정과목별 등) | `13px` | `4px 10px` |
| 레이블 텍스트 (계정과목, 집계 등) | `13px` | — |
| KPI 인라인 값 | `13~14px` | — |

### 금지 사항

- `borderLeftWidth: 3` 등 **bold border 방향 무관 절대 금지** (left / top / right / bottom 모두)
- 카드나 컴포넌트에 컬러 강조선(accent border) 넣지 말 것
- 필터 바에 그림자 강하게 넣지 말 것
- **같은 필터 바 내 토글 그룹끼리 fontSize 다르게 쓰지 말 것** (모두 13px)

### 구분선 (디바이더)

```tsx
<div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6", flexShrink: 0 }} />
```

---

## 5. 카드 & 패널

### 기본 카드

```tsx
<div
  className="bg-white rounded-lg border overflow-hidden"
  style={{
    borderColor: "#DFE3E6",
    boxShadow: "0 1px 3px #0000000D",
  }}
>
  {/* 카드 헤더 */}
  <div
    className="px-5 py-3 border-b"
    style={{ borderColor: "#EEEFF1" }}
  >
    <h4 style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>
      제목
    </h4>
  </div>
  {/* 카드 본문 */}
  <div className="p-5">...</div>
</div>
```

### 시나리오 배지 카드 (KPI 강조용)

```tsx
<div style={{
  textAlign: "center",
  backgroundColor: "#FFF4EE",
  border: "1px solid #FFCDA8",
  borderRadius: 8,
  padding: "10px 16px",
}}>
  <div style={{ fontSize: 11, color: "#A1A8B3", marginBottom: 2 }}>레이블</div>
  <div style={{ fontSize: 18, fontWeight: 700, color: "#FD5108" }}>값</div>
</div>
```

---

## 6. 테이블

### Summary 기준 통일 스타일 — **반드시 준수**

```tsx
<table className="w-full text-sm">
  <thead>
    <tr style={{ backgroundColor: "#F5F7F8" }}>
      <th
        className="text-left px-5 py-2.5 font-semibold"
        style={{ color: "#A1A8B3" }}
      >
        컬럼명
      </th>
      <th
        className="text-right px-5 py-2.5 font-semibold"
        style={{ color: "#A1A8B3" }}
      >
        금액
      </th>
    </tr>
  </thead>
  <tbody>
    {/* 일반 행 */}
    <tr
      className="border-t"
      style={{ borderColor: "#EEEFF1" }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAFBFC")}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
    >
      <td className="px-5 py-2" style={{ color: "#1A1A2E" }}>텍스트</td>
      <td className="text-right px-5 py-2" style={{ fontVariantNumeric: "tabular-nums" }}>
        숫자
      </td>
    </tr>

    {/* 합계/볼드 행 */}
    <tr style={{ backgroundColor: "#FFF5ED" }}>
      <td className="px-5 py-2 font-bold" style={{ color: "#FD5108" }}>합계</td>
      <td className="text-right px-5 py-2 font-bold" style={{ color: "#FD5108", fontVariantNumeric: "tabular-nums" }}>
        999억
      </td>
    </tr>
  </tbody>
</table>
```

### 체크리스트

- `text-sm` (14px) — **`text-xs` 절대 사용 금지**
- 헤더 패딩: `px-5 py-2.5`
- 셀 패딩: `px-5 py-2`
- 숫자 열: `text-right` + `fontVariantNumeric: "tabular-nums"`
- 합계/강조 행: bg `#FFF5ED`, 텍스트 `#FD5108`, fontWeight 700

---

## 7. 차트 (Recharts)

### 공통 설정

```typescript
// lib/utils/chartColors.ts에서 import
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";

// AXIS_STYLE  = { fontSize: 11, fill: "#A1A8B3" }
// GRID_STROKE = "#EEEFF1"
// CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 16 }
```

### CartesianGrid

```tsx
<CartesianGrid
  strokeDasharray="3 3"
  stroke={GRID_STROKE}
  vertical={false}   // 수직선 항상 끔
/>
```

### XAxis X축 라벨 규칙 ⚠️ 필수

> **모든 시계열 차트의 X축은 반드시 균일한 간격으로 라벨을 표시한다.**
> 라벨이 겹치면 **절대로** 일부만 표시하거나 무작위로 생략하지 말 것.
> 데이터가 많을 때는 반드시 **분기(3, 6, 9, 12월)** 단위로 표시한다.

```tsx
// ✅ 올바른 방법: interval={0} + 분기 필터 tick
<XAxis
  dataKey="date"
  tickLine={false}
  axisLine={false}
  interval={0}
  tick={({ x, y, payload }: any) => {
    // "YY.MM" 형식에서 월 추출 → 분기(03/06/09/12)만 표시
    const mo = String(payload.value ?? "").split(".")[1];
    if (!["03","06","09","12"].includes(mo)) return <g />;
    return (
      <text x={x} y={y + 10} textAnchor="middle" fill="#A1A8B3" fontSize={10}>
        {payload.value}
      </text>
    );
  }}
/>

// ❌ 금지: 기본 interval 설정 (라벨 자동 생략)
<XAxis dataKey="date" tick={AXIS_STYLE} />  // interval 미지정 → 금지
```

**적용 기준:**
- 데이터 포인트 ≤ 12개: 모든 라벨 표시 가능
- 데이터 포인트 > 12개: 반드시 분기 단위 (3, 6, 9, 12월) 필터 적용
- `interval={0}` 필수 설정 — 미설정 시 Recharts가 자동으로 라벨 숨김

### XAxis / YAxis

```tsx
<XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
<YAxis
  tickFormatter={chartAxisFormatter}
  tick={AXIS_STYLE}
  tickLine={false}
  axisLine={false}
  width={56}
/>
```

### 차트 중앙 정렬 (margin.right = YAxis.width)

차트 플롯 영역이 YAxis 때문에 좌측으로 치우치는 것을 방지:

```tsx
// YAxis width와 동일한 값을 margin.right에 적용
<BarChart margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
  <YAxis width={56} />
  // Legend도 같은 값으로 offset
  <Legend wrapperStyle={{ fontSize: 11, paddingLeft: 56, paddingTop: 4 }} />
</BarChart>
```

### 커스텀 툴팁

```tsx
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #DFE3E6",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 12,
      boxShadow: "0 4px 16px #0000001A",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#1A1A2E" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {formatKRW(p.value)}
        </div>
      ))}
    </div>
  );
}
```

### 당기 / 전기 색상 컨벤션

| 계열 | 색상 |
|------|------|
| 당기 (Current) | `#FD5108` (오렌지) |
| 전기 (Prior) | `#A1A8B3` (회색) — **모든 페이지 동일** |

### 차트 감싸는 카드 내부 여백

```tsx
<div style={{ height: 280, padding: "14px 8px 10px 8px" }}>
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>
```

---

## 8. 날짜 선택기

### 반드시 커스텀 `DatePicker` 컴포넌트 사용

```tsx
import DatePicker from "@/components/ui/DatePicker";

// 단일
<DatePicker
  value={dateFrom}              // YYYY-MM-DD
  onChange={(v) => setDate(v)}
  minDate="2024-01-01"
  maxDate="2026-03-31"
/>

// 범위 (from ~ to)
<DatePicker value={dateFrom} onChange={(v) => setDateRange(v, dateTo)} minDate="2024-01-01" maxDate="2026-03-31" />
<span style={{ fontSize: 14, color: "#A1A8B3" }}>~</span>
<DatePicker value={dateTo}   onChange={(v) => setDateRange(dateFrom, v)} minDate="2024-01-01" maxDate="2026-03-31" />
```

### `DatePicker` 내부 디자인 요소

| 요소 | 스타일 |
|------|--------|
| 트리거 버튼 | border `#DFE3E6`, borderRadius 6, bg `#fff` (열리면 `#F5F7F8`) |
| 드롭다운 팝업 | borderRadius 12, boxShadow `0 8px 32px rgba(0,0,0,0.12)` |
| 선택된 날짜 셀 | bg `#FD5108`, 텍스트 `#fff` |
| 오늘 날짜 | 텍스트 `#FD5108` |
| 일요일 | 텍스트 `#F87171` |
| 연/월 선택 활성 | bg `#FFF5ED`, 텍스트 `#FD5108` |

### 절대 금지

```tsx
// ❌ 금지 — 브라우저 기본 달력 UI
<input type="date" value={...} onChange={...} />
```

---

## 9. KPI 카드

```tsx
function KpiCard({ title, value, delta, deltaLabel, sub }) {
  const deltaColor =
    delta == null ? "#A1A8B3" : delta >= 0 ? "#16C784" : "#FF4747";

  return (
    <div
      className="bg-white rounded-lg border p-5"
      style={{ borderColor: "#DFE3E6", boxShadow: "0 1px 3px #0000000D" }}
    >
      {/* 레이블 */}
      <div style={{ fontSize: 12, color: "#A1A8B3", marginBottom: 6 }}>
        {title}
      </div>
      {/* 주요 수치 */}
      <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1A2E", letterSpacing: "-1px" }}>
        {value}
      </div>
      {/* 보조 텍스트 */}
      {sub && (
        <div style={{ fontSize: 11, color: "#A1A8B3", marginTop: 2 }}>{sub}</div>
      )}
      {/* 증감 */}
      {delta != null && (
        <div style={{ fontSize: 12, color: deltaColor, marginTop: 6, fontWeight: 500 }}>
          {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
          {deltaLabel && (
            <span style={{ color: "#A1A8B3", marginLeft: 4, fontWeight: 400 }}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 10. 증감 표현

### 색상 규칙 — 절대 다른 색 사용 금지

```typescript
// 양수(증가): #16C784 (bright green)
// 음수(감소): #FF4747 (bright red)
// 중립/없음:  #A1A8B3 (grey)

const getDeltaColor = (v: number | null) =>
  v == null ? "#A1A8B3" : v > 0 ? "#16C784" : "#FF4747";
```

### 텍스트 표현

```typescript
import { formatPct } from "@/lib/utils/formatters";

// formatPct(value) → "+12.3%" / "-5.1%"
// 부호 포함이 기본
```

### 수치 포맷터

```typescript
import { formatKRW, formatKRWFull, chartAxisFormatter } from "@/lib/utils/formatters";

formatKRW(1_234_500_000)     // "12.3억"
formatKRW(1_500_000_000_000) // "1.5조"
formatKRWFull(1_234_567)     // "₩1,234,567"
chartAxisFormatter(980_000_000) // "9.8억"  ← 차트 축 전용
```

---

## 11. 로딩 & 빈 상태

### 로딩

```tsx
{isLoading ? (
  <div style={{
    height: 220,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#A1A8B3",
    fontSize: 13,
  }}>
    Loading...
  </div>
) : ( ... )}
```

### 빈 상태 (데이터 없음)

```tsx
<tr>
  <td
    colSpan={6}
    style={{ padding: "32px", textAlign: "center", color: "#A1A8B3" }}
  >
    탐지된 전표 없음
  </td>
</tr>
```

---

## 12. 금지 사항 요약

| # | 금지 항목 | 이유 |
|---|-----------|------|
| 1 | `borderTopWidth: 3`, `borderLeftWidth: 3` 등 **bold border** (방향 무관) | 필터 바/카드에 강조선 금지 |
| 2 | 카드/컴포넌트에 컬러 accent border | 디자인 통일 파괴 |
| 3 | 섹션 제목 `fontSize < 16` | Summary 기준 16px/600 고정 |
| 4 | 테이블 `text-xs` | text-sm 14px 이상만 허용 |
| 5 | `<input type="date">` | 커스텀 DatePicker만 사용 |
| 6 | 증감 색상에 오렌지/네이비 등 임의 색상 | `#16C784` / `#FF4747`만 허용 |
| 7 | 전기(Prior) 색상에 `#C5CAD4` 등 다른 회색 | `#A1A8B3` 고정 |
| 8 | 차트 수직 그리드선 | `vertical={false}` 항상 설정 |
| 9 | 같은 필터 바 내 토글 버튼 그룹 간 **fontSize 불일치** (12 vs 13 혼용 등) | 모든 토글 버튼은 `fontSize: 13` 통일 |

---

## 참고 파일

| 파일 | 역할 |
|------|------|
| `src/lib/utils/chartColors.ts` | 차트 팔레트, AXIS_STYLE, GRID_STROKE |
| `src/lib/utils/formatters.ts` | KRW 포맷터, % 포맷터 |
| `src/components/ui/DatePicker.tsx` | 커스텀 달력 컴포넌트 |
| `src/components/ui/DateRangeFilterBar.tsx` | 공통 날짜 범위 필터 바 |
| `src/components/tables/FinancialStatementTable.tsx` | 재무 계층 테이블 기준 |
| `src/app/summary/page.tsx` | **전체 디자인 기준 페이지** |
