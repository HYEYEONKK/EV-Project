"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import CustomSelect from "@/components/ui/CustomSelect";
import SortableTable from "@/components/ui/SortableTable";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
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
  if (m === "차변") return { apiMetric: "debit",  field: "debit_total",  unit: "차변합계" };
  if (m === "전표수") return { apiMetric: "count", field: "count",        unit: "전표수" };
  return                      { apiMetric: "credit", field: "credit_total", unit: "대변합계" };
}

// rank 0 = darkest (#FD5108), rank N-1 = lightest (#FFCDA8)
function gradientOrange(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1);
  return `rgb(${Math.round(0xFD + 2*t)},${Math.round(0x51 + 0x7C*t)},${Math.round(0x08 + 0xA0*t)})`;
}

// PwC 테마 팔레트 — 오렌지·회색 계열 교차 배치, 각 색상 1회만 사용
const DONUT_PALETTE = [
  '#FD5108', // PwC Orange (진한)
  '#54565A', // PwC Dark Grey
  '#FE7C39', // PwC Orange (중간)
  '#A1A8B3', // PwC Mid Grey
  '#FFAA72', // PwC Orange (연한)
  '#374151', // PwC Charcoal
  '#FFCDA8', // PwC Orange (매우 연한)
  '#B5BCC4', // PwC Light Grey
  '#D04A02', // PwC Deep Orange
  '#CBD1D6', // PwC Pale Grey
  '#FF6B2B', // PwC Orange (중진)
  '#8A9099', // PwC Mid-Light Grey
  '#FFE8D4', // PwC Orange (극연)
  '#DFE3E6', // PwC Silver Grey
  '#E8450A', // PwC Red-Orange
  '#6B7280', // PwC Steel Grey
  '#FFBB88', // PwC Peach Orange
  '#9FAAB3', // PwC Blue-Grey
  '#C04000', // PwC Burnt Orange
  '#EEEFF1', // PwC Ghost Grey
];
function donutColor(index: number): string {
  return DONUT_PALETTE[index % DONUT_PALETTE.length];
}

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

export default function VoucherListPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const [mode, setMode] = useState<Mode>("모두");
  const [metric, setMetric] = useState<Metric>("대변");
  const [filterAcct, setFilterAcct] = useState("모두");
  const [topN, setTopN] = useState(10);

  const { field, apiMetric, unit } = metricField(metric);
  const acctParam = filterAcct !== "모두" ? filterAcct : undefined;
  const baseParams = { date_from: dateFrom, date_to: dateTo };

  const { data: dims } = useQuery({
    queryKey: ["je-voucher-dims", dateFrom, dateTo],
    queryFn: () => api.journalEntries.voucherDimensions(baseParams),
  });
  const acctOptions = ["모두", ...((dims as any)?.accounts ?? [])];

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

  const tableRows = useMemo(() => {
    const raw = entries as any[];
    if (!raw.length || mode === "모두") return raw;
    if (mode === "일자별") {
      const map: Record<string, any> = {};
      raw.forEach(e => {
        const k = e.date;
        if (!map[k]) map[k] = { date: k, je_number: "-", account: "(일자 합계)", vendor: "-", vendor_translated: "", memo: "", memo_translated: "", debit: 0, credit: 0 };
        map[k].debit += e.debit; map[k].credit += e.credit;
      });
      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    }
    if (mode === "계정과목별") {
      const map: Record<string, any> = {};
      raw.forEach(e => {
        const k = e.account;
        if (!map[k]) map[k] = { date: "-", je_number: "-", account: k, vendor: "(계정 합계)", vendor_translated: "", memo: "", memo_translated: "", debit: 0, credit: 0 };
        map[k].debit += e.debit; map[k].credit += e.credit;
      });
      return Object.values(map).sort((a, b) => b.credit - a.credit);
    }
    if (mode === "거래처별") {
      const map: Record<string, any> = {};
      raw.forEach(e => {
        const k = e.vendor;
        if (!map[k]) map[k] = { date: "-", je_number: "-", account: "(거래처 합계)", vendor: k, vendor_translated: "", memo: "", memo_translated: "", debit: 0, credit: 0 };
        map[k].debit += e.debit; map[k].credit += e.credit;
      });
      return Object.values(map).sort((a, b) => b.credit - a.credit);
    }
    return raw;
  }, [entries, mode]);

  // 월별 (x축: "24.01" 형식)
  const monthMap: Record<string, { name: string; value: number }> = {};
  (daily as any[]).forEach((d) => {
    const month = (d.date as string).slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { name: month.slice(2, 4) + "." + month.slice(5), value: 0 };
    monthMap[month].value += d[field] ?? 0;
  });
  const monthlyChartData = Object.values(monthMap);

  // 계정과목별 차트
  // API는 이미 내림차순 정렬(rank1=index0), Recharts layout="vertical"에서 index0 = 맨 위
  // → 뒤집지 않고 그대로 사용
  const acctChartData = (byAccount as any[]).map((d, i, arr) => ({
    name: d.account ?? "",
    value: d[field] ?? 0,
    fill: gradientOrange(i, arr.length), // i=0(rank1, top) = darkest
  }));

  // 거래처별
  const vendorChartData = (byVendor as any[]).map((d, i) => ({
    name: d.vendor ?? "",
    value: d[field] ?? 0,
    fill: donutColor(i),
  }));
  const vendorTotal = vendorChartData.reduce((s, d) => s + d.value, 0);

  // 계정과목 바 클릭 → 크로스 필터
  const handleBarClick = (data: any) => {
    if (!data?.name) return;
    setFilterAcct(prev => prev === data.name ? "모두" : data.name);
  };

  const kpiData = kpi as any;
  const isCount = metric === "전표수";

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

          {/* 계정과목 드롭다운 */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: "#A1A8B3", whiteSpace: "nowrap" }}>계정과목</span>
            <CustomSelect
              value={filterAcct}
              onChange={(v) => setFilterAcct(String(v))}
              options={acctOptions}
              fontSize={13}
            />
          </div>

          {/* 집계 방식 */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: "#A1A8B3", whiteSpace: "nowrap" }}>집계</span>
            <div className="flex" style={{ border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden", backgroundColor: "#fff" }}>
              {MODES.map((m) => {
                const active = m === mode;
                return (
                  <button key={m} onClick={() => setMode(m)}
                    style={{
                      fontSize: 13, letterSpacing: "-0.3px", padding: "4px 10px",
                      backgroundColor: active ? "#6B7280" : "transparent",
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
          </ChartCard>
        </div>
        <div className="col-span-4 flex flex-col">
          <ChartCard
            className="flex-1"
            title={`${unit}액 기준 상위 거래처`}
            subtitle={`상위 ${topN}개 거래처`}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* 도넛 차트 */}
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

              {/* 스크롤 가능한 커스텀 범례 */}
              <div style={{ maxHeight: 200, overflowY: "auto", paddingRight: 2 }}>
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
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold" style={{ color: "#000" }}>기표 내역</h4>
            {mode !== "모두" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "#F0F0F5", color: "#6B7280" }}>{mode} 기준</span>
            )}
          </div>
          <span className="text-xs" style={{ color: "#A1A8B3" }}>{tableRows.length.toLocaleString()}행</span>
        </div>
        <div className="px-5 py-3">
          <SortableTable
            columns={[
              { key: "date",             label: "일자",      align: "left" },
              { key: "je_number",        label: "전표번호",  align: "left" },
              { key: "account",          label: "계정과목",  align: "left" },
              { key: "vendor",           label: "거래처",    align: "left" },
              { key: "vendor_translated",label: "거래처 번역", align: "left" },
              { key: "memo",             label: "적요",      align: "left" },
              { key: "memo_translated",  label: "적요 번역", align: "left" },
              { key: "debit",            label: "차변",      align: "right" },
              { key: "credit",           label: "대변",      align: "right" },
            ]}
            rows={(tableRows as any[]).map((e) => [
              e.date,
              e.je_number,
              e.account,
              e.vendor,
              e.vendor_translated || "-",
              e.memo || "-",
              e.memo_translated || "-",
              e.debit > 0 ? e.debit : "-",
              e.credit > 0 ? e.credit : "-",
            ])}
            filename="전표분석내역"
            maxHeight={420}
            loading={tableLoading}
          />
        </div>
      </div>
    </div>
  );
}
