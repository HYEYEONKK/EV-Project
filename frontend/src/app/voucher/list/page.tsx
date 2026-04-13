"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import CustomSelect from "@/components/ui/CustomSelect";
import SortableTable from "@/components/ui/SortableTable";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import { downloadCsv } from "@/lib/utils/csvExport";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";

const MODES = ["모두", "일자별", "계정과목별", "거래처별"] as const;
type Mode = typeof MODES[number];

type Metric = "대변" | "차변" | "전표수";
const METRICS: Metric[] = ["대변", "차변", "전표수"];

const TOP_N_OPTIONS = [5, 10, 15, 20, 30];

function metricField(m: Metric) {
  if (m === "차변") return { apiMetric: "debit",  field: "debit_total",  unit: "차변" };
  if (m === "전표수") return { apiMetric: "count", field: "count",        unit: "전표수" };
  return                      { apiMetric: "credit", field: "credit_total", unit: "대변" };
}

// rank 0 = darkest (#FD5108), rank N-1 = lightest (#FFCDA8)
function gradientOrange(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1);
  return `rgb(${Math.round(0xFD + 2*t)},${Math.round(0x51 + 0x7C*t)},${Math.round(0x08 + 0xA0*t)})`;
}

// 계정과목 그룹 추출 (suffix 기반)
function accountGroup(name: string): string {
  if (name.endsWith("(제)")) return "제조원가";
  if (name.endsWith("(판)")) return "판관비";
  if (name.endsWith("(금융)")) return "금융손익";
  return "기타";
}

const ACCT_GROUPS = ["모두", "제조원가", "판관비", "금융손익", "기타"] as const;
type AcctGroup = typeof ACCT_GROUPS[number];

// 커스텀 툴팁
function ChartTooltip({ active, payload, label, isCount }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #DFE3E6",
      borderRadius: 8, padding: "8px 12px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      fontSize: 12, letterSpacing: "-0.3px",
    }}>
      {label && <p style={{ color: "#6B7280", marginBottom: 4, fontWeight: 500, fontSize: 11 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: "#374151", margin: 0 }}>
          {p.name}&nbsp;
          <strong style={{ color: "#FD5108" }}>
            {isCount ? `${Number(p.value).toLocaleString()}건` : formatKRW(Number(p.value))}
          </strong>
        </p>
      ))}
    </div>
  );
}

function VendorTooltip({ active, payload, total, isCount }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = total > 0 ? (p.value / total * 100).toFixed(1) : "0.0";
  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #DFE3E6",
      borderRadius: 8, padding: "8px 12px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      fontSize: 12, letterSpacing: "-0.3px", maxWidth: 220,
    }}>
      <p style={{ color: "#6B7280", marginBottom: 4, fontWeight: 500, fontSize: 11, wordBreak: "break-all" }}>{p.name}</p>
      <p style={{ color: "#FD5108", fontWeight: 700, margin: 0 }}>{pct}%</p>
      <p style={{ color: "#374151", margin: "2px 0 0" }}>{isCount ? `${Number(p.value).toLocaleString()}건` : formatKRW(Number(p.value))}</p>
    </div>
  );
}

function TopNSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ fontSize: 12, color: "#A1A8B3" }}>상위</span>
      <CustomSelect value={value} onChange={(v) => onChange(Number(v))} options={TOP_N_OPTIONS} fontSize={12} />
    </div>
  );
}

// CSV 다운로드 버튼 (카드 헤더용)
function CsvButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 500, color: "#A1A8B3",
        background: "none", border: "1px solid #DFE3E6",
        borderRadius: 7, padding: "4px 10px",
        cursor: "pointer", transition: "color .15s, border-color .15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#FD5108"; (e.currentTarget as HTMLElement).style.borderColor = "#FD5108"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6"; }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      CSV
    </button>
  );
}

export default function VoucherListPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const [mode, setMode] = useState<Mode>("모두");
  const [metric, setMetric] = useState<Metric>("대변");
  const [filterAcct, setFilterAcct] = useState("모두");
  const [filterGroup, setFilterGroup] = useState<AcctGroup>("모두");
  const [topN, setTopN] = useState(10);

  const { field, apiMetric, unit } = metricField(metric);
  const acctParam = filterAcct !== "모두" ? filterAcct : undefined;
  const baseParams = { date_from: dateFrom, date_to: dateTo };

  const { data: dims } = useQuery({
    queryKey: ["je-voucher-dims", dateFrom, dateTo],
    queryFn: () => api.journalEntries.voucherDimensions(baseParams),
  });
  const allAccounts: string[] = (dims as any)?.accounts ?? [];

  // 그룹 필터링된 계정 목록
  const filteredAccounts = useMemo(() => {
    if (filterGroup === "모두") return allAccounts;
    return allAccounts.filter(a => accountGroup(a) === filterGroup);
  }, [allAccounts, filterGroup]);

  const acctOptions = ["모두", ...filteredAccounts];

  // 그룹 변경 시 계정 선택 초기화
  const handleGroupChange = (g: AcctGroup) => {
    setFilterGroup(g);
    setFilterAcct("모두");
  };

  const { data: kpi } = useQuery({
    queryKey: ["je-kpi", dateFrom, dateTo, filterAcct],
    queryFn: () => api.journalEntries.kpiSummary({ ...baseParams, account: acctParam }),
  });

  const { data: daily = [] } = useQuery({
    queryKey: ["je-daily", dateFrom, dateTo, filterAcct],
    queryFn: () => api.journalEntries.dailyTrend({ ...baseParams, account: acctParam }),
  });

  const { data: byAccount = [] } = useQuery({
    queryKey: ["je-by-account", dateFrom, dateTo, topN, filterAcct, apiMetric],
    queryFn: () => api.journalEntries.byAccount({ ...baseParams, top_n: topN, account: acctParam, metric: apiMetric }),
  });

  const { data: byVendor = [] } = useQuery({
    queryKey: ["je-by-vendor", dateFrom, dateTo, topN, filterAcct, apiMetric],
    queryFn: () => api.journalEntries.byVendor({ ...baseParams, top_n: topN, account: acctParam, metric: apiMetric }),
  });

  const { data: entries = [], isLoading: tableLoading } = useQuery({
    queryKey: ["je-list", dateFrom, dateTo],
    queryFn: () => api.journalEntries.list(baseParams),
  });

  // 집계 행 (mode에 따른 그룹핑)
  const aggregateRows = useMemo(() => {
    const raw = entries as any[];
    if (!raw.length || mode === "모두") return raw;
    if (mode === "일자별") {
      const map: Record<string, any> = {};
      raw.forEach(e => {
        const k = e.date;
        if (!map[k]) map[k] = { date: k, debit: 0, credit: 0 };
        map[k].debit += e.debit; map[k].credit += e.credit;
      });
      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    }
    if (mode === "계정과목별") {
      const map: Record<string, any> = {};
      raw.forEach(e => {
        const k = e.account;
        if (!map[k]) map[k] = { account: k, debit: 0, credit: 0 };
        map[k].debit += e.debit; map[k].credit += e.credit;
      });
      return Object.values(map).sort((a, b) => b.credit - a.credit);
    }
    if (mode === "거래처별") {
      const map: Record<string, any> = {};
      raw.forEach(e => {
        const k = e.vendor;
        if (!map[k]) map[k] = { vendor: k, debit: 0, credit: 0 };
        map[k].debit += e.debit; map[k].credit += e.credit;
      });
      return Object.values(map).sort((a, b) => b.credit - a.credit);
    }
    return raw;
  }, [entries, mode]);

  // 상세 내역 행 (모두 모드 or 하위 상세)
  const detailRows = entries as any[];

  // 집계 테이블 컬럼 정의
  const aggregateCols = useMemo(() => {
    if (mode === "일자별") return [
      { key: "date", label: "일자", align: "left" as const },
      { key: "debit", label: "차변합계", align: "right" as const },
      { key: "credit", label: "대변합계", align: "right" as const },
    ];
    if (mode === "계정과목별") return [
      { key: "account", label: "계정과목", align: "left" as const },
      { key: "debit", label: "차변합계", align: "right" as const },
      { key: "credit", label: "대변합계", align: "right" as const },
    ];
    if (mode === "거래처별") return [
      { key: "vendor", label: "거래처", align: "left" as const },
      { key: "debit", label: "차변합계", align: "right" as const },
      { key: "credit", label: "대변합계", align: "right" as const },
    ];
    return [];
  }, [mode]);

  const aggregateTableRows = useMemo(() => {
    return aggregateRows.map((e: any) => {
      if (mode === "일자별") return [e.date, e.debit > 0 ? e.debit : "-", e.credit > 0 ? e.credit : "-"];
      if (mode === "계정과목별") return [e.account, e.debit > 0 ? e.debit : "-", e.credit > 0 ? e.credit : "-"];
      if (mode === "거래처별") return [e.vendor, e.debit > 0 ? e.debit : "-", e.credit > 0 ? e.credit : "-"];
      return [];
    });
  }, [aggregateRows, mode]);

  const detailTableCols = [
    { key: "date",             label: "일자",      align: "left" as const },
    { key: "je_number",        label: "전표번호",  align: "left" as const },
    { key: "account",          label: "계정과목",  align: "left" as const },
    { key: "vendor",           label: "거래처",    align: "left" as const },
    { key: "vendor_translated",label: "거래처 번역", align: "left" as const },
    { key: "memo",             label: "적요",      align: "left" as const },
    { key: "memo_translated",  label: "적요 번역", align: "left" as const },
    { key: "debit",            label: "차변",      align: "right" as const },
    { key: "credit",           label: "대변",      align: "right" as const },
  ];

  const detailTableRows = useMemo(() => {
    return detailRows.map((e: any) => [
      e.date,
      e.je_number,
      e.account,
      e.vendor,
      e.vendor_translated || "-",
      e.memo || "-",
      e.memo_translated || "-",
      e.debit > 0 ? e.debit : "-",
      e.credit > 0 ? e.credit : "-",
    ]);
  }, [detailRows]);

  // 월별 (x축: "24.01" 형식)
  const monthMap: Record<string, { name: string; value: number }> = {};
  (daily as any[]).forEach((d) => {
    const month = (d.date as string).slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { name: month.slice(2, 4) + "." + month.slice(5), value: 0 };
    monthMap[month].value += d[field] ?? 0;
  });
  const monthlyChartData = Object.values(monthMap);

  // 계정과목별 차트
  const acctChartData = (byAccount as any[]).map((d, i, arr) => ({
    name: d.account ?? "",
    value: d[field] ?? 0,
    fill: gradientOrange(i, arr.length),
  }));

  // 거래처별
  const vendorChartData = (byVendor as any[]).map((d, i, arr) => ({
    name: d.vendor ?? "",
    value: d[field] ?? 0,
    fill: gradientOrange(i, arr.length),
  }));
  const vendorTotal = vendorChartData.reduce((s, d) => s + d.value, 0);

  // 계정과목 바 클릭 → 크로스 필터
  const handleBarClick = (data: any) => {
    if (!data?.name) return;
    setFilterAcct(prev => prev === data.name ? "모두" : data.name);
  };

  const kpiData = kpi as any;
  const isCount = metric === "전표수";

  // CSV 다운로드 핸들러 (기표 내역 카드)
  const handleCsvDownload = () => {
    if (mode === "모두") {
      downloadCsv(detailTableCols.map(c => c.label), detailTableRows, "전표분석내역");
    } else {
      // 집계 + 상세 합쳐서 다운로드
      const aggHeader = aggregateCols.map(c => c.label);
      downloadCsv(aggHeader, aggregateTableRows, `전표분석내역_${mode}`);
    }
  };

  const useTwoColLegend = vendorChartData.length > 15;

  return (
    <div className="space-y-5">

      {/* ── 필터 바 ── */}
      <div className="rounded-lg px-5 py-3 flex items-center justify-between gap-4"
        style={{ backgroundColor: "#F5F7F8", border: "1px solid #DFE3E6" }}>

        <div className="flex items-center gap-3 flex-wrap">
          {/* 메트릭 토글 */}
          <div className="flex" style={{ border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden", backgroundColor: "#fff" }}>
            {METRICS.map((m) => {
              const active = m === metric;
              return (
                <button key={m} onClick={() => setMetric(m)}
                  style={{
                    fontSize: 13, letterSpacing: "-0.3px", padding: "4px 16px",
                    backgroundColor: active ? "#1A1A2E" : "transparent",
                    color: active ? "#fff" : "#A1A8B3",
                    outline: "none", cursor: "pointer",
                    border: "none", borderRight: "1px solid #DFE3E6",
                  }}>
                  {m}
                </button>
              );
            })}
          </div>

          {/* 계정과목 드롭다운 — 그룹 먼저, 하위 계정 선택 */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: "#A1A8B3", whiteSpace: "nowrap" }}>계정과목</span>
            {/* 그룹 토글 */}
            <div className="flex" style={{ border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden", backgroundColor: "#fff" }}>
              {ACCT_GROUPS.map((g) => {
                const active = g === filterGroup;
                return (
                  <button key={g} onClick={() => handleGroupChange(g)}
                    style={{
                      fontSize: 13, letterSpacing: "-0.3px", padding: "4px 12px",
                      backgroundColor: active ? "#FD5108" : "transparent",
                      color: active ? "#fff" : "#A1A8B3",
                      outline: "none", cursor: "pointer",
                      border: "none", borderRight: "1px solid #DFE3E6",
                      whiteSpace: "nowrap",
                    }}>
                    {g}
                  </button>
                );
              })}
            </div>
            {/* 하위 계정 선택 */}
            {filterGroup !== "모두" && (
              <CustomSelect
                value={filterAcct}
                onChange={(v) => setFilterAcct(String(v))}
                options={acctOptions}
                fontSize={13}
              />
            )}
          </div>

          <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6", flexShrink: 0 }} />

          {/* 인라인 KPI */}
          {kpiData ? (
            <span style={{ fontSize: 13, letterSpacing: "-0.3px", color: "#6B7280", whiteSpace: "nowrap" }}>
              전표수&nbsp;
              <strong style={{ fontSize: 14, color: metric === "전표수" ? "#FD5108" : "#374151" }}>
                {kpiData.je_count?.toLocaleString()}건
              </strong>
              &nbsp;&nbsp;차변&nbsp;
              <strong style={{ fontSize: 14, color: metric === "차변" ? "#FD5108" : "#374151" }}>
                {formatKRW(kpiData.debit_total)}
              </strong>
              &nbsp;&nbsp;대변&nbsp;
              <strong style={{ fontSize: 14, color: metric === "대변" ? "#FD5108" : "#374151" }}>
                {formatKRW(kpiData.credit_total)}
              </strong>
            </span>
          ) : (
            <span style={{ fontSize: 13, color: "#D1D5DB" }}>집계 중...</span>
          )}
        </div>

      </div>

      {/* ① 월별 추이 */}
      <ChartCard
        title={`월별 ${unit}액`}
        subtitle={filterAcct !== "모두" ? `계정과목: ${filterAcct}` : "분석 기간 내 월별 기표 금액 추이"}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyChartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={isCount ? (v) => v.toLocaleString() : chartAxisFormatter}
              tick={AXIS_STYLE} tickLine={false} axisLine={false}
            />
            <RechartsTooltip
              content={<ChartTooltip isCount={isCount} />}
              cursor={{ fill: "#F5F7F8" }}
            />
            <Bar dataKey="value" name={unit} fill="#FD5108" radius={[3, 3, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ② 계정과목별 + 거래처별 — 공유 TopN, 동일 높이 */}
      <div>
        {/* 공유 필터 헤더 */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span style={{ fontSize: 12, color: "#A1A8B3", letterSpacing: "-0.3px" }}>계정과목 · 거래처 공통 적용</span>
          <TopNSelector value={topN} onChange={setTopN} />
        </div>

        <div className="grid grid-cols-12 gap-4 items-stretch">
        <div className="col-span-8 flex flex-col">
          <ChartCard
            className="flex-1"
            title={`계정과목별 ${unit}액`}
            subtitle={`${unit}액 기준 상위 ${topN}개 계정 — 클릭하면 필터 적용`}
          >
            <div style={{ maxHeight: 460, overflowY: "auto" }}>
            <ResponsiveContainer width="100%" height={Math.max(280, topN * 28)}>
              <BarChart data={acctChartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                <XAxis type="number"
                  tickFormatter={isCount ? (v) => v.toLocaleString() : chartAxisFormatter}
                  tick={AXIS_STYLE} tickLine={false} axisLine={false}
                />
                <YAxis type="category" dataKey="name"
                  tick={{ ...AXIS_STYLE, fontSize: 11 }}
                  tickLine={false} axisLine={false} width={155}
                />
                <RechartsTooltip
                  content={<ChartTooltip isCount={isCount} />}
                  cursor={{ fill: "#F5F7F8" }}
                />
                <Bar dataKey="value" name={unit} radius={[0, 3, 3, 0]}
                  onClick={handleBarClick}
                  style={{ cursor: "pointer" }}
                >
                  {acctChartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.fill}
                      opacity={filterAcct === "모두" || filterAcct === d.name ? 1 : 0.35}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
        <div className="col-span-4 flex flex-col">
          <ChartCard
            className="flex-1"
            title={`${unit}액 기준 상위 거래처`}
            subtitle={`상위 ${topN}개 거래처`}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* 도넛 차트 — gradientOrange 팔레트 */}
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={vendorChartData} cx="50%" cy="50%"
                    innerRadius={52} outerRadius={82}
                    dataKey="value" nameKey="name"
                    strokeWidth={1} stroke="#fff">
                    {vendorChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <RechartsTooltip
                    content={<VendorTooltip total={vendorTotal} isCount={isCount} />}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* 커스텀 범례 — 20개 초과 시 2열 */}
              <div style={{
                maxHeight: 200, overflowY: "auto", paddingRight: 2,
                display: useTwoColLegend ? "grid" : "block",
                gridTemplateColumns: useTwoColLegend ? "1fr 1fr" : undefined,
                columnGap: useTwoColLegend ? 8 : undefined,
              }}>
                {vendorChartData.map((d, i) => {
                  const pct = vendorTotal > 0 ? (d.value / vendorTotal * 100).toFixed(1) : "0.0";
                  const displayName = d.name || "(미지정)";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px", borderRadius: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.fill, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.3px" }}>{displayName}</span>
                      <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, flexShrink: 0, letterSpacing: "-0.3px" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        </div>
        </div>{/* closes grid */}
      </div>{/* closes outer section */}

      {/* ── 기표 내역 테이블 ── */}
      <div className="bg-white rounded-lg border overflow-hidden"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>

        {/* 카드 헤더 — CSV 버튼 포함 */}
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold" style={{ color: "#000" }}>기표 내역</h4>
            {filterAcct !== "모두" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "#FFF5ED", color: "#FD5108" }}>{filterAcct}</span>
            )}
          </div>
          <CsvButton onClick={handleCsvDownload} />
        </div>

        {/* 집계 방식 탭 */}
        <div className="px-5 pt-3 pb-0 flex items-center gap-2">
          <span style={{ fontSize: 13, color: "#A1A8B3", whiteSpace: "nowrap" }}>집계</span>
          <div className="flex" style={{ border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden", backgroundColor: "#F5F7F8" }}>
            {MODES.map((m) => {
              const active = m === mode;
              return (
                <button key={m} onClick={() => setMode(m)}
                  style={{
                    fontSize: 13, letterSpacing: "-0.3px", padding: "4px 12px",
                    backgroundColor: active ? "#1A1A2E" : "transparent",
                    color: active ? "#fff" : "#A1A8B3",
                    outline: "none", cursor: "pointer",
                    border: "none", borderRight: "1px solid #DFE3E6",
                  }}>
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3">
          {mode === "모두" ? (
            /* 모두 모드: 상세 내역만 */
            <SortableTable
              columns={detailTableCols}
              rows={detailTableRows}
              filename="전표분석내역"
              maxHeight={420}
              loading={tableLoading}
              hideCsvButton
            />
          ) : (
            /* 집계 모드: 집계 내역 + 상세 내역 */
            <div className="space-y-4">
              {/* 집계 내역 */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  {mode} 집계
                </div>
                <SortableTable
                  columns={aggregateCols}
                  rows={aggregateTableRows}
                  filename={`전표분석내역_${mode}_집계`}
                  maxHeight={280}
                  loading={tableLoading}
                  hideCsvButton
                />
              </div>

              {/* 구분선 */}
              <div style={{ borderTop: "1px solid #EEEFF1" }} />

              {/* 상세 내역 */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  전표 상세 내역
                </div>
                <SortableTable
                  columns={detailTableCols}
                  rows={detailTableRows}
                  filename="전표분석내역_상세"
                  maxHeight={360}
                  loading={tableLoading}
                  hideCsvButton
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
