"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import type { PlMonthlyAccount, PlEntry, PlVendorDelta } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Cell,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE } from "@/lib/utils/chartColors";

/* ─── Helpers ─── */
function priorRange(from: string, to: string) {
  const y = (s: string) => `${parseInt(s.slice(0, 4)) - 1}${s.slice(4)}`;
  return { from: y(from), to: y(to) };
}
function fmtPct(curr: number, prev: number): string {
  if (!prev) return "—";
  const p = ((curr - prev) / Math.abs(prev)) * 100;
  return (p >= 0 ? "▲" : "▼") + Math.abs(p).toFixed(1) + "%";
}
function deltaCol(curr: number, prev: number): string {
  if (!prev) return "#A1A8B3";
  return curr >= prev ? "#16C784" : "#FF4747";
}

/* ─── Tooltip ─── */
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

/* ─── Sort Icon ─── */
type SortDir = "asc" | "desc" | null;
function SortIcon({ dir }: { dir: SortDir }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, marginLeft: 4, opacity: dir ? 1 : 0.3, verticalAlign: "middle" }}>
      <svg width="7" height="5" viewBox="0 0 7 5"><path d="M3.5 0L7 5H0z" fill={dir === "asc" ? "#FD5108" : "#A1A8B3"} /></svg>
      <svg width="7" height="5" viewBox="0 0 7 5"><path d="M3.5 5L0 0H7z" fill={dir === "desc" ? "#FD5108" : "#A1A8B3"} /></svg>
    </span>
  );
}

/* ─── Entry Table ─── */
const ENTRY_COLS: { key: keyof PlEntry; label: string; align?: "right" }[] = [
  { key: "date",      label: "일자" },
  { key: "je_number", label: "전표번호" },
  { key: "vendor",    label: "거래처" },
  { key: "memo",      label: "적요" },
  { key: "debit",     label: "차변", align: "right" },
  { key: "credit",    label: "대변", align: "right" },
];

function EntryTable({ title, subtitle, entries, csvFilename }: { title: string; subtitle?: string; entries: PlEntry[]; csvFilename: string }) {
  const [sk, setSk] = useState<keyof PlEntry | null>(null);
  const [sd, setSd] = useState<SortDir>(null);

  const sorted = useMemo(() => {
    if (!sk || !sd) return entries;
    return [...entries].sort((a, b) => {
      const av = a[sk] ?? ""; const bv = b[sk] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sd === "asc" ? cmp : -cmp;
    });
  }, [entries, sk, sd]);

  function downloadCSV() {
    const headers = "일자,전표번호,거래처,적요,차변,대변";
    const body = entries.map(e =>
      [e.date, e.je_number, e.vendor || "", e.memo || "", e.debit || 0, e.credit || 0]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + headers + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = csvFilename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#A1A8B3", marginTop: 1 }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#A1A8B3" }}>{entries.length.toLocaleString("ko-KR")}건</span>
          <button onClick={downloadCSV} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: "4px 10px", borderRadius: 5, border: "1px solid #DFE3E6", backgroundColor: "#fff", color: "#374151", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F5F7F8")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
        </div>
      </div>
      <div style={{ overflowY: "auto", maxHeight: 280 }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#F5F7F8", position: "sticky", top: 0, zIndex: 1 }}>
              {ENTRY_COLS.map(col => (
                <th key={col.key} onClick={() => { if (sk !== col.key) { setSk(col.key); setSd("desc"); } else if (sd === "desc") setSd("asc"); else { setSk(null); setSd(null); } }}
                  style={{ padding: "8px 12px", textAlign: col.align ?? "left", fontWeight: 600, color: sk === col.key ? "#FD5108" : "#A1A8B3", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
                  {col.label}<SortIcon dir={sk === col.key ? sd : null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "28px 12px", textAlign: "center", color: "#A1A8B3" }}>계정을 선택하면 전표 내역이 표시됩니다</td></tr>
            ) : sorted.map((e, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F5F7F8" }}
                onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = "#FAFBFC")}
                onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "")}>
                <td style={{ padding: "7px 12px", color: "#1A1A2E", whiteSpace: "nowrap" }}>{e.date}</td>
                <td style={{ padding: "7px 12px", color: "#A1A8B3", whiteSpace: "nowrap" }}>{e.je_number}</td>
                <td style={{ padding: "7px 12px", color: "#1A1A2E", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.vendor || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                <td style={{ padding: "7px 12px", color: "#A1A8B3", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.memo || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                <td style={{ padding: "7px 12px", textAlign: "right", color: "#1A1A2E", whiteSpace: "nowrap" }}>{e.debit ? formatKRW(e.debit) : "—"}</td>
                <td style={{ padding: "7px 12px", textAlign: "right", color: "#1A1A2E", whiteSpace: "nowrap" }}>{e.credit ? formatKRW(e.credit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
type TableRow = { label: string; curr: number; prev: number; level: number; isBold: boolean; isTotal: boolean; account?: string };
type Section = { header: TableRow; children: TableRow[] };
type SortKey = "curr" | "prev" | "delta" | "pct";

export default function PlAccountPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [topN, setTopN] = useState(10);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const prior = priorRange(dateFrom, dateTo);

  /* ── Queries ── */
  const { data: currData } = useQuery({ queryKey: ["pla-curr", dateFrom, dateTo], queryFn: () => api.financialStatements.incomeStatement({ date_from: dateFrom, date_to: dateTo }) });
  const { data: prevData } = useQuery({ queryKey: ["pla-prev", prior.from, prior.to], queryFn: () => api.financialStatements.incomeStatement({ date_from: prior.from, date_to: prior.to }) });
  const { data: monthlyAccts = [] } = useQuery({ queryKey: ["pla-monthly", dateFrom, dateTo], queryFn: () => api.plTrend.monthlyByAccount({ date_from: dateFrom, date_to: dateTo }) });
  const { data: vendors = [] } = useQuery({ queryKey: ["pla-vendor", dateFrom, dateTo, selectedAccount], queryFn: () => api.plTrend.vendorDelta({ date_from: dateFrom, date_to: dateTo, account: selectedAccount }), enabled: !!selectedAccount });
  const { data: currEntries = [] } = useQuery({ queryKey: ["pla-entries-c", dateFrom, dateTo, selectedAccount], queryFn: () => api.plTrend.entries({ date_from: dateFrom, date_to: dateTo, account: selectedAccount, period: "current", limit: 9999 }), enabled: !!selectedAccount });
  const { data: prevEntries = [] } = useQuery({ queryKey: ["pla-entries-p", dateFrom, dateTo, selectedAccount], queryFn: () => api.plTrend.entries({ date_from: dateFrom, date_to: dateTo, account: selectedAccount, period: "prior", limit: 9999 }), enabled: !!selectedAccount });

  const pl = currData as any;
  const pPL = prevData as any;

  /* ── Build flat table rows ── */
  const tableRows = useMemo<TableRow[]>(() => {
    if (!pl) return [];
    const map = (items: any[], prevItems: any[]): TableRow[] => {
      const pm = new Map((prevItems ?? []).map((i: any) => [i.account, i.amount]));
      return (items ?? []).map((i: any) => ({ label: i.account, curr: i.amount, prev: pm.get(i.account) ?? 0, level: 1, isBold: false, isTotal: false, account: i.account }));
    };
    const prevGP = (pPL?.revenue?.total ?? 0) - (pPL?.cogs?.total ?? 0);
    const prevOP = prevGP - (pPL?.sga?.total ?? 0);
    return [
      { label: "매출액",        curr: pl.revenue.total,     prev: pPL?.revenue?.total ?? 0,  level: 0, isBold: true, isTotal: false },
      ...map(pl.revenue.items, pPL?.revenue?.items ?? []),
      { label: "매출원가",       curr: pl.cogs.total,        prev: pPL?.cogs?.total ?? 0,     level: 0, isBold: true, isTotal: false },
      ...map(pl.cogs.items,    pPL?.cogs?.items ?? []),
      { label: "매출총이익",     curr: pl.gross_profit,      prev: prevGP,                     level: 0, isBold: true, isTotal: true  },
      { label: "판매비와관리비",  curr: pl.sga.total,         prev: pPL?.sga?.total ?? 0,      level: 0, isBold: true, isTotal: false },
      ...map(pl.sga.items,     pPL?.sga?.items ?? []),
      { label: "영업이익",       curr: pl.operating_income,  prev: prevOP,                     level: 0, isBold: true, isTotal: true  },
      { label: "기타손익",       curr: pl.other.total,       prev: pPL?.other?.total ?? 0,    level: 0, isBold: true, isTotal: false },
      ...map(pl.other.items,   pPL?.other?.items ?? []),
      { label: "당기순손익",     curr: pl.net_income,        prev: pPL?.net_income ?? 0,      level: 0, isBold: true, isTotal: true  },
    ];
  }, [pl, pPL]);

  /* ── Group into sections ── */
  const sections = useMemo<Section[]>(() => {
    const result: Section[] = [];
    let cur: Section | null = null;
    for (const row of tableRows) {
      if (row.level === 0) {
        if (cur) result.push(cur);
        cur = { header: row, children: [] };
      } else {
        cur?.children.push(row);
      }
    }
    if (cur) result.push(cur);
    return result;
  }, [tableRows]);

  /* ── Auto-select first leaf account ── */
  useEffect(() => {
    if (!selectedAccount && tableRows.length > 0) {
      const first = tableRows.find(r => r.level === 1 && r.account);
      if (first?.account) setSelectedAccount(first.account);
    }
  }, [tableRows, selectedAccount]);

  /* ── Sort toggle ── */
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); }
    else if (sortDir === "desc") setSortDir("asc");
    else { setSortKey(null); setSortDir(null); }
  }, [sortKey, sortDir]);

  /* ── CSV export for 손익항목 table ── */
  function downloadTableCSV() {
    const headers = "공시용계정,당기,전기,증감,증감률";
    const lines: string[] = [];
    for (const sec of sections) {
      const h = sec.header;
      lines.push([h.label, h.curr, h.prev, h.curr - h.prev, fmtPct(h.curr, h.prev)].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      const kids = collapsed.has(h.label) ? [] : sec.children;
      for (const r of kids) {
        lines.push([r.label, r.curr, r.prev, r.curr - r.prev, fmtPct(r.curr, r.prev)].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      }
    }
    const blob = new Blob(["\uFEFF" + headers + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `손익항목_${dateFrom}_${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Monthly trend for selected account ── */
  const trendData = useMemo(() => {
    if (!selectedAccount) return [];
    const acct = (monthlyAccts as PlMonthlyAccount[]).find(a => a.account === selectedAccount);
    if (!acct) return [];
    return [...acct.monthly].sort((a: any, b: any) => a.month.localeCompare(b.month)).map((m: any) => ({
      month: `'${m.month.slice(2, 4)}.${m.month.slice(5)}`,
      당기: m.current, 전기: m.prior, 당기선: m.current,
    }));
  }, [selectedAccount, monthlyAccts]);

  /* ── Vendor data ── */
  const vendorList = (vendors as PlVendorDelta[]).slice(0, topN);
  const totalCurrent = vendorList.reduce((s, v) => s + (v.current ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* ══ 2-column layout ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 420px", gap: 16, alignItems: "stretch", height: 680 }}>

        {/* ── Left: 손익항목 테이블 ── */}
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1", flexShrink: 0 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#000" }}>손익항목</h3>
              <p style={{ fontSize: 13, color: "#A1A8B3", marginTop: 2 }}>계정과목 아래 계정을 클릭하면 우측에 추이 및 거래처별 분석이 표시됩니다</p>
            </div>
            <button onClick={downloadTableCSV}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: "5px 11px", borderRadius: 6, border: "1px solid #DFE3E6", backgroundColor: "#fff", color: "#374151", cursor: "pointer", flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F5F7F8")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F5F7F8", position: "sticky", top: 0, zIndex: 1 }}>
                  <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 600, color: "#A1A8B3" }}>공시용계정</th>
                  {([["curr", "당기"], ["prev", "전기"], ["delta", "증감"], ["pct", "증감률"]] as [SortKey, string][]).map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)}
                      style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: sortKey === key ? "#FD5108" : "#A1A8B3", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
                      {label}<SortIcon dir={sortKey === key ? sortDir : null} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!pl ? (
                  <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#A1A8B3" }}>불러오는 중...</td></tr>
                ) : sections.map((sec) => {
                  const h = sec.header;
                  const isCollapsed = collapsed.has(h.label);
                  const hasChildren = sec.children.length > 0;

                  /* Sort children */
                  let children = [...sec.children];
                  if (sortKey && sortDir) {
                    children.sort((a, b) => {
                      const val = (r: TableRow) =>
                        sortKey === "curr" ? r.curr :
                        sortKey === "prev" ? r.prev :
                        sortKey === "delta" ? r.curr - r.prev :
                        r.prev ? ((r.curr - r.prev) / Math.abs(r.prev)) : 0;
                      return sortDir === "asc" ? val(a) - val(b) : val(b) - val(a);
                    });
                  }

                  const hDelta = h.curr - h.prev;
                  // Header row bg: light orange for regular bold, pale blue-gray for total rows
                  const hBg = h.isTotal ? "#F5F7FA" : "#FFF5ED";
                  const hColor = h.isTotal ? "#1A1A2E" : "#FD5108";

                  return [
                    /* Section header row */
                    <tr key={h.label} style={{ borderTop: "1px solid #DFE3E6", backgroundColor: hBg }}
                      onClick={() => hasChildren && setCollapsed(prev => { const n = new Set(prev); n.has(h.label) ? n.delete(h.label) : n.add(h.label); return n; })}
                      onMouseEnter={e => { if (hasChildren) (e.currentTarget as HTMLElement).style.backgroundColor = h.isTotal ? "#ECEEF3" : "#FFE8D4"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = hBg; }}>
                      <td style={{ padding: "9px 20px", fontWeight: 700, color: hColor }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {hasChildren && (
                            <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0, transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
                              <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {h.label}
                        </div>
                      </td>
                      <td style={{ padding: "9px 16px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatKRW(h.curr)}</td>
                      <td style={{ padding: "9px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#A1A8B3", whiteSpace: "nowrap" }}>{h.prev !== 0 ? formatKRW(h.prev) : "—"}</td>
                      <td style={{ padding: "9px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: deltaCol(h.curr, h.prev), whiteSpace: "nowrap" }}>{h.prev !== 0 ? (hDelta >= 0 ? "+" : "") + formatKRW(hDelta) : "—"}</td>
                      <td style={{ padding: "9px 16px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: deltaCol(h.curr, h.prev), whiteSpace: "nowrap" }}>{fmtPct(h.curr, h.prev)}</td>
                    </tr>,

                    /* Children rows */
                    ...(!isCollapsed ? children.map(r => {
                      const delta = r.curr - r.prev;
                      const isSelected = r.account === selectedAccount;
                      return (
                        <tr key={r.label}
                          onClick={() => r.account && setSelectedAccount(r.account)}
                          style={{ borderTop: "1px solid #EEEFF1", backgroundColor: isSelected ? "#FFF5ED" : undefined, cursor: r.account ? "pointer" : "default" }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#FFF9F5"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? "#FFF5ED" : ""; }}>
                          <td style={{ padding: "7px 20px 7px 36px", color: isSelected ? "#FD5108" : "#4B5563" }}>
                            {isSelected && <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", backgroundColor: "#FD5108", marginRight: 6, verticalAlign: "middle" }} />}
                            {r.label}
                          </td>
                          <td style={{ padding: "7px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatKRW(r.curr)}</td>
                          <td style={{ padding: "7px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#A1A8B3", whiteSpace: "nowrap" }}>{r.prev !== 0 ? formatKRW(r.prev) : "—"}</td>
                          <td style={{ padding: "7px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: deltaCol(r.curr, r.prev), whiteSpace: "nowrap" }}>{r.prev !== 0 ? (delta >= 0 ? "+" : "") + formatKRW(delta) : "—"}</td>
                          <td style={{ padding: "7px 16px", textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums", color: deltaCol(r.curr, r.prev), whiteSpace: "nowrap" }}>{fmtPct(r.curr, r.prev)}</td>
                        </tr>
                      );
                    }) : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right: Analysis Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>

          {/* 추이 */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", flex: 3, display: "flex", flexDirection: "column" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1", flexShrink: 0 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>
                추이
                {selectedAccount && <span style={{ fontSize: 12, fontWeight: 400, color: "#A1A8B3", marginLeft: 8 }}>— {selectedAccount}</span>}
              </h4>
            </div>
            <div style={{ flex: 1, padding: "14px 12px 10px", minHeight: 0 }}>
              {trendData.length === 0 ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>좌측 계정을 클릭하면 월별 추이가 표시됩니다</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval={0}
                      tick={({ x, y, payload }: any) => {
                        const mo = String(payload.value).slice(4);
                        if (!["03","06","09","12"].includes(mo)) return <g />;
                        return <text x={x} y={y + 12} textAnchor="middle" fill="#A1A8B3" fontSize={10}>{payload.value}</text>;
                      }} />
                    <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="전기" fill="#E5E7EB" radius={[2, 2, 0, 0]} barSize={8} name="전기" />
                    <Bar dataKey="당기" fill="#FD5108" radius={[2, 2, 0, 0]} barSize={8} name="당기" />
                    <Line type="monotone" dataKey="당기선" stroke="#FD5108" strokeWidth={1.5} dot={false} legendType="none" name="" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 상위 거래처 당기 비중 */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", flex: 2, display: "flex", flexDirection: "column" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1", flexShrink: 0 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>상위 거래처 당기 비중</h4>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#A1A8B3" }}>상위 N</span>
                <select value={topN} onChange={e => setTopN(Number(e.target.value))}
                  style={{ fontSize: 13, padding: "2px 6px", borderRadius: 5, border: "1px solid #DFE3E6", color: "#374151", backgroundColor: "#fff", cursor: "pointer" }}>
                  {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: "12px 16px 10px", overflowY: "auto", maxHeight: 320 }}>
              {vendorList.length === 0 ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>계정 선택 후 표시됩니다</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {vendorList.map((v, i) => {
                    const pct = totalCurrent > 0 ? (v.current / totalCurrent) * 100 : 0;
                    const shades = ["#FD5108","#FE7C39","#FFAA72","#FFB98A","#FFCBA5"];
                    const shade = shades[Math.min(i, shades.length - 1)];
                    return (
                      <div key={v.vendor} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#6B7280", width: 88, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }} title={v.vendor}>{v.vendor}</span>
                        <div style={{ flex: 1, height: 7, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", backgroundColor: shade, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#374151", width: 36, textAlign: "right", flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 거래처별 증감 분석 */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", flex: 2.5, display: "flex", flexDirection: "column" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1", flexShrink: 0 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>거래처별 증감 분석</h4>
            </div>
            <div style={{ flex: 1, padding: "12px 8px 10px", minHeight: 0 }}>
              {vendorList.length === 0 ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>계정 선택 후 표시됩니다</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendorList} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="vendor" tick={{ fontSize: 10, fill: "#A1A8B3" }} tickLine={false} axisLine={false} width={80}
                      tickFormatter={(v: string) => v.length > 7 ? v.slice(0, 7) + "…" : v} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="delta" name="증감" radius={[0, 3, 3, 0]} barSize={9}>
                      {vendorList.map((entry, i) => (
                        <Cell key={i} fill={(entry.delta ?? 0) >= 0 ? "#16C784" : "#FF4747"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Entry tables ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <EntryTable title="당기 전표 내역" subtitle={selectedAccount ? `${selectedAccount} · ${dateFrom} ~ ${dateTo}` : undefined}
          entries={currEntries as PlEntry[]} csvFilename={`당기_${selectedAccount ?? "전체"}_${dateFrom}_${dateTo}.csv`} />
        <EntryTable title="전기 전표 내역" subtitle={selectedAccount ? `${selectedAccount} · ${prior.from} ~ ${prior.to}` : undefined}
          entries={prevEntries as PlEntry[]} csvFilename={`전기_${selectedAccount ?? "전체"}_${prior.from}_${prior.to}.csv`} />
      </div>
    </div>
  );
}
