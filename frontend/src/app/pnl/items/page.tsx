"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";

type ViewMode = "연" | "분기" | "월";
type TableRow = {
  label: string;
  level: number;
  isBold: boolean;
  isTotal: boolean;
  values: Record<string, number>;
  priorValues: Record<string, number>;
};

function fmtAcct(v: number) {
  if (v === 0) return "—";
  if (v < 0) return `(${formatKRW(Math.abs(v))})`;
  return formatKRW(v);
}
function deltaColor(v: number) {
  if (v > 0) return "#DC2626";
  if (v < 0) return "#2563EB";
  return "#A1A8B3";
}

export default function PlItemsPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const [viewMode, setViewMode] = useState<ViewMode>("월");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: currData } = useQuery({
    queryKey: ["pli-curr-is", dateFrom, dateTo],
    queryFn: () => api.financialStatements.incomeStatement({ date_from: dateFrom, date_to: dateTo }),
  });
  const { data: priorData } = useQuery({
    queryKey: ["pli-prev-is", dateFrom, dateTo],
    queryFn: () => {
      const yr = (s: string) => `${parseInt(s.slice(0, 4)) - 1}${s.slice(4)}`;
      return api.financialStatements.incomeStatement({ date_from: yr(dateFrom), date_to: yr(dateTo) });
    },
  });
  const { data: waterfallRaw } = useQuery({
    queryKey: ["pli-waterfall", dateFrom, dateTo],
    queryFn: () => api.financialStatements.plWaterfallMonthly({ date_from: dateFrom, date_to: dateTo }),
  });
  const { data: priorWaterfallRaw } = useQuery({
    queryKey: ["pli-waterfall-prior", dateFrom, dateTo],
    queryFn: () => {
      const yr = (s: string) => `${parseInt(s.slice(0, 4)) - 1}${s.slice(4)}`;
      return api.financialStatements.plWaterfallMonthly({ date_from: yr(dateFrom), date_to: yr(dateTo) });
    },
  });

  // 계정별 월별 데이터
  const { data: monthlyAcctsRaw } = useQuery({
    queryKey: ["pli-monthly-accts", dateFrom, dateTo],
    queryFn: () => api.plTrend.monthlyByAccount({ date_from: dateFrom, date_to: dateTo }),
  });

  const pl = currData as any;
  const pPL = priorData as any;
  const waterfallData: any[] = Array.isArray(waterfallRaw) ? waterfallRaw : [];
  const priorWaterfall: any[] = Array.isArray(priorWaterfallRaw) ? priorWaterfallRaw : [];
  const monthlyAccts: any[] = Array.isArray(monthlyAcctsRaw) ? monthlyAcctsRaw : [];

  const { columns, columnLabels } = useMemo(() => {
    const allMonths = waterfallData.map((d: any) => d.month as string).sort();
    if (viewMode === "월") {
      return { columns: allMonths, columnLabels: allMonths.map(m => m.slice(2).replace("-", ".")) };
    }
    if (viewMode === "분기") {
      const quarters = new Set<string>();
      allMonths.forEach(m => { const q = Math.ceil(parseInt(m.slice(5)) / 3); quarters.add(`${m.slice(0, 4)}-Q${q}`); });
      const cols = Array.from(quarters).sort();
      return { columns: cols, columnLabels: cols.map(c => c.slice(2)) };
    }
    const years = new Set<string>();
    allMonths.forEach(m => years.add(m.slice(0, 4)));
    const cols = Array.from(years).sort();
    return { columns: cols, columnLabels: cols };
  }, [waterfallData, viewMode]);

  function aggregateByPeriod(data: any[], field: string): Record<string, number> {
    const result: Record<string, number> = {};
    for (const d of data) {
      const month = d.month as string;
      let key = month;
      if (viewMode === "분기") { const q = Math.ceil(parseInt(month.slice(5)) / 3); key = `${month.slice(0, 4)}-Q${q}`; }
      else if (viewMode === "연") { key = month.slice(0, 4); }
      result[key] = (result[key] ?? 0) + (d[field] ?? 0);
    }
    return result;
  }

  const tableRows = useMemo<TableRow[]>(() => {
    if (!pl || waterfallData.length === 0) return [];

    // 계정별 월별 데이터 맵 생성
    const acctMonthlyMap = new Map<string, any[]>();
    for (const acct of monthlyAccts) {
      acctMonthlyMap.set(acct.account, acct.monthly ?? []);
    }

    const map = (items: any[], prevItems: any[]): TableRow[] => {
      const pm = new Map((prevItems ?? []).map((i: any) => [i.account, i.amount]));
      return (items ?? []).map((i: any) => {
        // 이 계정의 월별 데이터로 기간별 집계
        const acctMonthly = acctMonthlyMap.get(i.account) ?? [];
        const vals: Record<string, number> = {};
        const priorVals: Record<string, number> = {};
        for (const m of acctMonthly) {
          let key = m.month;
          if (viewMode === "분기") { const q = Math.ceil(parseInt(m.month.slice(5)) / 3); key = `${m.month.slice(0, 4)}-Q${q}`; }
          else if (viewMode === "연") { key = m.month.slice(0, 4); }
          vals[key] = (vals[key] ?? 0) + (m.current ?? 0);
          priorVals[key] = (priorVals[key] ?? 0) + (m.prior ?? 0);
        }
        return {
          label: i.account, level: 1, isBold: false, isTotal: false,
          values: vals,
          priorValues: priorVals,
        };
      });
    };

    const revByPeriod = aggregateByPeriod(waterfallData, "revenue");
    const cogsByPeriod = aggregateByPeriod(waterfallData, "cogs");
    const sgaByPeriod = aggregateByPeriod(waterfallData, "sga");
    const otherByPeriod = aggregateByPeriod(waterfallData, "other");

    const shiftYear = (d: any) => ({ ...d, month: `${parseInt(d.month.slice(0, 4)) + 1}${d.month.slice(4)}` });
    const priorRevByPeriod = aggregateByPeriod(priorWaterfall.map(shiftYear), "revenue");
    const priorCogsByPeriod = aggregateByPeriod(priorWaterfall.map(shiftYear), "cogs");
    const priorSgaByPeriod = aggregateByPeriod(priorWaterfall.map(shiftYear), "sga");
    const priorOtherByPeriod = aggregateByPeriod(priorWaterfall.map(shiftYear), "other");

    const gpByPeriod: Record<string, number> = {};
    const opByPeriod: Record<string, number> = {};
    const niByPeriod: Record<string, number> = {};
    const priorGpByPeriod: Record<string, number> = {};
    const priorOpByPeriod: Record<string, number> = {};
    const priorNiByPeriod: Record<string, number> = {};

    for (const key of columns) {
      gpByPeriod[key] = (revByPeriod[key] ?? 0) - (cogsByPeriod[key] ?? 0);
      opByPeriod[key] = gpByPeriod[key] - (sgaByPeriod[key] ?? 0);
      niByPeriod[key] = opByPeriod[key] + (otherByPeriod[key] ?? 0);
      priorGpByPeriod[key] = (priorRevByPeriod[key] ?? 0) - (priorCogsByPeriod[key] ?? 0);
      priorOpByPeriod[key] = priorGpByPeriod[key] - (priorSgaByPeriod[key] ?? 0);
      priorNiByPeriod[key] = priorOpByPeriod[key] + (priorOtherByPeriod[key] ?? 0);
    }

    return [
      { label: "매출액", level: 0, isBold: true, isTotal: false, values: revByPeriod, priorValues: priorRevByPeriod },
      ...map(pl.revenue?.items ?? [], pPL?.revenue?.items ?? []),
      { label: "매출원가", level: 0, isBold: true, isTotal: false, values: cogsByPeriod, priorValues: priorCogsByPeriod },
      ...map(pl.cogs?.items ?? [], pPL?.cogs?.items ?? []),
      { label: "매출총이익", level: 0, isBold: true, isTotal: true, values: gpByPeriod, priorValues: priorGpByPeriod },
      { label: "판매비와관리비", level: 0, isBold: true, isTotal: false, values: sgaByPeriod, priorValues: priorSgaByPeriod },
      ...map(pl.sga?.items ?? [], pPL?.sga?.items ?? []),
      { label: "영업이익", level: 0, isBold: true, isTotal: true, values: opByPeriod, priorValues: priorOpByPeriod },
      { label: "기타손익", level: 0, isBold: true, isTotal: false, values: otherByPeriod, priorValues: priorOtherByPeriod },
      ...map(pl.other?.items ?? [], pPL?.other?.items ?? []),
      { label: "당기순이익", level: 0, isBold: true, isTotal: true, values: niByPeriod, priorValues: priorNiByPeriod },
    ];
  }, [pl, pPL, waterfallData, priorWaterfall, columns, viewMode]);

  type Section = { header: TableRow; children: TableRow[] };
  const sections = useMemo<Section[]>(() => {
    const result: Section[] = [];
    let cur: Section | null = null;
    for (const row of tableRows) {
      if (row.level === 0) { if (cur) result.push(cur); cur = { header: row, children: [] }; }
      else { cur?.children.push(row); }
    }
    if (cur) result.push(cur);
    return result;
  }, [tableRows]);

  const toggleCollapse = (label: string) => {
    setCollapsed(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });
  };

  return (
    <div className="space-y-4">
      {/* ══ 헤더 ══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#D04A02", whiteSpace: "nowrap" }}>손익항목</span>
        <div style={{ flex: 1, height: 1, backgroundColor: "#C8CDD6" }} />
        <span style={{ fontSize: 12, color: "#A1A8B3" }}>선택하여 연/분기/월별 손익계산서를 조회합니다</span>
        <div style={{ display: "flex", border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden" }}>
          {(["연", "분기", "월"] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{
                padding: "5px 18px", fontSize: 13, border: "none", cursor: "pointer",
                backgroundColor: viewMode === mode ? "#1A1A2E" : "#fff",
                color: viewMode === mode ? "#fff" : "#6B7280",
                fontWeight: viewMode === mode ? 600 : 400,
              }}>
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ══ 테이블 ══ */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 140px)" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: columns.length * 110 + 250 }}>
            <thead>
              <tr style={{ backgroundColor: "#1A1A2E" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", color: "#fff", fontWeight: 600, position: "sticky", left: 0, backgroundColor: "#1A1A2E", zIndex: 2, minWidth: 200 }}>
                  손익항목
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, minWidth: 100 }}>전기 합계</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, minWidth: 100 }}>당기 합계</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontWeight: 600, minWidth: 90 }}>증감</th>
                {columns.map((col, i) => (
                  <th key={col} style={{ padding: "10px 12px", textAlign: "right", color: "#FD5108", fontWeight: 600, minWidth: 100, backgroundColor: "#1A1A2E" }}>
                    {columnLabels[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!pl ? (
                <tr><td colSpan={4 + columns.length} style={{ padding: "40px", textAlign: "center", color: "#A1A8B3" }}>불러오는 중...</td></tr>
              ) : sections.map((sec) => {
                const h = sec.header;
                const isCollapsed = collapsed.has(h.label);
                const hasChildren = sec.children.length > 0;
                const hBg = h.isTotal ? "#F0F2F5" : "#FFF5ED";
                const hColor = h.isTotal ? "#1A1A2E" : "#D04A02";

                const currTotal = Object.values(h.values).reduce((s, v) => s + v, 0);
                const priorTotal = Object.values(h.priorValues).reduce((s, v) => s + v, 0);
                const delta = currTotal - priorTotal;

                return [
                  <tr key={h.label} style={{ backgroundColor: hBg, cursor: hasChildren ? "pointer" : "default" }}
                    onClick={() => hasChildren && toggleCollapse(h.label)}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = h.isTotal ? "#E8EBF0" : "#FFE8D4")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = hBg)}>
                    <td style={{ padding: "9px 16px", fontWeight: 700, color: hColor, position: "sticky", left: 0, backgroundColor: "inherit", zIndex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {hasChildren && (
                          <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0, transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}>
                            <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                        {h.label}
                      </div>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#A1A8B3" }}>{fmtAcct(priorTotal)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtAcct(currTotal)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: deltaColor(delta) }}>{fmtAcct(delta)}</td>
                    {columns.map(col => (
                      <td key={col} style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {fmtAcct(h.values[col] ?? 0)}
                      </td>
                    ))}
                  </tr>,
                  ...(!isCollapsed ? sec.children.map(r => {
                    const rCurr = Object.values(r.values).reduce((s, v) => s + v, 0);
                    const rPrior = Object.values(r.priorValues).reduce((s, v) => s + v, 0);
                    const rDelta = rCurr - rPrior;
                    return (
                      <tr key={r.label} style={{ borderBottom: "1px solid #F5F7F8" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAFBFC")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}>
                        <td style={{ padding: "7px 16px 7px 36px", color: "#4B5563", position: "sticky", left: 0, backgroundColor: "inherit", zIndex: 1 }}>{r.label}</td>
                        <td style={{ padding: "7px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#A1A8B3" }}>{fmtAcct(rPrior)}</td>
                        <td style={{ padding: "7px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtAcct(rCurr)}</td>
                        <td style={{ padding: "7px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: deltaColor(rDelta) }}>{fmtAcct(rDelta)}</td>
                        {columns.map(col => (
                          <td key={col} style={{ padding: "7px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#6B7280" }}>
                            {fmtAcct(r.values[col] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    );
                  }) : []),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
