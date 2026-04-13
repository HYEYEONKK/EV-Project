"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, MonthlyPL, ScenarioMonthly } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import { TOOLTIP_STYLE } from "@/lib/utils/chartColors";
import {
  Search,
  ArrowRight,
  BarChart2,
  TrendingUp,
  Database,
  FileText,
  Layers,
  ShieldAlert,
  Settings2,
  Check,
  LayoutGrid,
  Target,
  AlertTriangle,
  CalendarDays,
  Activity,
  ArrowRightLeft,
  Banknote,
  GripVertical,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Search items
───────────────────────────────────────────────────────────── */
type SearchItem = { label: string; href: string; section: string };
const SEARCH_ITEMS: SearchItem[] = [
  { label: "Summary",        href: "/summary",         section: "요약" },
  { label: "PL 요약",         href: "/pnl/summary",     section: "손익분석" },
  { label: "PL 추이분석",      href: "/pnl/trend",       section: "손익분석" },
  { label: "PL 계정분석",      href: "/pnl/account",     section: "손익분석" },
  { label: "매출분석",         href: "/pnl/sales",       section: "손익분석" },
  { label: "손익항목",         href: "/pnl/items",       section: "손익분석" },
  { label: "기간 비교 분석",   href: "/period",          section: "손익분석" },
  { label: "BS 요약",         href: "/bs/summary",      section: "재무상태분석" },
  { label: "BS 추이분석",      href: "/bs/trend",        section: "재무상태분석" },
  { label: "BS 계정분석",      href: "/bs/account",      section: "재무상태분석" },
  { label: "전표분석내역",      href: "/voucher/list",    section: "전표분석" },
  { label: "전표검색",         href: "/voucher/search",  section: "전표분석" },
  { label: "시나리오 1",       href: "/scenario/1",      section: "시나리오분석" },
  { label: "시나리오 2",       href: "/scenario/2",      section: "시나리오분석" },
  { label: "시나리오 3",       href: "/scenario/3",      section: "시나리오분석" },
  { label: "시나리오 4",       href: "/scenario/4",      section: "시나리오분석" },
  { label: "시나리오 5",       href: "/scenario/5",      section: "시나리오분석" },
  { label: "시나리오 6",       href: "/scenario/6",      section: "시나리오분석" },
  { label: "시나리오 7",       href: "/scenario/7",      section: "시나리오분석" },
  { label: "종합 감사 리포트", href: "/audit",           section: "시나리오분석" },
  { label: "금리",             href: "/market/rate",     section: "금리·환율" },
  { label: "환율",             href: "/market/exchange", section: "금리·환율" },
];

/* ─────────────────────────────────────────────────────────────
   Widget registry
───────────────────────────────────────────────────────────── */
const WIDGET_REGISTRY = [
  { id: "quick-nav",       label: "빠른 이동",       Icon: LayoutGrid,     defaultOn: true  },
  { id: "monthly-trend",   label: "월별 매출 추이",   Icon: TrendingUp,     defaultOn: true  },
  { id: "scenario-status", label: "시나리오 탐지",    Icon: ShieldAlert,    defaultOn: true  },
  { id: "budget",          label: "예산 달성률",      Icon: Target,         defaultOn: false },
  { id: "pl-kpi",          label: "손익 핵심 지표",   Icon: BarChart2,      defaultOn: false },
  { id: "bs-ratio",        label: "재무비율 요약",    Icon: Activity,       defaultOn: false },
  { id: "cashflow",        label: "현금흐름 요약",    Icon: ArrowRightLeft, defaultOn: false },
  { id: "voucher-top",     label: "전표 이상 탐지",   Icon: AlertTriangle,  defaultOn: false },
  { id: "period-compare",  label: "기간 비교 분석",   Icon: CalendarDays,   defaultOn: false },
] as const;
type WidgetId = (typeof WIDGET_REGISTRY)[number]["id"];
const DEFAULT_ACTIVE: WidgetId[] = WIDGET_REGISTRY.filter((w) => w.defaultOn).map((w) => w.id);

/* Widget layout: full = 전체 너비, half = 절반 */
const WIDGET_LAYOUT: Record<WidgetId, "full" | "half"> = {
  "quick-nav":       "full",
  "monthly-trend":   "half",
  "scenario-status": "half",
  "budget":          "full",
  "pl-kpi":          "half",
  "bs-ratio":        "half",
  "cashflow":        "half",
  "voucher-top":     "half",
  "period-compare":  "full",
};

/* ─────────────────────────────────────────────────────────────
   Quick nav cards
───────────────────────────────────────────────────────────── */
type QuickCard = { label: string; desc: string; href: string; color: string; Icon: React.ElementType };
const QUICK_CARDS: QuickCard[] = [
  { label: "Summary",    desc: "핵심 KPI 한눈에",   href: "/summary",        color: "#FD5108", Icon: BarChart2   },
  { label: "손익분석",    desc: "PL 추이·매출",      href: "/pnl/summary",    color: "#FE7C39", Icon: TrendingUp  },
  { label: "재무상태",    desc: "자산·부채·자본",     href: "/bs/summary",     color: "#FFAA72", Icon: Database    },
  { label: "전표검색",    desc: "이상거래 조회",      href: "/voucher/search", color: "#A1A8B3", Icon: FileText    },
  { label: "시나리오",    desc: "이상 패턴 탐지",     href: "/scenario/1",     color: "#54565A", Icon: Layers      },
  { label: "감사 리포트", desc: "종합 탐지 결과",     href: "/audit",          color: "#FD5108", Icon: ShieldAlert },
];

/* ─────────────────────────────────────────────────────────────
   Skeleton shimmer
───────────────────────────────────────────────────────────── */
function SkeletonKpi() {
  return (
    <div
      style={{
        height: 36,
        borderRadius: 6,
        background:
          "linear-gradient(90deg,#F0F0F0 25%,#E0E0E0 50%,#F0F0F0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        marginBottom: 4,
      }}
    />
  );
}
function SkeletonBar({ w }: { w?: string }) {
  return (
    <div
      style={{
        height: 14,
        width: w ?? "60%",
        borderRadius: 4,
        background:
          "linear-gradient(90deg,#F0F0F0 25%,#E0E0E0 50%,#F0F0F0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION A — QuickNavWidget
───────────────────────────────────────────────────────────── */
function QuickNavWidget() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6,1fr)",
        gap: 12,
      }}
    >
      {QUICK_CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          style={{
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.85)",
            borderRadius: 12,
            padding: "18px 12px 16px",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 0,
            boxShadow: "0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(253,81,8,0.13), inset 0 1px 0 rgba(255,255,255,0.95)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)";
          }}
        >
          <card.Icon size={24} color={card.color} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E", lineHeight: 1.3, marginTop: 8 }}>
            {card.label}
          </div>
          <div style={{ fontSize: 12, color: "#A1A8B3", lineHeight: 1.4, marginTop: 3 }}>
            {card.desc}
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION B — MonthlyTrendWidget
───────────────────────────────────────────────────────────── */
function MonthlyTrendWidget({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery<MonthlyPL[]>({
    queryKey: ["home-monthly-pl", dateFrom, dateTo],
    queryFn: () =>
      api.financialStatements.incomeStatementMonthly({ date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60 * 1000,
  });

  const rows = data ?? [];
  const lastValue = rows.length > 0 ? rows[rows.length - 1].revenue : null;
  const chartData = rows.map((r) => ({ month: r.month.slice(0, 7), revenue: r.revenue }));

  // 분기 첫 달(01·04·07·10)만 tick으로 표시
  const quarterTicks = chartData
    .filter((d) => ["01", "04", "07", "10"].includes(d.month.slice(5)))
    .map((d) => d.month);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 8, flexShrink: 0, paddingRight: 52 }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 매출 추이</span>
          <div style={{ marginTop: 2 }}>
            {isLoading ? (
              <SkeletonBar w="80px" />
            ) : (
              lastValue !== null && (
                <span style={{ fontSize: 22, fontWeight: 700, color: "#FD5108" }}>
                  {formatKRW(lastValue)}
                </span>
              )
            )}
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: "#EEEFF1", marginBottom: 8, flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0 }}>
        {isLoading ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SkeletonBar w="100%" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FD5108" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#FD5108" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#A1A8B3" }}
                tickLine={false}
                axisLine={false}
                ticks={quarterTicks}
                tickFormatter={(v: string) => {
                  const [year, month] = v.split("-");
                  return `'${year.slice(2)}.${month}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#A1A8B3" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={chartAxisFormatter}
                width={48}
              />
              <Tooltip
                formatter={(v: unknown) => [formatKRW(Number(v)), "매출액"]}
                labelStyle={{ fontSize: 12 }}
                contentStyle={TOOLTIP_STYLE}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#FD5108"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#FD5108" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION C — ScenarioStatusWidget
───────────────────────────────────────────────────────────── */
const SCENARIO_NAMES: Record<number, string> = {
  1: "이중지급",
  2: "분할지급",
  3: "비정상 계좌",
  4: "야간/주말",
  5: "금액 이상",
  6: "계정 불일치",
  7: "가공거래",
};

function SingleScenario({ n, dateFrom, dateTo }: { n: number; dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery<ScenarioMonthly[]>({
    queryKey: ["home-scenario", n, dateFrom, dateTo],
    queryFn: () =>
      api.scenarios.summary(n, { date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60 * 1000,
  });
  const total = data ? data.reduce((s, r) => s + r.count, 0) : null;
  const hasAlert = total !== null && total > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        background: "#FAFAFA",
        border: "1px solid #DFE3E6",
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            background: "#FFF5ED",
            color: "#FD5108",
            borderRadius: 6,
            padding: "2px 7px",
            whiteSpace: "nowrap",
          }}
        >
          S{n}
        </span>
        <span style={{ fontSize: 13, color: "#1A1A2E", fontWeight: 400 }}>
          {SCENARIO_NAMES[n]}
        </span>
      </div>
      {isLoading ? (
        <SkeletonBar w="32px" />
      ) : (
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: hasAlert ? "#FD5108" : "#A1A8B3",
            background: hasAlert ? "#FFF5ED" : "#F4F5F7",
            borderRadius: 20,
            padding: "2px 10px",
            minWidth: 32,
            textAlign: "center",
          }}
        >
          {total ?? "-"}
        </span>
      )}
    </div>
  );
}

function ScenarioStatusWidget({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const queries = Array.from({ length: 7 }, (_, i) => i + 1).map((n) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery<ScenarioMonthly[]>({
      queryKey: ["home-scenario", n, dateFrom, dateTo],
      queryFn: () =>
        api.scenarios.summary(n, { date_from: dateFrom, date_to: dateTo }),
      staleTime: 5 * 60 * 1000,
    })
  );

  const totalAll = queries.every((q) => q.data)
    ? queries.reduce((s, q) => s + (q.data ?? []).reduce((ss, r) => ss + r.count, 0), 0)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>시나리오 탐지 현황</span>
        {totalAll !== null && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: totalAll > 0 ? "#FD5108" : "#A1A8B3",
              background: totalAll > 0 ? "#FFF5ED" : "#F4F5F7",
              borderRadius: 20,
              padding: "3px 12px",
            }}
          >
            총 {totalAll.toLocaleString("ko-KR")}건
          </span>
        )}
      </div>
      <div style={{ height: 1, background: "#EEEFF1", marginBottom: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start" }}>
        {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
          <SingleScenario key={n} n={n} dateFrom={dateFrom} dateTo={dateTo} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION D — BudgetWidget
───────────────────────────────────────────────────────────── */
interface BudgetRow {
  label: string;
  actual: number;
  budget: number;
  color: string;
}

function BudgetWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-budget-variance"],
    queryFn: () => api.budget.varianceMonthly(),
    staleTime: 5 * 60 * 1000,
  });

  const rows: BudgetRow[] = (() => {
    if (!data) return [];
    const agg: Record<string, { actual: number; budget: number }> = {
      매출: { actual: 0, budget: 0 },
      영업이익: { actual: 0, budget: 0 },
      비용: { actual: 0, budget: 0 },
    };
    (data as any[]).forEach((row: any) => {
      const item: string = row.item ?? "";
      if (item.includes("매출") || item.includes("revenue") || item.includes("Revenue")) {
        agg["매출"].actual += row.actual ?? 0;
        agg["매출"].budget += row.budget ?? 0;
      } else if (item.includes("영업") || item.includes("operating") || item.includes("Operating")) {
        agg["영업이익"].actual += row.actual ?? 0;
        agg["영업이익"].budget += row.budget ?? 0;
      } else if (item.includes("비용") || item.includes("expense") || item.includes("Expense")) {
        agg["비용"].actual += row.actual ?? 0;
        agg["비용"].budget += row.budget ?? 0;
      }
    });
    // fallback: if no specific mapping found, sum everything into 매출
    if (
      agg["매출"].budget === 0 &&
      agg["영업이익"].budget === 0 &&
      agg["비용"].budget === 0
    ) {
      (data as any[]).forEach((row: any) => {
        agg["매출"].actual += row.actual ?? 0;
        agg["매출"].budget += row.budget ?? 0;
      });
    }
    return [
      { label: "매출",   ...agg["매출"],   color: "#FD5108" },
      { label: "영업이익", ...agg["영업이익"], color: "#FE7C39" },
      { label: "비용",   ...agg["비용"],   color: "#A1A8B3" },
    ];
  })();

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>예산 달성률</span>
      </div>
      <div style={{ height: 1, background: "#EEEFF1", marginBottom: 20 }} />

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonBar key={i} w="100%" />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {rows.map((row) => {
            const pct = row.budget > 0 ? Math.min((row.actual / row.budget) * 100, 100) : 0;
            return (
              <div key={row.label}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A2E" }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
                {/* progress bar */}
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: "#F0F0F0",
                    overflow: "hidden",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 4,
                      background: row.color,
                      transition: "width .6s ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: "#A1A8B3" }}>
                  {formatKRW(row.actual)} / {formatKRW(row.budget)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Drop placeholder
───────────────────────────────────────────────────────────── */
function DropPlaceholder({ layout }: { layout: "full" | "half" }) {
  return (
    <div
      style={{
        gridColumn: layout === "full" ? "span 2" : "span 1",
        border: "2px dashed #FD5108",
        borderRadius: 12,
        background: "#FFF8F5",
        minHeight: 100,
        opacity: 0.7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 8,
        color: "#FD5108",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>여기에 놓기</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FadeInView — scroll-triggered fade + slide-up
───────────────────────────────────────────────────────────── */
function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.06 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 0.52s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.52s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Widget card wrapper
───────────────────────────────────────────────────────────── */
function WidgetCard({
  children,
  style,
  isHovered,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  isHovered?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: isHovered ? "1px solid rgba(253,81,8,0.25)" : "1px solid #DFE3E6",
        borderRadius: 12,
        padding: 16,
        boxShadow: isHovered
          ? "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"
          : "var(--shadow-card)",
        transform: isHovered ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION E — PlKpiWidget
───────────────────────────────────────────────────────────── */
function PlKpiWidget({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["home-pl-kpi", dateFrom, dateTo],
    queryFn: () => api.financialStatements.incomeStatement({ date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60 * 1000,
  });
  const items = [
    { label: "매출액",     key: "revenue",          color: "#FD5108" },
    { label: "영업이익",   key: "operating_profit", color: "#FE7C39" },
    { label: "당기순이익", key: "net_income",        color: "#FFAA72" },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>손익 핵심 지표</span>
        <Link href="/pnl/summary" style={{ fontSize: 12, color: "#FD5108", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          상세보기 <ArrowRight size={12} />
        </Link>
      </div>
      <div style={{ height: 1, background: "#EEEFF1", marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {items.map((item) => (
          <div key={item.key} style={{ background: "#FAFAFA", borderRadius: 10, padding: "14px 16px", border: "1px solid #F0F0F0" }}>
            <div style={{ fontSize: 12, color: "#A1A8B3", marginBottom: 6 }}>{item.label}</div>
            {isLoading ? <SkeletonKpi /> : (
              <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>
                {data ? formatKRW(data[item.key] ?? data?.items?.find((r: any) => r.label?.includes(item.label))?.current_amount ?? 0) : "–"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION F — BsRatioWidget
───────────────────────────────────────────────────────────── */
function BsRatioWidget({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["home-bs", dateFrom, dateTo],
    queryFn: () => api.financialStatements.balanceSheet({ date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60 * 1000,
  });
  const findAmt = (label: string) => {
    if (!data?.items) return 0;
    const row = data.items.find((r: any) => r.label?.includes(label));
    return row?.current_amount ?? 0;
  };
  const currentAsset  = findAmt("유동자산");
  const currentLiab   = findAmt("유동부채");
  const totalAsset    = findAmt("자산총계") || findAmt("자산 총계");
  const totalLiab     = findAmt("부채총계") || findAmt("부채 총계");
  const equity        = findAmt("자본총계") || findAmt("자본 총계");
  const liquidityRatio = currentLiab > 0 ? (currentAsset / currentLiab * 100).toFixed(1) : "–";
  const debtRatio      = equity      > 0 ? (totalLiab   / equity       * 100).toFixed(1) : "–";
  const ratios = [
    { label: "유동비율",   value: liquidityRatio, unit: "%", color: "#FD5108" },
    { label: "부채비율",   value: debtRatio,      unit: "%", color: "#FE7C39" },
    { label: "자산총계",   value: totalAsset > 0 ? formatKRW(totalAsset) : "–", unit: "", color: "#FFAA72" },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>재무비율 요약</span>
        <Link href="/bs/summary" style={{ fontSize: 12, color: "#FD5108", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          상세보기 <ArrowRight size={12} />
        </Link>
      </div>
      <div style={{ height: 1, background: "#EEEFF1", marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {ratios.map((r) => (
          <div key={r.label} style={{ background: "#FAFAFA", borderRadius: 10, padding: "14px 16px", border: "1px solid #F0F0F0" }}>
            <div style={{ fontSize: 12, color: "#A1A8B3", marginBottom: 6 }}>{r.label}</div>
            {isLoading ? <SkeletonKpi /> : (
              <div style={{ fontSize: 22, fontWeight: 700, color: r.color }}>
                {r.value}{r.unit}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION G — CashflowWidget
───────────────────────────────────────────────────────────── */
function CashflowWidget({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["home-cf", dateFrom, dateTo],
    queryFn: () => api.financialStatements.cashFlow({ date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60 * 1000,
  });
  const findCf = (label: string) => {
    if (!data?.items) return 0;
    const row = data.items.find((r: any) => r.label?.includes(label));
    return row?.current_amount ?? 0;
  };
  const operating  = findCf("영업");
  const investing  = findCf("투자");
  const financing  = findCf("재무");
  const rows = [
    { label: "영업활동", value: operating,  color: operating  >= 0 ? "#16C784" : "#FF4747" },
    { label: "투자활동", value: investing,  color: investing  >= 0 ? "#16C784" : "#FF4747" },
    { label: "재무활동", value: financing,  color: financing  >= 0 ? "#16C784" : "#FF4747" },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>현금흐름 요약</span>
        <Link href="/summary" style={{ fontSize: 12, color: "#FD5108", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          상세보기 <ArrowRight size={12} />
        </Link>
      </div>
      <div style={{ height: 1, background: "#EEEFF1", marginBottom: 16 }} />
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1,2,3].map(i => <SkeletonBar key={i} w="100%" />)}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#FAFAFA", borderRadius: 8, border: "1px solid #F0F0F0" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A2E" }}>{row.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{formatKRW(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION H — VoucherTopWidget
───────────────────────────────────────────────────────────── */
function VoucherTopWidget({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const topScenarios = [1, 2, 3, 4, 5];
  const queries = topScenarios.map((n) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery<ScenarioMonthly[]>({
      queryKey: ["home-scenario", n, dateFrom, dateTo],
      queryFn: () => api.scenarios.summary(n, { date_from: dateFrom, date_to: dateTo }),
      staleTime: 5 * 60 * 1000,
    })
  );
  const NAMES: Record<number, string> = { 1: "동일금액 중복전표", 2: "현금+부채 동시인식", 3: "주말 현금지급", 4: "고액 현금전표", 5: "비용+현금 동시인식" };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>전표 이상 탐지 TOP5</span>
        <Link href="/scenario/1" style={{ fontSize: 12, color: "#FD5108", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          상세보기 <ArrowRight size={12} />
        </Link>
      </div>
      <div style={{ height: 1, background: "#EEEFF1", marginBottom: 12 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {topScenarios.map((n, i) => {
          const total = queries[i].data ? queries[i].data!.reduce((s, r) => s + r.count, 0) : null;
          const hasAlert = total !== null && total > 0;
          return (
            <Link key={n} href={`/scenario/${n}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#FAFAFA", borderRadius: 8, border: "1px solid #F0F0F0" }}>
              <span style={{ fontSize: 13, color: "#1A1A2E" }}>{NAMES[n]}</span>
              {total === null ? <SkeletonBar w="32px" /> : (
                <span style={{ fontSize: 12, fontWeight: 600, color: hasAlert ? "#FD5108" : "#A1A8B3", background: hasAlert ? "#FFF5ED" : "#F4F5F7", borderRadius: 20, padding: "2px 10px" }}>
                  {total}건
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION I — PeriodCompareWidget
───────────────────────────────────────────────────────────── */
function PeriodCompareWidget() {
  const links = [
    { label: "PL 계정분석",  href: "/pnl/account",  Icon: BarChart2,  desc: "계정별 당기/전기 비교" },
    { label: "기간 비교 분석", href: "/period",        Icon: CalendarDays, desc: "월·분기·연도 기간 비교" },
    { label: "BS 계정분석",  href: "/bs/account",   Icon: Database,  desc: "자산·부채 계정 증감" },
    { label: "전표분석내역",  href: "/voucher/list", Icon: FileText,  desc: "전표 상세 내역 조회" },
  ];
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>기간 비교 분석</span>
      </div>
      <div style={{ height: 1, background: "#EEEFF1", marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              padding: "18px 12px 16px",
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.85)",
              borderRadius: 12,
              textAlign: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)",
              transition: "transform 0.18s ease, box-shadow 0.18s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(253,81,8,0.13), inset 0 1px 0 rgba(255,255,255,0.95)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)";
            }}
          >
            <l.Icon size={22} color="#FD5108" />
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E", marginTop: 8 }}>{l.label}</div>
            <div style={{ fontSize: 12, color: "#A1A8B3", lineHeight: 1.4, marginTop: 3 }}>{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Three.js 3D Particle Wave Background
───────────────────────────────────────────────────────────── */
/* ── Concentric Rings hero graphic ── */
function ConcentricRings() {
  // Static rings (breathing)
  const staticRings = [100, 200, 310, 440, 590, 760, 950];
  // Expanding ripple rings (staggered)
  const rippleRings = [0, 1, 2, 3];
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      {/* Center dot */}
      <div style={{
        position: "absolute", width: 12, height: 12, borderRadius: "50%",
        background: "rgba(253,81,8,0.55)",
        boxShadow: "0 0 20px 6px rgba(253,81,8,0.18)",
      }} />

      {/* Static breathing rings */}
      {staticRings.map((r, i) => (
        <div key={`s${i}`} style={{
          position: "absolute",
          width: r * 2, height: r * 2, borderRadius: "50%",
          border: `${i < 3 ? 1.5 : 1}px solid rgba(253,81,8,${0.28 - i * 0.032})`,
          animation: `ring-breathe ${3.5 + i * 0.4}s ease-in-out ${i * 0.35}s infinite`,
        }} />
      ))}

      {/* Expanding ripple rings */}
      {rippleRings.map((i) => (
        <div key={`r${i}`} style={{
          position: "absolute",
          width: 200, height: 200, borderRadius: "50%",
          border: "1.5px solid rgba(253,81,8,0.5)",
          animation: `ring-expand 5s ease-out ${i * 1.25}s infinite`,
        }} />
      ))}
    </div>
  );
}

function HeroBg() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => {
      if (v.duration && v.currentTime > v.duration - 0.2) {
        v.currentTime = 0;
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}
    >
      <source src="/bg.mp4" type="video/mp4" />
    </video>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const { dateFrom, dateTo } = useFilterStore();

  /* Search */
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const filtered = query.trim()
    ? SEARCH_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.section.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  /* Widget settings */
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
  const widgetBtnRef   = useRef<HTMLButtonElement>(null);
  const widgetPanelRef = useRef<HTMLDivElement>(null);
  const [panelFixedPos, setPanelFixedPos] = useState<{ top: number; right: number } | null>(null);

  const openWidgetPanel = () => {
    if (!showWidgetPanel && widgetBtnRef.current) {
      const r = widgetBtnRef.current.getBoundingClientRect();
      setPanelFixedPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setShowWidgetPanel(v => !v);
  };
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(DEFAULT_ACTIVE);

  // SSR hydration 이후 localStorage 반영 (서버/클라이언트 불일치 방지)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("easyview_home_widgets");
      if (saved) setActiveWidgets(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggleWidget = (id: WidgetId) => {
    setActiveWidgets((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("easyview_home_widgets", JSON.stringify(next));
      return next;
    });
  };

  /* 대시보드 섹션 ref (스크롤 이동용) */
  const dashRef = useRef<HTMLDivElement>(null);
  const goToDashboard = () => {
    const top = (dashRef.current?.offsetTop ?? window.innerHeight) - 56;
    window.scrollTo({ top, behavior: "smooth" });
  };
  const goToHero = () => window.scrollTo({ top: 0, behavior: "smooth" });

  /* 화살표 표시 여부 (히어로 구간에서만 보임) */
  const [heroVisible, setHeroVisible] = useState(true);

  /* 섹션 스냅 스크롤 */
  useEffect(() => {
    let locked = false;

    const getPositions = () => {
      const heroH   = heroRef.current?.offsetHeight ?? window.innerHeight;
      const dashTop = (dashRef.current?.offsetTop ?? heroH) - 56;
      return { heroH, dashTop };
    };

    const snapDown = () => {
      const { dashTop } = getPositions();
      locked = true;
      window.scrollTo({ top: dashTop, behavior: "smooth" });
      setTimeout(() => { locked = false; }, 900);
    };
    const snapUp = () => {
      locked = true;
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => { locked = false; }, 900);
    };

    const snap = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return; // allow browser zoom
      if (locked) { e.preventDefault(); return; }
      const { heroH, dashTop } = getPositions();
      const y = window.scrollY;
      if (e.deltaY > 0 && y < heroH * 0.85) {
        e.preventDefault(); snapDown();
      } else if (e.deltaY < 0 && y <= dashTop + 120) {
        e.preventDefault(); snapUp();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(e.key)) return;
      if (locked) { e.preventDefault(); return; }
      const { heroH, dashTop } = getPositions();
      const y = window.scrollY;
      const goDown = e.key === "ArrowDown" || e.key === "PageDown";
      const goUp   = e.key === "ArrowUp"   || e.key === "PageUp";
      if (goDown && y < heroH * 0.85) {
        e.preventDefault(); snapDown();
      } else if (goUp && y <= dashTop + 120) {
        e.preventDefault(); snapUp();
      }
    };

    const onScroll = () => {
      const heroH = heroRef.current?.offsetHeight ?? window.innerHeight;
      setHeroVisible(window.scrollY < heroH * 0.5);
    };

    window.addEventListener("wheel",   snap,      { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll",  onScroll,  { passive: true });
    return () => {
      window.removeEventListener("wheel",   snap);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll",  onScroll);
    };
  }, []);

  /* Restore scroll on unmount */
  useEffect(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  /* Drag-and-drop state */
  const [dragId,        setDragId]        = useState<WidgetId | null>(null); // 대시보드 내 드래그
  const [panelDragId,   setPanelDragId]   = useState<WidgetId | null>(null); // 패널에서 드래그
  const [dragOverId,    setDragOverId]    = useState<WidgetId | null>(null); // 대시보드 재정렬용
  const [dropIndex,     setDropIndex]     = useState<number | null>(null);   // 플레이스홀더 위치
  const [hoveredWidgetId, setHoveredWidgetId] = useState<WidgetId | null>(null);

  /* 대시보드 내 재정렬 실시간 미리보기 */
  const previewOrder = useMemo(() => {
    if (!dragId || !dragOverId || dragId === dragOverId) return activeWidgets;
    const arr = [...activeWidgets];
    const from = arr.indexOf(dragId);
    const to   = arr.indexOf(dragOverId);
    if (from === -1 || to === -1) return activeWidgets;
    arr.splice(from, 1);
    arr.splice(to, 0, dragId);
    return arr;
  }, [dragId, dragOverId, activeWidgets]);

  const heroRef = useRef<HTMLDivElement>(null);

  /* Outside click handlers */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
      if (
        widgetPanelRef.current && !widgetPanelRef.current.contains(e.target as Node) &&
        widgetBtnRef.current  && !widgetBtnRef.current.contains(e.target as Node)
      ) setShowWidgetPanel(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); setShowWidgetPanel(false); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  /* KPI data */
  const { data: plData, isLoading: plLoading } = useQuery({
    queryKey: ["home-pl", dateFrom, dateTo],
    queryFn: () =>
      api.financialStatements.incomeStatement({ date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: cfData, isLoading: cfLoading } = useQuery({
    queryKey: ["home-cf", dateFrom, dateTo],
    queryFn: () =>
      api.financialStatements.cashFlow({ date_from: dateFrom, date_to: dateTo }),
    staleTime: 5 * 60 * 1000,
  });
  const pl = plData as any;
  const cf = cfData as any;
  const kpiLoading = plLoading || cfLoading;
  const kpiCards = [
    { label: "매출액",      value: pl?.revenue?.total ?? null,   color: "#FD5108" },
    { label: "영업이익",    value: pl?.operating_income ?? null, color: "#FE7C39" },
    { label: "당기순이익",  value: pl?.net_income ?? null,       color: "#FFAA72" },
    { label: "현금 순증감", value: cf?.net_change ?? null,       color: "#A1A8B3" },
  ];

  /* ── 위젯 패널 Portal — document.body에 직접 렌더링하여 stacking context 완전 탈출 ── */
  const widgetPortal = showWidgetPanel && panelFixedPos && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={widgetPanelRef}
          style={{
            position: "fixed", top: panelFixedPos.top, right: panelFixedPos.right,
            background: "#fff", border: "1px solid #DFE3E6", borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)", zIndex: 99999, padding: 14, width: 300,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", letterSpacing: "-0.2px" }}>
              위젯 표시 설정
            </span>
            <button onClick={() => setShowWidgetPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A1A8B3", padding: 2, display: "flex" }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {WIDGET_REGISTRY.map((w) => {
              const isActive = activeWidgets.includes(w.id);
              return (
                <div
                  key={w.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("widgetId", w.id);
                    e.dataTransfer.effectAllowed = "copy";
                    setPanelDragId(w.id);
                  }}
                  onDragEnd={() => { setPanelDragId(null); setDropIndex(null); }}
                  onClick={() => toggleWidget(w.id)}
                  style={{
                    position: "relative",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 5, padding: "12px 6px", aspectRatio: "1 / 1", borderRadius: 10, boxSizing: "border-box",
                    border: isActive ? "1px solid #FD5108" : "1px solid #DFE3E6",
                    background: isActive ? "#FFF8F5" : "#FAFAFA",
                    cursor: "pointer", transition: "all .15s", userSelect: "none",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "#FFAA72"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6"; }}
                >
                  <w.Icon size={20} color={isActive ? "#FD5108" : "#A1A8B3"} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? "#FD5108" : "#6B7280", textAlign: "center", lineHeight: 1.35, wordBreak: "keep-all", whiteSpace: "normal", width: "100%", padding: "0 4px" }}>
                    {w.label}
                  </span>
                  {isActive && (
                    <div style={{ position: "absolute", top: 5, right: 5 }}>
                      <Check size={10} color="#FD5108" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "#B0B7C3", marginTop: 12, textAlign: "center", marginBottom: 0, fontWeight: 400 }}>
            클릭으로 추가 · 드래그하여 대시보드에 추가
          </p>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {widgetPortal}
      {/* Global keyframe injection */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) translateY(0); }
          50%       { opacity: 1;   transform: translateX(-50%) translateY(6px); }
        }
        @keyframes scrollChevron {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.7; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ring-breathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.04); }
        }
        @keyframes ring-expand {
          0%   { transform: scale(0.7); opacity: 0.9; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        main { background-color: transparent !important; }
      `}</style>

      {/* Fixed video — behind both hero and dashboard */}
      <HeroBg />

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <div
        ref={heroRef}
        style={{
          position: "relative",
          zIndex: 2,
          height: "100vh",
          background: "transparent",
          overflow: "hidden",
          margin: "calc(-100px - 24px) -24px 0",
        }}
      >

          {/* Center content — constrained to max 620px */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 0,
              marginTop: -20,
            }}
          >
            <div style={{ width: "100%", maxWidth: 680, padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              {/* Eyebrow */}
              <span style={{
                fontSize: 17, color: "#FD5108", letterSpacing: 1, fontWeight: 400,
                animation: "heroFadeIn 0.5s ease 0.1s both",
                marginBottom: -4,
                marginTop: 16,
              }}>
                데이터 분석의 새로운 기준
              </span>

              {/* Title */}
              <h1 style={{
                fontSize: "clamp(32px, 4.2vw, 48px)", fontWeight: 700, color: "#1A1A2E",
                letterSpacing: -1.5, margin: 0, lineHeight: 1.2, textAlign: "center",
                animation: "heroFadeIn 0.6s ease 0.25s both",
                whiteSpace: "nowrap",
              }}>
                Welcome to Easy View
                <svg
                  viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
                  style={{
                    display: "inline-block",
                    width:  "clamp(18px, 2.4vw, 28px)",
                    height: "clamp(18px, 2.4vw, 28px)",
                    marginLeft: "0.04em",
                    marginRight: "0.04em",
                    verticalAlign: "super",
                    position: "relative",
                    top: "-0.08em",
                  }}
                >
                  <path d="M47.062 8.01195C47.2809 7.40867 47.6803 6.88743 48.2059 6.51908C48.7314 6.15073 49.3577 5.95312 49.9995 5.95312C50.6412 5.95313 51.2675 6.15073 51.793 6.51908C52.3186 6.88743 52.718 7.40867 52.937 8.01195L55.9245 16.1745C58.2675 22.5734 61.9774 28.3845 66.7959 33.203C71.6144 38.0215 77.4255 41.7315 83.8245 44.0745L91.9807 47.062C92.584 47.2809 93.1052 47.6803 93.4736 48.2059C93.8419 48.7314 94.0395 49.3577 94.0395 49.9995C94.0395 50.6412 93.8419 51.2675 93.4736 51.793C93.1052 52.3186 92.584 52.718 91.9807 52.937L83.8245 55.9245C77.4255 58.2675 71.6144 61.9774 66.7959 66.7959C61.9774 71.6144 58.2675 77.4255 55.9245 83.8245L52.937 91.9807C52.718 92.584 52.3186 93.1052 51.793 93.4736C51.2675 93.8419 50.6412 94.0395 49.9995 94.0395C49.3577 94.0395 48.7314 93.8419 48.2059 93.4736C47.6803 93.1052 47.2809 92.584 47.062 91.9807L44.0745 83.8245C41.7315 77.4255 38.0215 71.6144 33.203 66.7959C28.3845 61.9774 22.5734 58.2675 16.1745 55.9245L8.01195 52.937C7.40867 52.718 6.88743 52.3186 6.51908 51.793C6.15073 51.2675 5.95313 50.6412 5.95312 49.9995C5.95312 49.3577 6.15073 48.7314 6.51908 48.2059C6.88743 47.6803 7.40867 47.2809 8.01195 47.062L16.1745 44.0745C22.5734 41.7315 28.3845 38.0215 33.203 33.203C38.0215 28.3845 41.7315 22.5734 44.0745 16.1745L47.062 8.01195Z" fill="#FD5108"/>
                </svg>
              </h1>

              {/* Description */}
              <p style={{
                fontSize: 17, color: "#6B7280", margin: 0, textAlign: "center",
                lineHeight: 1.6, letterSpacing: "-0.2px",
                animation: "heroFadeIn 0.6s ease 0.48s both",
              }}>
                재무 결산부터 원가, 영업 분석까지 —&nbsp;
                <span style={{ color: "#1A1A2E", fontWeight: 600 }}>원하는 데이터를 한눈에</span> 확인하세요!
              </p>

              {/* Search bar */}
              <div ref={searchRef} style={{ position: "relative", width: "100%", marginTop: 4, animation: "heroFadeIn 0.6s ease 0.58s both" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#fff", border: "1.5px solid #DFE3E6",
                  borderRadius: 12, padding: "12px 18px",
                  boxShadow: "0 2px 12px rgba(253,81,8,0.06)",
                }}>
                  <Search size={16} color="#A1A8B3" />
                  <input
                    type="text"
                    placeholder="페이지 검색 (예: PL 요약, 전표...)"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 16, color: "#1A1A2E", background: "transparent" }}
                  />
                </div>

                {searchOpen && filtered.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "#fff", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
                    zIndex: 50, maxHeight: 280, overflowY: "auto",
                  }}>
                    {filtered.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => { router.push(item.href); setSearchOpen(false); setQuery(""); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid #F2F3F5", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FFF8F5"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, background: "#FFF5ED", color: "#FD5108", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>
                            {item.section}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{item.label}</span>
                        </div>
                        <ArrowRight size={14} color="#A1A8B3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 하단 그라데이션 페이드 */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 120, zIndex: 1,
            background: "linear-gradient(to bottom, transparent 0%, rgba(255,248,245,0.7) 70%, #FFF4EE 100%)",
            pointerEvents: "none",
          }} />

          {/* 스크롤 유도 버튼 — 히어로 구간에서만 표시 */}
          <button
            onClick={goToDashboard}
            style={{
              position: "absolute", bottom: 32, left: "50%",
              animation: "scrollPulse 2.2s ease-in-out infinite",
              zIndex: 3, background: "none", border: "none", cursor: "pointer", padding: 0,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
              opacity: heroVisible ? 1 : 0,
              pointerEvents: heroVisible ? "auto" : "none",
              transition: "opacity 0.4s ease",
            }}
          >
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <path d="M2 2.5L11 11.5L20 2.5" stroke="#FD5108" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" style={{ marginTop: -6, animation: "scrollChevron 2.2s ease-in-out infinite" }}>
              <path d="M2 2.5L11 11.5L20 2.5" stroke="#FD5108" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      {/* ════════════════════════════════════════════════════════
          DASHBOARD — 히어로 바로 아래, 스크롤로 자연스럽게 연결
      ════════════════════════════════════════════════════════ */}
      <div
        ref={dashRef}
        style={{
          position: "relative",
          zIndex: 2,
          scrollMarginTop: 56,
          margin: "0 -24px -24px",
          minHeight: "calc(100vh - 56px)",
          background: "rgba(255, 255, 255, 0.93)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "32px 24px 48px" }}>

        {/* ════════════════════════════════════════════════════════
            SECTION — Widget Grid
        ════════════════════════════════════════════════════════ */}
        <div>
          {/* Widget section header */}
          <FadeInView delay={0}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E", letterSpacing: "-0.4px" }}>
                  맞춤 위젯 관리
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#FD5108", background: "#FFF5ED", borderRadius: 20, padding: "2px 12px" }}>
                  필요한 정보만 한눈에! 나만의 대시보드를 완성하세요
                </span>
              </div>
            </div>

            {/* Widget add button */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                ref={widgetBtnRef}
                onClick={openWidgetPanel}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  background: "#FD5108", border: "none", borderRadius: 8,
                  padding: "8px 16px", cursor: "pointer", transition: "background .15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#E04500"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FD5108"; }}
              >
                <Settings2 size={14} />
                위젯 추가
              </button>

              {/* 팝업은 Portal로 body에 직접 렌더링 → stacking context 완전 탈출 */}
            </div>
          </div>
          </FadeInView>

          {/* ── 위젯 그리드 ── */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}
            onDragOver={(e) => {
              e.preventDefault();
              // 패널 드래그 중 그리드 빈 공간 위 → 마지막에 추가
              if (panelDragId && dropIndex === null) setDropIndex(activeWidgets.length);
            }}
            onDrop={(e) => {
              // 패널에서 직접 그리드 배경으로 드롭 (위젯 위가 아닌 경우)
              const panelId = e.dataTransfer.getData("widgetId") as WidgetId;
              if (panelId && !activeWidgets.includes(panelId)) {
                setActiveWidgets((prev) => {
                  const arr = [...prev];
                  arr.splice(dropIndex ?? arr.length, 0, panelId);
                  localStorage.setItem("easyview_home_widgets", JSON.stringify(arr));
                  return arr;
                });
              }
              setPanelDragId(null); setDropIndex(null);
            }}
          >
            {(() => {
              // 패널 드래그 중: 원본 목록 기준으로 플레이스홀더 삽입
              // 대시보드 재정렬: previewOrder 기준으로 표시
              const baseList = panelDragId ? activeWidgets : previewOrder;
              const placeholderLayout: "full" | "half" =
                panelDragId ? (WIDGET_LAYOUT[panelDragId as WidgetId] ?? "half") : "half";

              const elements: React.ReactNode[] = [];

              baseList.forEach((id, index) => {
                // 플레이스홀더: 이 위젯 앞에 삽입
                if (panelDragId && dropIndex === index) {
                  elements.push(<DropPlaceholder key="placeholder" layout={placeholderLayout} />);
                }

                const layout = WIDGET_LAYOUT[id];
                const isChartWidget = id === "monthly-trend" || id === "scenario-status";
                const isDragging = dragId === id;

                elements.push(
                  <div
                    key={id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("dashWidgetId", id);
                    }}
                    onMouseEnter={() => setHoveredWidgetId(id)}
                    onMouseLeave={() => setHoveredWidgetId(null)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); setDropIndex(null); }}
                    onDragOver={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (panelDragId) {
                        // 패널 드래그: 위젯 상/하 절반 기준으로 플레이스홀더 위치 결정
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setDropIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1);
                      } else {
                        setDragOverId(id);
                      }
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      // 대시보드 재정렬
                      const srcId = e.dataTransfer.getData("dashWidgetId") as WidgetId;
                      if (srcId && srcId !== id) {
                        setActiveWidgets((prev) => {
                          const arr = [...prev];
                          const from = arr.indexOf(srcId);
                          const to   = arr.indexOf(id);
                          arr.splice(from, 1); arr.splice(to, 0, srcId);
                          localStorage.setItem("easyview_home_widgets", JSON.stringify(arr));
                          return arr;
                        });
                      }
                      // 패널에서 드롭 → dropIndex 위치에 삽입
                      const panelId = e.dataTransfer.getData("widgetId") as WidgetId;
                      if (panelId && !activeWidgets.includes(panelId)) {
                        setActiveWidgets((prev) => {
                          const arr = [...prev];
                          arr.splice(dropIndex ?? index, 0, panelId);
                          localStorage.setItem("easyview_home_widgets", JSON.stringify(arr));
                          return arr;
                        });
                      }
                      setDragId(null); setDragOverId(null); setPanelDragId(null); setDropIndex(null);
                    }}
                    style={{
                      gridColumn: layout === "full" ? "span 2" : "span 1",
                      opacity: isDragging ? 0.35 : 1,
                      borderRadius: 12,
                      outline: isDragging ? "2px dashed #FD5108" : "none",
                      outlineOffset: "-2px",
                      transition: "opacity .2s",
                      position: "relative",
                    }}
                  >
                    {/* 컨트롤: 호버 시에만 표시 */}
                    <div style={{
                      position: "absolute", top: 10, right: 12, zIndex: 10,
                      display: "flex", alignItems: "center", gap: 2,
                      opacity: hoveredWidgetId === id ? 1 : 0,
                      pointerEvents: hoveredWidgetId === id ? "auto" : "none",
                      transition: "opacity 0.15s",
                    }}>
                      <div style={{ cursor: "grab", color: "#B0B7C3", display: "flex", padding: 2 }}>
                        <GripVertical size={13} />
                      </div>
                      <button
                        onClick={() => toggleWidget(id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#B0B7C3", display: "flex", padding: 2 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#FF4747"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#B0B7C3"; }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <FadeInView delay={index * 55} style={isChartWidget ? { display: "flex", flexDirection: "column", height: 300 } : { height: "100%" }}>
                      <WidgetCard isHovered={hoveredWidgetId === id && !isDragging} style={isChartWidget ? { display: "flex", flexDirection: "column", height: "100%" } : { height: "100%" }}>
                        {id === "quick-nav"       && <><div style={{ marginBottom: 12 }}><span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>빠른 이동</span></div><div style={{ height: 1, background: "#EEEFF1", marginBottom: 16 }} /><QuickNavWidget /></>}
                        {id === "monthly-trend"   && <MonthlyTrendWidget dateFrom={dateFrom} dateTo={dateTo} />}
                        {id === "scenario-status" && <ScenarioStatusWidget dateFrom={dateFrom} dateTo={dateTo} />}
                        {id === "budget"          && <BudgetWidget />}
                        {id === "pl-kpi"          && <PlKpiWidget dateFrom={dateFrom} dateTo={dateTo} />}
                        {id === "bs-ratio"        && <BsRatioWidget dateFrom={dateFrom} dateTo={dateTo} />}
                        {id === "cashflow"        && <CashflowWidget dateFrom={dateFrom} dateTo={dateTo} />}
                        {id === "voucher-top"     && <VoucherTopWidget dateFrom={dateFrom} dateTo={dateTo} />}
                        {id === "period-compare"  && <PeriodCompareWidget />}
                      </WidgetCard>
                    </FadeInView>
                  </div>
                );
              });

              // 플레이스홀더: 마지막 위치
              if (panelDragId && dropIndex === baseList.length) {
                elements.push(<DropPlaceholder key="placeholder" layout={placeholderLayout} />);
              }

              // 빈 상태 안내
              if (activeWidgets.length === 0 && !panelDragId) {
                elements.push(
                  <div key="empty" style={{
                    gridColumn: "span 2", padding: 48, borderRadius: 12,
                    border: "2px dashed #DFE3E6", background: "#FAFAFA",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#A1A8B3",
                  }}>
                    <LayoutGrid size={32} strokeWidth={1.5} />
                    <span style={{ fontSize: 14 }}>위젯 추가 버튼을 클릭하거나 드래그하여 위젯을 추가하세요</span>
                  </div>
                );
              }

              return elements;
            })()}
          </div>
        </div>

        </div>
      </div>
    </>
  );
}
