"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, BsMonthly, BsAccountDelta } from "@/lib/api/client";
import { formatKRW, formatPct, chartAxisFormatter } from "@/lib/utils/formatters";
import { downloadCsv } from "@/lib/utils/csvExport";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";

// ─── 분류 헬퍼 ─────────────────────────────────────────────
const ASSET_BRANCHES = ["유동자산", "비유동자산", "자산"];
const LIAB_BRANCHES  = ["유동부채", "비유동부채", "부채"];
const EQU_BRANCHES   = ["자본"];

function classifyBranch(branch: string): "자산" | "부채" | "자본" | "기타" {
  const b = branch || "";
  if (ASSET_BRANCHES.some((x) => b.includes(x))) return "자산";
  if (LIAB_BRANCHES.some((x) => b.includes(x)))  return "부채";
  if (EQU_BRANCHES.some((x) => b.includes(x)))   return "자본";
  return "기타";
}

const ASSET_COLORS: Record<string, string> = { "유동자산": "#FD5108", "비유동자산": "#1A1A2E", "자산": "#FE7C39" };
const LIAB_COLORS: Record<string, string>  = { "유동부채": "#FD5108", "비유동부채": "#FE7C39", "부채": "#FFAA72", "자본": "#6B7280" };

const POS_COLOR = "#16C784"; // green
const NEG_COLOR = "#FD5108"; // orange

// ─── 구분 배지 색상 ────────────────────────────────────────
const BRANCH_BADGE: Record<string, { bg: string; color: string }> = {
  "자산": { bg: "#FFF5ED", color: "#FD5108" },
  "부채": { bg: "#F0F0F5", color: "#6B7280" },
  "자본": { bg: "#EFF6FF", color: "#3B82F6" },
};

// ─── 커스텀 툴팁 ──────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #DFE3E6", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px #0000001A" }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#1A1A2E" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {formatKRW(Number(p.value))}</div>
      ))}
    </div>
  );
}



// ─── 증감 수평바 ──────────────────────────────────────────
function DeltaBar({ title, data }: { title: string; data: BsAccountDelta[] }) {
  const chartData = data.map((d) => ({ account: d.account.length > 12 ? d.account.slice(0, 12) + "…" : d.account, delta: d.delta }));
  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>{title}</div>
      </div>
      {chartData.length === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>데이터 없음</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 28 + 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="account" tick={{ fontSize: 10, fill: "#A1A8B3" }} tickLine={false} axisLine={false} width={120} />
            <Tooltip formatter={(v: any) => formatKRW(Number(v))} />
            <Bar dataKey="delta" name="증감" radius={[0,3,3,0]} barSize={10}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.delta >= 0 ? POS_COLOR : NEG_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── 증감 상세 테이블 ─────────────────────────────────────
type SortKey = "account" | "branch" | "opening" | "closing" | "delta" | "deltaPct";
type BranchFilter = "모두" | "자산" | "부채" | "자본";

function DeltaDetailTable({ deltas }: { deltas: BsAccountDelta[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("delta");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [branchFilter, setBranchFilter] = useState<BranchFilter>("모두");

  const BRANCH_FILTERS: BranchFilter[] = ["모두", "자산", "부채", "자본"];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    return deltas.filter(d => branchFilter === "모두" || classifyBranch(d.branch) === branchFilter);
  }, [deltas, branchFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const pctA = a.opening !== 0 ? (a.delta / Math.abs(a.opening)) * 100 : 0;
      const pctB = b.opening !== 0 ? (b.delta / Math.abs(b.opening)) * 100 : 0;
      const va = sortKey === "account" ? a.account : sortKey === "branch" ? a.branch : sortKey === "opening" ? a.opening : sortKey === "closing" ? a.closing : sortKey === "delta" ? a.delta : pctA;
      const vb = sortKey === "account" ? b.account : sortKey === "branch" ? b.branch : sortKey === "opening" ? b.opening : sortKey === "closing" ? b.closing : sortKey === "delta" ? b.delta : pctB;
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string, "ko") : (vb as string).localeCompare(va, "ko");
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [filtered, sortKey, sortDir]);

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span style={{ display:"inline-flex", flexDirection:"column", gap:1, marginLeft:4, verticalAlign:"middle", opacity: sortKey===k ? 1 : 0.3 }}>
      <svg width="7" height="4" viewBox="0 0 8 5"><path d="M4 0L7.5 5H0.5L4 0Z" fill={sortKey===k && sortDir==="asc" ? "#FD5108" : "#A1A8B3"}/></svg>
      <svg width="7" height="4" viewBox="0 0 8 5"><path d="M4 5L0.5 0H7.5L4 5Z" fill={sortKey===k && sortDir==="desc" ? "#FD5108" : "#A1A8B3"}/></svg>
    </span>
  );

  const handleCsv = () => {
    const headers = ["계정과목", "구분", "기초잔액", "기말잔액", "증감", "증감률"];
    const rows = sorted.map(d => {
      const pct = d.opening !== 0 ? ((d.delta / Math.abs(d.opening)) * 100).toFixed(1) + "%" : "0.0%";
      return [d.account, d.branch, d.opening, d.closing, d.delta, pct];
    });
    downloadCsv(headers, rows, "BS계정증감상세");
  };

  const thStyle = (k: SortKey, align: "left"|"right" = "right"): React.CSSProperties => ({
    padding: "10px 14px", fontWeight: 600, fontSize: 13,
    color: sortKey === k ? "#FD5108" : "#A1A8B3",
    textAlign: align, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
    transition: "color .15s",
  });

  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      {/* 헤더 */}
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
        <div className="flex items-center gap-3">
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>BS 계정 증감 상세</div>
          {/* 구분 필터 */}
          <div className="flex" style={{ border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden", backgroundColor: "#F5F7F8" }}>
            {BRANCH_FILTERS.map(f => {
              const active = f === branchFilter;
              const badge = BRANCH_BADGE[f];
              return (
                <button key={f} onClick={() => setBranchFilter(f)}
                  style={{
                    fontSize: 12, padding: "3px 10px", border: "none", borderRight: "1px solid #DFE3E6",
                    backgroundColor: active ? (badge?.bg ?? "#1A1A2E") : "transparent",
                    color: active ? (badge?.color ?? "#fff") : "#A1A8B3",
                    fontWeight: active ? 600 : 400, cursor: "pointer", outline: "none", whiteSpace: "nowrap",
                  }}>
                  {f}
                </button>
              );
            })}
          </div>
        </div>
        {/* CSV 버튼 */}
        <button onClick={handleCsv}
          style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
      </div>

      {/* 테이블 */}
      <div style={{ overflowY: "auto", overflowX: "auto", maxHeight: 420 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr style={{ backgroundColor: "#F5F7F8" }}>
              <th onClick={() => handleSort("account")} style={{ ...thStyle("account", "left") }}>계정과목 <SortIcon k="account" /></th>
              <th onClick={() => handleSort("branch")} style={{ ...thStyle("branch", "left") }}>구분 <SortIcon k="branch" /></th>
              <th onClick={() => handleSort("opening")} style={thStyle("opening")}>기초잔액 <SortIcon k="opening" /></th>
              <th onClick={() => handleSort("closing")} style={thStyle("closing")}>기말잔액 <SortIcon k="closing" /></th>
              <th onClick={() => handleSort("delta")} style={thStyle("delta")}>증감 <SortIcon k="delta" /></th>
              <th onClick={() => handleSort("deltaPct")} style={thStyle("deltaPct")}>증감률 <SortIcon k="deltaPct" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#A1A8B3", fontSize: 13 }}>데이터 없음</td></tr>
            ) : sorted.map((d, i) => {
              const pct = d.opening !== 0 ? (d.delta / Math.abs(d.opening)) * 100 : 0;
              const cls = classifyBranch(d.branch);
              const badge = BRANCH_BADGE[cls];
              return (
                <tr key={i} style={{ borderTop: "1px solid #EEEFF1" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#FAFBFC"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ""}>
                  <td style={{ padding: "7px 14px", color: "#1A1A2E", fontWeight: 500 }}>{d.account}</td>
                  <td style={{ padding: "7px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 10, backgroundColor: badge?.bg ?? "#F0F0F5", color: badge?.color ?? "#6B7280" }}>
                      {cls}
                    </span>
                  </td>
                  <td style={{ padding: "7px 14px", textAlign: "right", color: "#374151", fontVariantNumeric: "tabular-nums" }}>{d.opening.toLocaleString("ko-KR")}</td>
                  <td style={{ padding: "7px 14px", textAlign: "right", color: "#374151", fontVariantNumeric: "tabular-nums" }}>{d.closing.toLocaleString("ko-KR")}</td>
                  <td style={{ padding: "7px 14px", textAlign: "right", color: d.delta >= 0 ? POS_COLOR : NEG_COLOR, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{d.delta.toLocaleString("ko-KR")}</td>
                  <td style={{ padding: "7px 14px", textAlign: "right", color: d.delta >= 0 ? POS_COLOR : NEG_COLOR, fontVariantNumeric: "tabular-nums" }}>{formatPct(pct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

  // ─── 월별 스택바 데이터 ───────────────────────────────
  const { assetChartData, liabChartData, assetBranches, liabBranches, months } = useMemo(() => {
    const monthSet = new Set<string>();
    monthly.forEach((r) => monthSet.add(r.month));
    const months = [...monthSet].sort();
    const byMonthBranch: Record<string, Record<string, number>> = {};
    for (const r of monthly) {
      if (!byMonthBranch[r.month]) byMonthBranch[r.month] = {};
      byMonthBranch[r.month][r.branch] = (byMonthBranch[r.month][r.branch] || 0) + r.balance;
    }
    const allBranches = [...new Set(monthly.map((r) => r.branch))];
    const assetBranches = allBranches.filter((b) => classifyBranch(b) === "자산");
    const liabBranches  = allBranches.filter((b) => classifyBranch(b) === "부채" || classifyBranch(b) === "자본");
    const assetChartData = months.map((m) => {
      const base: Record<string, any> = { month: m.slice(2,4)+"."+m.slice(5) };
      assetBranches.forEach((b) => { base[b] = Math.abs(byMonthBranch[m]?.[b] || 0); });
      return base;
    });
    const liabChartData = months.map((m) => {
      const base: Record<string, any> = { month: m.slice(2,4)+"."+m.slice(5) };
      liabBranches.forEach((b) => { base[b] = Math.abs(byMonthBranch[m]?.[b] || 0); });
      return base;
    });
    return { assetChartData, liabChartData, assetBranches, liabBranches, months };
  }, [monthly]);

  // ─── 최신 월 KPI ─────────────────────────────────────
  const { curAsset, curLiab, curEquity, curCurrentAsset } = useMemo(() => {
    const lastMonth = months[months.length - 1];
    if (!lastMonth) return { curAsset: 0, curLiab: 0, curEquity: 0, curCurrentAsset: 0 };
    const byBranch: Record<string, number> = {};
    monthly.filter((r) => r.month === lastMonth).forEach((r) => { byBranch[r.branch] = (byBranch[r.branch]||0) + r.balance; });
    const curAsset = Object.entries(byBranch).filter(([b]) => classifyBranch(b)==="자산").reduce((s,[,v]) => s+Math.abs(v), 0);
    const curLiab  = Object.entries(byBranch).filter(([b]) => classifyBranch(b)==="부채").reduce((s,[,v]) => s+Math.abs(v), 0);
    const curEquity= Object.entries(byBranch).filter(([b]) => classifyBranch(b)==="자본").reduce((s,[,v]) => s+Math.abs(v), 0);
    const curCurrentAsset = Math.abs(byBranch["유동자산"] || byBranch["자산"] || 0);
    return { curAsset, curLiab, curEquity, curCurrentAsset };
  }, [monthly, months]);

  // ─── 증감 분리 ────────────────────────────────────────
  const { assetDeltas, liabDeltas } = useMemo(() => {
    const assetDeltas = deltas.filter((d) => classifyBranch(d.branch)==="자산").sort((a,b) => Math.abs(b.delta)-Math.abs(a.delta)).slice(0, 12);
    const liabDeltas  = deltas.filter((d) => classifyBranch(d.branch)==="부채"||classifyBranch(d.branch)==="자본").sort((a,b) => Math.abs(b.delta)-Math.abs(a.delta)).slice(0, 12);
    return { assetDeltas, liabDeltas };
  }, [deltas]);

  const colorForBranch = (b: string) => ASSET_COLORS[b] || LIAB_COLORS[b] || "#DFE3E6";

  return (
    <div className="space-y-5">

      {/* 스택바 — 2열 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 자산 구성</div>
          </div>
          {monthlyLoading ? (
            <div style={{ height: 220, display:"flex", alignItems:"center", justifyContent:"center", color:"#A1A8B3", fontSize:13 }}>Loading...</div>
          ) : (
            <div style={{ paddingTop: 12 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assetChartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 4 }} />
                {assetBranches.map((b, i) => (
                  <Bar key={b} dataKey={b} stackId="a" fill={colorForBranch(b)} name={b} radius={i===assetBranches.length-1 ? [3,3,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 부채·자본 구성</div>
          </div>
          {monthlyLoading ? (
            <div style={{ height: 220, display:"flex", alignItems:"center", justifyContent:"center", color:"#A1A8B3", fontSize:13 }}>Loading...</div>
          ) : (
            <div style={{ paddingTop: 12 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={liabChartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 4 }} />
                {liabBranches.map((b, i) => (
                  <Bar key={b} dataKey={b} stackId="b" fill={colorForBranch(b)} name={b} radius={i===liabBranches.length-1 ? [3,3,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 계정 증감 수평바 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DeltaBar title="주요 자산 계정 증감" data={assetDeltas} />
        <DeltaBar title="주요 부채·자본 계정 증감" data={liabDeltas} />
      </div>

      {/* 증감 상세 테이블 */}
      <DeltaDetailTable deltas={deltas} />
    </div>
  );
}
