"use client";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/lib/api/client";
import { useFilterStore } from "@/lib/store/filterStore";
import SortableTable from "@/components/ui/SortableTable";
import { downloadCsv } from "@/lib/utils/csvExport";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

const fmtRate = (v: number | null | undefined) => v != null ? v.toFixed(2) + "%" : "—";
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
      {sub && <div style={{ fontSize: 11, color: "#A1A8B3", marginTop: 2 }}>{sub}</div>}
      {delta != null && (
        <div style={{ fontSize: 12, color: deltaColor, marginTop: 6, fontWeight: 500 }}>
          {fmtDelta(delta)}
          {deltaLabel && <span style={{ color: "#A1A8B3", marginLeft: 4, fontWeight: 400 }}>{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

export default function InterestRatePage() {
  const { marketRateYear: startYear } = useFilterStore();

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

  const tableRows = monthly.map((m: any) => [
    m.date,
    m.cd91    != null ? m.cd91    : null,
    m.gov3yr  != null ? m.gov3yr  : null,
    m.gov5yr  != null ? m.gov5yr  : null,
  ]);

  const RATE_COLS = [
    { key: "date",   label: "일자",       align: "left"  as const },
    { key: "cd91",   label: "CD(91일)",   align: "right" as const },
    { key: "gov3yr", label: "국고채(3년)", align: "right" as const },
    { key: "gov5yr", label: "국고채(5년)", align: "right" as const },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard title={`CD(91일) 기말금리${asOf ? ` (${asOf})` : ""}`}
          value={fmtRate(latest.cd91?.value)} delta={latest.cd91?.delta} deltaLabel="전월대비" />
        <KpiCard title={`국고채(3년) 기말금리${asOf ? ` (${asOf})` : ""}`}
          value={fmtRate(latest.gov3yr?.value)} delta={latest.gov3yr?.delta} deltaLabel="전월대비" />
        <KpiCard title={`국고채(5년) 기말금리${asOf ? ` (${asOf})` : ""}`}
          value={fmtRate(latest.gov5yr?.value)} delta={latest.gov5yr?.delta} deltaLabel="전월대비" />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden card-hover"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <div style={{ borderRight: "1px solid #EEEFF1" }}>
            <div className="px-5 border-b flex items-center" style={{ borderColor: "#EEEFF1", height: 48 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>금리 추이</span>
            </div>
            {isLoading ? (
              <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>불러오는 중...</div>
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
                    <Tooltip formatter={(v: any) => v?.toFixed(2) + "%"}
                      contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 13, paddingLeft: 44, paddingTop: 4 }} />
                    <Line type="monotone" dataKey="CD(91일)"    stroke="#FD5108" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="국고채(3년)" stroke="#54565A" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="국고채(5년)" stroke="#A1A8B3" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div>
            <div className="px-5 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1", height: 48 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 금리</span>
              <button onClick={() => downloadCsv(["일자", "CD(91일)", "국고채(3년)", "국고채(5년)"], tableRows, `금리_${startYear}`)}
                style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV
              </button>
            </div>
            <div>
              <SortableTable
                columns={RATE_COLS}
                rows={tableRows}
                filename={`금리_${startYear}`}
                maxHeight={300}
                loading={isLoading}
                hideCsvButton
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
