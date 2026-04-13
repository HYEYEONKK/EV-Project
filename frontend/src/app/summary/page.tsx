"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import type { AnalysisMode, BSBase } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";
import Link from "next/link";
import { useMemo } from "react";
import { Copy, ArrowLeftRight, CalendarX, Banknote, Zap, UserMinus, CalendarOff } from "lucide-react";

const SCENARIO_ICONS: Record<string, React.ElementType> = {
  Copy, ArrowLeftRight, CalendarX, Banknote, Zap, UserMinus, CalendarOff,
};

/* ══════════════════════════════════════════
   Date range helpers
══════════════════════════════════════════ */
function lastDay(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}
function deriveDateRanges(
  baseYM: string,
  mode: AnalysisMode
): { curr: { from: string; to: string }; prev: { from: string; to: string } } {
  const [y, m] = baseYM.split("-").map(Number);
  const mStr = String(m).padStart(2, "0");
  const ld = lastDay(y, m);
  if (mode === "전년누적") {
    return {
      curr: { from: `${y}-01-01`, to: `${y}-${mStr}-${ld}` },
      prev: { from: `${y - 1}-01-01`, to: `${y - 1}-${mStr}-${lastDay(y - 1, m)}` },
    };
  }
  if (mode === "전년동월") {
    return {
      curr: { from: `${y}-${mStr}-01`, to: `${y}-${mStr}-${ld}` },
      prev: { from: `${y - 1}-${mStr}-01`, to: `${y - 1}-${mStr}-${lastDay(y - 1, m)}` },
    };
  }
  // 전월비교
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const pmStr = String(pm).padStart(2, "0");
  return {
    curr: { from: `${y}-${mStr}-01`,  to: `${y}-${mStr}-${ld}` },
    prev: { from: `${py}-${pmStr}-01`, to: `${py}-${pmStr}-${lastDay(py, pm)}` },
  };
}
function deriveBSDateRanges(
  baseYM: string,
  bsBase: BSBase
): { curr: { from: string; to: string }; prev: { from: string; to: string } } {
  const [y, m] = baseYM.split("-").map(Number);
  const mStr = String(m).padStart(2, "0");
  const ld = lastDay(y, m);
  if (bsBase === "연초") {
    return {
      curr: { from: `${y}-01-01`, to: `${y}-${mStr}-${ld}` },
      prev: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` },
    };
  }
  // 월초
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const pmStr = String(pm).padStart(2, "0");
  return {
    curr: { from: `${y}-${mStr}-01`, to: `${y}-${mStr}-${ld}` },
    prev: { from: `${py}-01-01`,    to: `${py}-${pmStr}-${lastDay(py, pm)}` },
  };
}


/* ══════════════════════════════════════════
   Sparkline
══════════════════════════════════════════ */
function Spark({ color, up, delay = 0 }: { color: string; up?: boolean; delay?: number }) {
  const pts = up
    ? "M0,45 20,42 40,44 60,38 80,32 100,25 120,20 140,15 160,10 180,7 200,4"
    : "M0,10 20,12 40,11 60,14 80,13 100,14 120,13 140,14 160,13 180,14 200,13";
  const id = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width: "100%", height: 36 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d={pts + " 200,60 0,60Z"}
        fill={`url(#${id})`}
        style={{ animation: `sparkFill 0.6s ease ${delay + 0.15}s both`, opacity: 0 }}
      />
      <path
        d={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={800}
        strokeDashoffset={800}
        style={{ animation: `sparkDraw 0.8s ease ${delay}s both` }}
      />
    </svg>
  );
}

/* ══════════════════════════════════════════
   Top-mover card
══════════════════════════════════════════ */
interface MoverItem { name: string; change: number }
function MoverCard({
  title, items, colors, href, positive,
}: {
  title: string;
  items: MoverItem[];
  colors: string[];
  href: string;
  positive: boolean;
}) {
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.change)), 1);
  const accentColor = positive ? "#16C784" : "#FF4747";
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        className="bg-white rounded-lg border h-full overflow-hidden"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer", transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease" }}
        onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "rgba(253,81,8,0.25)"; }}
        onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-card)"; el.style.transform = "translateY(0)"; el.style.borderColor = "#DFE3E6"; }}
      >
        {/* 제목 영역 */}
        <div
          className="px-4 pt-3 pb-2.5"
          style={{ borderBottom: "1px solid #EEEFF1" }}
        >
          <p className="text-base font-semibold leading-snug" style={{ color: "#000" }}>{title}</p>
        </div>
        {/* 데이터 영역 */}
        <div className="px-4 py-3">
          {items.length === 0 ? (
            <p className="text-xs" style={{ color: "#A1A8B3" }}>데이터 없음</p>
          ) : (
            items.map((item, i) => {
              const barW = Math.max(4, Math.round((Math.abs(item.change) / maxAbs) * 48));
              return (
                <div key={i} className="flex items-center gap-2 py-1.5" style={{ minWidth: 0 }}>
                  <span
                    className="text-sm"
                    style={{ color: "#374151", flex: "1 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                    <div style={{ width: barW, height: 5, backgroundColor: colors[i], borderRadius: 3, flexShrink: 0 }} />
                    <span
                      className="text-sm"
                      style={{ color: accentColor, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontWeight: 600 }}
                    >
                      {positive ? "+" : "−"}{formatKRW(Math.abs(item.change))}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════
   Scenario card
══════════════════════════════════════════ */
function ScenarioCard({ label, count, href, color }: { label: string; count: number | null; href: string; color: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        className="bg-white rounded-lg border p-5 text-center transition-shadow"
        style={{ borderColor: "#DFE3E6", borderTopWidth: 3, borderTopColor: color, boxShadow: "var(--shadow-card)", cursor: "pointer" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)")}
      >
        <p className="text-xs font-medium mb-3" style={{ color: "#A1A8B3" }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color }}>
          {count === null ? "—" : count.toLocaleString("ko-KR")}
        </p>
        <p className="text-xs mt-1" style={{ color: "#A1A8B3" }}>건</p>
      </div>
    </Link>
  );
}


/* ══════════════════════════════════════════
   Scenario Section (API 연동)
══════════════════════════════════════════ */
const SCENARIO_ITEMS = [
  { id: 1, label: "동일금액 중복",        icon: "Copy"          },
  { id: 2, label: "현금지급 後 부채인식", icon: "ArrowLeftRight" },
  { id: 3, label: "주말 현금지급",        icon: "CalendarX"     },
  { id: 4, label: "고액 현금 전표",       icon: "Banknote"      },
  { id: 5, label: "비용+현금 동시 지급",  icon: "Zap"           },
  { id: 6, label: "저빈도 거래처",        icon: "UserMinus"     },
  { id: 7, label: "주말 기표 전표",       icon: "CalendarOff"   },
];

function ScenarioSection({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const queries = SCENARIO_ITEMS.map((s) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["scenario-summary-summary", s.id, dateFrom, dateTo],
      queryFn: () => api.scenarios.summary(s.id, { date_from: dateFrom, date_to: dateTo }),
    })
  );

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3 px-1">
        <h4 className="text-base font-semibold" style={{ color: "#000" }}>시나리오 전표 수</h4>
        <span className="text-sm" style={{ color: "#A1A8B3" }}>클릭하면 해당 시나리오 분석 페이지로 이동합니다</span>
      </div>
      <div className="grid grid-cols-7 gap-3">
        {SCENARIO_ITEMS.map((s, i) => {
          const data = (queries[i].data as any[]) ?? [];
          const count = data.reduce((sum, d) => sum + (d.count || 0), 0);
          const loading = queries[i].isLoading;
          const IconComp = SCENARIO_ICONS[s.icon];
          return (
            <Link key={s.id} href={`/scenario/${s.id}`} style={{ textDecoration: "none" }}>
              <div
                className="bg-white rounded-lg border p-4 text-center"
                style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer", transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "rgba(253,81,8,0.25)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-card)"; el.style.transform = "translateY(0)"; el.style.borderColor = "#DFE3E6"; }}
              >
                {/* 아이콘 */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  {IconComp && <IconComp size={18} color="#FD5108" strokeWidth={1.8} />}
                </div>
                {/* 레이블 */}
                <p className="text-sm font-semibold leading-snug" style={{ color: "#000", marginBottom: 10 }}>{s.label}</p>
                {/* 값 — 손익지표 수치와 동일: 30px/700/#FD5108 */}
                <p style={{ fontSize: 30, fontWeight: 700, color: "#FD5108", letterSpacing: "-0.5px", lineHeight: 1 }}>
                  {loading ? "—" : count.toLocaleString("ko-KR")}
                </p>
                {/* 건 */}
                <p style={{ fontSize: 13, fontWeight: 500, color: "#A1A8B3", marginTop: 5 }}>건</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Compute per-item changes
══════════════════════════════════════════ */
type PLData = { revenue?: { items: any[]; total: number }; sga?: { items: any[]; total: number }; cogs?: { total: number }; other?: { items: any[]; total: number }; gross_profit?: number; operating_income?: number; operating_margin_pct?: number; net_income?: number; net_margin_pct?: number; gross_margin_pct?: number };
type BSData = { assets?: { total: number; current: { subtotal: number; items: any[] }; noncurrent: { subtotal: number; items: any[] } }; liabilities?: { total: number; current: { subtotal: number; items: any[] }; noncurrent: { subtotal: number } }; equity?: { total: number } };

function computeChanges(currItems: any[], prevItems: any[], key = "account") {
  const prevMap = new Map<string, number>(prevItems.map((i: any) => [i[key], i.amount ?? 0]));
  return currItems.map((i: any) => ({
    name: i[key] ?? "-",
    current: i.amount ?? 0,
    prev: prevMap.get(i[key]) ?? 0,
    change: (i.amount ?? 0) - (prevMap.get(i[key]) ?? 0),
  }));
}

/* ══════════════════════════════════════════
   Main Page
══════════════════════════════════════════ */
export default function SummaryPage() {
  const { summaryBaseYM: baseYM, summaryMode: mode, summaryBsBase: bsBase, dateFrom: globalFrom, dateTo: globalTo } = useFilterStore();

  const plRanges = useMemo(() => deriveDateRanges(baseYM, mode),     [baseYM, mode]);
  const bsRanges = useMemo(() => deriveBSDateRanges(baseYM, bsBase), [baseYM, bsBase]);

  /* ── API calls ── */
  const { data: currPL } = useQuery({ queryKey: ["pl-curr", plRanges.curr], queryFn: () => api.financialStatements.incomeStatement({ date_from: plRanges.curr.from, date_to: plRanges.curr.to }) });
  const { data: prevPL } = useQuery({ queryKey: ["pl-prev", plRanges.prev], queryFn: () => api.financialStatements.incomeStatement({ date_from: plRanges.prev.from, date_to: plRanges.prev.to }) });
  const { data: currBS } = useQuery({ queryKey: ["bs-curr", bsRanges.curr], queryFn: () => api.financialStatements.balanceSheet({ date_from: bsRanges.curr.from, date_to: bsRanges.curr.to }) });
  const { data: prevBS } = useQuery({ queryKey: ["bs-prev", bsRanges.prev], queryFn: () => api.financialStatements.balanceSheet({ date_from: bsRanges.prev.from, date_to: bsRanges.prev.to }) });

  const pl = currPL as PLData | undefined;
  const bs = currBS as BSData | undefined;
  const pPL = prevPL as PLData | undefined;
  const pBS = prevBS as BSData | undefined;

  /* ── Helpers ── */
  function pct(curr: number, prev: number): string {
    if (!prev) return "—";
    const p = ((curr - prev) / Math.abs(prev)) * 100;
    return (p >= 0 ? "+" : "") + p.toFixed(1) + "%";
  }

  /* ── KPI values ── */
  const revenue    = pl?.revenue?.total ?? 0;
  const opIncome   = pl?.operating_income   ?? 0;
  const opMargin   = pl?.operating_margin_pct ?? 0;
  const gpMargin   = pl?.gross_margin_pct   ?? 0;
  const npMargin   = pl?.net_margin_pct     ?? 0;
  const netIncome  = pl?.net_income         ?? 0;
  const totalAssets  = bs?.assets?.total      ?? 0;
  const totalLiab    = bs?.liabilities?.total ?? 0;
  const totalEquity  = bs?.equity?.total      ?? 0;
  const curAssets    = bs?.assets?.current?.subtotal    ?? 0;
  const curLiab      = bs?.liabilities?.current?.subtotal ?? 0;
  const debtRatio    = totalEquity ? (totalLiab / totalEquity * 100) : 0;
  const curRatio     = curLiab     ? (curAssets  / curLiab    * 100) : 0;

  /* ── Derived totals for table ── */
  const cogsTotal   = pl?.cogs?.total  ?? 0;
  const sgaTotal    = pl?.sga?.total   ?? 0;
  const otherTotal  = pl?.other?.total ?? 0;

  const pRevenue    = pPL?.revenue?.total  ?? 0;
  const pCogsTotal  = pPL?.cogs?.total    ?? 0;
  const pSgaTotal   = pPL?.sga?.total     ?? 0;
  const pOtherTotal = pPL?.other?.total   ?? 0;
  const pNetIncome  = pPL?.net_income     ?? 0;

  const pTotalAssets  = pBS?.assets?.total             ?? 0;
  const pCurAssets    = pBS?.assets?.current?.subtotal  ?? 0;
  const pNonCurAssets = pBS?.assets?.noncurrent?.subtotal ?? 0;
  const pTotalLiab    = pBS?.liabilities?.total        ?? 0;
  const pCurLiab      = pBS?.liabilities?.current?.subtotal ?? 0;
  const pNonCurLiab   = pBS?.liabilities?.noncurrent?.subtotal ?? 0;
  const pTotalEquity  = pBS?.equity?.total             ?? 0;

  /* ── Change computations ── */
  const revenueChanges = useMemo(() => computeChanges(pl?.revenue?.items ?? [], pPL?.revenue?.items ?? []), [pl, pPL]);
  const costChanges    = useMemo(() => computeChanges(pl?.sga?.items    ?? [], pPL?.sga?.items    ?? []), [pl, pPL]);
  const assetChanges   = useMemo(() => computeChanges(bs?.assets?.current?.items ?? [], pBS?.assets?.current?.items ?? []), [bs, pBS]);
  const liabChanges    = useMemo(() => computeChanges(bs?.liabilities?.current?.items ?? [], pBS?.liabilities?.current?.items ?? []), [bs, pBS]);

  function topIncreases(arr: ReturnType<typeof computeChanges>) {
    return [...arr].sort((a, b) => b.change - a.change).slice(0, 3).map((i) => ({ name: i.name, change: i.change }));
  }
  function topDecreases(arr: ReturnType<typeof computeChanges>) {
    return [...arr].sort((a, b) => a.change - b.change).slice(0, 3).map((i) => ({ name: i.name, change: i.change }));
  }

  const INC_COLORS = ["#FD5108", "#FE7C39", "#FFAA72"];
  const DEC_COLORS = ["#A1A8B3", "#B5BCC4", "#CBD1D6"];

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes summaryFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sparkDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes sparkFill {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ══ KPI Cards ══ */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "매출액",  value: revenue,    color: "#FD5108", up: true,  href: "/pnl/summary" },
          { label: "영업이익", value: opIncome,   color: "#FE7C39", up: true,  href: "/pnl/summary" },
          { label: "자산",    value: totalAssets, color: "#FFAA72", up: true,  href: "/bs/summary"  },
          { label: "부채",    value: totalLiab,   color: "#A1A8B3", up: false, href: "/bs/summary"  },
        ].map(({ label, value, color, up, href }, i) => (
          <Link key={label} href={href} style={{ textDecoration: "none", animation: `summaryFadeUp 0.45s ease ${i * 70}ms both` }}>
            <div
              className="bg-white rounded-lg border overflow-hidden"
              style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer", transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "rgba(253,81,8,0.25)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-card)"; el.style.transform = "translateY(0)"; el.style.borderColor = "#DFE3E6"; }}
            >
              <div className="px-5 pt-4 pb-1">
                <p className="text-sm font-medium" style={{ color }}>{label}</p>
                <p className="text-3xl font-bold mt-0.5" style={{ color: "#000", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
                  {formatKRW(value)}
                </p>
              </div>
              <Spark color={color} up={up} delay={i * 0.07 + 0.1} />
            </div>
          </Link>
        ))}
      </div>

      {/* ══ Top movers — 증가액 ══ */}
      <div className="grid grid-cols-4 gap-4">
        <MoverCard title="매출액 증가액 상위 3개 거래처" items={topIncreases(revenueChanges)} colors={INC_COLORS} href="/pnl/sales"   positive />
        <MoverCard title="비용 증가액 상위 3개 계정"    items={topIncreases(costChanges)}    colors={INC_COLORS} href="/pnl/account" positive />
        <MoverCard title="자산 증가액 상위 3개 계정"    items={topIncreases(assetChanges)}   colors={INC_COLORS} href="/bs/account"  positive />
        <MoverCard title="부채 증가액 상위 3개 계정"    items={topIncreases(liabChanges)}    colors={INC_COLORS} href="/bs/account"  positive />
      </div>

      {/* ══ Top movers — 감소액 ══ */}
      <div className="grid grid-cols-4 gap-4">
        <MoverCard title="매출액 감소액 상위 3개 거래처" items={topDecreases(revenueChanges)} colors={DEC_COLORS} href="/pnl/sales"   positive={false} />
        <MoverCard title="비용 감소액 상위 3개 계정"    items={topDecreases(costChanges)}    colors={DEC_COLORS} href="/pnl/account" positive={false} />
        <MoverCard title="자산 감소액 상위 3개 계정"    items={topDecreases(assetChanges)}   colors={DEC_COLORS} href="/bs/account"  positive={false} />
        <MoverCard title="부채 감소액 상위 3개 계정"    items={topDecreases(liabChanges)}    colors={DEC_COLORS} href="/bs/account"  positive={false} />
      </div>

      {/* ══ Indicators ══ */}
      <div className="grid grid-cols-2 gap-4">
        {/* 손익지표 */}
        <Link href="/pnl/summary" style={{ textDecoration: "none" }}>
          <div
            className="bg-white rounded-lg border p-5"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer", transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "rgba(253,81,8,0.25)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-card)"; el.style.transform = "translateY(0)"; el.style.borderColor = "#DFE3E6"; }}
          >
            <h4 className="text-base font-semibold mb-4" style={{ color: "#000" }}>
              손익지표 <span className="text-sm font-normal ml-1" style={{ color: "#A1A8B3" }}>→</span>
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "매출총이익률", value: gpMargin, good: gpMargin >= 20 },
                { label: "영업이익률",   value: opMargin, good: opMargin >= 5  },
                { label: "당기순이익률", value: npMargin, good: npMargin >= 5  },
              ].map(({ label, value, good }) => {
                const color = value === 0 ? "#A1A8B3" : good ? "#16C784" : "#FF4747";
                return (
                  <div key={label}>
                    <p className="text-sm mb-1" style={{ color: "#A1A8B3" }}>{label}</p>
                    <p className="text-3xl font-bold" style={{ color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
                      {value.toFixed(1)}%
                    </p>
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#EEEFF1" }}>
                      <div style={{ width: `${Math.min(Math.abs(value), 100)}%`, height: "100%", backgroundColor: color, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Link>

        {/* 유동성지표 */}
        <Link href="/bs/summary" style={{ textDecoration: "none" }}>
          <div
            className="bg-white rounded-lg border p-5"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer", transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "rgba(253,81,8,0.25)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-card)"; el.style.transform = "translateY(0)"; el.style.borderColor = "#DFE3E6"; }}
          >
            <h4 className="text-base font-semibold mb-4" style={{ color: "#000" }}>
              유동성지표 <span className="text-sm font-normal ml-1" style={{ color: "#A1A8B3" }}>→</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {/* 부채비율: 낮을수록 좋음 (100% 미만=초록, 이상=빨강) */}
              {[
                { label: "부채비율", value: debtRatio, good: debtRatio < 100, barMax: 200 },
                { label: "유동비율", value: curRatio,  good: curRatio  > 100, barMax: 800 },
              ].map(({ label, value, good, barMax }) => {
                const color = value === 0 ? "#374151" : good ? "#16C784" : "#FF4747";
                return (
                  <div key={label}>
                    <p className="text-sm mb-1" style={{ color: "#A1A8B3" }}>{label}</p>
                    <p className="text-3xl font-bold" style={{ color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
                      {value.toFixed(1)}%
                    </p>
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#EEEFF1" }}>
                      <div style={{ width: `${Math.min((value / barMax) * 100, 100)}%`, height: "100%", backgroundColor: color, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Link>
      </div>

      {/* ══ Tables ══ */}
      <div className="grid grid-cols-2 gap-4 items-start" style={{ alignItems: "stretch" }}>
        {/* 손익항목 */}
        <Link href="/pnl/account" style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
          <div
            className="bg-white rounded-lg border overflow-hidden flex-1"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer", transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "rgba(253,81,8,0.25)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-card)"; el.style.transform = "translateY(0)"; el.style.borderColor = "#DFE3E6"; }}
          >
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
              <h4 className="text-base font-semibold" style={{ color: "#000" }}>손익항목</h4>
              <span className="text-sm" style={{ color: "#A1A8B3" }}>→ PL 계정분석</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#F5F7F8" }}>
                  <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>공시용계정</th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>당기</th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>전기</th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>증감률</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "매출액",        curr: revenue,     prev: pRevenue,    bold: false },
                  { label: "매출원가",       curr: cogsTotal,   prev: pCogsTotal,  bold: false },
                  { label: "판매비와관리비",  curr: sgaTotal,    prev: pSgaTotal,   bold: false },
                  { label: "기타손익",       curr: otherTotal,  prev: pOtherTotal, bold: false },
                  { label: "당기손익",       curr: netIncome,   prev: pNetIncome,  bold: true  },
                ].map((r, i) => {
                  const deltaColor = !r.prev ? "#A1A8B3" : r.curr >= r.prev ? "#16C784" : "#FF4747";
                  return (
                    <tr key={i} className="border-t" style={{ borderColor: "#EEEFF1", backgroundColor: r.bold ? "#FFF5ED" : undefined }}>
                      <td className="px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, color: r.bold ? "#FD5108" : "#000" }}>{r.label}</td>
                      <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{formatKRW(r.curr)}</td>
                      <td className="text-right px-5 py-2" style={{ fontVariantNumeric: "tabular-nums", color: "#A1A8B3" }}>{formatKRW(r.prev)}</td>
                      <td className="text-right px-5 py-2" style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", color: deltaColor }}>{pct(r.curr, r.prev)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Link>

        {/* 재무항목 */}
        <Link href="/bs/account" style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
          <div
            className="bg-white rounded-lg border overflow-hidden flex-1"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer", transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"; el.style.transform = "translateY(-3px)"; el.style.borderColor = "rgba(253,81,8,0.25)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-card)"; el.style.transform = "translateY(0)"; el.style.borderColor = "#DFE3E6"; }}
          >
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
              <h4 className="text-base font-semibold" style={{ color: "#000" }}>재무항목</h4>
              <span className="text-sm" style={{ color: "#A1A8B3" }}>→ BS 계정분석</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#F5F7F8" }}>
                  <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}></th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>기말</th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>기초</th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>증감률</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "자산",   curr: totalAssets,                                    prev: pTotalAssets,  bold: true,  indent: false },
                  { label: "유동",   curr: curAssets,                                       prev: pCurAssets,    bold: false, indent: true  },
                  { label: "비유동", curr: bs?.assets?.noncurrent?.subtotal       ?? 0,     prev: pNonCurAssets, bold: false, indent: true  },
                  { label: "부채",   curr: totalLiab,                                       prev: pTotalLiab,    bold: true,  indent: false },
                  { label: "유동",   curr: curLiab,                                         prev: pCurLiab,      bold: false, indent: true  },
                  { label: "비유동", curr: bs?.liabilities?.noncurrent?.subtotal  ?? 0,     prev: pNonCurLiab,   bold: false, indent: true  },
                  { label: "자본",   curr: totalEquity,                                     prev: pTotalEquity,  bold: true,  indent: false },
                ].map((r, i) => {
                  const deltaColor = !r.prev ? "#A1A8B3" : r.curr >= r.prev ? "#16C784" : "#FF4747";
                  return (
                    <tr key={i} className="border-t" style={{ borderColor: "#EEEFF1", backgroundColor: r.bold ? "#FFF5ED" : undefined }}>
                      <td className="px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, paddingLeft: r.indent ? 28 : 20, color: r.bold ? "#FD5108" : "#000" }}>{r.label}</td>
                      <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{formatKRW(r.curr)}</td>
                      <td className="text-right px-5 py-2" style={{ fontVariantNumeric: "tabular-nums", color: "#A1A8B3" }}>{formatKRW(r.prev)}</td>
                      <td className="text-right px-5 py-2" style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", color: deltaColor }}>{pct(r.curr, r.prev)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Link>
      </div>

      {/* ══ Scenario 전표 수 ══ */}
      <ScenarioSection dateFrom={globalFrom} dateTo={globalTo} />

    </div>
  );
}
