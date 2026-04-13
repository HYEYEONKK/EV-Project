"use client";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, ScenarioEntry } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import SortableTable from "@/components/ui/SortableTable";
import { downloadCsv } from "@/lib/utils/csvExport";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";

const SCENARIOS: Record<string, { title: string; risk: string; desc: string; riskLevel: "high" | "medium" | "info" }> = {
  "1": { title: "시나리오 1. 동일 금액 중복 전표", riskLevel: "high",
    risk: "예상 위험: 정확한 금액 대신 반올림된 금액이 반복 기표되는 오류 가능성",
    desc: "동일 금액이 동일 계정에 이중 기표되는 경우를 탐색합니다." },
  "2": { title: "시나리오 2. 현금지급 후 동일금액 부채인식", riskLevel: "high",
    risk: "예상 위험: 현금 집행 후 동일금액의 부채를 재인식하여 부채금액 변동 없이 처리하는 패턴 식별",
    desc: "동일 전표번호에 현금 대변과 부채 차변이 동시 존재하는 전표를 식별합니다." },
  "3": { title: "시나리오 3. 주말 현금 지급 전표", riskLevel: "medium",
    risk: "예상 위험: 주말에 별도 통제 없이 승인 없이 현금 전표 집행",
    desc: "주말(토/일)에 기표된 현금 대변 전표를 식별합니다." },
  "4": { title: "시나리오 4. 고액 현금 전표", riskLevel: "high",
    risk: "예상 위험: 임계금액(10억 원) 이상의 현금 전표를 통한 비정상 거래 가능성",
    desc: "10억 원 이상 현금 계정 전표를 식별합니다." },
  "5": { title: "시나리오 5. 비용 인식과 동시에 현금지급", riskLevel: "medium",
    risk: "예상 위험: 중간 부채를 거치지 않고 비용 인식과 동시에 현금지급 — 발생주의 위배 가능성",
    desc: "동일 전표번호에 비용 차변(PL)과 현금 대변(BS)이 동시 존재하는 전표를 식별합니다." },
  "6": { title: "시나리오 6. Seldom Used (저빈도 거래처)", riskLevel: "info",
    risk: "예상 위험: 사용 빈도가 낮은 거래처를 통한 회계 오류 또는 부정 가능성",
    desc: "분석 기간 내 전표 수가 3건 이하인 저빈도 거래처 전표를 식별합니다." },
  "7": { title: "시나리오 7. 주말/공휴일 기표 전표 (전체)", riskLevel: "medium",
    risk: "예상 위험: 승인 절차 없이 수동으로 입력된 비정상 조정 전표 식별",
    desc: "현금 여부와 무관하게 주말(토/일)에 기표된 전체 전표를 식별합니다." },
};

const RISK_STYLE = {
  high:   { badge: "#FFF1F0", badgeText: "#E53E3E", dot: "#E53E3E", label: "HIGH" },
  medium: { badge: "#FFF7E6", badgeText: "#D97706", dot: "#D97706", label: "MEDIUM" },
  info:   { badge: "#EFF6FF", badgeText: "#3B82F6", dot: "#3B82F6", label: "INFO" },
};

type SortKey = "month" | "amount" | "count";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 10, color: active ? "#FD5108" : "#A1A8B3" }}>
      {active ? (dir === "asc" ? "▲" : "▼") : "▲▼"}
    </span>
  );
}

function MonthlyExceptionCard({ summaryData, loading }: {
  summaryData: any[]; loading: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("month");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [yearFilter, setYearFilter] = useState<string>("전체");

  // 연도 목록
  const years = ["전체", ...Array.from(new Set(summaryData.map(d => (d.month as string).slice(0, 4)))).sort()];

  const filtered = yearFilter === "전체" ? summaryData : summaryData.filter(d => (d.month as string).startsWith(yearFilter));

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = [...filtered].sort((a, b) => {
    const v = sortKey === "month" ? a.month.localeCompare(b.month)
      : sortKey === "amount" ? a.amount - b.amount
      : (a.count as number) - (b.count as number);
    return sortDir === "asc" ? v : -v;
  });

  const maxAmt = Math.max(1, ...filtered.map(d => d.amount || 0));

  // 차트 데이터: 필터된 연도 기준
  const chartData = filtered.map(d => ({
    month: (d.month as string).slice(2, 4) + "." + (d.month as string).slice(5),
    금액: d.amount,
  }));

  const thStyle = (key: SortKey, align: "left" | "right" = "left"): React.CSSProperties => ({
    padding: "8px 10px", textAlign: align, fontWeight: 600,
    color: sortKey === key ? "#FD5108" : "#A1A8B3",
    fontSize: 13, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
  });

  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 Exception 내역</h4>
        {/* 연도 필터 */}
        <div style={{ display: "flex", gap: 4 }}>
          {years.map(y => (
            <button key={y} onClick={() => setYearFilter(y)}
              style={{
                fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                border: "1px solid " + (yearFilter === y ? "#FD5108" : "#DFE3E6"),
                backgroundColor: yearFilter === y ? "#FFF5ED" : "#fff",
                color: yearFilter === y ? "#FD5108" : "#A1A8B3",
              }}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ height: 200, display:"flex", alignItems:"center", justifyContent:"center", color:"#A1A8B3", fontSize:13 }}>Loading...</div>
      ) : summaryData.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign:"center", color:"#A1A8B3", fontSize:13 }}>탐지된 Exception 없음</div>
      ) : (
        <>
          {/* 차트 */}
          <div style={{ padding: "12px 8px 4px 8px" }}>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top:4, right:16, bottom:0, left:8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={{ ...AXIS_STYLE, fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={chartAxisFormatter} tick={{ ...AXIS_STYLE, fontSize:10 }} tickLine={false} axisLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="금액" fill="#FD5108" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 테이블 */}
          <div>
            <div style={{ overflowY: "auto", maxHeight: 280 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                  <tr style={{ backgroundColor: "#F5F7F8" }}>
                    <th style={{ ...thStyle("month"), width: 80 }} onClick={() => handleSort("month")}>
                      연월<SortIcon active={sortKey==="month"} dir={sortDir} />
                    </th>
                    <th style={thStyle("amount","right")} onClick={() => handleSort("amount")}>
                      금액<SortIcon active={sortKey==="amount"} dir={sortDir} />
                    </th>
                    <th style={{ ...thStyle("count","right"), width: 60 }} onClick={() => handleSort("count")}>
                      건수<SortIcon active={sortKey==="count"} dir={sortDir} />
                    </th>
                    <th style={{ width: 72 }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((d, i) => {
                    const barPct = (d.amount / maxAmt) * 100;
                    const m = d.month as string;
                    const monthLabel = m.slice(0, 4) + "." + m.slice(5);
                    return (
                      <tr key={i} style={{ borderTop: "1px solid #F5F7F8" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor="#FAFBFC"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor=""}>
                        <td style={{ padding:"7px 10px", fontSize:13, fontWeight:600, color:"#374151", whiteSpace:"nowrap" }}>{monthLabel}</td>
                        <td style={{ padding:"7px 10px", fontSize:13, textAlign:"right", color:"#374151", fontVariantNumeric:"tabular-nums" }}>
                          {(d.amount as number).toLocaleString("ko-KR")}
                        </td>
                        <td style={{ padding:"7px 10px", fontSize:13, textAlign:"right", color:"#FD5108", fontWeight:700 }}>{d.count}</td>
                        <td style={{ padding:"7px 8px" }}>
                          <div style={{ height:6, borderRadius:3, backgroundColor:"#F0F0F0" }}>
                            <div style={{ height:6, borderRadius:3, backgroundColor:"#FD5108", width:`${barPct}%`, transition:"width 0.3s" }} />
                          </div>
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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #DFE3E6", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px #0000001A" }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#1A1A2E" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? "#FD5108", marginBottom: 2 }}>
          {p.name}: {p.name === "금액" ? formatKRW(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function ScenarioPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = use(params);
  const scenarioId = parseInt(n) || 1;
  const scenario = SCENARIOS[n] ?? SCENARIOS["1"];
  const riskStyle = RISK_STYLE[scenario.riskLevel];
  const { scenarioDateFrom, scenarioDateTo, scenarioMinAmount, scenarioMaxAmount } = useFilterStore();
  const queryParams = {
    date_from: scenarioDateFrom,
    date_to: scenarioDateTo,
    ...(scenarioMinAmount != null ? { min_amount: scenarioMinAmount } : {}),
    ...(scenarioMaxAmount != null ? { max_amount: scenarioMaxAmount } : {}),
  };

  const { data: summary = [], isLoading: summaryLoading } = useQuery({
    queryKey: ["scenario-summary", n, scenarioDateFrom, scenarioDateTo, scenarioMinAmount, scenarioMaxAmount],
    queryFn: () => api.scenarios.summary(scenarioId, queryParams),
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["scenario-entries", n, scenarioDateFrom, scenarioDateTo, scenarioMinAmount, scenarioMaxAmount],
    queryFn: () => api.scenarios.entries(scenarioId, { ...queryParams, limit: 500 }),
  });

  const summaryData = summary as any[];
  const entryList = entries as ScenarioEntry[];
  const totalCount  = summaryData.reduce((s, d) => s + (d.count || 0), 0);
  const totalAmount = summaryData.reduce((s, d) => s + (d.amount || 0), 0);

  const chartData = summaryData.map((d) => ({
    month: (d.month as string).slice(2, 4) + "." + (d.month as string).slice(5),
    건수: d.count,
    금액: d.amount,
  }));

  // 월별 최대 금액 (mini bar 너비 계산용)
  const maxMonthAmount = Math.max(1, ...summaryData.map(d => d.amount || 0));

  const csvCols = ["일자","전표번호","계정과목","거래처","차변","대변"];
  const csvRows = entryList.map(e => [e.date, e.je_number, e.account, e.vendor, e.debit||"-", e.credit||"-"]);

  return (
    <div className="space-y-5">

      {/* ── 헤더 카드 ── */}
      <div className="bg-white rounded-lg border overflow-hidden"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div style={{ padding: "20px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
            {/* 좌: 정보 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* 위험도 배지 */}
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  backgroundColor: riskStyle.badge, color: riskStyle.badgeText, letterSpacing: "0.5px" }}>
                  ● {riskStyle.label} RISK
                </span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", letterSpacing: "-0.4px", marginBottom: 10, lineHeight: 1.3 }}>
                {scenario.title}
              </h3>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FD5108" strokeWidth={2.5}
                  strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", lineHeight: 1.6 }}>{scenario.risk}</p>
              </div>
              <p style={{ fontSize: 13, color: "#A1A8B3", lineHeight: 1.6, paddingLeft: 24 }}>{scenario.desc}</p>
            </div>

            {/* 우: KPI 통계 */}
            <div style={{ display: "flex", gap: 10, flexShrink: 0, alignSelf: "center" }}>
              <div style={{
                backgroundColor: "#FFF5ED", borderRadius: 10, padding: "20px 28px",
                minWidth: 120, textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                <div style={{ fontSize: 13, color: "#A1A8B3", fontWeight: 500, whiteSpace: "nowrap" }}>탐지 건수</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: totalCount > 0 ? "#FD5108" : "#A1A8B3", letterSpacing: "-0.5px", lineHeight: 1 }}>
                  {totalCount.toLocaleString("ko-KR")}
                </div>
              </div>
              <div style={{
                backgroundColor: "#F5F7F8", borderRadius: 10, padding: "20px 28px",
                minWidth: 120, textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                <div style={{ fontSize: 13, color: "#A1A8B3", fontWeight: 500, whiteSpace: "nowrap" }}>탐지 금액</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: totalAmount > 0 ? "#1A1A2E" : "#A1A8B3", letterSpacing: "-0.5px", lineHeight: 1 }}>
                  {totalAmount > 0 ? formatKRW(totalAmount) : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 월별 Exception + 전표 추출 내역 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 16 }}>

        {/* 월별 Exception 내역 — 차트 상단, 테이블 하단 */}
        <MonthlyExceptionCard
          summaryData={summaryData}
          chartData={chartData}
          maxMonthAmount={maxMonthAmount}
          loading={summaryLoading}
        />

        {/* 전표 추출 내역 (이상 탐지 핵심 전표) */}
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
            <div className="flex items-center gap-2">
              <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>전표 추출 내역</h4>
              <span style={{ fontSize: 11, fontWeight:600, padding:"2px 8px", borderRadius:10,
                backgroundColor: entryList.length > 0 ? "#FFF5ED" : "#F5F7F8",
                color: entryList.length > 0 ? "#FD5108" : "#A1A8B3" }}>
                {entryList.length}건
              </span>
            </div>
            <button onClick={() => downloadCsv(csvCols, csvRows, `시나리오${n}_전표추출`)}
              style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
          </div>
          <div className="px-3 py-2">
            <SortableTable
              columns={[
                { key: "date",      label: "일자",    align: "left" },
                { key: "je_number", label: "전표번호", align: "left" },
                { key: "account",   label: "계정과목", align: "left" },
                { key: "vendor",    label: "거래처",   align: "left" },
                { key: "debit",     label: "차변",     align: "right" },
                { key: "credit",    label: "대변",     align: "right" },
              ]}
              rows={entryList.map((e) => [
                e.date, e.je_number, e.account, e.vendor,
                e.debit ? e.debit : "-", e.credit ? e.credit : "-",
              ])}
              filename={`시나리오${n}`}
              maxHeight={460}
              loading={entriesLoading}
              emptyText={totalCount === 0 ? "분석 기간 내 탐지된 이상 전표 없음" : "데이터 없음"}
              hideCsvButton
            />
          </div>
        </div>
      </div>

      {/* ── 전표 상세 내역 (전체) ── */}
      {entryList.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
            <div className="flex items-center gap-2">
              <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>전표 상세 내역</h4>
              <span style={{ fontSize: 11, color:"#A1A8B3" }}>전체 {entryList.length.toLocaleString()}건</span>
            </div>
            <button onClick={() => downloadCsv(csvCols, csvRows, `시나리오${n}_상세`)}
              style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
          </div>
          <div className="px-3 py-2">
            <SortableTable
              columns={[
                { key: "date",      label: "일자",    align: "left" },
                { key: "je_number", label: "전표번호", align: "left" },
                { key: "account",   label: "계정과목", align: "left" },
                { key: "vendor",    label: "거래처",   align: "left" },
                { key: "debit",     label: "차변",     align: "right" },
                { key: "credit",    label: "대변",     align: "right" },
              ]}
              rows={entryList.map((e) => [
                e.date, e.je_number, e.account, e.vendor,
                e.debit ? e.debit : "-", e.credit ? e.credit : "-",
              ])}
              filename={`시나리오${n}_전체`}
              maxHeight={400}
              loading={entriesLoading}
              emptyText="탐지된 전표 없음"
              hideCsvButton
            />
          </div>
        </div>
      )}

      {/* 데이터 없을 때 안내 */}
      {!entriesLoading && !summaryLoading && totalCount === 0 && (
        <div className="bg-white rounded-lg border" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 6 }}>이상 전표 미탐지</div>
          <div style={{ fontSize: 13, color: "#A1A8B3" }}>분석 기간 및 금액 조건에 해당하는 이상 전표가 없습니다.</div>
        </div>
      )}
    </div>
  );
}
