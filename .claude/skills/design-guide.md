# Design Guide — PwC EasyView 디자인 시스템

---

## 컬러 팔레트

```css
/* PwC 오렌지 계열 */
--pwc-orange:         #FD5108;  /* 주색 — 버튼, 강조, 수치 */
--pwc-orange-medium:  #FE7C39;
--pwc-orange-light:   #FFAA72;
--pwc-orange-pale:    #FFCDA8;
--pwc-orange-lighter: #FFE8D4;
--pwc-orange-ghost:   #FFF5ED;  /* 카드 배경 강조 */

/* PwC 회색 계열 */
--pwc-grey:         #A1A8B3;   /* 보조 텍스트, 범례 */
--pwc-grey-medium:  #B5BCC4;
--pwc-grey-light:   #CBD1D6;
--pwc-grey-pale:    #DFE3E6;   /* 테두리 */
--pwc-grey-lighter: #EEEFF1;   /* 섹션 구분선 */
--pwc-grey-ghost:   #F5F7F8;   /* 테이블 헤더 배경 */

/* 레이아웃 */
--sidebar:   #1A1A2E;
--surface:   #F5F7F8;
--text-primary:   #000000;
--text-body:      #1A1A2E;
--text-secondary: #374151;
--text-muted:     #A1A8B3;

/* 증감 */
--positive: #16C784;   /* 양수 증감 (밝은 연두) */
--negative: #FF4747;   /* 음수 증감 (밝은 빨강) */
```

> **주의:** 차트/KPI에 파랑·보라 등 비PwC 계열 색상 절대 사용 금지.
> 증감 색상은 반드시 `#16C784` (양수) / `#FF4747` (음수) 사용.

---

## 타이포그래피 스케일 ★ 핵심 규칙

모든 폰트 크기는 아래 스케일을 따른다. 임의로 11~12px을 사용하지 말 것.

| 용도 | fontSize | fontWeight | 색상 | 예시 |
|------|----------|------------|------|------|
| **KPI 수치 (대형)** | 30px | 700 | `#000` (letterSpacing: -0.5px) | 310.0억, 1,158건 |
| **섹션/패널 제목** | 16px | 600 | `#1A1A2E` | "월별 Exception 내역" |
| **KPI 레이블** | 14px | 500 | accent 색상 | "매출액", "자산" |
| **비교행 레이블** | 13px | 400 | `#A1A8B3` | "당기 기초 금액", "전기" |
| **비교행 값** | 13px | 400 | `#374151` | "1,415.6억" |
| **차트 범례** | 13px | 400 | `#A1A8B3` | "유동자산", "전기환율" |
| **테이블 헤더** | 13px | 600 | `#A1A8B3` | "일자", "계정과목" |
| **테이블 본문** | 13px | 400 | `#1A1A2E` | 숫자, 계정명 |
| **배지/태그** | 12px | 500 | `#FD5108` | "손익 분석" |
| **차트 축 tick** | 10px | 400 | `#A1A8B3` | X/Y 축 숫자 |
| **메타/주석** | 11px | 400 | `#A1A8B3` | 날짜, 건수 |

**금지 패턴:**
- `fontSize: 11` — 차트 범례·레이블에 절대 사용 금지 (→ 13 사용)
- `fontSize: 12` — KPI 비교행·레이블에 절대 사용 금지 (→ 13 사용)
- `text-xs` — 테이블 셀에 절대 사용 금지 (→ `text-sm` 또는 13px 사용)

---

## 카드 hover 효과 ★

모든 카드(KPI·차트 패널·테이블 패널)에 `card-hover` 클래스 부여.

```css
/* globals.css */
.card-hover {
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}
.card-hover:hover {
  box-shadow: 0 4px 12px 0 rgba(0,0,0,0.10) !important;
  transform: translateY(-1px);
}
```

```tsx
/* 사용 예 */
<div className="bg-white rounded-lg border overflow-hidden card-hover"
  style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
```

CSS 변수:
```css
--shadow-card:       0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.03);
--shadow-card-hover: 0 4px 12px 0 rgba(0,0,0,0.10);
```

---

## KPI 카드 표준 구조

```tsx
// 대형 KPI 카드 (Summary, PL 요약, BS 요약 등)
<div className="bg-white rounded-lg border p-5 card-hover"
  style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
  {/* 레이블: 14px/500/accent color */}
  <div style={{ fontSize: 14, fontWeight: 500, color: accentColor, marginBottom: 6 }}>{label}</div>
  {/* 값: 30px/700/black */}
  <div style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px", lineHeight: 1 }}>
    {value}
  </div>
  {/* 비교행: 13px/400 */}
  <div style={{ fontSize: 13, color: "#A1A8B3" }}>전기 비교...</div>
</div>
```

---

## 필터 바 표준 구조

```tsx
// Summary 기준 — bold left-border 절대 금지
<div style={{
  display: "flex", alignItems: "center", gap: 12,
  backgroundColor: "#F5F7F8", border: "1px solid #DFE3E6",
  borderRadius: 8, padding: "10px 16px",
}}>
  <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>제목</span>
  <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6" }} /> {/* 구분선 */}
  {/* DatePicker, CustomSelect 등 */}
</div>
```

---

## 차트 범례 배치 규칙

- **위치:** 차트 하단 X 에 범례 배치 금지 → **차트 패널 헤더 바로 아래 (좌측 정렬)** 배치
- **구현:** Recharts `<Legend>` 제거 후 커스텀 `<InlineLegend>` div 렌더링
- **폰트:** 13px/400/`#A1A8B3`
- **아이콘:** 가로선(width:18, height:2.5, borderRadius:1)

```tsx
function InlineLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, paddingLeft: 60, paddingBottom: 4 }}>
      {items.map(it => (
        <span key={it.label} style={{ display: "flex", alignItems: "center", gap: 5,
          fontSize: 13, fontWeight: 400, color: "#A1A8B3" }}>
          <span style={{
            width: 18, height: 2.5,
            background: it.dashed
              ? `repeating-linear-gradient(90deg,${it.color} 0,${it.color} 4px,transparent 4px,transparent 7px)`
              : it.color,
            display: "inline-block", borderRadius: 1,
          }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
```

---

## 차트 X축 tick 규칙

월별 데이터가 많을 때(>4개월) X축 라벨 잘림 방지:

```tsx
// 3개월마다 + 마지막 항목 항상 표시 (한국어 없이 "24.01" 형식)
function makeXTick(dataLen: number) {
  return function XTick({ x, y, payload, index }: any) {
    const isLast = index === dataLen - 1;
    if (!isLast && index % 3 !== 0) return <g />;
    return (
      <text x={x} y={y + 10} textAnchor="middle" fill="#A1A8B3" fontSize={10}>
        {payload.value}
      </text>
    );
  };
}

// XAxis 높이: 데이터 많을 때 최소 68px (회전 라벨 여유 공간)
<XAxis dataKey="month" tick={makeXTick(data.length)} interval={0} height={68} />
```

---

## 재무제표 테이블 스타일

```tsx
// 모든 표: text-sm(13px), px-5 py-2.5(헤더) / py-2(셀)
// 합계/소계 행: bg #FFF5ED, color #FD5108
// 일반 행 hover: bg #FAFBFC
<thead>
  <tr style={{ backgroundColor: "#F5F7F8", position: "sticky", top: 0 }}>
    <th style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, color: "#A1A8B3" }}>계정</th>
  </tr>
</thead>
<tbody>
  <tr style={{ borderBottom: "1px solid #EEEFF1" }}>
    <td style={{ padding: "7px 20px", fontSize: 13, color: "#1A1A2E" }}>...</td>
  </tr>
  {/* 합계 행 */}
  <tr style={{ backgroundColor: "#FFF5ED" }}>
    <td style={{ padding: "7px 20px", fontSize: 13, fontWeight: 700, color: "#FD5108" }}>합계</td>
  </tr>
</tbody>
```

---

## 증감 색상 규칙

```tsx
// 반드시 이 두 색상만 사용
const deltaColor = delta >= 0 ? "#16C784" : "#FF4747";

// 증감 표시
<span style={{ color: deltaColor, fontWeight: 500 }}>
  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
</span>
```

---

## 그림자 및 radius

```css
--shadow-card:       0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.03);
--shadow-card-hover: 0 4px 12px 0 rgba(0,0,0,0.10);

/* 카드: rounded-lg = 8px */
/* 버튼/입력: rounded-md = 6px */
/* 배지: borderRadius 8px */
```

---

## DatePicker UI 규칙

날짜 입력은 반드시 커스텀 `<DatePicker>` 컴포넌트 사용.
`<input type="date">` 절대 금지.

---

## 아이콘 라이브러리

Lucide React (`lucide-react`) 사용. 예:

```tsx
import { Copy, ArrowLeftRight, CalendarX, Banknote, Zap, UserMinus, CalendarOff } from "lucide-react";

<Copy size={18} color="#FD5108" strokeWidth={1.8} />
```
