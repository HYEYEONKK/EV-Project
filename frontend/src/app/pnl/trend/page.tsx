"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, PlMonthlyAccount, PlEntry } from "@/lib/api/client";
import { formatKRW, formatPct, chartAxisFormatter } from "@/lib/utils/formatters";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Cell, Legend,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";

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

// ─── 겹친 막대 shape (당기=채움, 전기=아웃라인, 동일 x 위치) ─
function CombinedBar({ x, y, width, height, value, payload, fill }: any) {
  if (!width || height === undefined || height === null) return <g />;
  const currentVal = Number(value ?? 0);
  const priorVal   = Number(payload?.전기 ?? 0);
  if (currentVal <= 0 && priorVal <= 0) return <g />;

  // y + height = pixel position of the 0 baseline
  const chartBottom = y + height;
  const pxPerUnit   = currentVal > 0 ? height / currentVal : 0;
  const priorH      = currentVal > 0 ? priorVal * pxPerUnit : 0;
  const priorY      = chartBottom - priorH;

  return (
    <g>
      {/* 전기 — 아웃라인 (뒤) */}
      {priorH > 0 && (
        <rect x={x} y={priorY} width={width} height={priorH}
          fill="transparent" stroke="#9CA3AF" strokeWidth={1.5} rx={2} ry={2} />
      )}
      {/* 당기 — 채운 막대 (앞) */}
      {currentVal > 0 && (
        <rect x={x + 2} y={y} width={Math.max(0, width - 4)} height={height}
          fill={fill} rx={2} ry={2} />
      )}
    </g>
  );
}

// ─── 커스텀 범례 (당기=채운 사각, 전기=아웃라인 사각) ────────
function ChartLegend({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11, paddingTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <svg width="12" height="10" viewBox="0 0 12 10">
          <rect x="1" y="1" width="10" height="8" fill={accent} rx="2"/>
        </svg>
        <span style={{ color: "#374151" }}>당기</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <svg width="12" height="10" viewBox="0 0 12 10">
          <rect x="1" y="1" width="10" height="8" fill="none" stroke="#A1A8B3" strokeWidth="1.5" rx="2"/>
        </svg>
        <span style={{ color: "#374151" }}>전기</span>
      </div>
    </div>
  );
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
      <svg width="7" height="5" viewBox="0 0 7 5"><path d="M3.5 0L7 5H0z" fill={dir === "asc" ? "#FD5108" : "#A1A8B3"} /></svg>
      <svg width="7" height="5" viewBox="0 0 7 5"><path d="M3.5 5L0 0H7z" fill={dir === "desc" ? "#FD5108" : "#A1A8B3"} /></svg>
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
                  style={{ padding: "8px 12px", textAlign: col.align ?? "left", fontWeight: 600, color: sortKey === col.key ? "#FD5108" : "#A1A8B3", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
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

// ─── 섹션 패널 (수익 / 비용 공통) ────────────────────────────
interface SectionPanelProps {
  label: "수익" | "비용";
  items: PlMonthlyAccount[];
  accent: string;
  headerBg: string;
  dateFrom: string;
  dateTo: string;
  isLoading: boolean;
}

function SectionPanel({ label, items, accent, headerBg, dateFrom, dateTo, isLoading }: SectionPanelProps) {
  const [selectedAcct, setSelectedAcct] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const effectiveAcct = selectedAcct ?? (items.length > 0 ? items[0].account : null);

  const filteredItems = useMemo(() =>
    search.trim()
      ? items.filter(i => i.account.includes(search.trim()))
      : items,
    [items, search]
  );

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

  const selectedData = items.find(a => a.account === effectiveAcct);

  const chartData = useMemo(() => {
    if (!selectedData) return [];
    const sorted = [...selectedData.monthly].sort((a, b) => a.month.localeCompare(b.month));
    let cumCur = 0, cumPri = 0;
    return sorted.map(m => {
      cumCur += m.current; cumPri += m.prior;
      return {
        month: m.month.slice(2, 4) + "." + m.month.slice(5),
        당기: m.current, 전기: m.prior,
        당기누적: cumCur,
        전기누적: cumPri,
      };
    });
  }, [selectedData]);

  const topVendors = (vendors as any[]).slice(0, 12);
  const curEntries = currentEntries as PlEntry[];
  const priEntries = priorEntries as PlEntry[];

  // 전기 = 당기 기간에서 1년 전
  const priorFrom = dateFrom ? `${parseInt(dateFrom.slice(0,4))-1}${dateFrom.slice(4)}` : "";
  const priorTo   = dateTo   ? `${parseInt(dateTo.slice(0,4))-1}${dateTo.slice(4)}`     : "";

  return (
    <div style={{ border: "1px solid #DFE3E6", borderRadius: 10, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 4px #0000000D" }}>

      {/* 섹션 헤더 */}
      <div style={{ padding: "10px 16px", backgroundColor: headerBg, borderBottom: "1px solid #DFE3E6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#A1A8B3" }}>{items.length}개 계정</span>
      </div>

      {/* 1행 4카드: 계정목록 | 월별 | 누적 | 거래처별증감 */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 2fr 1fr 1fr", gap: 12, padding: 14 }}>

        {/* ① 계정 목록 카드 */}
        <div style={{ border: "1px solid #DFE3E6", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #EEEFF1", fontSize: 14, fontWeight: 600, color: "#1A1A2E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>계정과목</span>
            <span style={{ fontSize: 10, color: "#A1A8B3", fontWeight: 400 }}>{items.length}개</span>
          </div>
          {/* 검색 */}
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
                onFocus={e => (e.target.style.borderColor = accent)}
                onBlur={e => (e.target.style.borderColor = "#DFE3E6")}
              />
            </div>
            {search && <div style={{ fontSize: 10, color: "#A1A8B3", marginTop: 3 }}>{filteredItems.length} / {items.length}</div>}
          </div>
          {/* 컬럼 헤더 */}
          <div style={{ padding: "3px 8px 2px", display: "flex", borderBottom: "1px solid #F5F7F8" }}>
            <span style={{ flex: 1, fontSize: 10, color: "#C0C4CC" }}>계정</span>
            <span style={{ fontSize: 10, color: "#C0C4CC", flexShrink: 0, minWidth: 44, textAlign: "right" }}>YoY</span>
          </div>
          {/* 목록 */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 300 }}>
            {isLoading ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#A1A8B3", fontSize: 12 }}>불러오는 중...</div>
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#A1A8B3", fontSize: 12 }}>없음</div>
            ) : filteredItems.map(item => {
              const isSelected = item.account === effectiveAcct;
              const changeColor = item.change_pct >= 0 ? "#059669" : "#DC2626";
              return (
                <button key={item.account} onClick={() => setSelectedAcct(item.account)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4, width: "100%",
                    textAlign: "left", padding: "5px 8px", border: "none",
                    backgroundColor: isSelected ? (label === "수익" ? "#FFF4EE" : "#EEF2F6") : "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? (label === "수익" ? "#FFF4EE" : "#EEF2F6") : "transparent"; }}
                >
                  <span style={{ flex: 1, fontSize: 11, fontWeight: isSelected ? 700 : 400, color: isSelected ? accent : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.account}
                  </span>
                  <span style={{ fontSize: 10, color: changeColor, whiteSpace: "nowrap", flexShrink: 0, minWidth: 44, textAlign: "right" }}>
                    {formatPct(item.change_pct)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ② 월별 카드 */}
        <div style={{ border: "1px solid #DFE3E6", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEEFF1", fontSize: 14, fontWeight: 600, color: "#1A1A2E", flexShrink: 0 }}>
            월별 {effectiveAcct && <span style={{ fontSize: 11, fontWeight: 400, color: "#A1A8B3" }}>— {effectiveAcct}</span>}
          </div>
          {effectiveAcct ? (
            <div style={{ flex: 1, minHeight: 0, padding: "14px 8px 10px 8px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 44, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`areaGrad-${label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false}
                    interval={0}
                    tick={({ x, y, payload }: any) => {
                      const mo = String(payload.value).slice(3);
                      if (!["03","06","09","12"].includes(mo)) return <g />;
                      return <text x={x} y={y + 12} textAnchor="middle" fill="#A1A8B3" fontSize={10}>{payload.value}</text>;
                    }} />
                  <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend content={() => <ChartLegend accent={accent} />} wrapperStyle={{ paddingTop: 2 }} />
                  <Area type="monotone" dataKey="전기" stroke="#A1A8B3" strokeWidth={1.5}
                    strokeDasharray="4 3" fill="none" dot={false} name="전기" />
                  <Area type="monotone" dataKey="당기" stroke={accent} strokeWidth={2}
                    fill={`url(#areaGrad-${label})`} dot={false} name="당기" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 12 }}>계정 선택</div>
          )}
        </div>

        {/* ③ 누적 카드 */}
        <div style={{ border: "1px solid #DFE3E6", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEEFF1", fontSize: 14, fontWeight: 600, color: "#1A1A2E", flexShrink: 0 }}>
            누적 {effectiveAcct && <span style={{ fontSize: 11, fontWeight: 400, color: "#A1A8B3" }}>— {effectiveAcct}</span>}
          </div>
          {effectiveAcct ? (
            <div style={{ flex: 1, minHeight: 0, padding: "14px 8px 10px 8px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false}
                    interval={0}
                    tick={({ x, y, payload }: any) => {
                      const mo = String(payload.value).slice(3);
                      if (!["03","06","09","12"].includes(mo)) return <g />;
                      return <text x={x} y={y + 12} textAnchor="middle" fill="#A1A8B3" fontSize={10}>{payload.value}</text>;
                    }} />
                  <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 2, paddingLeft: 56 }} />
                  <Line type="monotone" dataKey="당기누적" stroke={accent} strokeWidth={2} dot={false} name="당기누적" />
                  <Line type="monotone" dataKey="전기누적" stroke="#A1A8B3" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="전기누적" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 12 }}>계정 선택</div>
          )}
        </div>

        {/* ④ 거래처별 증감 카드 */}
        <div style={{ border: "1px solid #DFE3E6", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 1px 3px #0000000D", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid #EEEFF1", fontSize: 14, fontWeight: 600, color: "#1A1A2E", flexShrink: 0 }}>
            거래처별 증감 {effectiveAcct && <span style={{ fontSize: 11, fontWeight: 400, color: "#A1A8B3" }}>— {effectiveAcct}</span>}
          </div>
          {effectiveAcct ? (
            topVendors.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 12 }}>데이터 없음</div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, padding: "14px 8px 10px 8px" }}>
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
  const revenueAccts = acctList.filter(a => a.branch === "수익");
  const expenseAccts = acctList.filter(a => a.branch !== "수익");

  return (
    <div className="space-y-5">
      <SectionPanel
        label="수익"
        items={revenueAccts}
        accent="#FD5108"
        headerBg="#fff"
        dateFrom={dateFrom}
        dateTo={dateTo}
        isLoading={isLoading}
      />
      <SectionPanel
        label="비용"
        items={expenseAccts}
        accent="#6B7280"
        headerBg="#fff"
        dateFrom={dateFrom}
        dateTo={dateTo}
        isLoading={isLoading}
      />
    </div>
  );
}
