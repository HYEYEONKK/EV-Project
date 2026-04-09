"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, BsMonthly, BsAccountDelta } from "@/lib/api/client";
import DateRangeFilterBar from "@/components/ui/DateRangeFilterBar";
import { formatKRW, formatPct, chartAxisFormatter } from "@/lib/utils/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";

// ─── 자산/부채/자본 분류 헬퍼 ─────────────────────────────
const ASSET_BRANCHES = ["유동자산", "비유동자산", "자산"];
const LIAB_BRANCHES = ["유동부채", "비유동부채", "부채"];
const EQUITY_BRANCHES = ["자본"];

function classifyBranch(branch: string): "자산" | "부채" | "자본" | "기타" {
  const b = branch || "";
  if (ASSET_BRANCHES.some((x) => b.includes(x))) return "자산";
  if (LIAB_BRANCHES.some((x) => b.includes(x))) return "부채";
  if (EQUITY_BRANCHES.some((x) => b.includes(x))) return "자본";
  return "기타";
}

// 스택바 컬러 — 자산 구성
const ASSET_COLORS: Record<string, string> = {
  "유동자산": "#FD5108",
  "비유동자산": "#1A1A2E",
  "자산": "#FE7C39",
};
// 부채+자본 구성
const LIAB_COLORS: Record<string, string> = {
  "유동부채": "#FD5108",
  "비유동부채": "#FE7C39",
  "부채": "#FFAA72",
  "자본": "#6B7280",
};

// ─── 커스텀 툴팁 ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #DFE3E6", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px #0000001A" }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#1A1A2E" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {formatKRW(Number(p.value))}
        </div>
      ))}
    </div>
  );
}

// ─── KPI 카드 ─────────────────────────────────────────────
function KpiCard({ label, value, change, color = "#FD5108" }: { label: string; value: number; change?: number; color?: string }) {
  return (
    <div className="card-hover" style={{ background: "#fff", border: "1px solid #DFE3E6", borderRadius: 8, padding: "16px 20px", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 14, fontWeight: 500, color, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px" }}>{formatKRW(value)}</div>
      {change !== undefined && (
        <div style={{ fontSize: 12, color: change >= 0 ? "#059669" : "#DC2626", marginTop: 4 }}>
          {formatPct(change)} YoY
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────
export default function BsTrendPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const params = { date_from: dateFrom, date_to: dateTo };

  const { data: monthlyRaw = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ["bs-monthly", dateFrom, dateTo],
    queryFn: () => api.bsTrend.monthly(params),
  });

  const { data: deltaRaw = [] } = useQuery({
    queryKey: ["bs-account-delta", dateFrom, dateTo],
    queryFn: () => api.bsTrend.accountDelta(params),
  });

  const monthly = monthlyRaw as BsMonthly[];
  const deltas = deltaRaw as BsAccountDelta[];

  // ─── 월별 스택바 데이터 ────────────────────────────────
  const { assetChartData, liabChartData, assetBranches, liabBranches, months } = useMemo(() => {
    const monthSet = new Set<string>();
    monthly.forEach((r) => monthSet.add(r.month));
    const months = [...monthSet].sort();

    // group by month + branch
    const byMonthBranch: Record<string, Record<string, number>> = {};
    for (const r of monthly) {
      if (!byMonthBranch[r.month]) byMonthBranch[r.month] = {};
      byMonthBranch[r.month][r.branch] = (byMonthBranch[r.month][r.branch] || 0) + r.balance;
    }

    // unique branches for each type
    const allBranches = [...new Set(monthly.map((r) => r.branch))];
    const assetBranches = allBranches.filter((b) => classifyBranch(b) === "자산");
    const liabBranches = allBranches.filter((b) => classifyBranch(b) === "부채" || classifyBranch(b) === "자본");

    const assetChartData = months.map((m) => {
      const base: Record<string, any> = { month: m.slice(2, 4) + "." + m.slice(5) };
      assetBranches.forEach((b) => { base[b] = Math.abs(byMonthBranch[m]?.[b] || 0); });
      return base;
    });
    const liabChartData = months.map((m) => {
      const base: Record<string, any> = { month: m.slice(2, 4) + "." + m.slice(5) };
      liabBranches.forEach((b) => { base[b] = Math.abs(byMonthBranch[m]?.[b] || 0); });
      return base;
    });

    return { assetChartData, liabChartData, assetBranches, liabBranches, months };
  }, [monthly]);

  // ─── 최신 월 KPI ──────────────────────────────────────
  const { curAsset, curLiab, curEquity, curCurrentAsset, curCurrentLiab } = useMemo(() => {
    const lastMonth = months[months.length - 1];
    if (!lastMonth) return { curAsset: 0, curLiab: 0, curEquity: 0, curCurrentAsset: 0, curCurrentLiab: 0 };
    const byBranch: Record<string, number> = {};
    monthly.filter((r) => r.month === lastMonth).forEach((r) => {
      byBranch[r.branch] = (byBranch[r.branch] || 0) + r.balance;
    });
    const curAsset = Object.entries(byBranch).filter(([b]) => classifyBranch(b) === "자산").reduce((s, [, v]) => s + Math.abs(v), 0);
    const curLiab = Object.entries(byBranch).filter(([b]) => classifyBranch(b) === "부채").reduce((s, [, v]) => s + Math.abs(v), 0);
    const curEquity = Object.entries(byBranch).filter(([b]) => classifyBranch(b) === "자본").reduce((s, [, v]) => s + Math.abs(v), 0);
    const curCurrentAsset = Math.abs(byBranch["유동자산"] || byBranch["자산"] || 0);
    const curCurrentLiab = Math.abs(byBranch["유동부채"] || byBranch["부채"] || 0);
    return { curAsset, curLiab, curEquity, curCurrentAsset, curCurrentLiab };
  }, [monthly, months]);

  // ─── 증감 데이터 분리 ────────────────────────────────
  const { assetDeltas, liabDeltas } = useMemo(() => {
    const assetDeltas = deltas.filter((d) => classifyBranch(d.branch) === "자산").sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 12);
    const liabDeltas = deltas.filter((d) => classifyBranch(d.branch) === "부채" || classifyBranch(d.branch) === "자본").sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 12);
    return { assetDeltas, liabDeltas };
  }, [deltas]);

  const colorForBranch = (b: string) => ASSET_COLORS[b] || LIAB_COLORS[b] || "#DFE3E6";

  return (
    <div className="space-y-5">
      {/* 필터 바 */}
      <div style={{ backgroundColor: "#F5F7F8", border: "1px solid #DFE3E6", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <DateRangeFilterBar />
      </div>

      {/* KPI 4개 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KpiCard label="총 자산"  value={curAsset}        color="#FD5108" />
        <KpiCard label="유동자산" value={curCurrentAsset}  color="#FE7C39" />
        <KpiCard label="총 부채"  value={curLiab}         color="#A1A8B3" />
        <KpiCard label="자본 총계" value={curEquity}       color="#FFAA72" />
      </div>

      {/* 스택바 — 2열 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* 자산 구성 */}
        <div className="bg-white rounded-lg border overflow-hidden card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>월별 자산 구성</div>
          </div>
          {monthlyLoading ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assetChartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 4 }} />
                {assetBranches.map((b, i) => (
                  <Bar key={b} dataKey={b} stackId="a" fill={colorForBranch(b)} name={b} radius={i === assetBranches.length - 1 ? [3,3,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 부채·자본 구성 */}
        <div className="bg-white rounded-lg border overflow-hidden card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>월별 부채·자본 구성</div>
          </div>
          {monthlyLoading ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={liabChartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 4 }} />
                {liabBranches.map((b, i) => (
                  <Bar key={b} dataKey={b} stackId="b" fill={colorForBranch(b)} name={b} radius={i === liabBranches.length - 1 ? [3,3,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 계정 증감 수평바 — 자산 / 부채 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DeltaBar title="주요 자산 계정 증감" data={assetDeltas} />
        <DeltaBar title="주요 부채·자본 계정 증감" data={liabDeltas} />
      </div>

      {/* BS 계정 상세 테이블 */}
      <div className="bg-white rounded-lg border overflow-hidden card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>BS 계정 증감 상세</div>
        </div>
        <div style={{ overflowY: "auto", maxHeight: 400 }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F5F7F8", position: "sticky", top: 0 }}>
                {["계정과목", "구분", "기초잔액", "기말잔액", "증감", "증감률"].map((h) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: h === "계정과목" || h === "구분" ? "left" : "right", fontWeight: 600, color: "#A1A8B3", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deltas.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#A1A8B3" }}>데이터 없음</td></tr>
              ) : deltas.slice(0, 50).map((d, i) => {
                const pct = d.opening !== 0 ? (d.delta / Math.abs(d.opening)) * 100 : 0;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #F5F7F8" }}>
                    <td style={{ padding: "7px 14px", color: "#1A1A2E", fontWeight: 500 }}>{d.account}</td>
                    <td style={{ padding: "7px 14px", color: "#A1A8B3" }}>{d.branch}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#1A1A2E" }}>{formatKRW(d.opening)}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#1A1A2E" }}>{formatKRW(d.closing)}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: d.delta >= 0 ? "#059669" : "#DC2626", fontWeight: 500 }}>{formatKRW(d.delta)}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: d.delta >= 0 ? "#059669" : "#DC2626" }}>{formatPct(pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeltaBar({ title, data }: { title: string; data: BsAccountDelta[] }) {
  const chartData = data.map((d) => ({ account: d.account.length > 10 ? d.account.slice(0, 10) + "…" : d.account, delta: d.delta }));
  return (
    <div className="bg-white rounded-lg border overflow-hidden card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{title}</div>
      </div>
      {chartData.length === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>데이터 없음</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 26 + 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="account" tick={{ fontSize: 10, fill: "#A1A8B3" }} tickLine={false} axisLine={false} width={110} />
            <Tooltip formatter={(v: any) => formatKRW(Number(v))} />
            <Bar dataKey="delta" name="증감" radius={[0,3,3,0]} barSize={10}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.delta >= 0 ? "#FD5108" : "#6B7280"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
