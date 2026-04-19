"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import type { PlEntry } from "@/lib/api/client";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

const ACCENT = "#FD5108";

// ─── 전표 테이블 ─────────────────────────────────────────────
function EntryTable({ title, subtitle, entries }: { title: string; subtitle?: string; entries: PlEntry[] }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#A1A8B3", marginTop: 1 }}>{subtitle}</div>}
        </div>
        <span style={{ fontSize: 12, color: "#A1A8B3" }}>{entries.length.toLocaleString()}건</span>
      </div>
      <div style={{ overflowY: "auto", maxHeight: 320 }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#F5F7F8", position: "sticky", top: 0, zIndex: 1 }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#A1A8B3", whiteSpace: "nowrap" }}>일자</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#A1A8B3", whiteSpace: "nowrap" }}>전표번호</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#A1A8B3", whiteSpace: "nowrap" }}>거래처</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#A1A8B3", whiteSpace: "nowrap" }}>적요</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#A1A8B3", whiteSpace: "nowrap" }}>금액</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "28px 12px", textAlign: "center", color: "#A1A8B3" }}>데이터 없음</td></tr>
            ) : entries.map((e, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F5F7F8" }}
                onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = "#FAFBFC")}
                onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "")}>
                <td style={{ padding: "7px 12px", color: "#1A1A2E", whiteSpace: "nowrap" }}>{e.date}</td>
                <td style={{ padding: "7px 12px", color: "#A1A8B3", whiteSpace: "nowrap" }}>{e.je_number}</td>
                <td style={{ padding: "7px 12px", color: "#1A1A2E", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.vendor || "—"}</td>
                <td style={{ padding: "7px 12px", color: "#A1A8B3", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.memo || "—"}</td>
                <td style={{ padding: "7px 12px", textAlign: "right", color: "#1A1A2E", whiteSpace: "nowrap" }}>{formatKRW((e.credit || 0) - (e.debit || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 비교 모드 ───────────────────────────────────────────────
type CompareMode = "전년누적" | "전년동월";

function computeSalesRanges(dateFrom: string, dateTo: string, mode: CompareMode) {
  if (mode === "전년누적") {
    const yr = (s: string) => `${parseInt(s.slice(0, 4)) - 1}${s.slice(4)}`;
    return { currFrom: dateFrom, currTo: dateTo, prevFrom: yr(dateFrom), prevTo: yr(dateTo) };
  }
  const y = parseInt(dateTo.slice(0, 4));
  const m = parseInt(dateTo.slice(5, 7));
  const lastDay = new Date(y, m, 0).getDate();
  const currFrom = `${y}-${String(m).padStart(2, "0")}-01`;
  const currTo = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const prevLastDay = new Date(y - 1, m, 0).getDate();
  return {
    currFrom, currTo,
    prevFrom: `${y - 1}-${String(m).padStart(2, "0")}-01`,
    prevTo: `${y - 1}-${String(m).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`,
  };
}

function fmtDelta(v: number) {
  if (v === 0) return "—";
  return v < 0 ? `(${formatKRW(Math.abs(v))})` : formatKRW(v);
}
function fmtPct(curr: number, prev: number) {
  if (!prev) return "—";
  const p = ((curr - prev) / Math.abs(prev)) * 100;
  return p < 0 ? `(${Math.abs(p).toFixed(1)}%)` : `▲ ${p.toFixed(1)}%`;
}
function pctColor(curr: number, prev: number) {
  if (!prev) return "#A1A8B3";
  return curr >= prev ? "#DC2626" : "#2563EB";
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #DFE3E6", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px #0000001A" }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#1A1A2E" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? p.fill, marginBottom: 2 }}>
          {p.name}: {formatKRW(Number(p.value))}
        </div>
      ))}
    </div>
  );
}

const DONUT_COLORS = ["#D04A02", "#FE7C39", "#FFAA72", "#EB8C00", "#295477", "#688FA8", "#C9A84C", "#7A3B1E", "#4A4A6A", "#A1A8B3"];

export default function SalesPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const [compareMode, setCompareMode] = useState<CompareMode>("전년누적");
  const [categoryFilter, setCategoryFilter] = useState("모두");
  const [vendor1, setVendor1] = useState("");
  const [vendor2, setVendor2] = useState("");

  const ranges = computeSalesRanges(dateFrom, dateTo, compareMode);

  const { data: currSummary } = useQuery({
    queryKey: ["sales-summary-curr", ranges.currFrom, ranges.currTo, categoryFilter],
    queryFn: () => api.sales.summary({ date_from: ranges.currFrom, date_to: ranges.currTo, product_category: categoryFilter === "모두" ? undefined : categoryFilter }),
  });
  const { data: prevSummary } = useQuery({
    queryKey: ["sales-summary-prev", ranges.prevFrom, ranges.prevTo, categoryFilter],
    queryFn: () => api.sales.summary({ date_from: ranges.prevFrom, date_to: ranges.prevTo, product_category: categoryFilter === "모두" ? undefined : categoryFilter }),
  });
  const { data: monthlyData } = useQuery({
    queryKey: ["sales-monthly", dateFrom, dateTo, categoryFilter],
    queryFn: () => api.sales.monthlyTrend({ date_from: dateFrom, date_to: dateTo, product_category: categoryFilter === "모두" ? undefined : categoryFilter }),
  });
  const { data: priorMonthlyData } = useQuery({
    queryKey: ["sales-monthly-prior", dateFrom, dateTo, categoryFilter],
    queryFn: () => {
      const yr = (s: string) => `${parseInt(s.slice(0, 4)) - 1}${s.slice(4)}`;
      return api.sales.monthlyTrend({ date_from: yr(dateFrom), date_to: yr(dateTo), product_category: categoryFilter === "모두" ? undefined : categoryFilter });
    },
  });
  const { data: currVendors } = useQuery({
    queryKey: ["sales-vendors-curr", ranges.currFrom, ranges.currTo, categoryFilter],
    queryFn: () => api.sales.byVendor({ date_from: ranges.currFrom, date_to: ranges.currTo, top_n: 50, product_category: categoryFilter === "모두" ? undefined : categoryFilter }),
  });
  const { data: prevVendors } = useQuery({
    queryKey: ["sales-vendors-prev", ranges.prevFrom, ranges.prevTo, categoryFilter],
    queryFn: () => api.sales.byVendor({ date_from: ranges.prevFrom, date_to: ranges.prevTo, top_n: 50, product_category: categoryFilter === "모두" ? undefined : categoryFilter }),
  });
  const { data: dimensions } = useQuery({
    queryKey: ["sales-dimensions"],
    queryFn: () => api.sales.dimensions(),
  });
  const { data: vendor1Monthly } = useQuery({
    queryKey: ["sales-vendor1-monthly", dateFrom, dateTo, vendor1],
    queryFn: () => api.sales.monthlyTrend({ date_from: dateFrom, date_to: dateTo, vendor: vendor1 }),
    enabled: !!vendor1,
  });
  const { data: vendor2Monthly } = useQuery({
    queryKey: ["sales-vendor2-monthly", dateFrom, dateTo, vendor2],
    queryFn: () => api.sales.monthlyTrend({ date_from: dateFrom, date_to: dateTo, vendor: vendor2 }),
    enabled: !!vendor2,
  });

  const cs = currSummary as any;
  const ps = prevSummary as any;
  const monthly = (monthlyData as any[]) ?? [];
  const priorMonthly = (priorMonthlyData as any[]) ?? [];
  const cVendors = (currVendors as any[]) ?? [];
  const pVendors = (prevVendors as any[]) ?? [];
  const dims = dimensions as any;
  const categories = dims?.product_categories ?? [];
  const vendorList = dims?.vendors ?? [];

  const trendData = useMemo(() => {
    const priorMap = new Map(priorMonthly.map((m: any) => {
      const yr = parseInt(m.month.slice(0, 4)) + 1;
      return [`${yr}${m.month.slice(4)}`, m.revenue ?? 0];
    }));
    return monthly.map((m: any) => ({
      month: parseInt(m.month.slice(5)),
      당기: m.revenue ?? 0,
      전기: priorMap.get(m.month) ?? 0,
    }));
  }, [monthly, priorMonthly]);

  const vendorDelta = useMemo(() => {
    const prevMap = new Map(pVendors.map((v: any) => [v.vendor, v.revenue ?? 0]));
    return cVendors.map((v: any) => ({
      vendor: v.vendor,
      current: v.revenue ?? 0,
      prior: prevMap.get(v.vendor) ?? 0,
      delta: (v.revenue ?? 0) - (prevMap.get(v.vendor) ?? 0),
    }));
  }, [cVendors, pVendors]);

  const topIncrease = [...vendorDelta].sort((a, b) => b.delta - a.delta).filter(v => v.delta > 0).slice(0, 10);
  const topDecrease = [...vendorDelta].sort((a, b) => a.delta - b.delta).filter(v => v.delta < 0).slice(0, 10);

  const totalRevenue = cVendors.reduce((s: number, v: any) => s + (v.revenue ?? 0), 0);
  const top10Vendors = cVendors.slice(0, 10);
  const top10Total = top10Vendors.reduce((s: number, v: any) => s + (v.revenue ?? 0), 0);
  const otherTotal = totalRevenue - top10Total;
  const donutData = [
    ...top10Vendors.map((v: any) => ({ name: v.vendor, value: v.revenue ?? 0 })),
    ...(otherTotal > 0 ? [{ name: "기타", value: otherTotal }] : []),
  ];

  const compareData = useMemo(() => {
    const v1 = (vendor1Monthly as any[]) ?? [];
    const v2 = (vendor2Monthly as any[]) ?? [];
    const all = new Map<string, any>();
    v1.forEach((m: any) => { all.set(m.month, { month: `${m.month.slice(5)}월`, 거래처1: m.revenue ?? 0 }); });
    v2.forEach((m: any) => {
      const existing = all.get(m.month) ?? { month: `${m.month.slice(5)}월` };
      existing.거래처2 = m.revenue ?? 0;
      all.set(m.month, existing);
    });
    return Array.from(all.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [vendor1Monthly, vendor2Monthly]);

  // 전표 내역
  const { data: currEntries = [] } = useQuery({
    queryKey: ["sales-entries-curr", ranges.currFrom, ranges.currTo],
    queryFn: () => api.plTrend.entries({ date_from: ranges.currFrom, date_to: ranges.currTo, account: "제품매출(국내)", period: "current", limit: 9999 }),
  });
  const { data: prevEntries = [] } = useQuery({
    queryKey: ["sales-entries-prev", ranges.prevFrom, ranges.prevTo],
    queryFn: () => api.plTrend.entries({ date_from: ranges.prevFrom, date_to: ranges.prevTo, account: "제품매출(국내)", period: "current", limit: 9999 }),
  });

  // 초기 거래처 선택: 매출 상위 1, 2위
  useEffect(() => {
    if (!vendor1 && !vendor2 && cVendors.length >= 2) {
      setVendor1(cVendors[0].vendor);
      setVendor2(cVendors[1].vendor);
    }
  }, [cVendors]);

  const lastMonthRev = monthly.length > 0 ? monthly[monthly.length - 1]?.revenue ?? 0 : 0;
  const prevMonthRev = monthly.length > 1 ? monthly[monthly.length - 2]?.revenue ?? 0 : 0;
  const momDelta = lastMonthRev - prevMonthRev;
  const currRev = cs?.total_revenue ?? 0;
  const prevRev = ps?.total_revenue ?? 0;
  const currVendorCount = cVendors.length;
  const prevVendorCount = pVendors.length;
  const vendorCountDelta = currVendorCount - prevVendorCount;
  const baseYM = dateTo.slice(0, 7).replace("-", "년 ") + "월";

  return (
    <div className="space-y-5">
      {/* ══ 헤더 ══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#D04A02", whiteSpace: "nowrap" }}>매출분석</span>
        <div style={{ flex: 1, height: 1, backgroundColor: "#C8CDD6" }} />
        <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{baseYM}</span>
        <div style={{ display: "flex", border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden" }}>
          {(["전년누적", "전년동월"] as CompareMode[]).map(mode => (
            <button key={mode} onClick={() => setCompareMode(mode)}
              style={{ padding: "5px 16px", fontSize: 13, border: "none", cursor: "pointer", backgroundColor: compareMode === mode ? "#1A1A2E" : "#fff", color: compareMode === mode ? "#fff" : "#6B7280", fontWeight: compareMode === mode ? 600 : 400 }}>
              {mode}
            </button>
          ))}
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: "5px 12px", fontSize: 13, border: "1px solid #DFE3E6", borderRadius: 6, backgroundColor: "#fff", color: "#374151", cursor: "pointer", minWidth: 100 }}>
          <option value="모두">모두</option>
          {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ══ KPI + 매출 추이 ══ */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr" }}>
          <div style={{ padding: 24, borderRight: "1px solid #EEEFF1" }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#A1A8B3", marginBottom: 6 }}>매출액</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: ACCENT, marginBottom: 16 }}>{formatKRW(currRev)}</div>
            <table style={{ fontSize: 16, width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{ padding: "6px 0", color: "#A1A8B3" }}>전기</td><td style={{ textAlign: "right", color: "#374151", fontWeight: 500 }}>{formatKRW(prevRev)}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#A1A8B3" }}>증감</td><td style={{ textAlign: "right", color: pctColor(currRev, prevRev), fontWeight: 600 }}>{fmtDelta(currRev - prevRev)}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#A1A8B3" }}>△%</td><td style={{ textAlign: "right", color: pctColor(currRev, prevRev), fontWeight: 600 }}>{fmtPct(currRev, prevRev)}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#A1A8B3" }}>전월대비증감</td><td style={{ textAlign: "right", color: pctColor(lastMonthRev, prevMonthRev), fontWeight: 600 }}>{fmtDelta(momDelta)}</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ padding: 24, borderRight: "1px solid #EEEFF1" }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#A1A8B3", marginBottom: 6 }}>거래처수</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#1A1A2E", marginBottom: 16 }}>{currVendorCount}</div>
            <table style={{ fontSize: 16, width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{ padding: "6px 0", color: "#A1A8B3" }}>전기</td><td style={{ textAlign: "right", color: "#374151", fontWeight: 500 }}>{prevVendorCount}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#A1A8B3" }}>증감</td><td style={{ textAlign: "right", color: pctColor(currVendorCount, prevVendorCount), fontWeight: 600 }}>{vendorCountDelta}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#A1A8B3" }}>△%</td><td style={{ textAlign: "right", color: pctColor(currVendorCount, prevVendorCount), fontWeight: 600 }}>{fmtPct(currVendorCount, prevVendorCount)}</td></tr>
                <tr><td style={{ padding: "6px 0", color: "#A1A8B3" }}>전월대비증감</td><td style={{ textAlign: "right", color: "#374151" }}>—</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ padding: "16px 16px 8px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", marginBottom: 4 }}>매출액 추이</div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#A1A8B3", marginBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: ACCENT, display: "inline-block" }} />당기</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 14, height: 2, borderBottom: "2px dashed #A1A8B3", display: "inline-block" }} />전기</span>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={50} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="당기" fill={ACCENT} radius={[2, 2, 0, 0]} barSize={20} name="당기" />
                  <Line type="monotone" dataKey="전기" stroke="#A1A8B3" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="전기" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 거래처 분석 (좌: 도넛 크게 | 우: 증가+감소 위아래) ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 520 }}>

        {/* 좌: 상위 10 당기 비중 — 스크린샷 스타일 */}
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>상위 10개 거래처 당기 비중</span>
            <span style={{ fontSize: 11, color: "#A1A8B3" }}>상위 N 10</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "4px 12px" }}>
            {/* 도넛 + 외부 라벨 — 넓게 */}
            <div style={{ flex: 1, height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="45%" cy="50%"
                    innerRadius={85} outerRadius={150} paddingAngle={1}
                    label={({ name, percent, cx, cy, midAngle, outerRadius, x, y, textAnchor }) => {
                      const pct = (percent * 100).toFixed(1);
                      const displayName = name.length > 10 ? name.slice(0, 10) + "…" : name;
                      return (
                        <text x={x} y={y} textAnchor={textAnchor} fill="#4B5563" fontSize={11} dominantBaseline="central">
                          <title>{name} {pct}%</title>
                          {displayName} {pct}%
                        </text>
                      );
                    }}
                    labelLine={{ stroke: "#CBD1D6", strokeWidth: 1 }}>
                    {donutData.map((_, i) => (<Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v: any, name: any) => [formatKRW(Number(v)), name]} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* 매출액 / 비중 — 우측 끝 */}
            <div style={{ flexShrink: 0, textAlign: "right", paddingRight: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>매출액</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: ACCENT, marginBottom: 20 }}>{formatKRW(top10Total)}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>비중</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: ACCENT }}>{totalRevenue ? ((top10Total / totalRevenue) * 100).toFixed(2) : 0}%</div>
            </div>
          </div>
        </div>

        {/* 우: 증가 + 감소 위아래 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 증가 거래처 */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1", flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>상위 10개 매출액 증가 거래처</span>
            </div>
            <div style={{ padding: "6px 16px", flex: 1, overflowY: "auto" }}>
              {topIncrease.length === 0 ? (
                <div style={{ textAlign: "center", color: "#A1A8B3", padding: 16, fontSize: 13 }}>데이터 없음</div>
              ) : topIncrease.map((v) => {
                const maxDelta = topIncrease[0]?.delta ?? 1;
                return (
                  <div key={v.vendor} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                    <span style={{ fontSize: 11, color: "#6B7280", width: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }} title={v.vendor}>{v.vendor}</span>
                    <div style={{ flex: 1, height: 14, backgroundColor: "#FFF5ED", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(v.delta / maxDelta) * 100}%`, height: "100%", backgroundColor: "#FFAA72", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600, whiteSpace: "nowrap", minWidth: 80, textAlign: "right" }}>{formatKRW(v.delta)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 감소 거래처 */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1", flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>상위 10개 매출액 감소 거래처</span>
            </div>
            <div style={{ padding: "6px 16px", flex: 1, overflowY: "auto" }}>
              {topDecrease.length === 0 ? (
                <div style={{ textAlign: "center", color: "#A1A8B3", padding: 16, fontSize: 13 }}>데이터 없음</div>
              ) : topDecrease.map((v) => {
                const maxDelta = Math.abs(topDecrease[0]?.delta ?? 1);
                return (
                  <div key={v.vendor} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                    <span style={{ fontSize: 11, color: "#6B7280", width: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }} title={v.vendor}>{v.vendor}</span>
                    <div style={{ flex: 1, height: 14, backgroundColor: "#EFF6FF", borderRadius: 3, overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ width: `${(Math.abs(v.delta) / maxDelta) * 100}%`, height: "100%", backgroundColor: "#93C5FD", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600, whiteSpace: "nowrap", minWidth: 80, textAlign: "right" }}>({formatKRW(Math.abs(v.delta))})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 거래처별 비교 ══ */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>거래처별 비교</span>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={vendor1} onChange={e => setVendor1(e.target.value)}
              style={{ padding: "4px 10px", fontSize: 12, border: "1px solid #DFE3E6", borderRadius: 5, backgroundColor: "#fff", color: "#374151", cursor: "pointer", maxWidth: 180 }}>
              <option value="">거래처 1 선택</option>
              {vendorList.map((v: string) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={vendor2} onChange={e => setVendor2(e.target.value)}
              style={{ padding: "4px 10px", fontSize: 12, border: "1px solid #DFE3E6", borderRadius: 5, backgroundColor: "#fff", color: "#374151", cursor: "pointer", maxWidth: 180 }}>
              <option value="">거래처 2 선택</option>
              {vendorList.map((v: string) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ height: 240, padding: "16px 12px 8px" }}>
          {(!vendor1 && !vendor2) ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#A1A8B3", fontSize: 13 }}>거래처를 선택하면 월별 매출 비교 차트가 표시됩니다</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={compareData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {vendor1 && <Line type="monotone" dataKey="거래처1" stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} name={vendor1} />}
                {vendor2 && <Line type="monotone" dataKey="거래처2" stroke="#295477" strokeWidth={2} dot={{ r: 3 }} name={vendor2} />}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ══ 당기/전기 전표 내역 ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <EntryTable title="당기 전표 내역" subtitle={`${ranges.currFrom} ~ ${ranges.currTo}`} entries={currEntries as PlEntry[]} />
        <EntryTable title="전기 전표 내역" subtitle={`${ranges.prevFrom} ~ ${ranges.prevTo}`} entries={prevEntries as PlEntry[]} />
      </div>

    </div>
  );
}
