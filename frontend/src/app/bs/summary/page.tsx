"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE } from "@/lib/utils/chartColors";

const fmtM = (v: string) => v.slice(2, 4) + "." + v.slice(5);

// ─── 레이블 공통 스타일 (Summary 손익지표 > 매출총이익률 기준) ─────
const LABEL_STYLE: React.CSSProperties = { fontSize: 13, fontWeight: 400, color: "#A1A8B3" };

function SectionLabel({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: "#EEEFF1" }} />
    </div>
  );
}

function PctTag({ v }: { v: number | null }) {
  if (v == null) return null;
  const up = v >= 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: up ? "#16C784" : "#FF4747" }}>
      {up ? "▲" : "▼"}{Math.abs(v).toFixed(1)}%
    </span>
  );
}

// ─── 인라인 범례 (차트 상단 좌측) ──────────────────────────────
function InlineLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, paddingBottom: 4, flexWrap: "wrap", justifyContent: "flex-end", paddingRight: 12 }}>
      {items.map(it => (
        <span key={it.label} style={{ display: "flex", alignItems: "center", gap: 5, ...LABEL_STYLE }}>
          <span style={{
            width: 18, height: 2.5,
            background: it.dashed
              ? `repeating-linear-gradient(90deg,${it.color} 0,${it.color} 4px,transparent 4px,transparent 7px)`
              : it.color,
            display: "inline-block", borderRadius: 1, flexShrink: 0,
          }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ─── KPI 카드 (자산/부채/자본) ──────────────────────────────────
function BsKpiCard({ label, data, color }: { label: string; data: any; color: string }) {
  return (
    <div className="bg-white rounded-lg border p-5 flex-1 card-hover"
      style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 14, fontWeight: 500, color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 14 }}>
        {formatKRW(data?.current ?? 0)}
      </div>
      <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
        <div className="flex justify-between items-center">
          <span style={LABEL_STYLE}>당기 기초 금액</span>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: "#374151", fontVariantNumeric: "tabular-nums" }}>{formatKRW(data?.ytd_start ?? 0)}</span>
            <PctTag v={data?.ytd_pct} />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span style={LABEL_STYLE}>당월 기초 금액</span>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: "#374151", fontVariantNumeric: "tabular-nums" }}>{formatKRW(data?.mtd_start ?? 0)}</span>
            <PctTag v={data?.mtd_pct} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── X축 커스텀 틱 (3개월마다 + 마지막 틱 항상 표시) ────────────
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

// ─── Area 차트 (자산/부채 구성) ──────────────────────────────────
function BsTrendChart({ data, branches, colors, height = 130 }: {
  data: any[]; branches: string[]; colors: Record<string, string>; height?: number;
}) {
  const XTick = makeXTick(data.length);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
        <defs>
          {branches.map(b => (
            <linearGradient key={b} id={`grad-${b.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[b]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[b]} stopOpacity={0.03} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="month" tick={XTick} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={72}
          tickFormatter={v => formatKRW(v)} />
        <Tooltip formatter={(v: number) => formatKRW(v)}
          contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 11 }} />
        {branches.map(b => (
          <Area key={b} type="monotone" dataKey={b} stackId="a"
            stroke={colors[b]} strokeWidth={1.5}
            fill={`url(#grad-${b.replace(/\s/g, "")})`} dot={false} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PANEL_CLS = "bg-white rounded-lg border overflow-hidden card-hover";
const PANEL_STYLE = { borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" };

function ChartHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>{title}</span>
    </div>
  );
}

export default function BsSummaryPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const params = { date_from: dateFrom, date_to: dateTo };

  const { data: kpi } = useQuery({
    queryKey: ["bs-kpi", dateTo],
    queryFn: () => api.bsSummary.kpi({ date_to: dateTo }),
  });
  const { data: monthlyRaw = [] } = useQuery({
    queryKey: ["bs-monthly", dateFrom, dateTo],
    queryFn: () => api.bsTrend.monthly(params),
  });
  const { data: ratios = [] } = useQuery({
    queryKey: ["bs-ratios-monthly", dateFrom, dateTo],
    queryFn: () => api.bsSummary.ratiosMonthly(params),
  });
  const { data: activity } = useQuery({
    queryKey: ["bs-activity-monthly", dateFrom, dateTo],
    queryFn: () => api.bsSummary.activityMonthly(params),
  });

  const monthly = monthlyRaw as any[];
  const monthSet = [...new Set(monthly.map((r: any) => r.month))].sort();

  function buildMonthlyData(branch: string) {
    return monthSet.map(m => {
      const rows = monthly.filter((r: any) => r.month === m && r.branch === branch);
      const entry: Record<string, any> = { month: fmtM(m) };
      rows.forEach((r: any) => { entry[r.division || branch] = Math.abs(r.balance); });
      return entry;
    });
  }

  function buildEquityMonthly() {
    return monthSet.map(m => {
      const totalA = monthly.filter((r: any) => r.month === m && r.branch === "자산").reduce((s: number, r: any) => s + Math.abs(r.balance), 0);
      const totalL = monthly.filter((r: any) => r.month === m && r.branch === "부채").reduce((s: number, r: any) => s + Math.abs(r.balance), 0);
      return { month: fmtM(m), "자본": Math.max(0, totalA - totalL) };
    });
  }

  const assetData   = buildMonthlyData("자산");
  const liabData    = buildMonthlyData("부채");
  const equityData  = buildEquityMonthly();

  const assetBranches = [...new Set(monthly.filter((r: any) => r.branch === "자산").map((r: any) => r.division || "자산"))] as string[];
  const liabBranches  = [...new Set(monthly.filter((r: any) => r.branch === "부채").map((r: any) => r.division || "부채"))] as string[];

  const ASSET_COLORS: Record<string, string> = { "유동자산": "#FD5108", "비유동자산": "#FFAA72" };
  const LIAB_COLORS:  Record<string, string> = { "유동부채": "#54565A", "비유동부채": "#CBD1D6" };

  const ratioData = (ratios as any[]).map((r: any) => ({ ...r, month: fmtM(r.month) }));
  const ratioXTick = makeXTick(ratioData.length);

  const activityMonthly = (activity?.monthly ?? []).map((r: any) => ({ ...r, month: fmtM(r.month) }));
  const actXTick = makeXTick(activityMonthly.length);
  const actSummary = activity?.summary ?? {};
  const avgRecvDays   = actSummary["매출채권회전일수"] ?? 0;
  const avgInvDays    = actSummary["재고자산회전일수"] ?? 0;
  const avgRecvBalance = actSummary["평균매출채권잔액"] ?? 0;
  const avgInvBalance  = actSummary["평균재고자산잔액"] ?? 0;
  const dailyRev  = actSummary["일평균매출액"] ?? 0;
  const dailyCogs = actSummary["일평균매출원가"] ?? 0;

  return (
    <div className="space-y-5">

      {/* Section 1: 자산, 부채, 자본 증감 및 추이 */}
      <SectionLabel title="자산, 부채, 자본 증감 및 추이" />
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 2fr" }}>

        {/* Left: 3 stacked KPI cards */}
        <div className="flex flex-col gap-4">
          <BsKpiCard label="자산" data={kpi?.["자산"]} color="#FD5108" />
          <BsKpiCard label="부채" data={kpi?.["부채"]} color="#A1A8B3" />
          <BsKpiCard label="자본" data={kpi?.["자본"]} color="#FFAA72" />
        </div>

        {/* Right: 3 stacked area charts */}
        <div className="flex flex-col gap-4">
          <div className={PANEL_CLS} style={PANEL_STYLE}>
            <ChartHeader title="자산추이" />
            <div style={{ padding: "6px 8px 8px" }}>
              <InlineLegend items={assetBranches.map(b => ({ label: b, color: ASSET_COLORS[b] ?? "#FD5108" }))} />
              <BsTrendChart data={assetData} branches={assetBranches} colors={ASSET_COLORS} height={120} />
            </div>
          </div>
          <div className={PANEL_CLS} style={PANEL_STYLE}>
            <ChartHeader title="부채추이" />
            <div style={{ padding: "6px 8px 8px" }}>
              <InlineLegend items={liabBranches.map(b => ({ label: b, color: LIAB_COLORS[b] ?? "#A1A8B3" }))} />
              <BsTrendChart data={liabData} branches={liabBranches} colors={LIAB_COLORS} height={120} />
            </div>
          </div>
          <div className={PANEL_CLS} style={PANEL_STYLE}>
            <ChartHeader title="자본추이" />
            <div style={{ padding: "6px 8px 8px" }}>
              <InlineLegend items={[{ label: "자본", color: "#FFAA72" }]} />
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={equityData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFAA72" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FFAA72" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={makeXTick(equityData.length)} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={72}
                    tickFormatter={v => formatKRW(v)} />
                  <Tooltip formatter={(v: number) => formatKRW(v)}
                    contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="자본" stroke="#FFAA72" strokeWidth={1.5}
                    fill="url(#gradEquity)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: 재무 지표 */}
      <SectionLabel title="재무 지표" />
      <div className="grid grid-cols-2 gap-4">
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="당좌비율, 유동비율 추이" />
          <div style={{ padding: "6px 8px 8px" }}>
            <InlineLegend items={[
              { label: "당좌비율", color: "#FD5108" },
              { label: "유동비율", color: "#FFAA72" },
            ]} />
            <ResponsiveContainer width="100%" height={195}>
              <LineChart data={ratioData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={ratioXTick} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44}
                  tickFormatter={v => v + "%"} />
                <Tooltip formatter={(v: number) => v.toFixed(1) + "%"}
                  contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="당좌비율" stroke="#FD5108" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="유동비율" stroke="#FFAA72" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="부채비율 추이" />
          <div style={{ padding: "6px 8px 8px" }}>
            <InlineLegend items={[{ label: "부채비율", color: "#A1A8B3" }]} />
            <ResponsiveContainer width="100%" height={195}>
              <LineChart data={ratioData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={ratioXTick} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44}
                  tickFormatter={v => v + "%"} />
                <Tooltip formatter={(v: number) => v.toFixed(1) + "%"}
                  contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="부채비율" stroke="#A1A8B3" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 3: 활동성 지표 */}
      <SectionLabel title="활동성 지표" />
      <div className="grid grid-cols-2 gap-4">
        {/* 매출채권 회전일수 */}
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="매출채권 회전일수" />
          <div className="p-5">
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#FD5108", marginBottom: 4 }}>매출채권 회전일수</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px" }}>
                  {avgRecvDays.toFixed(1)}일
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={LABEL_STYLE}>평균매출채권잔액</span>
                  <span style={{ fontSize: 13, color: "#374151", fontVariantNumeric: "tabular-nums" }}>{formatKRW(avgRecvBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={LABEL_STYLE}>일평균매출총액</span>
                  <span style={{ fontSize: 13, color: "#374151", fontVariantNumeric: "tabular-nums" }}>{formatKRW(dailyRev)}</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <InlineLegend items={[{ label: "매출채권회전일수", color: "#FD5108" }]} />
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={activityMonthly} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradRecv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FD5108" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FD5108" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={actXTick} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={48}
                    tickFormatter={v => v + "일"} />
                  <Tooltip formatter={(v: number) => v.toFixed(1) + "일"}
                    contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 11 }} />
                  {avgRecvDays > 0 && (
                    <ReferenceLine y={avgRecvDays} stroke="#FD5108" strokeDasharray="4 2" strokeWidth={1}
                      label={{ value: `평균 ${avgRecvDays.toFixed(1)}일`, position: "insideTopLeft", fontSize: 10, fill: "#FD5108", offset: 4 }} />
                  )}
                  <Area type="monotone" dataKey="매출채권회전일수" stroke="#FD5108" strokeWidth={2}
                    fill="url(#gradRecv)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 재고자산 회전일수 */}
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="재고자산 회전일수" />
          <div className="p-5">
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#FE7C39", marginBottom: 4 }}>재고자산 회전일수</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px" }}>
                  {avgInvDays.toFixed(1)}일
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={LABEL_STYLE}>평균재고자산잔액</span>
                  <span style={{ fontSize: 13, color: "#374151", fontVariantNumeric: "tabular-nums" }}>{formatKRW(avgInvBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={LABEL_STYLE}>일평균매출원가</span>
                  <span style={{ fontSize: 13, color: "#374151", fontVariantNumeric: "tabular-nums" }}>{formatKRW(dailyCogs)}</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <InlineLegend items={[{ label: "재고자산회전일수", color: "#FE7C39" }]} />
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={activityMonthly} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FE7C39" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FE7C39" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={actXTick} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={48}
                    tickFormatter={v => v + "일"} />
                  <Tooltip formatter={(v: number) => v.toFixed(1) + "일"}
                    contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 11 }} />
                  {avgInvDays > 0 && (
                    <ReferenceLine y={avgInvDays} stroke="#FE7C39" strokeDasharray="4 2" strokeWidth={1}
                      label={{ value: `평균 ${avgInvDays.toFixed(1)}일`, position: "insideTopLeft", fontSize: 10, fill: "#FE7C39", offset: 4 }} />
                  )}
                  <Area type="monotone" dataKey="재고자산회전일수" stroke="#FE7C39" strokeWidth={2}
                    fill="url(#gradInv)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
