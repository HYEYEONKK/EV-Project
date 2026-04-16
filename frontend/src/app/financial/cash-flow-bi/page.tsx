"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, CashFlowComparison, CashFlowComparisonItem } from "@/lib/api/client";
import { formatKRW, formatPct, chartAxisFormatter } from "@/lib/utils/formatters";
import { downloadCsv } from "@/lib/utils/csvExport";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

/*
  현금흐름 (BI) — Power BI #13 완전 재현
  - 현금흐름 PivotTable (당기/전기 비교)
  - 현금흐름 구분 DonutChart
  - 계정유형별 당/전기 증감 100%StackedBar
  - 계정과목별 당/전기 증감 100%StackedBar
  - CF구분 슬라이서
*/

const CF_COLORS: Record<string, string> = {
  "영업활동": "#FD5108",
  "투자활동": "#54565A",
  "재무활동": "#FFAA72",
};

const PANEL_CLS = "bg-white rounded-lg border overflow-hidden card-hover";
const PANEL_STYLE: React.CSSProperties = { borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" };

function BiTag() {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, color: "#fff",
      backgroundColor: "#FD5108", borderRadius: 4, padding: "2px 6px", marginLeft: 8,
      verticalAlign: "middle", letterSpacing: "0.5px",
    }}>BI</span>
  );
}

function ChartHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>{title}</span>
      {right}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12, padding: "4px 12px", borderRadius: 16,
      border: active ? "1px solid #FD5108" : "1px solid #DFE3E6",
      backgroundColor: active ? "#FFF5ED" : "#fff",
      color: active ? "#FD5108" : "#6B7280",
      fontWeight: active ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

// KPI 카드 (당기/전기 비교)
function CfKpiCard({ label, current, prior, color }: {
  label: string; current: number; prior: number; color: string;
}) {
  const delta = current - prior;
  const deltaPct = prior !== 0 ? (delta / Math.abs(prior)) * 100 : 0;
  return (
    <div className="bg-white rounded-lg border p-4 card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <p className="text-sm font-medium" style={{ color: "#A1A8B3" }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: current >= 0 ? "#16C784" : "#FF4747" }}>
        {formatKRW(current)}
      </p>
      <div className="flex items-center gap-3 mt-2" style={{ fontSize: 12 }}>
        <span style={{ color: "#A1A8B3" }}>전기: {formatKRW(prior)}</span>
        <span style={{ fontWeight: 600, color: delta >= 0 ? "#16C784" : "#FF4747" }}>
          {delta >= 0 ? "▲" : "▼"}{Math.abs(deltaPct).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default function CashFlowBiPage() {
  const { dateFrom, dateTo, cashFlowCategory, setCashFlowCategory } = useFilterStore();
  const params = { date_from: dateFrom, date_to: dateTo };

  const { data, isLoading } = useQuery({
    queryKey: ["cash-flow-comparison", dateFrom, dateTo],
    queryFn: () => api.cashFlowBi.comparison(params),
  });

  const cf = data as CashFlowComparison | undefined;

  // 도넛 차트 데이터
  const donutData = useMemo(() => {
    if (!cf) return [];
    return [
      { name: "영업활동", value: Math.abs(cf.operating.current_total) },
      { name: "투자활동", value: Math.abs(cf.investing.current_total) },
      { name: "재무활동", value: Math.abs(cf.financing.current_total) },
    ];
  }, [cf]);

  // CF 구분 필터된 항목
  const filteredItems = useMemo(() => {
    if (!cf) return [];
    const sections = [
      { cat: "영업활동", ...cf.operating },
      { cat: "투자활동", ...cf.investing },
      { cat: "재무활동", ...cf.financing },
    ];
    if (cashFlowCategory) {
      return sections.filter(s => s.cat === cashFlowCategory);
    }
    return sections;
  }, [cf, cashFlowCategory]);

  // 당기/전기 비교 바 차트 (상위 10 계정)
  const comparisonChartData = useMemo(() => {
    if (!cf) return [];
    let allItems: CashFlowComparisonItem[] = [];
    if (!cashFlowCategory || cashFlowCategory === "영업활동") allItems = [...allItems, ...cf.operating.items];
    if (!cashFlowCategory || cashFlowCategory === "투자활동") allItems = [...allItems, ...cf.investing.items];
    if (!cashFlowCategory || cashFlowCategory === "재무활동") allItems = [...allItems, ...cf.financing.items];

    return allItems
      .sort((a, b) => Math.abs(b.current) - Math.abs(a.current))
      .slice(0, 12)
      .map(d => ({
        account: d.account.length > 14 ? d.account.slice(0, 14) + "…" : d.account,
        당기: d.current,
        전기: d.prior,
      }));
  }, [cf, cashFlowCategory]);

  const handleCsv = () => {
    if (!cf) return;
    const headers = ["구분", "계정과목", "당기", "전기", "증감"];
    const rows: (string | number)[][] = [];
    const addSection = (cat: string, items: CashFlowComparisonItem[], totCurr: number, totPrior: number) => {
      rows.push([cat, "", totCurr, totPrior, totCurr - totPrior]);
      items.forEach(it => rows.push(["", it.account, it.current, it.prior, it.current - it.prior]));
    };
    addSection("I. 영업활동", cf.operating.items, cf.operating.current_total, cf.operating.prior_total);
    addSection("II. 투자활동", cf.investing.items, cf.investing.current_total, cf.investing.prior_total);
    addSection("III. 재무활동", cf.financing.items, cf.financing.current_total, cf.financing.prior_total);
    rows.push(["순증감", "", cf.current_net_change, cf.prior_net_change, cf.current_net_change - cf.prior_net_change]);
    downloadCsv(headers, rows, "현금흐름표_비교");
  };

  if (isLoading || !cf) {
    return <div style={{ padding: 60, textAlign: "center", color: "#A1A8B3" }}>불러오는 중...</div>;
  }

  return (
    <div className="space-y-5">
      {/* 페이지 타이틀 */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E" }}>현금흐름표</span>
        <BiTag />
        <span style={{ fontSize: 12, color: "#A1A8B3", marginLeft: 4 }}>Power BI 레이아웃 (당기/전기 비교)</span>
      </div>

      {/* KPI 카드 (4개) */}
      <div className="grid grid-cols-4 gap-4">
        <CfKpiCard label="영업활동" current={cf.operating.current_total} prior={cf.operating.prior_total} color={CF_COLORS["영업활동"]} />
        <CfKpiCard label="투자활동" current={cf.investing.current_total} prior={cf.investing.prior_total} color={CF_COLORS["투자활동"]} />
        <CfKpiCard label="재무활동" current={cf.financing.current_total} prior={cf.financing.prior_total} color={CF_COLORS["재무활동"]} />
        <CfKpiCard label="순 현금 변동" current={cf.current_net_change} prior={cf.prior_net_change} color="#1A1A2E" />
      </div>

      {/* CF구분 슬라이서 + 도넛차트 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* 도넛차트 — PBI donutChart */}
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="현금흐름 구분" />
          <div className="flex items-center justify-center" style={{ padding: 16 }}>
            <div className="flex items-center gap-3 mb-2">
              <FilterPill label="전체" active={!cashFlowCategory} onClick={() => setCashFlowCategory(null)} />
              <FilterPill label="영업활동" active={cashFlowCategory === "영업활동"} onClick={() => setCashFlowCategory(cashFlowCategory === "영업활동" ? null : "영업활동")} />
              <FilterPill label="투자활동" active={cashFlowCategory === "투자활동"} onClick={() => setCashFlowCategory(cashFlowCategory === "투자활동" ? null : "투자활동")} />
              <FilterPill label="재무활동" active={cashFlowCategory === "재무활동"} onClick={() => setCashFlowCategory(cashFlowCategory === "재무활동" ? null : "재무활동")} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                dataKey="value" nameKey="name" paddingAngle={2}>
                {donutData.map((d, i) => (
                  <Cell key={i} fill={CF_COLORS[d.name] ?? "#DFE3E6"}
                    stroke={cashFlowCategory === d.name ? "#1A1A2E" : "none"} strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatKRW(Number(v))} contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 계정과목별 당/전기 비교 — PBI hundredPercentStackedBarChart 대안 */}
        <div className={PANEL_CLS} style={PANEL_STYLE}>
          <ChartHeader title="계정과목별 당기/전기 증감 현황" />
          {comparisonChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(280, comparisonChartData.length * 28 + 40)}>
              <BarChart data={comparisonChartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="account" tick={{ fontSize: 10, fill: "#A1A8B3" }} tickLine={false} axisLine={false} width={120} />
                <Tooltip formatter={(v: any) => formatKRW(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="당기" fill="#FD5108" barSize={8} radius={[0, 3, 3, 0]} />
                <Bar dataKey="전기" fill="#CBD1D6" barSize={8} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>
              데이터 없음
            </div>
          )}
        </div>
      </div>

      {/* 현금흐름 상세 테이블 (당기/전기 비교) — PBI pivotTable */}
      <div className={PANEL_CLS} style={PANEL_STYLE}>
        <ChartHeader title="현금흐름표 (당기/전기 비교)" right={
          <button onClick={handleCsv} style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500,
            color: "#A1A8B3", background: "none", border: "1px solid #DFE3E6", borderRadius: 7,
            padding: "4px 10px", cursor: "pointer",
          }}>CSV</button>
        } />
        <div style={{ overflowY: "auto", maxHeight: 520 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ backgroundColor: "#F5F7F8" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#A1A8B3" }}>항목</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#FD5108" }}>금액(당기)</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#A1A8B3" }}>금액(전기)</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#A1A8B3" }}>증감</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((section, si) => (
                <tbody key={si}>
                  {/* 구분 소계 행 */}
                  <tr style={{ backgroundColor: "#F5F7F8", borderTop: si > 0 ? "2px solid #EEEFF1" : undefined }}>
                    <td style={{ padding: "8px 14px", fontWeight: 700, color: CF_COLORS[section.cat] }}>
                      {si === 0 ? "I" : si === 1 ? "II" : "III"}. {section.cat} 현금흐름
                    </td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {formatKRW(section.current_total)}
                    </td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
                      {formatKRW(section.prior_total)}
                    </td>
                    <td style={{
                      padding: "8px 14px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                      color: (section.current_total - section.prior_total) >= 0 ? "#16C784" : "#FF4747"
                    }}>
                      {formatKRW(section.current_total - section.prior_total)}
                    </td>
                  </tr>
                  {/* 항목 행 */}
                  {section.items.slice(0, 20).map((item: CashFlowComparisonItem, i: number) => {
                    const delta = item.current - item.prior;
                    return (
                      <tr key={i} style={{ borderTop: "1px solid #EEEFF1" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#FAFBFC"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ""}>
                        <td style={{ padding: "6px 14px 6px 28px", color: "#374151" }}>{item.account}</td>
                        <td style={{ padding: "6px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {formatKRW(item.current)}
                        </td>
                        <td style={{ padding: "6px 14px", textAlign: "right", color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
                          {formatKRW(item.prior)}
                        </td>
                        <td style={{
                          padding: "6px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                          color: delta >= 0 ? "#16C784" : "#FF4747",
                        }}>
                          {formatKRW(delta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
              {/* 순증감 */}
              <tr style={{ borderTop: "2px solid #FD5108", backgroundColor: "#FFF5ED" }}>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: "#FD5108" }}>현금 순증감</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatKRW(cf.current_net_change)}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
                  {formatKRW(cf.prior_net_change)}
                </td>
                <td style={{
                  padding: "10px 14px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  color: (cf.current_net_change - cf.prior_net_change) >= 0 ? "#16C784" : "#FF4747",
                }}>
                  {formatKRW(cf.current_net_change - cf.prior_net_change)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
