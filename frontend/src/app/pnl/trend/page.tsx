"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, PlMonthlyAccount, PlEntry } from "@/lib/api/client";
import { formatKRW, formatPct, chartAxisFormatter } from "@/lib/utils/formatters";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Cell, Legend, LineChart,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE } from "@/lib/utils/chartColors";

// ─── COA 대분류 목록 ────────────────────────────────────────
const COA_CATEGORIES = [
  "매출액", "매출원가", "판관비", "금융수익", "금융비용", "기타수익", "기타비용",
] as const;

const ACCENT = "#FD5108";
const PRIOR_COLOR = "#A1A8B3";

// 회계 서식: 음수는 (1,234) 형태, 증가=빨강, 감소=파랑
function formatAcctPct(v: number): string {
  const abs = Math.abs(v).toFixed(1);
  return v < 0 ? `(${abs}%)` : `${abs}%`;
}
const PCT_COLOR_POS = "#DC2626"; // 빨강 (증가)
const PCT_COLOR_NEG = "#2563EB"; // 파랑 (감소)
const BAR_COLOR_POS = "rgba(220,38,38,0.12)";  // 연핑크
const BAR_COLOR_NEG = "rgba(37,99,235,0.12)";  // 연파랑

// ─── CSV 다운로드 ────────────────────────────────────────────
function downloadCSV(entries: PlEntry[], filename: string) {
  const headers = "일자,전표번호,거래처,적요,차변,대변";
  const body = entries.map(e =>
    [e.date, e.je_number, e.vendor || "", e.memo || "", e.debit || 0, e.credit || 0]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + headers + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── 커스텀 툴팁 ─────────────────────────────────────────────
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

// ─── 정렬 아이콘 ─────────────────────────────────────────────
type SortDir = "asc" | "desc" | null;
function SortIcon({ dir }: { dir: SortDir }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, marginLeft: 3, opacity: dir ? 1 : 0.3, verticalAlign: "middle" }}>
      <svg width="7" height="5" viewBox="0 0 7 5"><path d="M3.5 0L7 5H0z" fill={dir === "asc" ? ACCENT : "#A1A8B3"} /></svg>
      <svg width="7" height="5" viewBox="0 0 7 5"><path d="M3.5 5L0 0H7z" fill={dir === "desc" ? ACCENT : "#A1A8B3"} /></svg>
    </span>
  );
}

// ─── 전표 테이블 ─────────────────────────────────────────────
const ENTRY_COLS: { key: keyof PlEntry; label: string; align?: "right" }[] = [
  { key: "date",      label: "일자" },
  { key: "je_number", label: "전표번호" },
  { key: "vendor",    label: "거래처" },
  { key: "memo",      label: "적요" },
  { key: "debit",     label: "차변",  align: "right" },
  { key: "credit",    label: "대변",  align: "right" },
];

function EntryTable({ title, subtitle, entries, csvFilename }: { title: string; subtitle?: string; entries: PlEntry[]; csvFilename: string }) {
  const [sortKey, setSortKey] = useState<keyof PlEntry | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: keyof PlEntry) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); }
    else if (sortDir === "desc") setSortDir("asc");
    else { setSortKey(null); setSortDir(null); }
  };

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return entries;
    return [...entries].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [entries, sortKey, sortDir]);

  return (
    <div className="bg-white rounded-lg border overflow-hidden card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#A1A8B3", marginTop: 1 }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#A1A8B3" }}>{entries.length}건</span>
          <button
            onClick={() => downloadCSV(entries, csvFilename)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 8px", borderRadius: 5, border: "1px solid #DFE3E6", backgroundColor: "#fff", color: "#374151", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F5F7F8")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
        </div>
      </div>
      <div style={{ overflowY: "auto", maxHeight: 260 }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#F5F7F8", position: "sticky", top: 0, zIndex: 1 }}>
              {ENTRY_COLS.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  style={{ padding: "8px 12px", textAlign: col.align ?? "left", fontWeight: 600, color: sortKey === col.key ? ACCENT : "#A1A8B3", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
                  {col.label}<SortIcon dir={sortKey === col.key ? sortDir : null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: "#A1A8B3" }}>데이터 없음</td></tr>
            ) : sorted.map((e, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F5F7F8" }}
                onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = "#FAFBFC")}
                onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "")}>
                <td style={{ padding: "7px 12px", color: "#1A1A2E", whiteSpace: "nowrap" }}>{e.date}</td>
                <td style={{ padding: "7px 12px", color: "#A1A8B3", whiteSpace: "nowrap" }}>{e.je_number}</td>
                <td style={{ padding: "7px 12px", color: "#1A1A2E", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.vendor || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                <td style={{ padding: "7px 12px", color: "#A1A8B3", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.memo || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                <td style={{ padding: "7px 12px", textAlign: "right", color: "#1A1A2E" }}>{e.debit ? formatKRW(e.debit) : "—"}</td>
                <td style={{ padding: "7px 12px", textAlign: "right", color: "#1A1A2E" }}>{e.credit ? formatKRW(e.credit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 섹션 헤더 ───────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#D04A02", whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: "#C8CDD6" }} />
    </div>
  );
}

// ─── 소형 스파크라인 차트 (월별 손익 Trend 그리드) ─────────────
function SparklineCard({
  item, mode,
}: {
  item: PlMonthlyAccount;
  mode: "월" | "누적";
}) {
  const sorted = [...item.monthly].sort((a, b) => a.month.localeCompare(b.month));

  const chartData = useMemo(() => {
    let cumCur = 0, cumPri = 0;
    return sorted.map(m => {
      cumCur += m.current;
      cumPri += m.prior;
      const mo = parseInt(m.month.slice(5));
      return {
        month: mo,
        당기: mode === "월" ? m.current : cumCur,
        전기: mode === "월" ? m.prior : cumPri,
      };
    });
  }, [sorted, mode]);

  const maxVal = Math.max(...chartData.map(d => Math.max(Math.abs(d.당기), Math.abs(d.전기))), 1);

  return (
    <div style={{
      border: "1px solid #EEEFF1", borderRadius: 8, padding: "10px 12px",
      backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.account}
      </div>
      <div style={{ fontSize: 10, color: "#A1A8B3", marginBottom: 6 }}>
        {chartAxisFormatter(maxVal)}
      </div>
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#C0C4CC" }} tickLine={false} axisLine={false} interval={2} />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="전기" stroke={PRIOR_COLOR} strokeWidth={1.5}
              strokeDasharray="3 3" dot={false} name="전기" />
            <Line type="monotone" dataKey="당기" stroke={ACCENT} strokeWidth={2}
              dot={false} name="당기" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── 커스텀 범례 ─────────────────────────────────────────────
function ChartLegend() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11, paddingTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 18, height: 2, backgroundColor: ACCENT, display: "inline-block", borderRadius: 1 }} />
        <span style={{ color: "#374151" }}>당기</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 18, height: 2, background: `repeating-linear-gradient(90deg,${PRIOR_COLOR} 0,${PRIOR_COLOR} 4px,transparent 4px,transparent 7px)`, display: "inline-block" }} />
        <span style={{ color: "#374151" }}>전기</span>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function PlTrendPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["pl-monthly-accounts", dateFrom, dateTo],
    queryFn: () => api.plTrend.monthlyByAccount({ date_from: dateFrom, date_to: dateTo }),
  });

  const acctList = accounts as PlMonthlyAccount[];

  // ── 상태 ──
  const [trendCategory, setTrendCategory] = useState<string>("판관비");
  const [trendMode, setTrendMode] = useState<"월" | "누적">("월");
  const [detailCategory, setDetailCategory] = useState<string>("매출액");
  const [selectedAcct, setSelectedAcct] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // 카테고리별 그룹핑
  const categories = useMemo(() => {
    const map: Record<string, PlMonthlyAccount[]> = {};
    for (const cat of COA_CATEGORIES) map[cat] = [];
    for (const a of acctList) {
      const cat = a.category || "기타비용";
      if (!map[cat]) map[cat] = [];
      map[cat].push(a);
    }
    return map;
  }, [acctList]);

  // 비어있지 않은 카테고리 목록
  const availableCategories = useMemo(
    () => COA_CATEGORIES.filter(c => (categories[c]?.length ?? 0) > 0),
    [categories]
  );

  // 초기 카테고리 선택
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.includes(trendCategory as any)) {
      setTrendCategory(availableCategories[0]);
    }
    if (availableCategories.length > 0 && !availableCategories.includes(detailCategory as any)) {
      setDetailCategory(availableCategories[0]);
    }
  }, [availableCategories]);

  // 상세 섹션: 선택된 카테고리의 계정들
  const detailItems = categories[detailCategory] ?? [];
  const filteredItems = useMemo(() =>
    search.trim()
      ? detailItems.filter(i => i.account.includes(search.trim()))
      : detailItems,
    [detailItems, search]
  );

  const effectiveAcct = selectedAcct && detailItems.some(i => i.account === selectedAcct)
    ? selectedAcct
    : (filteredItems.length > 0 ? filteredItems[0].account : null);

  // 카테고리 변경 시 선택 초기화
  useEffect(() => {
    setSelectedAcct(null);
    setSearch("");
  }, [detailCategory]);

  // 차트 데이터
  const selectedData = detailItems.find(a => a.account === effectiveAcct);
  const chartData = useMemo(() => {
    if (!selectedData) return [];
    const sorted = [...selectedData.monthly].sort((a, b) => a.month.localeCompare(b.month));
    let cumCur = 0, cumPri = 0;
    return sorted.map(m => {
      cumCur += m.current; cumPri += m.prior;
      return {
        month: m.month.slice(2, 4) + "." + m.month.slice(5),
        당기: m.current, 전기: m.prior,
        당기누적: cumCur, 전기누적: cumPri,
      };
    });
  }, [selectedData]);

  // 거래처/전표
  const params = { date_from: dateFrom, date_to: dateTo };
  const { data: vendors = [] } = useQuery({
    queryKey: ["pl-vendor-delta", dateFrom, dateTo, effectiveAcct],
    queryFn: () => api.plTrend.vendorDelta({ ...params, account: effectiveAcct }),
    enabled: !!effectiveAcct,
  });
  const { data: currentEntries = [] } = useQuery({
    queryKey: ["pl-entries-current", dateFrom, dateTo, effectiveAcct],
    queryFn: () => api.plTrend.entries({ ...params, account: effectiveAcct, period: "current", limit: 9999 }),
    enabled: !!effectiveAcct,
  });
  const { data: priorEntries = [] } = useQuery({
    queryKey: ["pl-entries-prior", dateFrom, dateTo, effectiveAcct],
    queryFn: () => api.plTrend.entries({ ...params, account: effectiveAcct, period: "prior", limit: 9999 }),
    enabled: !!effectiveAcct,
  });

  const topVendors = (vendors as any[]).slice(0, 12);
  const curEntries = currentEntries as PlEntry[];
  const priEntries = priorEntries as PlEntry[];
  const priorFrom = dateFrom ? `${parseInt(dateFrom.slice(0,4))-1}${dateFrom.slice(4)}` : "";
  const priorTo   = dateTo   ? `${parseInt(dateTo.slice(0,4))-1}${dateTo.slice(4)}`     : "";

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "#A1A8B3" }}>
        불러오는 중...
      </div>
    );
  }

  // ── Trend 섹션 카테고리 항목들 ──
  const trendItems = categories[trendCategory] ?? [];

  return (
    <div className="space-y-6">

      {/* ══════════════════════════════════════════════════════
          1. 계정별 추이분석 (소형 차트 그리드)
         ══════════════════════════════════════════════════════ */}
      <div>
        {/* 헤더: 타이틀 + 월/누적 토글 + 카테고리 드롭다운 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#D04A02", whiteSpace: "nowrap" }}>계정별 추이분석</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#C8CDD6" }} />

          {/* 월/누적 토글 */}
          <div style={{ display: "flex", border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden" }}>
            {(["월", "누적"] as const).map(m => (
              <button key={m} onClick={() => setTrendMode(m)}
                style={{
                  padding: "5px 16px", fontSize: 13, border: "none", cursor: "pointer",
                  backgroundColor: trendMode === m ? "#1A1A2E" : "#fff",
                  color: trendMode === m ? "#fff" : "#6B7280",
                  fontWeight: trendMode === m ? 600 : 400,
                }}>
                {m}
              </button>
            ))}
          </div>

          {/* 카테고리 드롭다운 */}
          <select
            value={trendCategory}
            onChange={e => setTrendCategory(e.target.value)}
            style={{
              padding: "5px 28px 5px 12px", fontSize: 13, border: "1px solid #DFE3E6",
              borderRadius: 6, backgroundColor: "#fff", color: "#374151",
              cursor: "pointer", appearance: "auto", minWidth: 140,
            }}>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 안내 문구 */}
        <div style={{ fontSize: 12, color: "#A1A8B3", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", backgroundColor: "#FFF5ED", fontSize: 10, color: "#D04A02" }}>i</span>
          &apos;월별 손익 Trend&apos;에서 라인차트를 클릭하여 해당월 기준 전년 대비 증감 및 전기/당기 기표 내역을 분석
        </div>

        {/* 범례 */}
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEEFF1" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E", marginBottom: 6 }}>월별 손익 Trend</div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: PRIOR_COLOR, display: "inline-block" }} />
                {parseInt(dateFrom?.slice(0,4) || "2024")}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: ACCENT, display: "inline-block" }} />
                {parseInt(dateTo?.slice(0,4) || "2025")}
              </span>
            </div>
          </div>

          {/* 그리드 (4x3=12개 넘으면 스크롤) */}
          <div style={{ padding: 16, maxHeight: 460, overflowY: "auto" }}>
            {trendItems.length === 0 ? (
              <div style={{ textAlign: "center", color: "#A1A8B3", padding: 40, fontSize: 13 }}>
                해당 카테고리에 데이터가 없습니다.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {trendItems.map(item => (
                  <SparklineCard key={item.account} item={item} mode={trendMode} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          2. 상세 분석 (통합 수익+비용)
         ══════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader title="상세 계정 분석" />

        <div style={{ border: "1px solid #DFE3E6", borderRadius: 10, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 4px #0000000D" }}>

          {/* 카테고리 탭 바 */}
          <div style={{ padding: "0 16px", borderBottom: "1px solid #DFE3E6", display: "flex", alignItems: "center", gap: 0, backgroundColor: "#FAFBFC" }}>
            {availableCategories.map(cat => (
              <button key={cat} onClick={() => setDetailCategory(cat)}
                style={{
                  padding: "10px 16px", fontSize: 13, border: "none", cursor: "pointer",
                  backgroundColor: "transparent",
                  color: detailCategory === cat ? "#D04A02" : "#6B7280",
                  fontWeight: detailCategory === cat ? 700 : 400,
                  borderBottom: detailCategory === cat ? "2px solid #D04A02" : "2px solid transparent",
                  transition: "all 0.15s",
                }}>
                {cat}
                <span style={{ fontSize: 10, color: "#A1A8B3", marginLeft: 4 }}>
                  {(categories[cat]?.length ?? 0)}
                </span>
              </button>
            ))}
          </div>

          {/* 4카드 레이아웃 */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 2fr 1fr 1fr", gap: 12, padding: 14, minHeight: 380 }}>

            {/* ① 계정 목록 */}
            <div style={{ border: "1px solid #DFE3E6", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #EEEFF1", fontSize: 14, fontWeight: 600, color: "#1A1A2E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>계정과목</span>
                <span style={{ fontSize: 10, color: "#A1A8B3", fontWeight: 400 }}>{detailItems.length}개</span>
              </div>
              <div style={{ padding: "7px 10px", borderBottom: "1px solid #F5F7F8" }}>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A8B3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="검색..."
                    style={{
                      width: "100%", padding: "4px 8px 4px 24px", fontSize: 11, boxSizing: "border-box",
                      border: "1px solid #DFE3E6", borderRadius: 5, outline: "none", color: "#374151", backgroundColor: "#FAFBFC",
                    }}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = "#DFE3E6")}
                  />
                </div>
                {search && <div style={{ fontSize: 10, color: "#A1A8B3", marginTop: 3 }}>{filteredItems.length} / {detailItems.length}</div>}
              </div>
              <div style={{ padding: "3px 8px 2px", display: "flex", borderBottom: "1px solid #F5F7F8" }}>
                <span style={{ flex: 1, fontSize: 10, color: "#C0C4CC" }}>계정</span>
                <span style={{ fontSize: 10, color: "#C0C4CC", flexShrink: 0, minWidth: 44, textAlign: "right" }}>YoY</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", maxHeight: 300 }}>
                {filteredItems.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "#A1A8B3", fontSize: 12 }}>없음</div>
                ) : filteredItems.map(item => {
                  const isSelected = item.account === effectiveAcct;
                  const changeColor = item.change_pct >= 0 ? "#059669" : "#DC2626";
                  return (
                    <button key={item.account} onClick={() => setSelectedAcct(item.account)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, width: "100%",
                        textAlign: "left", padding: "5px 8px", border: "none",
                        backgroundColor: isSelected ? "#FFF4EE" : "transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? "#FFF4EE" : "transparent"; }}
                    >
                      <span style={{ flex: 1, fontSize: 11, fontWeight: isSelected ? 700 : 400, color: isSelected ? ACCENT : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.account}
                      </span>
                      <span style={{
                        fontSize: 10, whiteSpace: "nowrap", flexShrink: 0, minWidth: 56, textAlign: "right",
                        color: item.change_pct >= 0 ? PCT_COLOR_POS : PCT_COLOR_NEG,
                        fontWeight: 600,
                        position: "relative", padding: "2px 4px", borderRadius: 3,
                        background: `linear-gradient(to ${item.change_pct >= 0 ? "right" : "left"}, ${item.change_pct >= 0 ? BAR_COLOR_POS : BAR_COLOR_NEG} ${Math.min(Math.abs(item.change_pct), 100)}%, transparent ${Math.min(Math.abs(item.change_pct), 100)}%)`,
                      }}>
                        {formatAcctPct(item.change_pct)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ② 월별 차트 */}
            <div style={{ border: "1px solid #DFE3E6", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEEFF1", fontSize: 14, fontWeight: 600, color: "#1A1A2E", flexShrink: 0 }}>
                월별 {effectiveAcct && <span style={{ fontSize: 11, fontWeight: 400, color: "#A1A8B3" }}>— {effectiveAcct}</span>}
              </div>
              {effectiveAcct ? (
                <div style={{ height: 300, padding: "14px 8px 10px 8px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 44, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="areaGrad-detail" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={ACCENT} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false}
                        interval={0}
                        tick={({ x, y, payload }: any) => {
                          const mo = String(payload.value).slice(3);
                          if (!["03","06","09","12"].includes(mo)) return <g />;
                          return <text x={x} y={y + 12} textAnchor="middle" fill="#A1A8B3" fontSize={10}>{payload.value}</text>;
                        }} />
                      <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend content={() => <ChartLegend />} wrapperStyle={{ paddingTop: 2 }} />
                      <Area type="monotone" dataKey="전기" stroke={PRIOR_COLOR} strokeWidth={1.5}
                        strokeDasharray="4 3" fill="none" dot={false} name="전기" />
                      <Area type="monotone" dataKey="당기" stroke={ACCENT} strokeWidth={2}
                        fill="url(#areaGrad-detail)" dot={false} name="당기" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 12 }}>계정 선택</div>
              )}
            </div>

            {/* ③ 누적 차트 */}
            <div style={{ border: "1px solid #DFE3E6", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEEFF1", fontSize: 14, fontWeight: 600, color: "#1A1A2E", flexShrink: 0 }}>
                누적 {effectiveAcct && <span style={{ fontSize: 11, fontWeight: 400, color: "#A1A8B3" }}>— {effectiveAcct}</span>}
              </div>
              {effectiveAcct ? (
                <div style={{ height: 300, padding: "14px 8px 10px 8px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false}
                        interval={0}
                        tick={({ x, y, payload }: any) => {
                          const mo = String(payload.value).slice(3);
                          if (!["03","06","09","12"].includes(mo)) return <g />;
                          return <text x={x} y={y + 12} textAnchor="middle" fill="#A1A8B3" fontSize={10}>{payload.value}</text>;
                        }} />
                      <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={56} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 13, paddingTop: 2, paddingLeft: 56 }} />
                      <Line type="monotone" dataKey="당기누적" stroke={ACCENT} strokeWidth={2} dot={false} name="당기누적" />
                      <Line type="monotone" dataKey="전기누적" stroke={PRIOR_COLOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="전기누적" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 12 }}>계정 선택</div>
              )}
            </div>

            {/* ④ 거래처별 증감 */}
            <div style={{ border: "1px solid #DFE3E6", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEEFF1", fontSize: 14, fontWeight: 600, color: "#1A1A2E", flexShrink: 0 }}>
                거래처별 증감 {effectiveAcct && <span style={{ fontSize: 11, fontWeight: 400, color: "#A1A8B3" }}>— {effectiveAcct}</span>}
              </div>
              {effectiveAcct ? (
                topVendors.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 12 }}>데이터 없음</div>
                ) : (
                  <div style={{ height: 300, padding: "14px 8px 10px 8px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topVendors} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                        <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="vendor" tick={{ fontSize: 10, fill: "#A1A8B3" }} tickLine={false} axisLine={false} width={80}
                          tickFormatter={(v: string) => v.length > 7 ? v.slice(0, 7) + "…" : v} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="delta" name="증감" radius={[0, 3, 3, 0]} barSize={9}>
                          {topVendors.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.delta >= 0 ? "#16C784" : "#FF4747"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 12 }}>계정 선택</div>
              )}
            </div>
          </div>

          {/* 전표 내역 */}
          {effectiveAcct && (
            <div style={{ borderTop: "1px solid #EEEFF1", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, backgroundColor: "#FAFBFC" }}>
              <EntryTable
                title="당기 전표 내역"
                subtitle={`${dateFrom} ~ ${dateTo}`}
                entries={curEntries}
                csvFilename={`당기_${effectiveAcct}_${dateFrom}_${dateTo}.csv`}
              />
              <EntryTable
                title="전기 전표 내역"
                subtitle={`${priorFrom} ~ ${priorTo}`}
                entries={priEntries}
                csvFilename={`전기_${effectiveAcct}_${priorFrom}_${priorTo}.csv`}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
