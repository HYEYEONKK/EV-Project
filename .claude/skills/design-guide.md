# Design Guide — PwC EasyView 디자인 시스템

## 컬러 팔레트

```css
/* Primary */
--pwc-orange: #D04A02;        /* 버튼, 강조, 활성 상태 */
--pwc-orange-light: #FD5108;  /* 호버, 로고 chevron */
--pwc-orange-pale: #FFF3ED;   /* 활성 메뉴 배경 */

/* Layout */
--sidebar: #1A1A2E;           /* 사이드바 배경 */
--sidebar-hover: #16213E;     /* 사이드바 호버 */
--sidebar-text: #E8E8F0;      /* 사이드바 텍스트 */

/* Content */
--surface: #F7F8FC;           /* 페이지 배경 */
--surface-card: #FFFFFF;      /* 카드 배경 */
--border: #E5E7EB;            /* 테두리 */
--text-primary: #111827;      /* 본문 텍스트 */
--text-secondary: #6B7280;    /* 보조 텍스트 */

/* Status */
--positive: #059669;          /* 증가/긍정 */
--negative: #DC2626;          /* 감소/경고 */
```

## 차트 색상 팔레트 (순서대로 사용)

```typescript
export const PWC_CHART_COLORS = [
  '#D04A02',  // 1st series - PwC Orange
  '#295477',  // 2nd series - Steel blue
  '#EB8C00',  // 3rd series - Amber
  '#688FA8',  // 4th series - Light blue
  '#1A1A2E',  // 5th series - Dark navy
  '#C9A84C',  // 6th series - Gold
  '#7A3B1E',  // 7th series - Brown
  '#4A4A6A',  // 8th series - Muted purple
];

export const BUDGET_COLORS = {
  plan: '#295477',
  actual: '#D04A02',
  positive_variance: '#059669',
  negative_variance: '#DC2626',
};
```

## 로고 & 파비콘

```tsx
// EasyView 텍스트 로고 (사이드바 상단)
// PwC chevron(파비콘.svg의 두 평행사변형) + "EasyView" 텍스트
<svg width="140" height="32">
  {/* 두 평행사변형 — #FD5108 */}
  <polygon points="0,20 20,20 28,0 8,0" fill="#FD5108"/>
  <polygon points="22,20 42,20 50,0 30,0" fill="#FD5108"/>
  {/* EasyView 텍스트 */}
  <text x="56" y="16" fill="white" fontSize="18" fontWeight="600"
        fontFamily="Pretendard, sans-serif">EasyView</text>
</svg>

// 파비콘: public/favicon.svg (파비콘.svg 복사)
// <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

## 사이드바 구조

```
[Logo: EasyView]
─────────────────
▪ Dashboard
▪ Financial Statements
  ├ Balance Sheet
  ├ Income Statement
  └ Cash Flow
▪ Sales Analysis
▪ Budget vs Actual
▪ Account Trends
─────────────────
[< Collapse]
```

## KPI 카드

```tsx
<div className="bg-white rounded-lg shadow-card p-6 border border-border">
  <p className="text-sm text-text-secondary">{label}</p>
  <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
  <p className={`text-sm mt-2 ${delta > 0 ? 'text-positive' : 'text-negative'}`}>
    {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
  </p>
</div>
```

## 재무제표 테이블 스타일

```tsx
// 소계 행
<tr className="bg-gray-50 font-semibold">
// 합계 행
<tr className="bg-pwc-orange/5 font-bold border-t-2 border-pwc-orange">
// 일반 행
<tr className="hover:bg-gray-50">
// 증감율 양수
<td className="text-positive">+12.3%</td>
// 증감율 음수
<td className="text-negative">-5.2%</td>
```

## 필터 chip (크로스필터 표시)

```tsx
<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
                 bg-pwc-orange/10 text-pwc-orange border border-pwc-orange/30">
  {label}
  <button onClick={onRemove}>×</button>
</span>
```

## 그림자 및 radius

```css
shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
shadow-card-hover: 0 4px 12px rgba(0,0,0,0.12)
rounded-lg: 8px (카드)
rounded-md: 6px (버튼, 입력)
rounded-full: (chip, badge)
```
