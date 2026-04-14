"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/lib/api/client";
import { useFilterStore } from "@/lib/store/filterStore";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";
import SortableTable from "@/components/ui/SortableTable";
import { downloadCsv } from "@/lib/utils/csvExport";

const fmtFx = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
const fmtDelta = (v: number | null | undefined) => v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}` : null;

function KpiCard({ title, value, delta, deltaLabel, sub }: {
  title: string; value: string;
  delta?: number | null; deltaLabel?: string; sub?: string;
}) {
  const deltaColor = delta == null ? "#A1A8B3" : delta >= 0 ? "#16C784" : "#FF4747";
  return (
    <div className="bg-white rounded-lg border p-5 card-hover"
      style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#A1A8B3", marginTop: 2 }}>{sub}</div>}
      {delta != null && (
        <div style={{ fontSize: 13, color: deltaColor, marginTop: 6, fontWeight: 500 }}>
          {fmtDelta(delta)}
          {deltaLabel && <span style={{ color: "#A1A8B3", marginLeft: 4, fontWeight: 400 }}>{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

function CurrencyCalculator({ convRate }: { convRate: number }) {
  const [usdAmt, setUsdAmt] = useState<string>("");
  const [krwAmt, setKrwAmt] = useState<string>("");

  const usdToKrw = usdAmt !== "" && !isNaN(Number(usdAmt))
    ? fmtFx(Number(usdAmt) * convRate)
    : "—";
  const krwToUsd = krwAmt !== "" && !isNaN(Number(krwAmt))
    ? fmtFx(Number(krwAmt) / convRate)
    : "—";

  const inputStyle: React.CSSProperties = {
    background: "#F5F7F8",
    border: "1px solid #DFE3E6",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 16,
    width: 200,
    textAlign: "right",
    outline: "none",
    color: "#1A1A2E",
  };

  return (
    <div className="bg-white rounded-lg border card-hover"
      style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", padding: "20px 24px" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", marginBottom: 20 }}>환율 계산기</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* USD → KRW */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="number"
            value={usdAmt}
            onChange={e => setUsdAmt(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3", whiteSpace: "nowrap" }}>USD</span>
          <span style={{ fontSize: 20, color: "#DFE3E6", padding: "0 8px" }}>=</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#FD5108", minWidth: 160 }}>{usdToKrw}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3" }}>KRW</span>
        </div>
        {/* KRW → USD */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="number"
            value={krwAmt}
            onChange={e => setKrwAmt(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3", whiteSpace: "nowrap" }}>KRW</span>
          <span style={{ fontSize: 20, color: "#DFE3E6", padding: "0 8px" }}>=</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#FD5108", minWidth: 160 }}>{krwToUsd}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3" }}>USD</span>
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "#A1A8B3" }}>
        적용 환율: {fmtFx(convRate)} KRW/USD
      </div>
    </div>
  );
}

const CURRENCIES = ["USD", "EUR", "JPY", "CNY"];
const FX_COLORS: Record<string, string> = {
  USD: "#FD5108", EUR: "#54565A", JPY: "#FE7C39", CNY: "#A1A8B3",
};

export default function ExchangeRatePage() {
  const { marketExchangeYear: year, marketExchangeCurrency: currency } = useFilterStore();
  const [todayRate, setTodayRate] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r => r.json())
      .then(d => {
        const rate = d?.rates?.KRW;
        if (rate) setTodayRate(rate);
      })
      .catch(() => {});
  }, []);

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
    return [i + 1, m?.current ?? null, m?.prior ?? null];
  });

  const FX_COLS = [
    { key: "month",   label: "월",     align: "left"  as const },
    { key: "current", label: "당기환율", align: "right" as const },
    { key: "prior",   label: "전기환율", align: "right" as const },
  ];

  const deltaAvg  = kpi.avg != null && kpi.prev_avg  != null ? kpi.avg - kpi.prev_avg  : null;
  const deltaLast = kpi.last?.value != null && kpi.prev_last != null ? kpi.last.value - kpi.prev_last : null;

  const convRate = todayRate ?? kpi.avg ?? 1300;

  return (
    <div className="space-y-4">
      {/* 오늘 환율 배너 — 임시 숨김 */}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="연평균환율" value={fmtFx(kpi.avg)} delta={deltaAvg} deltaLabel="전년대비"
          sub={kpi.prev_avg != null ? `전년평균 ${fmtFx(kpi.prev_avg)}` : undefined} />
        <KpiCard title={`기말환율${kpi.last?.date ? ` (${kpi.last.date})` : ""}`}
          value={fmtFx(kpi.last?.value)} delta={deltaLast} deltaLabel="전년말대비"
          sub={kpi.prev_last != null ? `전년말 ${fmtFx(kpi.prev_last)}` : undefined} />
        <KpiCard title="연중 최고환율" value={fmtFx(kpi.high?.value)} sub={kpi.high?.date ?? ""} />
        <KpiCard title="연중 최저환율" value={fmtFx(kpi.low?.value)}  sub={kpi.low?.date  ?? ""} />
      </div>

      {/* Chart + Table */}
      <div className="bg-white rounded-lg border overflow-hidden card-hover"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <div style={{ borderRight: "1px solid #EEEFF1" }}>
            <div className="px-5 border-b flex items-center" style={{ borderColor: "#EEEFF1", height: 48 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 환율 추이</span>
            </div>
            {isLoading ? (
              <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>불러오는 중...</div>
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
                    <YAxis tickFormatter={v => v?.toLocaleString()} tick={AXIS_STYLE}
                      tickLine={false} axisLine={false} width={56} domain={["auto", "auto"]} />
                    <Tooltip formatter={(v: any) => fmtFx(v)}
                      contentStyle={TOOLTIP_STYLE} />
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
          <div>
            <div className="px-5 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1", height: 48 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 환율</span>
              <button onClick={() => downloadCsv(["월", "당기환율", "전기환율"], tableRows, `환율_${currency}_${year}`)}
                style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV
              </button>
            </div>
            <div>
              <SortableTable
                columns={FX_COLS}
                rows={tableRows}
                filename={`환율_${currency}_${year}`}
                maxHeight={300}
                loading={isLoading}
                hideCsvButton
              />
            </div>
          </div>
        </div>
      </div>

      {/* Currency Calculator */}
      <CurrencyCalculator convRate={convRate} />
    </div>
  );
}
