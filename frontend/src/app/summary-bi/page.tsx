"use client";
import { useMemo, useState, useCallback, useEffect } from "react";
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

// ─── Shimmer keyframes (injected once) ─────────────────────
const SHIMMER_ID = "__summary-bi-shimmer";
function ensureShimmer() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHIMMER_ID)) return;
  const style = document.createElement("style");
  style.id = SHIMMER_ID;
  style.textContent = `@keyframes sbShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`;
  document.head.appendChild(style);
}

function Skeleton({ width, height, style: s }: { width?: string | number; height?: string | number; style?: React.CSSProperties }) {
  ensureShimmer();
  return (
    <div style={{
      width: width ?? "100%", height: height ?? 28, borderRadius: 4,
      background: `linear-gradient(90deg, ${COLOR.borderLight} 25%, #e8eaed 50%, ${COLOR.borderLight} 75%)`,
      backgroundSize: "200% 100%",
      animation: "sbShimmer 1.5s ease-in-out infinite",
      ...s,
    }} />
  );
}

function SkeletonKpiCard() {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: `1px solid ${COLOR.border}`,
      borderLeft: `4px solid ${COLOR.borderLight}`, boxShadow: SHADOW_MD, padding: "20px 24px 16px",
    }}>
      <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
      <Skeleton width={120} height={28} style={{ marginBottom: 10 }} />
      <Skeleton width={90} height={12} />
    </div>
  );
}

function SkeletonChart() {
  ensureShimmer();
  return (
    <div style={{
      width: "100%", height: 260, borderRadius: 6,
      background: `linear-gradient(90deg, ${COLOR.borderLight} 25%, #e8eaed 50%, ${COLOR.borderLight} 75%)`,
      backgroundSize: "200% 100%",
      animation: "sbShimmer 1.5s ease-in-out infinite",
    }} />
  );
}

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
function ChartCard({ title, tag, subtitle, children, onClick, style: extraStyle, tableData, ariaLabel }: {
  title: string; tag?: "PL" | "BS"; subtitle?: string; children: React.ReactNode;
  onClick?: () => void; style?: React.CSSProperties;
  tableData?: Record<string, string | number>[];
  ariaLabel?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const tableView = showTable && tableData && tableData.length > 0;
  const cols = tableData && tableData.length > 0 ? Object.keys(tableData[0]) : [];

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
          <div style={{ flex: 1 }} />
          {tableData && tableData.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setShowTable(v => !v); }}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "2px 6px",
                fontSize: 11, color: COLOR.textTertiary, display: "flex", alignItems: "center", gap: 3,
              }}
              title={showTable ? "차트 보기" : "표로 보기"}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              {showTable ? "차트" : "표로 보기"}
            </button>
          )}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: COLOR.textTertiary, marginTop: 6, lineHeight: 1.4 }}>{subtitle}</div>
        )}
      </div>
      <div style={{ padding: "4px 24px 24px" }} role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
        {tableView ? (
          <div style={{ overflowX: "auto", maxHeight: 280 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {cols.map(c => (
                    <th key={c} style={{
                      padding: "8px 10px", textAlign: c === cols[0] ? "left" : "right",
                      fontSize: 11, fontWeight: 600, color: COLOR.textSecondary,
                      background: COLOR.surfacePage, border: `1px solid ${COLOR.borderLight}`,
                    }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData!.map((row, ri) => (
                  <tr key={ri}>
                    {cols.map((c, ci) => (
                      <td key={c} style={{
                        padding: "6px 10px", textAlign: ci === 0 ? "left" : "right",
                        border: `1px solid ${COLOR.borderLight}`, color: COLOR.textPrimary,
                        ...TNUM,
                      }}>{typeof row[c] === "number" ? (row[c] as number).toLocaleString("ko-KR") : row[c]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : children}
      </div>
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
  const changeBg = changeCls === "positive" ? "#FDECEA" : changeCls === "negative" ? "#EBF3FB" : "#F0F2F4";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: `1px solid ${hovered ? COLOR.borderLight : "transparent"}`,
        boxShadow: hovered ? SHADOW_LG : SHADOW_SM,
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "all 0.18s ease",
        padding: "22px 24px 18px",
        cursor: onClick ? "pointer" : undefined,
        position: "relative",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
      }}>
        <span style={{ fontSize: 13, color: COLOR.textTertiary, fontWeight: 500, letterSpacing: "0.1px" }}>{label}</span>
        {onClick && (
          <span style={{
            fontSize: 11, color: COLOR.textTertiary, opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s",
          }}>상세 ›</span>
        )}
      </div>
      <div style={{
        fontSize: 30, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1,
        color: COLOR.textPrimary, marginBottom: 14, ...TNUM,
      }}>{value}</div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 6, background: changeBg,
      }}>
        {arrow && <span style={{ fontSize: 12, fontWeight: 700, color: changeColor }}>{arrow}</span>}
        <span style={{ fontSize: 12, fontWeight: 600, color: changeColor, ...TNUM }}>{changeText}</span>
        <span style={{ fontSize: 11, color: COLOR.textTertiary, marginLeft: 2 }}>{compareLabel}</span>
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKpi, setPanelKpi] = useState<string>("");
  const [highlightMonth, setHighlightMonth] = useState<string | null>(null);

  // Close slide panel on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelOpen(false); };
    if (panelOpen) { document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }
  }, [panelOpen]);

  // Listen for budget modal open event from TopNav filter bar
  useEffect(() => {
    const handler = () => setBudgetModalOpen(true);
    window.addEventListener("open-budget-modal", handler);
    return () => window.removeEventListener("open-budget-modal", handler);
  }, []);

  const openPanel = useCallback((kpi: string) => { setPanelKpi(kpi); setPanelOpen(true); }, []);
  const budget = useMemo(() => loadBudget(), [budgetModalOpen]);
  const hasBudget = !!budget && Object.keys(budget).length > 0;

  // ─── Data Queries ───
  const { data: plMonthly = [], isLoading: plLoading } = useQuery({
    queryKey: ["summary-bi-pl-profitability", dateFrom, dateTo],
    queryFn: () => api.summaryBi.plProfitability(params),
  });
  const { data: plKpi } = useQuery({
    queryKey: ["summary-bi-pl-kpi", dateFrom, dateTo],
    queryFn: () => api.financialStatements.plKpiMonthly(params),
  });
  const { data: bsSnapshot, isLoading: bsLoading } = useQuery({
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
    if (!prev || prev === 0) return { changeText: "\u2014", changeCls: "neutral", pyVal: "\u2014" };
    if (isPercent) {
      const diff = cur - prev;
      const sign = diff >= 0 ? "+" : "\u2212";
      return {
        changeText: `${sign}${Math.abs(diff).toFixed(1)}pp`,
        changeCls: diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral",
        pyVal: prev.toFixed(1) + "%",
      };
    }
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    const sign = pct >= 0 ? "+" : "\u2212";
    return {
      changeText: `${sign}${Math.abs(pct).toFixed(1)}%`,
      changeCls: pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral",
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

  // ─── 당기 연도 필터 (차트용) ───
  const curYear = dateTo.slice(0, 4);
  const plCurrent = useMemo(() => pl.filter(m => m.month.startsWith(curYear)), [pl, curYear]);
  const cccCurrent = useMemo(() => ccc.filter(c => c.month.startsWith(curYear)), [ccc, curYear]);

  // ─── Revenue chart data ───
  const revenueChartData = useMemo(() => {
    return plCurrent.map(m => {
      const priorM = plPrior.find(p => p.month.slice(5) === m.month.slice(5));
      return {
        month: fmtM(m.month),
        매출액: m.revenue,
        전기: priorM?.revenue ?? 0,
        "OPM%": m.opm,
      };
    });
  }, [plCurrent, plPrior]);

  // ─── CCC chart data ───
  const cccChartData = useMemo(() =>
    cccCurrent.map(c => ({
      month: fmtM(c.month),
      DSO: c.dso,
      DIO: c.dio,
      DPO: -c.dpo,
      CCC: c.ccc,
    }))
  , [cccCurrent]);

  // ─── Profitability chart data ───
  const profitChartData = useMemo(() => {
    return plCurrent.map(m => {
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
  }, [plCurrent, plPrior]);

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

  // ─── Slide panel trend data ───
  const panelTrendData = useMemo(() => {
    const fieldMap: Record<string, { cur: (m: PlProfitabilityMonthly) => number; label: string }> = {
      "매출액": { cur: m => m.revenue, label: "매출액" },
      "영업이익": { cur: m => m.operatingIncome, label: "영업이익" },
      "영업이익률": { cur: m => m.opm, label: "영업이익률" },
      "당기순이익": { cur: m => m.netIncome, label: "당기순이익" },
    };
    const cfg = fieldMap[panelKpi];
    if (!cfg) return [];
    return pl.map(m => {
      const priorM = plPrior.find(p => p.month.slice(5) === m.month.slice(5));
      const cur = cfg.cur(m);
      const prev = priorM ? cfg.cur(priorM) : null;
      const chg = prev && prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;
      return { month: fmtM(m.month), 당기: cur, 전기: prev, "증감%": chg };
    });
  }, [panelKpi, pl, plPrior]);

  // ─── Exception Alerts ───
  const alertsData = [
    { severity: "critical", month: "2025-06", text: "기타비용(잡손실) 44.88억 발생 — 월평균의 약 50배", amount: "44.88억" },
    { severity: "warning", month: "2025-03", text: "금융수익 마이너스 전환 (-1.6억) — 비정상", amount: "-1.6억" },
    { severity: "warning", month: "2025-06", text: "법인세 31.52억 충당 — 반기 결산", amount: "31.52억" },
    { severity: "warning", month: "2025-06", text: "당기순이익 -26.54억 적자 전환", amount: "-26.54억" },
    { severity: "info", month: "2025-09", text: "기타수익 9.16억 — 외화환산이익 등 환율 변동", amount: "9.16억" },
    { severity: "info", month: "2025-05", text: "매출 222.3억 — 당기 최고 매출", amount: "222.3억" },
  ];

  // ─── Date range label for aria ───
  const dateRangeLabel = useMemo(() => {
    const fy = dateFrom.slice(0, 4), fm = parseInt(dateFrom.slice(5, 7));
    const ty = dateTo.slice(0, 4), tm = parseInt(dateTo.slice(5, 7));
    return `${fy}년 ${fm}월부터 ${ty}년 ${tm}월까지`;
  }, [dateFrom, dateTo]);

  const kpiLoading = plLoading || bsLoading;

  // ─── Tooltip customization ───
  const tooltipStyle: React.CSSProperties = {
    ...TOOLTIP_STYLE,
    background: "#fff",
    fontSize: 12,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <BudgetModal open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} />

      {/* ═══ HERO KPI 4+4 ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {kpiLoading ? <><SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard /><SkeletonKpiCard /></> : (<>
          <KpiCard
            label="매출액" value={formatKRW(plAgg.revenue)}
            {...fmtChange(plAgg.revenue, plPriorAgg.revenue)}
            compareLabel={compareLabel}
            borderColor={getStatusColor(plAgg.revenue, plPriorAgg.revenue)}
            onClick={() => openPanel("매출액")}
          />
          <KpiCard
            label="영업이익" value={formatKRW(plAgg.operatingIncome)}
            {...fmtChange(plAgg.operatingIncome, plPriorAgg.operatingIncome)}
            compareLabel={compareLabel}
            borderColor={getStatusColor(plAgg.operatingIncome, plPriorAgg.operatingIncome)}
            onClick={() => openPanel("영업이익")}
          />
          <KpiCard
            label="영업이익률" value={opm.toFixed(1) + "%"}
            {...fmtChange(opm, opmPrior, true)}
            compareLabel={compareLabel}
            borderColor={opm >= opmPrior ? COLOR.increase : COLOR.decrease}
            onClick={() => openPanel("영업이익률")}
          />
          <KpiCard
            label="당기순이익" value={formatKRW(plAgg.netIncome)}
            {...fmtChange(plAgg.netIncome, plPriorAgg.netIncome)}
            compareLabel={compareLabel}
            borderColor={getStatusColor(plAgg.netIncome, plPriorAgg.netIncome)}
            onClick={() => openPanel("당기순이익")}
          />
          <KpiCard
            label="총자산" value={formatKRW(bsCur.totalAssets ?? 0)}
            {...fmtChange(bsCur.totalAssets ?? 0, bsOpen.totalAssets)}
            compareLabel="vs PY"
            borderColor={getStatusColor(bsCur.totalAssets ?? 0, bsOpen.totalAssets ?? 0)}
            onClick={() => openPanel("총자산")}
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
        </>)}
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

      {/* ═══ Cross-filter chip ═══ */}
      {highlightMonth && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, color: COLOR.chart1,
            background: COLOR.chart1 + "12", borderRadius: 16, padding: "4px 12px",
          }}>
            월: {highlightMonth}
            <button
              onClick={() => setHighlightMonth(null)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: 14, lineHeight: 1, color: COLOR.chart1, fontWeight: 700,
              }}
            >&times;</button>
          </span>
        </div>
      )}

      {/* ═══ CHART ROW 1: 매출추이 | BS 재무상태표 ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard
          title="매출 및 영업이익 추이" tag="PL" subtitle="월별 매출(Bar) + 전기(반투명) + 영업이익률(Line)"
          tableData={revenueChartData}
          ariaLabel={`${dateRangeLabel} 월별 매출액 및 영업이익률 추이 차트`}
        >
          {plLoading ? <SkeletonChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={revenueChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} width={64} tickFormatter={fmtAx} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} width={40} tickFormatter={v => v + "%"} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} verticalAlign="top" align="right" />
              <Bar
                yAxisId="left" dataKey="매출액" fill={COLOR.chart1} radius={[3, 3, 0, 0]} barSize={16}
                onClick={(_d: any, idx: number) => {
                  const m = revenueChartData[idx]?.month as string;
                  setHighlightMonth((prev: string | null) => prev === m ? null : m);
                }}
              >
                {revenueChartData.map((d: any, i: number) => (
                  <Cell key={i} fill={COLOR.chart1} opacity={highlightMonth && d.month !== highlightMonth ? 0.25 : 1} cursor="pointer" />
                ))}
              </Bar>
              <Bar yAxisId="left" dataKey="전기" fill={COLOR.greyMedium + "60"} radius={[3, 3, 0, 0]} barSize={16}>
                {revenueChartData.map((d: any, i: number) => (
                  <Cell key={i} fill={COLOR.greyMedium + "60"} opacity={highlightMonth && d.month !== highlightMonth ? 0.25 : 1} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="OPM%" stroke={COLOR.chart3} strokeWidth={2} dot={{ r: 3, fill: COLOR.chart3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="재무상태표" tag="BS" subtitle="기말 vs 기초 잔액 비교" ariaLabel={`${dateRangeLabel} 재무상태표 기말 기초 비교`}>
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
        <ChartCard
          title="손익 구조 Waterfall" tag="PL" subtitle="매출 → 원가 → 판관비 → 금융순손익 → 기타순손익 → 법인세 → 순이익"
          tableData={waterfallData.map(d => ({ 항목: d.name, 금액: d.value }))}
          ariaLabel={`${dateRangeLabel} 손익 구조 워터폴 차트`}
        >
          {plLoading ? <SkeletonChart /> : (
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
          )}
        </ChartCard>

        <ChartCard
          title="주요 증감 항목" tag="BS" subtitle="기초 대비 기말 변동 TOP 7 (자본 제외)"
          tableData={bsVarianceData.map(d => ({ 계정: d.account, 증감: d.delta }))}
          ariaLabel={`${dateRangeLabel} 재무상태표 주요 증감 항목 차트`}
        >
          {bsLoading ? <SkeletonChart /> : (
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
          )}
        </ChartCard>
      </div>

      {/* ═══ CHART ROW 3: 수익성 | CCC ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard
          title="수익성 비율 추이" tag="PL" subtitle="매출총이익률 / 영업이익률 / 순이익률 (점선 = 전기)"
          tableData={profitChartData.map((d: any) => ({ 월: d.month, 매출총이익률: d.매출총이익률, 영업이익률: d.영업이익률, 순이익률: d.순이익률 }))}
          ariaLabel={`${dateRangeLabel} 수익성 비율 추이 차트`}
        >
          {plLoading ? <SkeletonChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={highlightMonth ? profitChartData.map((d: any) => ({
                ...d,
                _dim: d.month !== highlightMonth,
              })) : profitChartData}
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
            >
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
          )}
        </ChartCard>

        <ChartCard
          title="운전자본 효율 (CCC)" tag="BS" subtitle="DSO + DIO - DPO = CCC(일) / 낮을수록 효율적"
          tableData={cccChartData.map((d: any) => ({ 월: d.month, DSO: d.DSO, DIO: d.DIO, DPO: Math.abs(d.DPO), CCC: d.CCC }))}
          ariaLabel={`${dateRangeLabel} 운전자본 효율 CCC 차트`}
        >
          {bsLoading ? <SkeletonChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={cccChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLOR.textTertiary }} tickLine={false} axisLine={false} width={40} tickFormatter={v => Math.round(v) + "일"} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => Math.abs(Number(v)).toFixed(0) + "일"} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} verticalAlign="top" align="right" />
              <ReferenceLine y={0} stroke={COLOR.textTertiary + "40"} />
              <Bar dataKey="DSO" stackId="s" fill={COLOR.chart2} name="DSO (매출채권)">
                {cccChartData.map((d: any, i: number) => (
                  <Cell key={i} fill={COLOR.chart2} opacity={highlightMonth && d.month !== highlightMonth ? 0.25 : 1} />
                ))}
              </Bar>
              <Bar dataKey="DIO" stackId="s" fill={COLOR.chart1} name="DIO (재고)" radius={[3, 3, 0, 0]}>
                {cccChartData.map((d: any, i: number) => (
                  <Cell key={i} fill={COLOR.chart1} opacity={highlightMonth && d.month !== highlightMonth ? 0.25 : 1} />
                ))}
              </Bar>
              <Bar dataKey="DPO" stackId="s" fill={COLOR.decrease + "80"} name="DPO (매입채무)" radius={[0, 0, 3, 3]}>
                {cccChartData.map((d: any, i: number) => (
                  <Cell key={i} fill={COLOR.decrease + "80"} opacity={highlightMonth && d.month !== highlightMonth ? 0.25 : 1} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="CCC" stroke={COLOR.chart4} strokeWidth={2.5} dot={{ r: 3, fill: COLOR.chart4 }} name="CCC" />
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ═══ 이상 항목 (Exception Alerts) ═══ */}
      <div style={{
        background: "#fff", borderRadius: 8, border: `1px solid ${COLOR.border}`,
        boxShadow: SHADOW_SM, padding: "20px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLOR.textPrimary }}>이상 항목</span>
          <span style={{ fontSize: 12, color: COLOR.textTertiary }}>
            (Critical {alertsData.filter(a => a.severity === "critical").length} / Warning {alertsData.filter(a => a.severity === "warning").length})
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {alertsData.map((alert, i) => {
            const borderColor = alert.severity === "critical" ? "#B91C1C" : alert.severity === "warning" ? "#B45309" : COLOR.chart1;
            const bgColor = alert.severity === "critical" ? "#FEE2E2" : alert.severity === "warning" ? "#FEF3C7" : "#FFF5ED";
            const labelBg = alert.severity === "critical" ? "#B91C1C" : alert.severity === "warning" ? "#B45309" : COLOR.chart2;
            const labelText = alert.severity.toUpperCase();
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 8,
                borderLeft: `3px solid ${borderColor}`, background: bgColor,
                cursor: "pointer", transition: "box-shadow 0.15s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = SHADOW_MD;
                const hint = (e.currentTarget as HTMLElement).querySelector(".alert-hint") as HTMLElement;
                if (hint) hint.style.opacity = "1";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                const hint = (e.currentTarget as HTMLElement).querySelector(".alert-hint") as HTMLElement;
                if (hint) hint.style.opacity = "0";
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#fff", background: labelBg,
                  borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap", textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>{labelText}</span>
                <span style={{ fontSize: 13, color: COLOR.textPrimary, flex: 1 }}>
                  <strong>{alert.month}</strong> — {alert.text}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.textPrimary, whiteSpace: "nowrap", ...TNUM }}>
                  {alert.amount}
                </span>
                <span className="alert-hint" style={{
                  fontSize: 11, fontWeight: 500, color: COLOR.chart1,
                  background: "#FFF5ED", padding: "3px 10px", borderRadius: 4,
                  opacity: 0, transition: "opacity 0.15s", whiteSpace: "nowrap", flexShrink: 0,
                }}>상세 보기 ›</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Slide Panel Drilldown ═══ */}
      {panelOpen && (
        <>
          <div
            onClick={() => setPanelOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.3)", transition: "opacity 0.2s ease",
            }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "42%", zIndex: 201,
            background: "#fff", boxShadow: SHADOW_LG, display: "flex", flexDirection: "column",
            transform: "translateX(0)", transition: "transform 0.25s ease",
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: `1px solid ${COLOR.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: COLOR.textPrimary, margin: 0 }}>
                {panelKpi} 월별 추이
              </h3>
              <button
                onClick={() => setPanelOpen(false)}
                style={{
                  background: "none", border: "none", fontSize: 22, cursor: "pointer",
                  color: COLOR.textSecondary, lineHeight: 1, padding: 4,
                }}
              >&times;</button>
            </div>
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLOR.border}` }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: COLOR.textSecondary, background: COLOR.surfacePage }}>월</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: COLOR.textSecondary, background: COLOR.surfacePage }}>당기</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: COLOR.textSecondary, background: COLOR.surfacePage }}>전기</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: COLOR.textSecondary, background: COLOR.surfacePage }}>증감%</th>
                  </tr>
                </thead>
                <tbody>
                  {panelTrendData.map((row, i) => {
                    const isPercent = panelKpi === "영업이익률";
                    const fmtVal = (v: number | null) => {
                      if (v === null || v === undefined) return "\u2014";
                      return isPercent ? v.toFixed(1) + "%" : formatKRW(v);
                    };
                    const chgColor = row["증감%"] !== null
                      ? ((row["증감%"] as number) >= 0 ? COLOR.increase : COLOR.decrease)
                      : COLOR.neutral;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${COLOR.borderLight}` }}>
                        <td style={{ padding: "8px 12px", fontWeight: 500, color: COLOR.textPrimary }}>{row.month}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: COLOR.textPrimary, ...TNUM }}>{fmtVal(row.당기)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: COLOR.textSecondary, ...TNUM }}>{fmtVal(row.전기)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: chgColor, ...TNUM }}>
                          {row["증감%"] !== null ? ((row["증감%"] as number) >= 0 ? "+" : "") + (row["증감%"] as number).toFixed(1) + "%" : "\u2014"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
