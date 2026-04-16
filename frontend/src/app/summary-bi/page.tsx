"use client";
import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, PlProfitabilityMonthly, CccMonthly, BsSnapshot } from "@/lib/api/client";
import { formatKRW, formatPct } from "@/lib/utils/formatters";
import {
  ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, ReferenceLine, PieChart, Pie,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

/*
  Summary BI — executive_summary.html 완전 재현 (Recharts)
  기존 Summary 필터 시스템 연동, 예산 설정 + 전기/예산 토글 포함
*/

// ─── 공통 스타일 ──────────────────────────────────────────────
const PANEL = "bg-white rounded-lg border overflow-hidden";
const PANEL_S: React.CSSProperties = { borderColor: "#DFE3E6", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const POS = "#16C784";
const NEG = "#FF4747";
const fmtM = (v: string) => parseInt(v.split("-")[1]) + "월";
const fmtAx = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(1) + "조";
  if (abs >= 1e8) return (v / 1e8).toFixed(0) + "억";
  if (abs >= 1e4) return (v / 1e4).toFixed(0) + "만";
  return v.toLocaleString();
};

function BiTag() {
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "#fff",
      backgroundColor: "#FD5108", borderRadius: 4, padding: "2px 6px", marginLeft: 8 }}>BI</span>
  );
}

function SectionTag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.5,
      padding: "2px 6px", borderRadius: 3, backgroundColor: color + "18", color }}>{label}</span>
  );
}

function ChartCard({ title, tag, subtitle, children, onClick, style: extraStyle }: {
  title: string; tag?: "PL" | "BS"; subtitle?: string; children: React.ReactNode;
  onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <div className={PANEL} style={{ ...PANEL_S, cursor: onClick ? "pointer" : undefined, ...extraStyle }}
      onClick={onClick}>
      <div style={{ padding: "14px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#1A1D23" }}>
          {tag && <SectionTag label={tag} color={tag === "PL" ? "#FD5108" : "#1D6BB5"} />}
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 10, color: "#7A8290", marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "4px 16px 16px" }}>{children}</div>
    </div>
  );
}

// ─── KPI 카드 ──────────────────────────────────────────────────
function KpiCard({ label, value, changeText, changeCls, pyVal, compareLabel, borderColor, onClick }: {
  label: string; value: string; changeText: string; changeCls: string;
  pyVal: string; compareLabel: string; borderColor: string; onClick?: () => void;
}) {
  const changeColor = changeCls === "positive" ? "#C1292E" : changeCls === "negative" ? "#1D6BB5" : "#7A8290";
  return (
    <div className={PANEL} onClick={onClick}
      style={{ ...PANEL_S, padding: "14px 16px 12px", borderLeft: `4px solid ${borderColor}`,
        cursor: onClick ? "pointer" : undefined, transition: "0.2s ease" }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}>
      <div style={{ fontSize: 11, color: "#4A5056", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 6,
        fontFeatureSettings: "'tnum'" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: changeColor, display: "flex", alignItems: "center", gap: 4 }}>
        {changeText}
        <span style={{ fontSize: 10, color: "#7A8290", fontWeight: 400, marginLeft: 4 }}>{compareLabel}</span>
        <span style={{ fontSize: 10, color: "#7A8290", fontWeight: 400 }}>({pyVal})</span>
      </div>
    </div>
  );
}

// ─── 보조 KPI 스트립 ──────────────────────────────────────────
function AuxItem({ label, value, up }: { label: string; value: string; up?: boolean | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 8px" }}>
      <span style={{ fontSize: 11, color: "#4A5056", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#6D3AB5", fontFeatureSettings: "'tnum'" }}>{value}</span>
      {up !== null && up !== undefined && (
        <span style={{ fontSize: 10, fontWeight: 700, color: up ? "#1E7E4A" : "#B91C1C" }}>{up ? "▲" : "▼"}</span>
      )}
    </div>
  );
}

function AuxDivider() {
  return <div style={{ width: 1, height: 20, background: "#DFE3E6", alignSelf: "center" }} />;
}

// ─── 예산 (localStorage) ──────────────────────────────────────
function loadBudget(): Record<string, Record<string, number>> | null {
  try {
    const raw = localStorage.getItem("abc_budget");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveBudget(data: Record<string, Record<string, number>>) {
  localStorage.setItem("abc_budget", JSON.stringify(data));
}

// ─── 예산 모달 ────────────────────────────────────────────────
function BudgetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const months: string[] = [];
  for (let y = 2024; y <= 2025; y++)
    for (let m = 1; m <= 12; m++) {
      if (y === 2025 && m > 9) break;
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }

  const [budget, setBudget] = useState<Record<string, Record<string, number>>>(() => loadBudget() || {});
  const fields = [
    { key: "revenue", label: "매출액" },
    { key: "op", label: "영업이익" },
    { key: "ni", label: "당기순이익" },
  ];

  const handleSave = () => { saveBudget(budget); onClose(); window.location.reload(); };
  const handleClear = () => { localStorage.removeItem("abc_budget"); setBudget({}); onClose(); window.location.reload(); };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", width: "90%", maxWidth: 800, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #DFE3E6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>예산 설정 (Budget)</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#4A5056" }}>&times;</button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: 8, background: "#F5F7F8", border: "1px solid #DFE3E6", fontSize: 11 }}>월</th>
                {fields.map(f => <th key={f.key} style={{ padding: 8, background: "#F5F7F8", border: "1px solid #DFE3E6", fontSize: 11 }}>{f.label} (억)</th>)}
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m}>
                  <td style={{ padding: 4, border: "1px solid #DFE3E6", fontWeight: 500, textAlign: "center" }}>{m}</td>
                  {fields.map(f => (
                    <td key={f.key} style={{ padding: 0, border: "1px solid #DFE3E6" }}>
                      <input type="number" style={{ width: "100%", border: "none", textAlign: "right", padding: "4px 6px", fontSize: 12, background: "transparent" }}
                        value={budget[m]?.[f.key] ?? ""}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setBudget(prev => ({
                            ...prev,
                            [m]: { ...(prev[m] || {}), [f.key]: isNaN(v) ? 0 : v },
                          }));
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #DFE3E6", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={handleClear} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #B91C1C", background: "#B91C1C", color: "#fff" }}>예산 삭제</button>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #DFE3E6", background: "#fff" }}>취소</button>
          <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #FD5108", background: "#FD5108", color: "#fff" }}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ─── Waterfall 헬퍼 ──────────────────────────────────────────
function buildWaterfallData(pl: { revenue: number; cogs: number; sga: number; grossProfit: number; operatingIncome: number; netIncome: number; financialNet?: number; other?: number; tax?: number }) {
  const rev = pl.revenue;
  const cogs = pl.cogs;
  const sga = pl.sga;
  const op = pl.operatingIncome;
  const nonOp = (pl.financialNet ?? 0) + (pl.other ?? 0);
  const tax = pl.tax ?? 0;
  const ni = pl.netIncome;

  return [
    { name: "매출액", value: rev, fill: "rgba(59,130,246,0.85)" },
    { name: "매출원가", value: -cogs, fill: "rgba(239,68,68,0.7)" },
    { name: "판관비", value: -sga, fill: "rgba(239,68,68,0.7)" },
    { name: "영업외순", value: nonOp, fill: nonOp >= 0 ? "rgba(5,150,105,0.7)" : "rgba(239,68,68,0.7)" },
    { name: "법인세", value: -Math.abs(tax), fill: "rgba(239,68,68,0.7)" },
    { name: "순이익", value: ni, fill: ni >= 0 ? "rgba(5,150,105,0.85)" : "rgba(239,68,68,0.85)" },
  ].map((item, i, arr) => {
    if (i === 0) return { ...item, base: 0, top: rev };
    if (i === arr.length - 1) return { ...item, base: 0, top: ni };
    const prevTop = i === 0 ? 0 : arr.slice(0, i).reduce((s, it) => s + (it.name === "매출액" ? it.value : it.value), 0);
    return { ...item, base: prevTop + item.value, top: prevTop };
  });
}

// ═════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════

export default function SummaryBiPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const params = { date_from: dateFrom, date_to: dateTo };

  const [compareMode, setCompareMode] = useState<"py" | "budget">("py");
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const budget = useMemo(() => loadBudget(), [budgetModalOpen]);
  const hasBudget = !!budget && Object.keys(budget).length > 0;

  // ─── Data Queries ───
  const { data: plMonthly = [] } = useQuery({
    queryKey: ["summary-bi-pl-profitability", dateFrom, dateTo],
    queryFn: () => api.summaryBi.plProfitability(params),
  });
  const { data: plKpi } = useQuery({
    queryKey: ["summary-bi-pl-kpi", dateFrom, dateTo],
    queryFn: () => api.financialStatements.plKpiMonthly(params),
  });
  const { data: bsSnapshot } = useQuery({
    queryKey: ["summary-bi-bs-snapshot", dateFrom, dateTo],
    queryFn: () => api.summaryBi.bsSnapshot(params),
  });
  const { data: bsKpi } = useQuery({
    queryKey: ["summary-bi-bs-kpi", dateTo],
    queryFn: () => api.bsSummary.kpi({ date_to: dateTo }),
  });
  const { data: cccMonthly = [] } = useQuery({
    queryKey: ["summary-bi-ccc", dateFrom, dateTo],
    queryFn: () => api.summaryBi.cccMonthly(params),
  });
  const { data: bsDelta = [] } = useQuery({
    queryKey: ["summary-bi-bs-delta", dateFrom, dateTo],
    queryFn: () => api.bsTrend.accountDelta(params),
  });
  const { data: plWaterfall = [] } = useQuery({
    queryKey: ["summary-bi-waterfall", dateFrom, dateTo],
    queryFn: () => api.financialStatements.plWaterfallMonthly(params),
  });

  const pl = plMonthly as PlProfitabilityMonthly[];
  const ccc = cccMonthly as CccMonthly[];
  const bs = bsSnapshot as BsSnapshot | undefined;

  // ─── Aggregated PL ───
  const plAgg = useMemo(() => {
    const a = { revenue: 0, cogs: 0, sga: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0 };
    pl.forEach(m => {
      a.revenue += m.revenue; a.cogs += m.cogs; a.sga += m.sga;
      a.grossProfit += m.grossProfit; a.operatingIncome += m.operatingIncome; a.netIncome += m.netIncome;
    });
    return a;
  }, [pl]);

  // ─── Prior year aggregated PL (shift -1 year) ───
  const priorYear = useMemo(() => parseInt(dateTo.slice(0, 4)) - 1, [dateTo]);

  const { data: plPriorRaw = [] } = useQuery({
    queryKey: ["summary-bi-pl-prior", priorYear],
    queryFn: () => api.summaryBi.plProfitability({
      date_from: `${priorYear}-01-01`,
      date_to: `${priorYear}-12-31`,
    }),
  });
  const plPrior = plPriorRaw as PlProfitabilityMonthly[];
  const plPriorAgg = useMemo(() => {
    const a = { revenue: 0, cogs: 0, sga: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0 };
    plPrior.forEach(m => {
      a.revenue += m.revenue; a.cogs += m.cogs; a.sga += m.sga;
      a.grossProfit += m.grossProfit; a.operatingIncome += m.operatingIncome; a.netIncome += m.netIncome;
    });
    return a;
  }, [plPrior]);

  // ─── Change computation ───
  function fmtChange(cur: number, prev: number | null, isPercent = false) {
    if (!prev || prev === 0) return { text: "N/A", cls: "neutral", pyVal: "-" };
    if (isPercent) {
      const diff = cur - prev;
      return { text: `${diff >= 0 ? "▲ +" : "▼ "}${Math.abs(diff).toFixed(1)}pp`, cls: diff > 0 ? "positive" : "negative", pyVal: prev.toFixed(1) + "%" };
    }
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    return { text: `${pct >= 0 ? "▲ +" : "▼ "}${Math.abs(pct).toFixed(1)}%`, cls: pct > 0 ? "positive" : "negative", pyVal: formatKRW(prev) };
  }

  function getRag(cur: number, prev: number) {
    if (!prev) return "#1E7E4A";
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    return pct > 5 ? "#1E7E4A" : pct > 0 ? "#B45309" : "#B91C1C";
  }

  const opm = plAgg.revenue ? (plAgg.operatingIncome / plAgg.revenue) * 100 : 0;
  const opmPrior = plPriorAgg.revenue ? (plPriorAgg.operatingIncome / plPriorAgg.revenue) * 100 : 0;
  const compareLabel = compareMode === "budget" && hasBudget ? "vs 예산" : "vs PY";

  // ─── BS derived values ───
  const bsCur = bs?.current ?? {};
  const bsOpen = bs?.opening ?? {};
  const curRatio = (bsCur.currentAssets && bsCur.currentLiabilities) ? bsCur.currentAssets / bsCur.currentLiabilities : 0;
  const deRatio = (bsCur.totalLiabilities && bsCur.totalEquity) ? (bsCur.totalLiabilities / bsCur.totalEquity) * 100 : 0;

  // ─── BS Variance TOP 7 (자본 제외) ───
  const bsVarianceData = useMemo(() => {
    const delta = bsDelta as any[];
    return delta
      .filter(d => d.branch !== "자본" && d.branch !== "손익대체")
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 7)
      .map(d => ({
        account: d.account.length > 12 ? d.account.slice(0, 12) + "…" : d.account,
        delta: d.delta,
      }));
  }, [bsDelta]);

  // ─── Revenue chart data ───
  const revenueChartData = useMemo(() => {
    return pl.map(m => {
      const priorM = plPrior.find(p => p.month.slice(5) === m.month.slice(5));
      return {
        month: fmtM(m.month),
        매출액: m.revenue,
        전기: priorM?.revenue ?? 0,
        "OPM%": m.opm,
      };
    });
  }, [pl, plPrior]);

  // ─── CCC chart data ───
  const cccChartData = useMemo(() =>
    ccc.map(c => ({
      month: fmtM(c.month),
      DSO: c.dso,
      DIO: c.dio,
      DPO: -c.dpo,
      CCC: c.ccc,
    }))
  , [ccc]);

  // ─── Profitability chart data ───
  const profitChartData = useMemo(() => {
    return pl.map(m => {
      const priorM = plPrior.find(p => p.month.slice(5) === m.month.slice(5));
      return {
        month: fmtM(m.month),
        매출총이익률: m.gpm,
        영업이익률: m.opm,
        순이익률: m.npm,
        "매출총이익률(전기)": priorM?.gpm ?? null,
        "영업이익률(전기)": priorM?.opm ?? null,
        "순이익률(전기)": priorM?.npm ?? null,
      };
    });
  }, [pl, plPrior]);

  // ─── BS Table rows ───
  const bsTableRows = useMemo(() => {
    if (!bs) return [];
    const c = bs.current, o = bs.opening;
    function pct(cur: number, prev: number) {
      if (!prev) return null;
      return ((cur - prev) / Math.abs(prev)) * 100;
    }
    return [
      { label: "자산", cur: c.totalAssets, prev: o.totalAssets, pct: pct(c.totalAssets, o.totalAssets), major: true },
      { label: "유동", cur: c.currentAssets, prev: o.currentAssets, pct: pct(c.currentAssets, o.currentAssets), sub: true },
      { label: "비유동", cur: c.nonCurrentAssets, prev: o.nonCurrentAssets, pct: pct(c.nonCurrentAssets, o.nonCurrentAssets), sub: true },
      { label: "부채", cur: c.totalLiabilities, prev: o.totalLiabilities, pct: pct(c.totalLiabilities, o.totalLiabilities), major: true },
      { label: "유동", cur: c.currentLiabilities, prev: o.currentLiabilities, pct: pct(c.currentLiabilities, o.currentLiabilities), sub: true },
      { label: "비유동", cur: c.nonCurrentLiabilities, prev: o.nonCurrentLiabilities, pct: pct(c.nonCurrentLiabilities, o.nonCurrentLiabilities), sub: true },
      { label: "자본", cur: c.totalEquity, prev: o.totalEquity, pct: pct(c.totalEquity, o.totalEquity), major: true },
    ];
  }, [bs]);

  // ─── Waterfall data ───
  const waterfallData = useMemo(() => {
    const wf = plWaterfall as any;
    if (!wf || !Array.isArray(wf) || wf.length === 0) {
      // fallback from aggregated PL
      return buildWaterfallData({ ...plAgg, financialNet: 0, other: 0, tax: 0 });
    }
    // aggregate all months
    const totals = { revenue: 0, cogs: 0, sga: 0, other: 0, net_income: 0 };
    wf.forEach((m: any) => {
      totals.revenue += m.revenue ?? 0;
      totals.cogs += m.cogs ?? 0;
      totals.sga += m.sga ?? 0;
      totals.other += m.other ?? 0;
      totals.net_income += m.net_income ?? 0;
    });
    const gp = totals.revenue - totals.cogs;
    const op = gp - totals.sga;
    return buildWaterfallData({
      revenue: totals.revenue, cogs: totals.cogs, sga: totals.sga,
      grossProfit: gp, operatingIncome: op, netIncome: totals.net_income,
      financialNet: 0, other: totals.other, tax: 0,
    });
  }, [plWaterfall, plAgg]);

  // ─── Aux KPI ───
  const roa = bsCur.totalAssets ? (plAgg.netIncome / bsCur.totalAssets) * 100 : 0;
  const roe = bsCur.totalEquity ? (plAgg.netIncome / bsCur.totalEquity) * 100 : 0;
  const turnover = bsCur.totalAssets ? plAgg.revenue / bsCur.totalAssets : 0;
  const nwc = (bsCur.currentAssets ?? 0) - (bsCur.currentLiabilities ?? 0);

  const roaPrior = bsOpen.totalAssets ? (plPriorAgg.netIncome / bsOpen.totalAssets) * 100 : null;
  const roePrior = bsOpen.totalEquity ? (plPriorAgg.netIncome / bsOpen.totalEquity) * 100 : null;

  return (
    <div className="space-y-4">
      <BudgetModal open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} />

      {/* ─── 타이틀 + 예산/비교 토글 ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1D23" }}>Executive Summary</span>
          <BiTag />
        </div>
        <div className="flex items-center gap-3">
          {hasBudget && (
            <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: 2, gap: 2 }}>
              {(["py", "budget"] as const).map(mode => (
                <button key={mode} onClick={() => setCompareMode(mode)}
                  style={{
                    padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
                    background: compareMode === mode ? "#FD5108" : "transparent",
                    color: compareMode === mode ? "#fff" : "#6B7280",
                  }}>{mode === "py" ? "전기" : "예산"}</button>
              ))}
            </div>
          )}
          <button onClick={() => setBudgetModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6,
              fontSize: 12, fontWeight: 500, border: "1px solid #DFE3E6", cursor: "pointer",
              background: hasBudget ? "#FD5108" : "#fff",
              color: hasBudget ? "#fff" : "#6B7280",
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
            예산 설정
          </button>
        </div>
      </div>

      {/* ═══ HERO KPI (PL 4 + BS 4) ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1.5, color: "#FD5108", marginBottom: 6, paddingLeft: 4 }}>P&L Performance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiCard label="매출액" value={formatKRW(plAgg.revenue)} {...fmtChange(plAgg.revenue, plPriorAgg.revenue)} compareLabel={compareLabel} borderColor={getRag(plAgg.revenue, plPriorAgg.revenue)} />
            <KpiCard label="영업이익" value={formatKRW(plAgg.operatingIncome)} {...fmtChange(plAgg.operatingIncome, plPriorAgg.operatingIncome)} compareLabel={compareLabel} borderColor={getRag(plAgg.operatingIncome, plPriorAgg.operatingIncome)} />
            <KpiCard label="영업이익률" value={opm.toFixed(1) + "%"} {...fmtChange(opm, opmPrior, true)} compareLabel={compareLabel} borderColor={opm > 12 ? "#1E7E4A" : opm > 8 ? "#B45309" : "#B91C1C"} />
            <KpiCard label="당기순이익" value={formatKRW(plAgg.netIncome)} {...fmtChange(plAgg.netIncome, plPriorAgg.netIncome)} compareLabel={compareLabel} borderColor={getRag(plAgg.netIncome, plPriorAgg.netIncome)} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1.5, color: "#1D6BB5", marginBottom: 6, paddingLeft: 4 }}>Balance Sheet Health</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiCard label="총자산" value={formatKRW(bsCur.totalAssets ?? 0)} {...fmtChange(bsCur.totalAssets ?? 0, bsOpen.totalAssets)} compareLabel="vs PY" borderColor={getRag(bsCur.totalAssets ?? 0, bsOpen.totalAssets ?? 0)} />
            <KpiCard label="현금 포지션" value={formatKRW((bsCur["현금및현금성자산"] ?? 0) + (bsCur["단기금융상품"] ?? 0))} {...fmtChange((bsCur["현금및현금성자산"] ?? 0) + (bsCur["단기금융상품"] ?? 0), (bsOpen["현금및현금성자산"] ?? 0) + (bsOpen["단기금융상품"] ?? 0))} compareLabel="vs PY" borderColor="#1E7E4A" />
            <KpiCard label="유동비율" value={curRatio.toFixed(2) + "x"} {...fmtChange(curRatio, bsOpen.currentAssets && bsOpen.currentLiabilities ? bsOpen.currentAssets / bsOpen.currentLiabilities : null)} compareLabel="vs PY" borderColor={curRatio >= 2 ? "#1E7E4A" : curRatio >= 1.5 ? "#B45309" : "#B91C1C"} />
            <KpiCard label="부채비율" value={deRatio.toFixed(1) + "%"} {...fmtChange(deRatio, bsOpen.totalLiabilities && bsOpen.totalEquity ? (bsOpen.totalLiabilities / bsOpen.totalEquity) * 100 : null, true)} compareLabel="vs PY" borderColor={deRatio < 50 ? "#1E7E4A" : deRatio < 100 ? "#B45309" : "#B91C1C"} />
          </div>
        </div>
      </div>

      {/* ═══ AUX STRIP ═══ */}
      <div className={PANEL} style={{ ...PANEL_S, display: "flex", gap: 16, padding: "8px 16px", flexWrap: "wrap" }}>
        <AuxItem label="ROA" value={roa.toFixed(1) + "%"} up={roaPrior !== null ? roa >= roaPrior : null} />
        <AuxDivider />
        <AuxItem label="ROE" value={roe.toFixed(1) + "%"} up={roePrior !== null ? roe >= roePrior : null} />
        <AuxDivider />
        <AuxItem label="자산회전율" value={turnover.toFixed(2) + "x"} up={null} />
        <AuxDivider />
        <AuxItem label="NWC" value={formatKRW(nwc)} up={null} />
      </div>

      {/* ═══ CHART ROW 1: 매출추이 | BS 재무상태표 ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="매출 및 영업이익 추이" tag="PL" subtitle="월별 매출(Bar) + 전기(반투명) + 영업이익률(Line)">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={revenueChartData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={64} tickFormatter={fmtAx} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={40} tickFormatter={v => v + "%"} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="매출액" fill="rgba(59,130,246,0.8)" radius={[3, 3, 0, 0]} barSize={16} />
              <Bar yAxisId="left" dataKey="전기" fill="rgba(156,163,175,0.3)" radius={[3, 3, 0, 0]} barSize={16} />
              <Line yAxisId="right" type="monotone" dataKey="OPM%" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="재무상태표" tag="BS" subtitle="기말 vs 기초 잔액 비교 — 증감률 표시">
          <div style={{ overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #DFE3E6" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#4A5056", background: "#F5F7F8" }}></th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#4A5056", background: "#F5F7F8" }}>기말</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#4A5056", background: "#F5F7F8" }}>기초</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#4A5056", background: "#F5F7F8" }}>증감률</th>
                </tr>
              </thead>
              <tbody>
                {bsTableRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${r.major ? "#DFE3E6" : "#EEEFF1"}` }}>
                    <td style={{ padding: "7px 12px", fontWeight: r.major ? 700 : 400, paddingLeft: r.sub ? 24 : 12, color: r.sub ? "#4A5056" : "#1A1D23" }}>{r.label}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: r.major ? 700 : 400, fontFeatureSettings: "'tnum'" }}>{(r.cur ?? 0).toLocaleString("ko-KR")}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontFeatureSettings: "'tnum'" }}>{(r.prev ?? 0).toLocaleString("ko-KR")}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600,
                      color: r.pct !== null ? (r.pct >= 0 ? "#1E7E4A" : "#B91C1C") : "#7A8290" }}>
                      {r.pct !== null ? `${r.pct >= 0 ? "▲" : "▼"}${Math.abs(r.pct).toFixed(1)}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* ═══ CHART ROW 2: Waterfall | BS 주요 증감 ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="손익 구조 Waterfall" tag="PL" subtitle="매출 → 원가 → 판관비 → 영업외 → 법인세 → 순이익">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterfallData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={64} tickFormatter={fmtAx} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatKRW(Number(v))} />
              <Bar dataKey="top" stackId="a" fill="transparent" />
              <Bar dataKey="base" stackId="a" fill="transparent" />
              {waterfallData.map((d, i) => (
                <Bar key={i} dataKey="value" fill={d.fill} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="주요 증감 항목" tag="BS" subtitle="기초 대비 기말 — 가장 크게 변동한 계정 TOP 7 (자본 제외)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bsVarianceData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtAx} />
              <YAxis type="category" dataKey="account" tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatKRW(Number(v))} />
              <Bar dataKey="delta" radius={[0, 4, 4, 0]} barSize={14}>
                {bsVarianceData.map((d, i) => (
                  <Cell key={i} fill={d.delta >= 0 ? "rgba(5,150,105,0.8)" : "rgba(239,68,68,0.8)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ CHART ROW 3: 수익성 | CCC ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="수익성 비율 추이" tag="PL" subtitle="매출총이익률 / 영업이익률 / 순이익률 — 점선은 전기">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={profitChartData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={40} tickFormatter={v => v + "%"} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => (v !== null ? Number(v).toFixed(1) + "%" : "-")} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="매출총이익률" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="영업이익률" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="순이익률" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="매출총이익률(전기)" stroke="rgba(59,130,246,0.35)" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="영업이익률(전기)" stroke="rgba(5,150,105,0.35)" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="순이익률(전기)" stroke="rgba(245,158,11,0.35)" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="운전자본 효율 (CCC)" tag="BS" subtitle="DSO(매출채권) + DIO(재고) - DPO(매입채무) = CCC(일) — 낮을수록 효율적">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={cccChartData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={40} tickFormatter={v => Math.round(v) + "일"} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => Math.abs(Number(v)).toFixed(0) + "일"} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.25)" />
              <Bar dataKey="DSO" stackId="s" fill="rgba(13,148,136,0.75)" name="DSO (매출채권)" />
              <Bar dataKey="DIO" stackId="s" fill="rgba(245,158,11,0.7)" name="DIO (재고)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="DPO" stackId="s" fill="rgba(239,68,68,0.5)" name="DPO (매입채무)" radius={[0, 0, 3, 3]} />
              <Line type="monotone" dataKey="CCC" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} name="CCC" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
