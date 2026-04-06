"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";
import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";

/* ══════════════════════════════════════════
   Types
══════════════════════════════════════════ */
type AnalysisMode = "전년누적" | "전년동월" | "전월비교";
type BSBase = "연초" | "월초";

/* ══════════════════════════════════════════
   Date range helpers
══════════════════════════════════════════ */
function lastDay(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}
function ym(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
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
   Available months dropdown
══════════════════════════════════════════ */
const MONTHS: string[] = [];
for (let y = 2024; y <= 2026; y++) {
  for (let mo = 1; mo <= 12; mo++) {
    if (y === 2026 && mo > 3) break;
    MONTHS.push(ym(y, mo));
  }
}

/* ══════════════════════════════════════════
   Sparkline
══════════════════════════════════════════ */
function Spark({ color, up }: { color: string; up?: boolean }) {
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
      <path d={pts + " 200,60 0,60Z"} fill={`url(#${id})`} />
      <path d={pts} fill="none" stroke={color} strokeWidth="1.5" />
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
  const accentColor = positive ? "#059669" : "#DC2626";
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        className="bg-white rounded-lg border h-full transition-shadow overflow-hidden"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)")}
      >
        {/* 제목 영역 */}
        <div
          className="px-4 pt-3 pb-2.5"
          style={{ borderBottom: "1px solid #EEEFF1" }}
        >
          <p className="text-xs font-semibold leading-snug" style={{ color: "#000" }}>{title}</p>
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
                    className="text-xs"
                    style={{ color: "#374151", flex: "1 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                    <div style={{ width: barW, height: 5, backgroundColor: colors[i], borderRadius: 3, flexShrink: 0 }} />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: accentColor, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
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
   Custom year-month dropdown
══════════════════════════════════════════ */
function YMDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = (() => {
    const [y, mo] = value.split("-");
    return `${y}년 ${String(Number(mo)).padStart(2, "0")}월`;
  })();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold rounded-md px-3 py-1.5 transition-colors"
        style={{
          border: "1px solid #DFE3E6",
          backgroundColor: open ? "#F5F7F8" : "#fff",
          color: "#000",
          outline: "none",
          whiteSpace: "nowrap",
        }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A1A8B3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
            backgroundColor: "#fff", border: "1px solid #DFE3E6", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)", minWidth: 130,
            maxHeight: 260, overflowY: "auto",
          }}
        >
          {MONTHS.map((m) => {
            const [y, mo] = m.split("-");
            const lbl = `${y}년 ${String(Number(mo)).padStart(2, "0")}월`;
            const active = m === value;
            return (
              <button
                key={m}
                onClick={() => { onChange(m); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-xs transition-colors"
                style={{
                  backgroundColor: active ? "#FFF5ED" : "transparent",
                  color: active ? "#FD5108" : "#374151",
                  fontWeight: active ? 600 : 400,
                  outline: "none",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? "#FFF5ED" : "transparent"; }}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Toggle button group
══════════════════════════════════════════ */
function ToggleGroup<T extends string>({
  options, value, onChange,
}: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex" style={{ border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden" }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: active ? "#000" : "#fff",
              color: active ? "#fff" : "#A1A8B3",
              borderRight: "1px solid #DFE3E6",
              outline: "none",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   Compute per-item changes
══════════════════════════════════════════ */
type PLData = { revenue?: { items: any[] }; sga?: { items: any[] }; cogs?: { total: number }; gross_profit?: number; operating_income?: number; operating_margin_pct?: number; net_income?: number; net_margin_pct?: number; gross_margin_pct?: number };
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
  const { dateTo } = useFilterStore();
  const defaultYM = dateTo.slice(0, 7) || "2026-03";

  const [baseYM, setBaseYM]       = useState<string>(defaultYM);
  const [mode,    setMode]         = useState<AnalysisMode>("전월비교");
  const [bsBase,  setBsBase]       = useState<BSBase>("연초");

  const plRanges = useMemo(() => deriveDateRanges(baseYM, mode),   [baseYM, mode]);
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

  /* ── KPI values ── */
  const revenue    = pl?.revenue?.items?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0;
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

      {/* ══ Filter bar ══ */}
      <div
        className="bg-white rounded-lg border flex items-center gap-6 px-5 py-3"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}
      >
        {/* 기준연월 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium" style={{ color: "#A1A8B3", whiteSpace: "nowrap" }}>기준 연월</span>
          <YMDropdown value={baseYM} onChange={setBaseYM} />
        </div>

        <div className="w-px self-stretch" style={{ backgroundColor: "#EEEFF1" }} />

        {/* 분석대상 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium" style={{ color: "#A1A8B3", whiteSpace: "nowrap" }}>분석대상</span>
          <ToggleGroup<AnalysisMode> options={["전년누적", "전년동월", "전월비교"]} value={mode} onChange={setMode} />
        </div>

        <div className="flex-1" />

        {/* 비교대상 (재무상태) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium" style={{ color: "#A1A8B3", whiteSpace: "nowrap" }}>비교대상 (재무상태)</span>
          <ToggleGroup<BSBase> options={["연초", "월초"]} value={bsBase} onChange={setBsBase} />
        </div>
      </div>

      {/* ══ KPI Cards ══ */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "매출액",  value: revenue,    color: "#FD5108", up: true,  href: "/pnl/summary" },
          { label: "영업이익", value: opIncome,   color: "#FE7C39", up: true,  href: "/pnl/summary" },
          { label: "자산",    value: totalAssets, color: "#FFAA72", up: true,  href: "/bs/summary"  },
          { label: "부채",    value: totalLiab,   color: "#A1A8B3", up: false, href: "/bs/summary"  },
        ].map(({ label, value, color, up, href }) => (
          <Link key={label} href={href} style={{ textDecoration: "none" }}>
            <div
              className="bg-white rounded-lg border overflow-hidden transition-shadow"
              style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)")}
            >
              <div className="px-5 pt-4 pb-1">
                <p className="text-xs font-medium" style={{ color }}>{label}</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: "#000", fontVariantNumeric: "tabular-nums" }}>
                  {formatKRW(value)}
                </p>
              </div>
              <Spark color={color} up={up} />
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
            className="bg-white rounded-lg border p-5 transition-shadow"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)")}
          >
            <h4 className="text-sm font-semibold mb-4" style={{ color: "#000" }}>
              손익지표 <span className="text-xs font-normal ml-1" style={{ color: "#A1A8B3" }}>→</span>
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "매출총이익률", value: gpMargin, good: gpMargin >= 20 },
                { label: "영업이익률",   value: opMargin, good: opMargin >= 5  },
                { label: "당기순이익률", value: npMargin, good: npMargin >= 5  },
              ].map(({ label, value, good }) => {
                const color = value === 0 ? "#A1A8B3" : good ? "#059669" : "#DC2626";
                return (
                  <div key={label}>
                    <p className="text-xs mb-1" style={{ color: "#A1A8B3" }}>{label}</p>
                    <p className="text-2xl font-bold" style={{ color, fontVariantNumeric: "tabular-nums" }}>
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
            className="bg-white rounded-lg border p-5 transition-shadow"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)")}
          >
            <h4 className="text-sm font-semibold mb-4" style={{ color: "#000" }}>
              유동성지표 <span className="text-xs font-normal ml-1" style={{ color: "#A1A8B3" }}>→</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {/* 부채비율: 낮을수록 좋음 (100% 미만=초록, 이상=빨강) */}
              {[
                { label: "부채비율", value: debtRatio, good: debtRatio < 100, barMax: 200 },
                { label: "유동비율", value: curRatio,  good: curRatio  > 100, barMax: 800 },
              ].map(({ label, value, good, barMax }) => {
                const color = value === 0 ? "#374151" : good ? "#059669" : "#DC2626";
                return (
                  <div key={label}>
                    <p className="text-xs mb-1" style={{ color: "#A1A8B3" }}>{label}</p>
                    <p className="text-2xl font-bold" style={{ color, fontVariantNumeric: "tabular-nums" }}>
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
            className="bg-white rounded-lg border overflow-hidden transition-shadow flex-1"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)")}
          >
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
              <h4 className="text-sm font-semibold" style={{ color: "#000" }}>손익항목</h4>
              <span className="text-xs" style={{ color: "#A1A8B3" }}>→ PL 계정분석</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "#F5F7F8" }}>
                  <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>공시용계정</th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>당기</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "매출액",        val: revenue,                          bold: true  },
                  { label: "매출원가",       val: pl?.cogs?.total                ?? 0, bold: false },
                  { label: "판매비와관리비",  val: pl?.sga?.items?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0, bold: false },
                  { label: "기타손익",       val: 0,                                bold: false },
                  { label: "당기순이익",     val: netIncome,                        bold: true  },
                ].map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "#EEEFF1", backgroundColor: r.bold ? "#FFF5ED" : undefined }}>
                    <td className="px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, color: r.bold ? "#FD5108" : "#000" }}>{r.label}</td>
                    <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{formatKRW(r.val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Link>

        {/* 재무항목 */}
        <Link href="/bs/account" style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
          <div
            className="bg-white rounded-lg border overflow-hidden transition-shadow flex-1"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", cursor: "pointer" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)")}
          >
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
              <h4 className="text-sm font-semibold" style={{ color: "#000" }}>재무항목</h4>
              <span className="text-xs" style={{ color: "#A1A8B3" }}>→ BS 계정분석</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "#F5F7F8" }}>
                  <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>재무항목</th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>기말</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "자산",   val: totalAssets,                              bold: true,  indent: false },
                  { label: "유동",   val: curAssets,                                bold: false, indent: true  },
                  { label: "비유동", val: bs?.assets?.noncurrent?.subtotal       ?? 0, bold: false, indent: true  },
                  { label: "부채",   val: totalLiab,                                bold: true,  indent: false },
                  { label: "유동",   val: curLiab,                                  bold: false, indent: true  },
                  { label: "비유동", val: bs?.liabilities?.noncurrent?.subtotal  ?? 0, bold: false, indent: true  },
                  { label: "자본",   val: totalEquity,                              bold: true,  indent: false },
                ].map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "#EEEFF1", backgroundColor: r.bold ? "#FFF5ED" : undefined }}>
                    <td className="px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, paddingLeft: r.indent ? 28 : 20, color: r.bold ? "#FD5108" : "#000" }}>{r.label}</td>
                    <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{formatKRW(r.val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Link>
      </div>

      {/* ══ Scenario 전표 수 ══ */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
          <h4 className="text-sm font-semibold" style={{ color: "#000" }}>시나리오 전표 수</h4>
          <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>클릭하면 해당 시나리오 분석 페이지로 이동합니다</p>
        </div>
        <div className="grid grid-cols-4 gap-px" style={{ backgroundColor: "#EEEFF1" }}>
          {[
            { label: "동일금액 중복",       href: "/scenario/1", color: "#FD5108" },
            { label: "현금지급 後 부채인식", href: "/scenario/3", color: "#FE7C39" },
            { label: "주말현금지급",         href: "/scenario/2", color: "#FFAA72" },
            { label: "현금지급 및 비용인식", href: "/scenario/4", color: "#A1A8B3" },
          ].map(({ label, href, color }) => (
            <Link key={label} href={href} style={{ textDecoration: "none" }}>
              <div
                className="bg-white p-5 text-center transition-colors"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#FFF5ED")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#fff")}
              >
                <p className="text-xs font-medium mb-3" style={{ color: "#A1A8B3" }}>{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>—</p>
                <p className="text-xs mt-1" style={{ color: "#A1A8B3" }}>건</p>
                <p className="text-xs mt-2 px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: "#EEEFF1", color: "#A1A8B3" }}>API 연동 예정</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
