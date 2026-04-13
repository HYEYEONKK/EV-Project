# Frontend — Next.js + React 패턴

## API 클라이언트 기본 패턴

```typescript
// lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export async function apiFetch<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v)) v.forEach(item => url.searchParams.append(k, String(item)));
        else url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

## React Query 훅 패턴

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useFilterStore } from '@/lib/store/filterStore';

export function useMonthlySales() {
  const { dateFrom, dateTo, divisions, branches } = useFilterStore();
  return useQuery({
    queryKey: ['sales', 'monthly', { dateFrom, dateTo, divisions, branches }],
    queryFn: () => apiFetch('/sales/monthly-trend', { date_from: dateFrom, date_to: dateTo, division: divisions, branch: branches }),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
```

## Zustand 크로스필터 패턴

```typescript
// 차트 onClick에서 크로스필터 설정
const setCrossFilter = useFilterStore(s => s.setCrossFilter);

// Recharts 클릭 핸들러
<Bar onClick={(data) => setCrossFilter('activeMonth', data.month)} />

// 비활성 요소 opacity 처리
<Bar opacity={activeMonth && bar.month !== activeMonth ? 0.3 : 1} />
```

## KRW 포맷터

```typescript
// lib/utils/formatters.ts
export function formatKRW(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}조`;
  if (abs >= 1e8) return `${(value / 1e8).toFixed(1)}억`;
  if (abs >= 1e4) return `${(value / 1e4).toFixed(0)}만`;
  return value.toLocaleString('ko-KR');
}

export function formatKRWFull(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
}
```

## Tailwind 컴포넌트 클래스 규칙

```typescript
// KPI 카드
"bg-white rounded-lg shadow-card p-6 border border-border"

// 사이드바 메뉴 활성
"border-l-2 border-pwc-orange bg-pwc-orange/10 text-white"

// 사이드바 메뉴 비활성
"text-sidebar-text hover:bg-sidebar-hover"

// 버튼 primary
"bg-pwc-orange hover:bg-pwc-orange/90 text-white px-4 py-2 rounded-md text-sm font-medium"
```

## 차트 공통 props (Recharts)

```typescript
const CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 16 };
const AXIS_STYLE = { fontSize: 11, fill: '#6B7280' };
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 6 };
```
