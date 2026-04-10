"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/lib/api/client";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

// ─── 공통 스타일 상수 ────────────────────────────────────
const FS = 14;
const LS = "-0.3px";

const FILTER_BAR: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  backgroundColor: "#F5F7F8",
  border: "1px solid #DFE3E6",
  borderRadius: 8,
  padding: "10px 16px",
};


const DIVIDER = (
  <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6", flexShrink: 0 }} />
);

// ─── 포맷터 ──────────────────────────────────────────────
const fmtRate = (v: number | null | undefined) =>
  v != null ? v.toFixed(2) + "%" : "—";
const fmtFx = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
const fmtDelta = (v: number | null | undefined, decimals = 2) =>
  v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}` : null;

// ─── KPI 카드 ─────────────────────────────────────────────
function KpiCard({
  title, value, delta, deltaLabel, sub,
}: {
  title: string; value: string;
  delta?: number | null; deltaLabel?: string; sub?: string;
}) {
  const deltaColor =
    delta == null ? "#A1A8B3" : delta >= 0 ? "#16C784" : "#FF4747";
  return (
    <div className="bg-white rounded-lg border p-5"
      style={{ borderColor: "#DFE3E6", boxShadow: "0 1px 3px #0000000D" }}>
      <div style={{ fontSize: 12, color: "#A1A8B3", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#1A1A2E", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#A1A8B3", marginTop: 2 }}>{sub}</div>}
      {delta != null && (
        <div style={{ fontSize: 12, color: deltaColor, marginTop: 6, fontWeight: 500 }}>
          {fmtDelta(delta)}
          {deltaLabel && (
            <span style={{ color: "#A1A8B3", marginLeft: 4, fontWeight: 400 }}>{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 금리 섹션 ────────────────────────────────────────────
const RATE_YEARS = ["2022", "2023", "2024", "2025", "2026"];

function InterestRateSection() {
  const [startYear, setStartYear] = useState("2024");

  const { data, isLoading } = useQuery({
    queryKey: ["interest-rates", startYear],
    queryFn: () => marketApi.interestRates(startYear),
  });

  const monthly: any[] = data?.monthly ?? [];
  const latest = data?.latest ?? {};
  const asOf = latest.as_of ?? "";

  const chartData = monthly.map((m: any) => ({
    date: m.date.slice(2, 4) + "." + m.date.slice(5),
    "CD(91일)": m.cd91,
    "국고채(3년)": m.gov3yr,
    "국고채(5년)": m.gov5yr,
  }));

  const tableRows = monthly.slice().reverse().map((m: any) => [
    m.date,
    m.cd91?.toFixed(2)   ?? "—",
    m.gov3yr?.toFixed(2) ?? "—",
    m.gov5yr?.toFixed(2) ?? "—",
  ]);

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div style={FILTER_BAR}>
        <span style={{ fontSize: FS, fontWeight: 600, color: "#1A1A2E", letterSpacing: LS, whiteSpace: "nowrap" }}>
          금리
        </span>
        {DIVIDER}
        <span style={{ fontSize: FS, color: "#A1A8B3", letterSpacing: LS, whiteSpace: "nowrap" }}>조회 시작</span>
        <CustomSelect
          value={startYear}
          onChange={v => setStartYear(String(v))}
          options={RATE_YEARS.map(y => ({ value: y, label: `${y}년 1월` }))}
        />
      </div>

      {/* KPI 3개 */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          title={`CD(91일) 기말금리${asOf ? ` (${asOf})` : ""}`}
          value={fmtRate(latest.cd91?.value)}
          delta={latest.cd91?.delta}
          deltaLabel="전월대비"
        />
        <KpiCard
          title={`국고채(3년) 기말금리${asOf ? ` (${asOf})` : ""}`}
          value={fmtRate(latest.gov3yr?.value)}
          delta={latest.gov3yr?.delta}
          deltaLabel="전월대비"
        />
        <KpiCard
          title={`국고채(5년) 기말금리${asOf ? ` (${asOf})` : ""}`}
          value={fmtRate(latest.gov5yr?.value)}
          delta={latest.gov5yr?.delta}
          deltaLabel="전월대비"
        />
      </div>

      {/* 차트 + 테이블 */}
      <div className="bg-white rounded-lg border overflow-hidden"
        style={{ borderColor: "#DFE3E6", boxShadow: "0 1px 3px #0000000D" }}>
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          {/* 차트 */}
          <div style={{ borderRight: "1px solid #EEEFF1" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>금리 추이</span>
            </div>
            {isLoading ? (
              <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>
                불러오는 중...
              </div>
            ) : (
              <div style={{ height: 280, padding: "14px 8px 10px 8px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 44, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} interval={0}
                      tick={({ x, y, payload }: any) => {
                        const mo = String(payload.value ?? "").split(".")[1];
                        if (!["03","06","09","12"].includes(mo)) return <g />;
                        return <text x={x} y={y + 10} textAnchor="middle" fill="#A1A8B3" fontSize={10}>{payload.value}</text>;
                      }}
                    />
                    <YAxis tickFormatter={v => v + "%"} tick={AXIS_STYLE} tickLine={false} axisLine={false}
                      width={44} domain={["auto", "auto"]} />
                    <Tooltip formatter={(v: number) => v?.toFixed(2) + "%"} />
                    <Legend wrapperStyle={{ fontSize: 13, paddingLeft: 44, paddingTop: 4 }} />
                    <Line type="monotone" dataKey="CD(91일)"    stroke="#FD5108" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="국고채(3년)" stroke="#6B7280" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="국고채(5년)" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 테이블 */}
          <div style={{ overflowY: "auto", maxHeight: 340 }}>
            <table className="w-full text-sm">
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ backgroundColor: "#F5F7F8" }}>
                  {["일자", "CD(91일)", "국고채(3년)", "국고채(5년)"].map((h, i) => (
                    <th key={i}
                      className={`${i === 0 ? "text-left" : "text-right"} px-5 py-2.5 font-semibold`}
                      style={{ color: "#A1A8B3" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#A1A8B3" }}>불러오는 중...</td></tr>
                ) : tableRows.map((row: any[], i: number) => (
                  <tr key={i} className="border-t" style={{ borderColor: "#EEEFF1" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAFBFC")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}>
                    {row.map((cell, j) => (
                      <td key={j}
                        className={`${j === 0 ? "text-left" : "text-right"} px-5 py-2`}
                        style={{ fontVariantNumeric: "tabular-nums", color: "#1A1A2E" }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 환율 섹션 ────────────────────────────────────────────
const CURRENCIES = ["USD", "EUR", "JPY", "CNY"];
const FX_COLORS: Record<string, string> = {
  USD: "#FD5108",
  EUR: "#1A1A2E",
  JPY: "#D04A02",
  CNY: "#EB8C00",
};

function ExchangeRateSection() {
  const thisYear = new Date().getFullYear();
  const FX_YEARS = Array.from({ length: 5 }, (_, i) => String(thisYear - i));
  const [year, setYear] = useState(String(thisYear - 1));
  const [currency, setCurrency] = useState("USD");

  const { data, isLoading } = useQuery({
    queryKey: ["exchange-rate", year, currency],
    queryFn: () => marketApi.exchangeRate(year, currency),
  });

  const monthly: any[] = data?.monthly ?? [];
  const kpi = data?.kpi ?? {};
  const accent = FX_COLORS[currency] ?? "#FD5108";

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = monthly.find((r: any) => r.month === i + 1);
    return { month: `${i + 1}월`, 당기환율: m?.current ?? null, 전기환율: m?.prior ?? null };
  });

  const tableRows = Array.from({ length: 12 }, (_, i) => {
    const m = monthly.find((r: any) => r.month === i + 1);
    return [
      `${i + 1}월`,
      m?.current != null ? fmtFx(m.current) : "—",
      m?.prior   != null ? fmtFx(m.prior)   : "—",
    ];
  });

  const deltaAvg  = kpi.avg != null && kpi.prev_avg  != null ? kpi.avg - kpi.prev_avg  : null;
  const deltaLast = kpi.last?.value != null && kpi.prev_last != null ? kpi.last.value - kpi.prev_last : null;

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div style={FILTER_BAR}>
        <span style={{ fontSize: FS, fontWeight: 600, color: "#1A1A2E", letterSpacing: LS, whiteSpace: "nowrap" }}>
          환율
        </span>
        {DIVIDER}
        <span style={{ fontSize: FS, color: "#A1A8B3", letterSpacing: LS, whiteSpace: "nowrap" }}>연도</span>
        <CustomSelect
          value={year}
          onChange={v => setYear(String(v))}
          options={FX_YEARS.map(y => ({ value: y, label: `${y}년` }))}
        />
        {DIVIDER}
        <span style={{ fontSize: FS, color: "#A1A8B3", letterSpacing: LS, whiteSpace: "nowrap" }}>통화</span>
        <CustomSelect
          value={currency}
          onChange={v => setCurrency(String(v))}
          options={CURRENCIES}
        />
      </div>

      {/* KPI 4개 */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="연평균환율"
          value={fmtFx(kpi.avg)}
          delta={deltaAvg}
          deltaLabel="전년대비"
          sub={kpi.prev_avg != null ? `전년평균 ${fmtFx(kpi.prev_avg)}` : undefined}
        />
        <KpiCard
          title={`기말환율${kpi.last?.date ? ` (${kpi.last.date})` : ""}`}
          value={fmtFx(kpi.last?.value)}
          delta={deltaLast}
          deltaLabel="전년말대비"
          sub={kpi.prev_last != null ? `전년말 ${fmtFx(kpi.prev_last)}` : undefined}
        />
        <KpiCard
          title="연중 최고환율"
          value={fmtFx(kpi.high?.value)}
          sub={kpi.high?.date ?? ""}
        />
        <KpiCard
          title="연중 최저환율"
          value={fmtFx(kpi.low?.value)}
          sub={kpi.low?.date ?? ""}
        />
      </div>

      {/* 차트 + 테이블 */}
      <div className="bg-white rounded-lg border overflow-hidden"
        style={{ borderColor: "#DFE3E6", boxShadow: "0 1px 3px #0000000D" }}>
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          {/* 차트 */}
          <div style={{ borderRight: "1px solid #EEEFF1" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>월별 환율 추이</span>
            </div>
            {isLoading ? (
              <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>
                불러오는 중...
              </div>
            ) : (
              <div style={{ height: 280, padding: "14px 8px 10px 8px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="fxGradCur" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={accent} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fxGradPri" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#A1A8B3" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#A1A8B3" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={v => v?.toLocaleString()}
                      tick={AXIS_STYLE} tickLine={false} axisLine={false}
                      width={56} domain={["auto", "auto"]}
                    />
                    <Tooltip
                      formatter={(v: number) => fmtFx(v)}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Legend wrapperStyle={{ fontSize: 13, paddingLeft: 56, paddingTop: 4 }} />
                    <Area type="monotone" dataKey="전기환율" stroke="#A1A8B3" strokeWidth={1.5}
                      strokeDasharray="4 3" fill="url(#fxGradPri)" dot={false} />
                    <Area type="monotone" dataKey="당기환율" stroke={accent} strokeWidth={2}
                      fill="url(#fxGradCur)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 테이블 */}
          <div style={{ overflowY: "auto", maxHeight: 340 }}>
            <table className="w-full text-sm">
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ backgroundColor: "#F5F7F8" }}>
                  {["월", "당기환율", "전기환율"].map((h, i) => (
                    <th key={i}
                      className={`${i === 0 ? "text-left" : "text-right"} px-5 py-2.5 font-semibold`}
                      style={{ color: "#A1A8B3" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={3} style={{ padding: "24px", textAlign: "center", color: "#A1A8B3" }}>불러오는 중...</td></tr>
                ) : tableRows.map((row, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "#EEEFF1" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAFBFC")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}>
                    {row.map((cell, j) => (
                      <td key={j}
                        className={`${j === 0 ? "text-left" : "text-right"} px-5 py-2`}
                        style={{ fontVariantNumeric: "tabular-nums", color: "#1A1A2E" }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────
export default function MarketPage() {
  return (
    <div className="space-y-8">
      <InterestRateSection />
      <ExchangeRateSection />
    </div>
  );
}
