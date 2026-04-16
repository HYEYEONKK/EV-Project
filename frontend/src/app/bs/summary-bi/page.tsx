"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

/*
  BS 요약 (BI) — Power BI #10 완전 재현
  기존 /bs/summary 페이지를 보존하면서 Power BI 레이아웃을 그대로 구현
*/

const fmtM = (v: string) => v.slice(2, 4) + "." + v.slice(5);
const LABEL_STYLE: React.CSSProperties = { fontSize: 13, fontWeight: 400, color: "#7A8290" };

function SectionLabel({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1D23", whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: "#EEEFF1" }} />
    </div>
  );
}

function BiTag() {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, color: "#fff",
      backgroundColor: "#FD5108", borderRadius: 4, padding: "2px 6px", marginLeft: 8,
      verticalAlign: "middle", letterSpacing: "0.5px",
    }}>BI</span>
  );
}

function PctTag({ v }: { v: number | null }) {
  if (v == null) return null;
  const up = v >= 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: up ? "#C1292E" : "#1D6BB5", fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>
      {up ? "↑" : "↓"}{Math.abs(v).toFixed(1)}%
    </span>
  );
}

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

// Power BI 스타일 KPI 카드 (cardVisual)
function BsKpiCard({ label, data, color, icon }: {
  label: string; data: any; color: string; icon: string;
}) {
  return (
    <div className="bg-white border card-hover"
      style={{
        borderColor: "#DFE3E6", borderRadius: 12, padding: 24, minWidth: 200,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1D23", letterSpacing: "-0.5px", lineHeight: 1.1, fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>
            {formatKRW(data?.current ?? 0)}
          </div>
        </div>
        <img src={`/icons/${icon}`} alt={label} style={{ width: 48, height: 48, flexShrink: 0 }} />
      </div>
      <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 8, marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
        <div className="flex justify-between items-center">
          <span style={LABEL_STYLE}>연초 대비</span>
          <PctTag v={data?.ytd_pct} />
        </div>
        <div className="flex justify-between items-center">
          <span style={LABEL_STYLE}>전월 대비</span>
          <PctTag v={data?.mtd_pct} />
        </div>
      </div>
    </div>
  );
}

function makeXTick(dataLen: number) {
  return function XTick({ x, y, payload, index }: any) {
    const isLast = index === dataLen - 1;
    if (!isLast && index % 3 !== 0) return <g />;
    return (
      <text x={x} y={y + 10} textAnchor="middle" fill="#7A8290" fontSize={11}>
        {payload.value}
      </text>
    );
  };
}

const PANEL_CLS = "bg-white border overflow-hidden";
const PANEL_STYLE: React.CSSProperties = {
  borderColor: "#DFE3E6", borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
};

function ChartHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1D23" }}>{title}</span>
    </div>
  );
}

function BsTrendChart({ data, branches, colors, height = 130 }: {
  data: any[]; branches: string[]; colors: Record<string, string>; height?: number;
}) {
  const XTick = makeXTick(data.length);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
        <defs>
          {branches.map(b => (
            <linearGradient key={b} id={`gradbi-${b.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[b]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[b]} stopOpacity={0.03} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="month" tick={XTick} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={72}
          tickFormatter={v => formatKRW(v)} />
        <Tooltip formatter={(v: any) => formatKRW(Number(v))} contentStyle={TOOLTIP_STYLE} />
        {branches.map(b => (
          <Area key={b} type="monotone" dataKey={b} stackId="a"
            stroke={colors[b]} strokeWidth={1.5}
            fill={`url(#gradbi-${b.replace(/\s/g, "")})`} dot={false} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function BsSummaryBiPage() {
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

  const assetData = buildMonthlyData("자산");
  const liabData = buildMonthlyData("부채");
  const equityData = buildEquityMonthly();

  const assetBranches = [...new Set(monthly.filter((r: any) => r.branch === "자산").map((r: any) => r.division || "자산"))] as string[];
  const liabBranches = [...new Set(monthly.filter((r: any) => r.branch === "부채").map((r: any) => r.division || "부채"))] as string[];

  const ASSET_COLORS: Record<string, string> = { "유동자산": "#E04A00", "비유동자산": "#FFAA72" };
  const LIAB_COLORS: Record<string, string> = { "유동부채": "#54565A", "비유동부채": "#CBD1D6" };

  const ratioData = (ratios as any[]).map((r: any) => ({ ...r, month: fmtM(r.month) }));
  const ratioXTick = makeXTick(ratioData.length);

  const activityMonthly = (activity?.monthly ?? []).map((r: any) => ({ ...r, month: fmtM(r.month) }));
  const actXTick = makeXTick(activityMonthly.length);
  const actSummary = activity?.summary ?? {};
  const avgRecvDays = actSummary["매출채권회전일수"] ?? 0;
  const avgInvDays = actSummary["재고자산회전일수"] ?? 0;

  return (
    <div className="space-y-8">
      {/* 페이지 타이틀 */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1D23" }}>BS 요약</span>
        <BiTag />
        <span style={{ fontSize: 12, color: "#7A8290", marginLeft: 4 }}>Power BI 레이아웃</span>
      </div>

      {/* Section 1: KPI 카드 (가로 3개) — PBI cardVisual */}
      <div className="grid grid-cols-3 gap-5">
        <BsKpiCard label="자산" data={kpi?.["자산"]} color="#FD5108" icon="asset-and-wealth.svg" />
        <BsKpiCard label="부채" data={kpi?.["부채"]} color="#7A8290" icon="bank.svg" />
        <BsKpiCard label="자본" data={kpi?.["자본"]} color="#FFAA72" icon="investment.svg" />
      </div>

      {/* Section 2: 추이 차트 (자산/부채/자본) — PBI areaChart */}
      <SectionLabel title="자산, 부채, 자본 추이" />
      <div className="grid grid-cols-3 gap-4">
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="자산추이" />
          <div style={{ padding: "12px 24px 24px" }}>
            <InlineLegend items={assetBranches.map(b => ({ label: b, color: ASSET_COLORS[b] ?? "#E04A00" }))} />
            <BsTrendChart data={assetData} branches={assetBranches} colors={ASSET_COLORS} height={160} />
          </div>
        </div>
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="부채추이" />
          <div style={{ padding: "12px 24px 24px" }}>
            <InlineLegend items={liabBranches.map(b => ({ label: b, color: LIAB_COLORS[b] ?? "#7A8290" }))} />
            <BsTrendChart data={liabData} branches={liabBranches} colors={LIAB_COLORS} height={160} />
          </div>
        </div>
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="자본추이" />
          <div style={{ padding: "12px 24px 24px" }}>
            <InlineLegend items={[{ label: "자본", color: "#FFAA72" }]} />
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={equityData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradbiEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFAA72" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FFAA72" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={makeXTick(equityData.length)} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={72}
                  tickFormatter={v => formatKRW(v)} />
                <Tooltip formatter={(v: any) => formatKRW(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="자본" stroke="#FFAA72" strokeWidth={1.5}
                  fill="url(#gradbiEquity)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 3: 유동성/안정성 지표 (2x2) — PBI lineChart */}
      <SectionLabel title="유동성 · 안정성 지표" />
      <div className="grid grid-cols-2 gap-4">
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="당좌비율, 유동비율 추이" />
          <div style={{ padding: "12px 24px 24px" }}>
            <InlineLegend items={[
              { label: "당좌비율", color: "#E04A00" },
              { label: "유동비율", color: "#FFAA72" },
            ]} />
            <ResponsiveContainer width="100%" height={195}>
              <LineChart data={ratioData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={ratioXTick} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44}
                  tickFormatter={v => v + "%"} />
                <Tooltip formatter={(v: any) => Number(v).toFixed(1) + "%"} contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="당좌비율" stroke="#E04A00" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="유동비율" stroke="#FFAA72" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="부채비율 추이" />
          <div style={{ padding: "12px 24px 24px" }}>
            <InlineLegend items={[{ label: "부채비율", color: "#7A8290" }]} />
            <ResponsiveContainer width="100%" height={195}>
              <LineChart data={ratioData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={ratioXTick} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44}
                  tickFormatter={v => v + "%"} />
                <Tooltip formatter={(v: any) => Number(v).toFixed(1) + "%"} contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="부채비율" stroke="#7A8290" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 4: 활동성 지표 — PBI areaChart + cardVisual */}
      <SectionLabel title="활동성 지표" />
      <div className="grid grid-cols-2 gap-4">
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="매출채권 회전일수 추이" />
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1D23", marginBottom: 4, letterSpacing: "-0.5px", fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>
              {avgRecvDays.toFixed(1)}<span style={{ fontSize: 16, fontWeight: 400 }}>일</span>
            </div>
            <InlineLegend items={[{ label: "매출채권회전일수", color: "#E04A00" }]} />
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={activityMonthly} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradbiRecv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E04A00" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E04A00" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={actXTick} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={48}
                  tickFormatter={v => v + "일"} />
                <Tooltip formatter={(v: any) => Number(v).toFixed(1) + "일"} contentStyle={TOOLTIP_STYLE} />
                {avgRecvDays > 0 && (
                  <ReferenceLine y={avgRecvDays} stroke="#E04A00" strokeDasharray="4 2" strokeWidth={1} />
                )}
                <Area type="monotone" dataKey="매출채권회전일수" stroke="#E04A00" strokeWidth={2}
                  fill="url(#gradbiRecv)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="재고자산 회전일수 추이" />
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1D23", marginBottom: 4, letterSpacing: "-0.5px", fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>
              {avgInvDays.toFixed(1)}<span style={{ fontSize: 16, fontWeight: 400 }}>일</span>
            </div>
            <InlineLegend items={[{ label: "재고자산회전일수", color: "#FE7C39" }]} />
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={activityMonthly} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradbiInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FE7C39" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FE7C39" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={actXTick} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={48}
                  tickFormatter={v => v + "일"} />
                <Tooltip formatter={(v: any) => Number(v).toFixed(1) + "일"} contentStyle={TOOLTIP_STYLE} />
                {avgInvDays > 0 && (
                  <ReferenceLine y={avgInvDays} stroke="#FE7C39" strokeDasharray="4 2" strokeWidth={1} />
                )}
                <Area type="monotone" dataKey="재고자산회전일수" stroke="#FE7C39" strokeWidth={2}
                  fill="url(#gradbiInv)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
