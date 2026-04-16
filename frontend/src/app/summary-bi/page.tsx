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
  Summary BI — Executive Dashboard
  필터 시스템 연동, 예산 설정 + 전기/예산 토글
*/

// ─── Design Tokens ──────────────────────────────────────────
const COLOR = {
  increase: "#C1292E",
  decrease: "#1D6BB5",
  neutral: "#7A8290",
  textPrimary: "#1A1D23",
  textSecondary: "#4A5056",
  textTertiary: "#7A8290",
  surfacePage: "#F5F7F8",
  border: "#DFE3E6",
  borderLight: "#EEEFF1",
  chart1: "#E04A00",
  chart2: "#1D6BB5",
  chart3: "#1A7A56",
  chart4: "#6D3AB5",
  uiOrange: "#FD5108",
  greyMedium: "#B5BCC4",
} as const;

const SHADOW_SM = "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
const SHADOW_MD = "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)";
const SHADOW_LG = "0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)";

const TNUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1, 'zero' 1",
};

const fmtM = (v: string) => parseInt(v.split("-")[1]) + "월";
const fmtAx = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(1) + "조";
  if (abs >= 1e8) return (v / 1e8).toFixed(0) + "억";
  if (abs >= 1e4) return (v / 1e4).toFixed(0) + "만";
  return v.toLocaleString();
};

/** Format negative amounts with parentheses (Korean accounting convention) */
function fmtKRWParens(value: number): string {
  if (value === null || value === undefined) return "\u2014";
  if (value === 0) return "₩0";
  const abs = Math.abs(value);
  let formatted: string;
  if (abs >= 1e12) formatted = "₩" + (abs / 1e12).toLocaleString("ko-KR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + "조";
  else if (abs >= 1e8) formatted = "₩" + (abs / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + "억";
  else if (abs >= 1e4) formatted = "₩" + (abs / 1e4).toLocaleString("ko-KR", { maximumFractionDigits: 0 }) + "만";
  else formatted = "₩" + abs.toLocaleString("ko-KR");
  return value < 0 ? `(${formatted})` : formatted;
}

// ─── BI Tag ─────────────────────────────────────────────────
function BiTag() {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, color: "#fff",
      backgroundColor: COLOR.uiOrange, borderRadius: 4, padding: "2px 6px", marginLeft: 8,
      letterSpacing: 0.5,
    }}>BI</span>
  );
}

// ─── Section Tag ────────────────────────────────────────────
function SectionTag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.5,
      padding: "2px 8px", borderRadius: 4,
      backgroundColor: color + "14", color,
    }}>{label}</span>
  );
}

// ─── Chart Card ─────────────────────────────────────────────
function ChartCard({ title, tag, subtitle, children, onClick, style: extraStyle }: {
  title: string; tag?: "PL" | "BS"; subtitle?: string; children: React.ReactNode;
  onClick?: () => void; style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: `1px solid ${COLOR.border}`,
        boxShadow: hovered && onClick ? SHADOW_LG : SHADOW_SM,
        transform: hovered && onClick ? "translateY(-2px)" : "none",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        cursor: onClick ? "pointer" : undefined,
        overflow: "hidden",
        ...extraStyle,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ padding: "20px 24px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tag && <SectionTag label={tag} color={tag === "PL" ? COLOR.chart1 : COLOR.chart2} />}
          <span style={{ fontSize: 16, fontWeight: 600, color: COLOR.textPrimary }}>{title}</span>
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: COLOR.textTertiary, marginTop: 6, lineHeight: 1.4 }}>{subtitle}</div>
        )}
      </div>
      <div style={{ padding: "4px 24px 24px" }}>{children}</div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────
function KpiCard({ label, value, changeText, changeCls, pyVal, compareLabel, borderColor, onClick }: {
  label: string; value: string; changeText: string; changeCls: string;
  pyVal: string; compareLabel: string; borderColor: string; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const changeColor = changeCls === "positive" ? COLOR.increase : changeCls === "negative" ? COLOR.decrease : COLOR.neutral;
  const arrow = changeCls === "positive" ? "↑" : changeCls === "negative" ? "↓" : "";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: `1px solid ${COLOR.border}`,
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: hovered ? SHADOW_LG : SHADOW_MD,
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        padding: "20px 24px 16px",
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: 12, color: COLOR.textSecondary, fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{
        fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 10,
        color: COLOR.textPrimary, ...TNUM,
      }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {arrow && (
          <span style={{ fontSize: 13, fontWeight: 700, color: changeColor }}>{arrow}</span>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: changeColor, ...TNUM }}>{changeText}</span>
        <span style={{ fontSize: 11, color: COLOR.textTertiary, fontWeight: 400, marginLeft: 4 }}>
          {compareLabel}
        </span>
        <span style={{ fontSize: 11, color: COLOR.textTertiary, fontWeight: 400, ...TNUM }}>
          ({pyVal})
        </span>
      </div>
    </div>
  );
}

// ─── Aux KPI Strip ──────────────────────────────────────────
function AuxItem({ label, value, up }: { label: string; value: string; up?: boolean | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px" }}>
      <span style={{ fontSize: 12, color: COLOR.textSecondary, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: COLOR.chart4, ...TNUM }}>{value}</span>
      {up !== null && up !== undefined && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: up ? COLOR.increase : COLOR.decrease,
        }}>{up ? "↑" : "↓"}</span>
      )}
    </div>
  );
}

function AuxDivider() {
  return <div style={{ width: 1, height: 22, background: COLOR.border, alignSelf: "center" }} />;
}

// ─── Budget (localStorage) ──────────────────────────────────
function loadBudget(): Record<string, Record<string, number>> | null {
  try {
    const raw = localStorage.getItem("abc_budget");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveBudget(data: Record<string, Record<string, number>>) {
  localStorage.setItem("abc_budget", JSON.stringify(data));
}

// ─── Budget Modal ───────────────────────────────────────────
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
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, boxShadow: SHADOW_LG,
        width: "90%", maxWidth: 800, maxHeight: "80vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "20px 24px", borderBottom: `1px solid ${COLOR.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLOR.textPrimary, margin: 0 }}>예산 설정 (Budget)</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, cursor: "pointer",
            color: COLOR.textSecondary, lineHeight: 1, padding: 4,
          }}>&times;</button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: "10px 12px", background: COLOR.surfacePage, border: `1px solid ${COLOR.border}`, fontSize: 11, fontWeight: 600, color: COLOR.textSecondary }}>월</th>
                {fields.map(f => (
                  <th key={f.key} style={{ padding: "10px 12px", background: COLOR.surfacePage, border: `1px solid ${COLOR.border}`, fontSize: 11, fontWeight: 600, color: COLOR.textSecondary }}>{f.label} (억)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m}>
                  <td style={{ padding: "6px 12px", border: `1px solid ${COLOR.border}`, fontWeight: 500, textAlign: "center", color: COLOR.textPrimary }}>{m}</td>
                  {fields.map(f => (
                    <td key={f.key} style={{ padding: 0, border: `1px solid ${COLOR.border}` }}>
                      <input
                        type="number"
                        style={{
                          width: "100%", border: "none", textAlign: "right",
                          padding: "6px 8px", fontSize: 12, background: "transparent",
                          ...TNUM,
                        }}
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
        <div style={{
          padding: "16px 24px", borderTop: `1px solid ${COLOR.border}`,
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button onClick={handleClear} style={{
            padding: "8px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: `1px solid ${COLOR.increase}`,
            background: COLOR.increase, color: "#fff",
          }}>예산 삭제</button>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: `1px solid ${COLOR.border}`, background: "#fff",
            color: COLOR.textSecondary,
          }}>취소</button>
          <button onClick={handleSave} style={{
            padding: "8px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: `1px solid ${COLOR.uiOrange}`,
            background: COLOR.uiOrange, color: "#fff",
          }}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ─── Waterfall Helper ───────────────────────────────────────
function buildWaterfallData(pl: {
  revenue: number; cogs: number; sga: number; grossProfit: number;
  operatingIncome: number; netIncome: number;
  financialNet?: number; otherNet?: number; tax?: number;
}) {
  const rev = pl.revenue;
  const cogs = pl.cogs;
  const sga = pl.sga;
  const op = pl.operatingIncome;
  const financialNet = pl.financialNet ?? 0;
  const otherNet = pl.otherNet ?? 0;
  const tax = pl.tax ?? 0;
  const ni = pl.netIncome;

  // Waterfall items with running subtotals
  const items = [
    { name: "매출액", value: rev, type: "total" as const },
    { name: "매출원가", value: -cogs, type: "cost" as const },
    { name: "판관비", value: -sga, type: "cost" as const },
    { name: "금융순손익", value: financialNet, type: "item" as const },
    { name: "기타순손익", value: otherNet, type: "item" as const },
    { name: "법인세", value: -Math.abs(tax), type: "cost" as const },
    { name: "순이익", value: ni, type: "total" as const },
  ];

  let running = 0;
  return items.map((item, i) => {
    if (item.type === "total" && i === 0) {
      // Start bar
      running = item.value;
      return { ...item, base: 0, top: item.value, fill: COLOR.greyMedium };
    }
    if (item.type === "total" && i === items.length - 1) {
      // End bar
      return { ...item, base: 0, top: item.value, fill: COLOR.greyMedium };
    }
    // Intermediate bar
    const prevRunning = running;
    running = prevRunning + item.value;
    const isIncrease = item.value >= 0;
    return {
      ...item,
      base: isIncrease ? prevRunning : running,
      top: isIncrease ? running : prevRunning,
      fill: isIncrease ? COLOR.increase : COLOR.decrease,
    };
  });
}

// ─── Custom Waterfall Bar ───────────────────────────────────
function WaterfallBar(props: any) {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  const barBase = payload.base;
  const barTop = payload.top;
  const yScale = props.yScale || props.background?.y;
  return null; // handled via stacked bars below
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
    if (!prev || prev === 0) return { text: "\u2014", cls: "neutral", pyVal: "\u2014" };
    if (isPercent) {
      const diff = cur - prev;
      const sign = diff >= 0 ? "+" : "\u2212";
      return {
        text: `${sign}${Math.abs(diff).toFixed(1)}pp`,
        cls: diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral",
        pyVal: prev.toFixed(1) + "%",
      };
    }
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    const sign = pct >= 0 ? "+" : "\u2212";
    return {
      text: `${sign}${Math.abs(pct).toFixed(1)}%`,
      cls: pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral",
      pyVal: formatKRW(prev),
    };
  }

  function getStatusColor(cur: number, prev: number) {
    if (!prev) return COLOR.increase;
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    return pct >= 0 ? COLOR.increase : COLOR.decrease;
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
        account: d.account.length > 12 ? d.account.slice(0, 12) + "\u2026" : d.account,
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
      return buildWaterfallData({ ...plAgg, financialNet: 0, otherNet: 0, tax: 0 });
    }
    const totals = { revenue: 0, cogs: 0, sga: 0, financialNet: 0, otherNet: 0, tax: 0, net_income: 0 };
    wf.forEach((m: any) => {
      totals.revenue += m.revenue ?? 0;
      totals.cogs += m.cogs ?? 0;
      totals.sga += m.sga ?? 0;
      totals.financialNet += m.financial_net ?? m.financialNet ?? 0;
      totals.otherNet += m.other_net ?? m.other ?? 0;
      totals.tax += m.tax ?? 0;
      totals.net_income += m.net_income ?? 0;
    });
    const gp = totals.revenue - totals.cogs;
    const op = gp - totals.sga;
    return buildWaterfallData({
      revenue: totals.revenue, cogs: totals.cogs, sga: totals.sga,
      grossProfit: gp, operatingIncome: op, netIncome: totals.net_income,
      financialNet: totals.financialNet, otherNet: totals.otherNet, tax: totals.tax,
    });
  }, [plWaterfall, plAgg]);

  // ─── Aux KPI — ROA/ROE with average denominator ───
  const avgAssets = ((bsOpen.totalAssets ?? 0) + (bsCur.totalAssets ?? 0)) / 2;
  const avgEquity = ((bsOpen.totalEquity ?? 0) + (bsCur.totalEquity ?? 0)) / 2;
  const monthCount = pl.length || 12;
  const annFactor = 12 / monthCount;

  const roa = avgAssets ? ((plAgg.netIncome * annFactor) / avgAssets) * 100 : 0;
  const roe = avgEquity ? ((plAgg.netIncome * annFactor) / avgEquity) * 100 : 0;
  const turnover = avgAssets ? (plAgg.revenue * annFactor) / avgAssets : 0;
  const nwc = (bsCur.currentAssets ?? 0) - (bsCur.currentLiabilities ?? 0);

  const roaPrior = bsOpen.totalAssets ? (plPriorAgg.netIncome / bsOpen.totalAssets) * 100 : null;
  const roePrior = bsOpen.totalEquity ? (plPriorAgg.netIncome / bsOpen.totalEquity) * 100 : null;

  // ─── Tooltip customization ───
  const tooltipStyle: React.CSSProperties = {
    ...TOOLTIP_STYLE,
    background: "#fff",
    fontSize: 12,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <BudgetModal open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} />

      {/* ─── Title + Budget / Compare Toggle ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: COLOR.textPrimary, letterSpacing: "-0.3px" }}>
            Executive Summary
          </span>
          <BiTag />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {hasBudget && (
            <div style={{
              display: "flex", background: COLOR.surfacePage,
              borderRadius: 8, padding: 3, gap: 2, border: `1px solid ${COLOR.borderLight}`,
            }}>
              {(["py", "budget"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCompareMode(mode)}
                  style={{
                    padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: compareMode === mode ? COLOR.uiOrange : "transparent",
                    color: compareMode === mode ? "#fff" : COLOR.textSecondary,
                    transition: "all 0.15s ease",
                  }}
                >{mode === "py" ? "전기" : "예산"}</button>
              ))}
            </div>
          )}
          <button
            onClick={() => setBudgetModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${hasBudget ? COLOR.uiOrange : COLOR.border}`,
              background: hasBudget ? COLOR.uiOrange : "#fff",
              color: hasBudget ? "#fff" : COLOR.textSecondary,
              transition: "all 0.15s ease",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            예산 설정
          </button>
        </div>
      </div>

      {/* ═══ HERO KPI (PL 4 + BS 4) ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
            letterSpacing: 1.5, color: COLOR.chart1, marginBottom: 10, paddingLeft: 4,
          }}>P&L Performance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <KpiCard
              label="매출액" value={formatKRW(plAgg.revenue)}
              {...fmtChange(plAgg.revenue, plPriorAgg.revenue)}
              compareLabel={compareLabel}
              borderColor={getStatusColor(plAgg.revenue, plPriorAgg.revenue)}
            />
            <KpiCard
              label="영업이익" value={formatKRW(plAgg.operatingIncome)}
              {...fmtChange(plAgg.operatingIncome, plPriorAgg.operatingIncome)}
              compareLabel={compareLabel}
              borderColor={getStatusColor(plAgg.operatingIncome, plPriorAgg.operatingIncome)}
            />
            <KpiCard
              label="영업이익률" value={opm.toFixed(1) + "%"}
              {...fmtChange(opm, opmPrior, true)}
              compareLabel={compareLabel}
              borderColor={opm >= opmPrior ? COLOR.increase : COLOR.decrease}
            />
            <KpiCard
              label="당기순이익" value={formatKRW(plAgg.netIncome)}
              {...fmtChange(plAgg.netIncome, plPriorAgg.netIncome)}
              compareLabel={compareLabel}
              borderColor={getStatusColor(plAgg.netIncome, plPriorAgg.netIncome)}
            />
          </div>
        </div>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
            letterSpacing: 1.5, color: COLOR.chart2, marginBottom: 10, paddingLeft: 4,
          }}>Balance Sheet Health</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <KpiCard
              label="총자산" value={formatKRW(bsCur.totalAssets ?? 0)}
              {...fmtChange(bsCur.totalAssets ?? 0, bsOpen.totalAssets)}
              compareLabel="vs PY"
              borderColor={getStatusColor(bsCur.totalAssets ?? 0, bsOpen.totalAssets ?? 0)}
            />
            <KpiCard
              label="현금 포지션"
              value={formatKRW((bsCur["현금및현금성자산"] ?? 0) + (bsCur["단기금융상품"] ?? 0))}
              {...fmtChange(
                (bsCur["현금및현금성자산"] ?? 0) + (bsCur["단기금융상품"] ?? 0),
                (bsOpen["현금및현금성자산"] ?? 0) + (bsOpen["단기금융상품"] ?? 0),
              )}
              compareLabel="vs PY"
              borderColor={COLOR.chart3}
            />
            <KpiCard
              label="유동비율" value={curRatio.toFixed(2) + "x"}
              {...fmtChange(curRatio, bsOpen.currentAssets && bsOpen.currentLiabilities ? bsOpen.currentAssets / bsOpen.currentLiabilities : null)}
              compareLabel="vs PY"
              borderColor={curRatio >= 1.5 ? COLOR.chart3 : COLOR.increase}
            />
            <KpiCard
              label="부채비율" value={deRatio.toFixed(1) + "%"}
              {...fmtChange(deRatio, bsOpen.totalLiabilities && bsOpen.totalEquity ? (bsOpen.totalLiabilities / bsOpen.totalEquity) * 100 : null, true)}
              compareLabel="vs PY"
              borderColor={deRatio < 100 ? COLOR.chart3 : COLOR.increase}
            />
          </div>
        </div>
      </div>

      {/* ═══ AUX STRIP ═══ */}
      <div style={{
        background: "#fff", borderRadius: 8, border: `1px solid ${COLOR.border}`,
        boxShadow: SHADOW_SM, display: "flex", gap: 16, padding: "10px 20px", flexWrap: "wrap",
        alignItems: "center",
      }}>
        <AuxItem label="ROA" value={roa.toFixed(1) + "%"} up={roaPrior !== null ? roa >= roaPrior : null} />
        <AuxDivider />
        <AuxItem label="ROE" value={roe.toFixed(1) + "%"} up={roePrior !== null ? roe >= roePrior : null} />
        <AuxDivider />
        <AuxItem label="자산회전율" value={turnover.toFixed(2) + "x"} up={null} />
        <AuxDivider />
        <AuxItem label="NWC" value={fmtKRWParens(nwc)} up={null} />
      </div>

      {/* ═══ CHART ROW 1: 매출추이 | BS 재무상태표 ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="매출 및 영업이익 추이" tag="PL" subtitle="월별 매출(Bar) + 전기(반투명) + 영업이익률(Line)">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={revenueChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} width={64} tickFormatter={fmtAx} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} width={40} tickFormatter={v => v + "%"} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} verticalAlign="top" align="right" />
              <Bar yAxisId="left" dataKey="매출액" fill={COLOR.chart1} radius={[3, 3, 0, 0]} barSize={16} />
              <Bar yAxisId="left" dataKey="전기" fill={COLOR.greyMedium + "60"} radius={[3, 3, 0, 0]} barSize={16} />
              <Line yAxisId="right" type="monotone" dataKey="OPM%" stroke={COLOR.chart3} strokeWidth={2} dot={{ r: 3, fill: COLOR.chart3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="재무상태표" tag="BS" subtitle="기말 vs 기초 잔액 비교">
          <div style={{ overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLOR.border}` }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: COLOR.textSecondary, background: COLOR.surfacePage }}></th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: COLOR.textSecondary, background: COLOR.surfacePage }}>기말</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: COLOR.textSecondary, background: COLOR.surfacePage }}>기초</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: COLOR.textSecondary, background: COLOR.surfacePage }}>증감률</th>
                </tr>
              </thead>
              <tbody>
                {bsTableRows.map((r, i) => {
                  const changeColor = r.pct !== null
                    ? (r.pct >= 0 ? COLOR.increase : COLOR.decrease)
                    : COLOR.neutral;
                  const arrow = r.pct !== null
                    ? (r.pct >= 0 ? "↑" : "↓")
                    : "";
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${r.major ? COLOR.border : COLOR.borderLight}` }}>
                      <td style={{
                        padding: "8px 12px", fontWeight: r.major ? 700 : 400,
                        paddingLeft: r.sub ? 28 : 12, color: r.sub ? COLOR.textSecondary : COLOR.textPrimary,
                        fontSize: 13,
                      }}>{r.label}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: r.major ? 700 : 400, color: COLOR.textPrimary, ...TNUM }}>
                        {r.cur != null ? r.cur.toLocaleString("ko-KR") : "\u2014"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: COLOR.textSecondary, ...TNUM }}>
                        {r.prev != null ? r.prev.toLocaleString("ko-KR") : "\u2014"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: changeColor, ...TNUM }}>
                        {r.pct !== null ? `${arrow} ${Math.abs(r.pct).toFixed(1)}%` : "\u2014"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* ═══ CHART ROW 2: Waterfall | BS 주요 증감 ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="손익 구조 Waterfall" tag="PL" subtitle="매출 → 원가 → 판관비 → 금융순손익 → 기타순손익 → 법인세 → 순이익">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterfallData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500, fill: COLOR.textSecondary }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} width={64} tickFormatter={fmtAx} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: any, name: string) => {
                  if (name === "base") return [null, null];
                  return [formatKRW(Number(v)), "금액"];
                }}
              />
              <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="value" stackId="waterfall" radius={[3, 3, 0, 0]} isAnimationActive={true}>
                {waterfallData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="주요 증감 항목" tag="BS" subtitle="기초 대비 기말 변동 TOP 7 (자본 제외)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bsVarianceData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} tickFormatter={fmtAx} />
              <YAxis type="category" dataKey="account" tick={{ fontSize: 12, fontWeight: 500, fill: COLOR.textSecondary }} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatKRW(Number(v))} />
              <Bar dataKey="delta" radius={[0, 4, 4, 0]} barSize={14}>
                {bsVarianceData.map((d, i) => (
                  <Cell key={i} fill={d.delta >= 0 ? COLOR.increase : COLOR.decrease} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ CHART ROW 3: 수익성 | CCC ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="수익성 비율 추이" tag="PL" subtitle="매출총이익률 / 영업이익률 / 순이익률 (점선 = 전기)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={profitChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} width={40} tickFormatter={v => v + "%"} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => (v !== null ? Number(v).toFixed(1) + "%" : "\u2014")} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} verticalAlign="top" align="right" />
              <Line type="monotone" dataKey="매출총이익률" stroke={COLOR.chart1} strokeWidth={2} dot={{ r: 3, fill: COLOR.chart1 }} />
              <Line type="monotone" dataKey="영업이익률" stroke={COLOR.chart3} strokeWidth={2} dot={{ r: 3, fill: COLOR.chart3 }} />
              <Line type="monotone" dataKey="순이익률" stroke={COLOR.chart4} strokeWidth={2} dot={{ r: 3, fill: COLOR.chart4 }} />
              <Line type="monotone" dataKey="매출총이익률(전기)" stroke={COLOR.chart1 + "50"} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2, fill: COLOR.chart1 + "50" }} connectNulls />
              <Line type="monotone" dataKey="영업이익률(전기)" stroke={COLOR.chart3 + "50"} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2, fill: COLOR.chart3 + "50" }} connectNulls />
              <Line type="monotone" dataKey="순이익률(전기)" stroke={COLOR.chart4 + "50"} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2, fill: COLOR.chart4 + "50" }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="운전자본 효율 (CCC)" tag="BS" subtitle="DSO + DIO - DPO = CCC(일) / 낮을수록 효율적">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={cccChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} width={40} tickFormatter={v => Math.round(v) + "일"} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => Math.abs(Number(v)).toFixed(0) + "일"} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} verticalAlign="top" align="right" />
              <ReferenceLine y={0} stroke={COLOR.textTertiary + "40"} />
              <Bar dataKey="DSO" stackId="s" fill={COLOR.chart2} name="DSO (매출채권)" />
              <Bar dataKey="DIO" stackId="s" fill={COLOR.chart1} name="DIO (재고)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="DPO" stackId="s" fill={COLOR.decrease + "80"} name="DPO (매입채무)" radius={[0, 0, 3, 3]} />
              <Line type="monotone" dataKey="CCC" stroke={COLOR.chart4} strokeWidth={2.5} dot={{ r: 3, fill: COLOR.chart4 }} name="CCC" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
