"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
  ReferenceLine, Cell, ComposedChart, Area,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE } from "@/lib/utils/chartColors";

// ─── PwC 컬러 팔레트 ──────────────────────────────────────
// Orange: #FD5108 → #FE7C39 → #FFAA72 → #FFCDA8 → #FFE8D4 → #FFF5ED
// Grey:   #A1A8B3 → #B5BCC4 → #CBD1D6 → #DFE3E6 → #EEEFF1 → #F5F7F8
const KPI_COLORS = {
  revenue:          "#FD5108",  // PwC Orange (주색)
  gross_profit:     "#FE7C39",  // PwC Medium Orange
  operating_income: "#FFAA72",  // PwC Light Orange
  net_income:       "#54565A",  // PwC Dark Gray — 흰 배경 가시성 확보
};
const PRIOR_COLOR = "#B5BCC4";  // PwC Medium Grey (전기 비교용)

// ─── 도넛 게이지 (진입 arc 애니메이션 + hover glow) ──────
function DonutGauge({ value, color, size = 72 }: { value: number; color: string; size?: number }) {
  const pct = Math.min(Math.abs(value), 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const [animated, setAnimated] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const uid = `donut-${color.replace("#", "")}-${size}`;
  const glowId = `glow-${uid}`;

  return (
    <svg
      width={size} height={size} viewBox="0 0 72 72"
      style={{ cursor: "default", filter: hovered ? `drop-shadow(0 0 6px ${color}66)` : "none", transition: "filter 0.2s" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <defs>
        <style>{`
          @keyframes donut-draw-${uid} {
            from { stroke-dasharray: 0 ${circ}; }
            to   { stroke-dasharray: ${dash} ${circ - dash}; }
          }
        `}</style>
      </defs>
      {/* 배경 트랙 */}
      <circle cx="36" cy="36" r={r} fill="none" stroke="#EEEFF1" strokeWidth="9" />
      {/* 진행 arc */}
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth={hovered ? "10" : "9"}
        strokeDasharray={animated ? `${dash} ${circ - dash}` : `0 ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{
          transition: animated
            ? `stroke-dasharray 0.75s cubic-bezier(0.4,0,0.2,1), stroke-width 0.15s`
            : "none",
        }}
      />
      {/* 중앙 텍스트 */}
      <text
        x="36" y="40" textAnchor="middle"
        fontSize={hovered ? "13" : "12"} fontWeight="700" fill={color}
        style={{ transition: "font-size 0.15s" }}
      >
        {value.toFixed(1)}%
      </text>
    </svg>
  );
}

// ─── 섹션 헤더 (구분선 색상 강화) ────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: "#C8CDD6" }} />
    </div>
  );
}

// ─── KPI + 차트 카드 ──────────────────────────────────────
function KpiChartCell({
  label, color, current, prior, changePct, margin, marginLabel,
  chartData, dataKey, priorKey,
}: {
  label: string; color: string; current: number; prior: number;
  changePct: number; margin?: number; marginLabel?: string;
  chartData: Record<string, unknown>[]; dataKey: string; priorKey: string;
}) {
  const delta = current - prior;
  const deltaColor = delta >= 0 ? "#16C784" : "#FF4747";
  const [hov, setHov] = useState(false);

  return (
    <div
      className="bg-white rounded-lg border overflow-hidden"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderColor: hov ? "rgba(253,81,8,0.25)" : "#DFE3E6",
        boxShadow: hov
          ? "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"
          : "var(--shadow-card)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease",
      }}>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1.5fr" }}>

        {/* 좌: KPI */}
        <div className="p-5" style={{ borderRight: "1px solid #EEEFF1" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
            {formatKRW(current)}
          </div>

          {/* 이익률 도넛 */}
          {margin !== undefined && (
            <div className="flex items-center gap-2 mt-3">
              <DonutGauge value={margin} color={color} />
              <span style={{ fontSize: 13, color: "#A1A8B3" }}>{marginLabel}</span>
            </div>
          )}

          {/* 전기/증감/증감% */}
          <div className="mt-3 space-y-1.5" style={{ fontSize: 13 }}>
            <div className="flex justify-between">
              <span style={{ color: "#A1A8B3" }}>전기</span>
              <span style={{ color: "#374151" }}>{formatKRW(prior)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#A1A8B3" }}>증감</span>
              <span style={{ color: deltaColor, fontWeight: 500 }}>
                {delta >= 0 ? "+" : ""}{formatKRW(delta)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#A1A8B3" }}>증감%</span>
              <span style={{ color: deltaColor, fontWeight: 500 }}>
                {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 우: 차트 (PL추이분석 스타일 라인+영역) */}
        <div style={{ position: "relative", flex: 1, minHeight: 180, padding: "36px 8px 8px 4px" }}>
          {/* 범례 — 우측 상단 절대 위치 */}
          <div style={{ position: "absolute", top: 10, right: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#A1A8B3" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 20, height: 2, backgroundColor: color, display: "inline-block", borderRadius: 1 }} />당기
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 20, height: 2, background: `repeating-linear-gradient(90deg,${PRIOR_COLOR} 0,${PRIOR_COLOR} 4px,transparent 4px,transparent 7px)`, display: "inline-block" }} />전기
            </span>
          </div>
          <div style={{ height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ ...AXIS_STYLE, fontSize: 10 }} tickLine={false} axisLine={false}
                  interval={0}
                  tick={({ x, y, payload, index }: any) => {
                    // 분기(3, 6, 9, 12월)만 표시
                    const mo = String(payload.value ?? "").split(".")[1];
                    if (!["03","06","09","12"].includes(mo)) return <g />;
                    return <text x={x} y={y + 10} textAnchor="middle" fill="#A1A8B3" fontSize={10}>{payload.value}</text>;
                  }}
                />
                <YAxis tickFormatter={(v: number) => formatKRW(v)} tick={{ ...AXIS_STYLE, fontSize: 10 }}
                  tickLine={false} axisLine={false} width={72} />
                <Tooltip
                  formatter={(v: number) => formatKRW(v)}
                  contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px #0000001A" }}
                />
                {/* 전기 — 점선 */}
                <Line type="monotone" dataKey={priorKey} stroke={PRIOR_COLOR} strokeWidth={1.5}
                  strokeDasharray="4 3" dot={false} name="전기" />
                {/* 당기 — 실선 + 영역 */}
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
                  fill={`url(#grad-${dataKey})`} dot={false} name="당기" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 이익률 추이 차트 ─────────────────────────────────────
function MarginTrendChart({
  title, color, chartData, dataKey, priorKey,
}: {
  title: string; color: string;
  chartData: Record<string, unknown>[]; dataKey: string; priorKey: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="bg-white rounded-lg border overflow-hidden"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderColor: hov ? "rgba(253,81,8,0.25)" : "#DFE3E6",
        boxShadow: hov
          ? "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"
          : "var(--shadow-card)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease",
      }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{title}</span>
      </div>
      <div style={{ height: 200, padding: "12px 8px 10px 4px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ ...AXIS_STYLE, fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ ...AXIS_STYLE, fontSize: 10 }}
              tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
            <Tooltip
              formatter={(v: number) => `${v?.toFixed(1)}%`}
              contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px #0000001A" }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 4 }} />
            <Line type="monotone" dataKey={priorKey} stroke={PRIOR_COLOR} strokeWidth={1.5}
              strokeDasharray="4 3" dot={false} name="전기"
              animationDuration={900} animationEasing="ease-out" />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
              dot={false} name="당기"
              animationDuration={1100} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── makeXTick 헬퍼 (3개월마다 + 마지막 항상 표시) ───────────
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

// ─── 범례 컴포넌트 (우측 상단 정렬) ─────────────────────────
function InlineLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", paddingRight: 4, paddingBottom: 4, flexWrap: "wrap" }}>
      {items.map(it => (
        <span key={it.label} style={{ display: "flex", alignItems: "center", gap: 5,
          fontSize: 13, fontWeight: 400, color: "#A1A8B3" }}>
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

// ─── 월별 이익 추이 차트 (Waterfall 대체) ─────────────────────
function PlBridgeChart({ waterfallData }: { waterfallData: any[] }) {
  const data = waterfallData.map(d => {
    const gp  = (d.revenue ?? 0) - (d.cogs ?? 0);
    const op  = gp - (d.sga ?? 0);
    const net = op + (d.other ?? 0);
    return {
      month: String(d.month).slice(2, 4) + "." + String(d.month).slice(5),
      매출총이익: gp,
      영업이익: op,
      당기순이익: net,
    };
  });

  const XTick = makeXTick(data.length);

  const [hov, setHov] = useState(false);
  return (
    <div
      className="bg-white rounded-lg border overflow-hidden"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderColor: hov ? "rgba(253,81,8,0.25)" : "#DFE3E6",
        boxShadow: hov
          ? "0 8px 28px rgba(253,81,8,0.11), 0 2px 8px rgba(0,0,0,0.06)"
          : "var(--shadow-card)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease",
      }}>
      <div className="px-5 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "#EEEFF1" }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 이익 추이</span>
        <InlineLegend items={[
          { label: "매출총이익", color: "#FD5108" },
          { label: "영업이익",   color: "#FE7C39", dashed: true },
          { label: "당기순이익", color: "#54565A", dashed: true },
        ]} />
      </div>
      <div style={{ height: 280, padding: "12px 12px 8px 4px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF1" vertical={false} />
            <XAxis dataKey="month" tick={XTick} tickLine={false} axisLine={false} interval={0} />
            <YAxis tickFormatter={(v: number) => formatKRW(v)}
              tick={{ fontSize: 10, fill: "#A1A8B3" }}
              tickLine={false} axisLine={false} width={72} />
            <Tooltip
              formatter={(v: number) => formatKRW(v)}
              contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 12,
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
            <ReferenceLine y={0} stroke="#DFE3E6" strokeWidth={1.5} />
            <Line type="monotone" dataKey="매출총이익" stroke="#FD5108" strokeWidth={2}
              dot={false} name="매출총이익" />
            <Line type="monotone" dataKey="영업이익" stroke="#FE7C39" strokeWidth={2}
              strokeDasharray="5 3" dot={false} name="영업이익" />
            <Line type="monotone" dataKey="당기순이익" stroke="#54565A" strokeWidth={2}
              strokeDasharray="5 3" dot={false} name="당기순이익" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────
export default function PlSummaryPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ["pl-kpi-monthly", dateFrom, dateTo],
    queryFn: () => api.financialStatements.plKpiMonthly({ date_from: dateFrom, date_to: dateTo }),
  });

  const { data: waterfallRaw, isLoading: waterfallLoading } = useQuery({
    queryKey: ["pl-waterfall-monthly", dateFrom, dateTo],
    queryFn: () => api.financialStatements.plWaterfallMonthly({ date_from: dateFrom, date_to: dateTo }),
  });

  const summary  = (kpiData as any)?.summary ?? {};
  const monthly: any[] = (kpiData as any)?.monthly ?? [];
  const waterfallData: any[] = Array.isArray(waterfallRaw) ? waterfallRaw : [];

  const rev = summary.revenue          ?? {};
  const gp  = summary.gross_profit     ?? {};
  const op  = summary.operating_income ?? {};
  const net = summary.net_income       ?? {};

  // 차트용: month label + 이익률 계산
  const chartData = monthly.map((m: any) => {
    const r = m.revenue || 1;
    return {
      ...m,
      monthLabel: String(m.month).slice(2, 4) + "." + String(m.month).slice(5),
      gp_margin:    r ? +(m.gross_profit     / r * 100).toFixed(2) : 0,
      op_margin:    r ? +(m.operating_income / r * 100).toFixed(2) : 0,
      net_margin:   r ? +(m.net_income       / r * 100).toFixed(2) : 0,
      prior_gp_margin:  m.prior_revenue ? +(m.prior_gross_profit     / m.prior_revenue * 100).toFixed(2) : 0,
      prior_op_margin:  m.prior_revenue ? +(m.prior_operating_income / m.prior_revenue * 100).toFixed(2) : 0,
      prior_net_margin: m.prior_revenue ? +(m.prior_net_income       / m.prior_revenue * 100).toFixed(2) : 0,
    };
  });

  if (kpiLoading || waterfallLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "#A1A8B3" }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ══ 1. KPI 카드 4개 (2×2) ══ */}
      <div className="grid grid-cols-2 gap-4">
        <KpiChartCell
          label="매출액" color={KPI_COLORS.revenue}
          current={rev.current ?? 0} prior={rev.prior ?? 0} changePct={rev.change_pct ?? 0}
          margin={rev.change_pct ?? 0} marginLabel="YoY 증감률"
          chartData={chartData} dataKey="revenue" priorKey="prior_revenue"
        />
        <KpiChartCell
          label="매출총이익" color={KPI_COLORS.gross_profit}
          current={gp.current ?? 0} prior={gp.prior ?? 0} changePct={gp.change_pct ?? 0}
          margin={gp.margin} marginLabel="매출총이익률"
          chartData={chartData} dataKey="gross_profit" priorKey="prior_gross_profit"
        />
        <KpiChartCell
          label="영업이익" color={KPI_COLORS.operating_income}
          current={op.current ?? 0} prior={op.prior ?? 0} changePct={op.change_pct ?? 0}
          margin={op.margin} marginLabel="영업이익률"
          chartData={chartData} dataKey="operating_income" priorKey="prior_operating_income"
        />
        <KpiChartCell
          label="당기순이익" color={KPI_COLORS.net_income}
          current={net.current ?? 0} prior={net.prior ?? 0} changePct={net.change_pct ?? 0}
          margin={net.margin} marginLabel="당기순이익률"
          chartData={chartData} dataKey="net_income" priorKey="prior_net_income"
        />
      </div>

      {/* ══ 2. 이익률 추이 ══ */}
      <div>
        <SectionHeader title="이익률 추이" />
        <div className="grid grid-cols-3 gap-4">
          <MarginTrendChart
            title="매출총이익률 추이" color={KPI_COLORS.gross_profit}
            chartData={chartData} dataKey="gp_margin" priorKey="prior_gp_margin"
          />
          <MarginTrendChart
            title="영업이익률 추이" color={KPI_COLORS.operating_income}
            chartData={chartData} dataKey="op_margin" priorKey="prior_op_margin"
          />
          <MarginTrendChart
            title="당기순이익률 추이" color={KPI_COLORS.net_income}
            chartData={chartData} dataKey="net_margin" priorKey="prior_net_margin"
          />
        </div>
      </div>

      {/* ══ 3. 월별 이익 추이 ══ */}
      <div>
        <SectionHeader title="월별 이익 추이" />
        <PlBridgeChart waterfallData={waterfallData} />
      </div>

    </div>
  );
}
