"use client";
import { useState, useMemo } from "react";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, Treemap, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ReferenceLine,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

const ACCENT = "#D04A02";
const POS = "#059669";
const NEG = "#DC2626";
const NEU = "#6B7280";

/* ══════════════════════════════════════════════
   MOCK 데이터 — 법인별 재무 지표
══════════════════════════════════════════════ */
type CompanyData = {
  name: string;
  // 손익 (단위: 백만원)
  revenue: number; gp: number; op: number; ni: number;
  // 이익률 (%)
  gpMargin: number; opMargin: number; niMargin: number;
  // BS (단위: 백만원)
  assets: number; liabilities: number; equity: number;
  // 재무비율 (%)
  debtRatio: number; currentRatio: number; roe: number; roa: number;
  // CF
  ocf: number; icf: number; fcf: number; freeCF: number;
  // 예산 달성률 (%)
  budgetAchievement: number;
};

function generateMockData(compareMode: string): CompanyData[] {
  // 비교모드별 약간씩 다른 값 시뮬레이션
  const base: CompanyData[] = [
    { name: "EV Korea",    revenue: 450000, gp: 180000, op: 85000,  ni: 65000,  gpMargin: 40.0, opMargin: 18.9, niMargin: 14.4, assets: 890000, liabilities: 340000, equity: 550000, debtRatio: 61.8,  currentRatio: 185.0, roe: 11.8, roa: 7.3, ocf: 95000, icf: -35000, fcf: 15000, freeCF: 60000,  budgetAchievement: 102.5 },
    { name: "EV China",    revenue: 320000, gp: 115000, op: 42000,  ni: 28000,  gpMargin: 35.9, opMargin: 13.1, niMargin: 8.8,  assets: 620000, liabilities: 290000, equity: 330000, debtRatio: 87.9,  currentRatio: 142.0, roe: 8.5,  roa: 4.5, ocf: 55000, icf: -22000, fcf: 8000,  freeCF: 33000,  budgetAchievement: 94.3  },
    { name: "EV Japan",    revenue: 280000, gp: 98000,  op: 38000,  ni: 29000,  gpMargin: 35.0, opMargin: 13.6, niMargin: 10.4, assets: 530000, liabilities: 195000, equity: 335000, debtRatio: 58.2,  currentRatio: 220.0, roe: 8.7,  roa: 5.5, ocf: 48000, icf: -18000, fcf: 5000,  freeCF: 30000,  budgetAchievement: 98.7  },
    { name: "EV USA",      revenue: 520000, gp: 225000, op: 110000, ni: 82000,  gpMargin: 43.3, opMargin: 21.2, niMargin: 15.8, assets: 950000, liabilities: 380000, equity: 570000, debtRatio: 66.7,  currentRatio: 195.0, roe: 14.4, roa: 8.6, ocf: 125000,icf: -45000, fcf: 20000, freeCF: 80000,  budgetAchievement: 108.2 },
    { name: "EV Vietnam",  revenue: 180000, gp: 56000,  op: 18000,  ni: 12000,  gpMargin: 31.1, opMargin: 10.0, niMargin: 6.7,  assets: 340000, liabilities: 180000, equity: 160000, debtRatio: 112.5, currentRatio: 128.0, roe: 7.5,  roa: 3.5, ocf: 28000, icf: -12000, fcf: 5000,  freeCF: 16000,  budgetAchievement: 88.5  },
    { name: "EV Germany",  revenue: 380000, gp: 152000, op: 68000,  ni: 52000,  gpMargin: 40.0, opMargin: 17.9, niMargin: 13.7, assets: 720000, liabilities: 260000, equity: 460000, debtRatio: 56.5,  currentRatio: 208.0, roe: 11.3, roa: 7.2, ocf: 82000, icf: -28000, fcf: 12000, freeCF: 54000,  budgetAchievement: 105.1 },
    { name: "EV Singapore",revenue: 150000, gp: 55500,  op: 24000,  ni: 18500,  gpMargin: 37.0, opMargin: 16.0, niMargin: 12.3, assets: 280000, liabilities: 95000,  equity: 185000, debtRatio: 51.4,  currentRatio: 245.0, roe: 10.0, roa: 6.6, ocf: 32000, icf: -10000, fcf: 4000,  freeCF: 22000,  budgetAchievement: 96.2  },
    { name: "EV India",    revenue: 220000, gp: 72600,  op: 26000,  ni: 17000,  gpMargin: 33.0, opMargin: 11.8, niMargin: 7.7,  assets: 410000, liabilities: 205000, equity: 205000, debtRatio: 100.0, currentRatio: 155.0, roe: 8.3,  roa: 4.1, ocf: 38000, icf: -15000, fcf: 7000,  freeCF: 23000,  budgetAchievement: 91.4  },
  ];

  // 비교모드에 따라 살짝 다른 값 (목업 목적)
  const multiplier = compareMode === "전기동월" ? 0.85 : compareMode === "전기말" ? 0.92 : 0.97;
  return base.map(c => ({ ...c }));
}

function getPriorData(compareMode: string): CompanyData[] {
  const curr = generateMockData("current");
  const multiplier = compareMode === "전기동월" ? 0.85 : compareMode === "전기말" ? 0.92 : 0.97;
  return curr.map(c => ({
    ...c,
    revenue: c.revenue * multiplier,
    gp: c.gp * multiplier,
    op: c.op * (multiplier - 0.03),
    ni: c.ni * (multiplier - 0.05),
    assets: c.assets * (multiplier + 0.02),
    liabilities: c.liabilities * multiplier,
    equity: c.equity * (multiplier + 0.03),
  }));
}

/* ══════════════════════════════════════════════
   유틸
══════════════════════════════════════════════ */
function fmtPct(v: number | undefined) {
  if (v === undefined || isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}
function fmtYoY(curr: number, prev: number) {
  if (!prev) return "—";
  const p = ((curr - prev) / Math.abs(prev)) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}
function yoyColor(curr: number, prev: number) {
  if (!prev) return NEU;
  return curr >= prev ? POS : NEG;
}
// 히트맵 셀 색상 (값이 평균 대비 얼마나 높은지)
function heatColor(value: number, min: number, max: number, reverse = false) {
  if (max === min) return "transparent";
  const ratio = (value - min) / (max - min);
  const r = reverse ? 1 - ratio : ratio;
  // 0~1 → 연한 회색에서 진한 주황
  const alpha = 0.08 + r * 0.35;
  return `rgba(208, 74, 2, ${alpha})`;
}
// 부채비율 등 낮을수록 좋은 지표
function heatColorReverse(value: number, min: number, max: number) {
  if (max === min) return "transparent";
  const ratio = 1 - (value - min) / (max - min);
  const alpha = 0.08 + ratio * 0.35;
  return `rgba(5, 150, 105, ${alpha})`;
}

/* ══════════════════════════════════════════════
   섹션 헤더
══════════════════════════════════════════════ */
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: ACCENT, whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: "#C8CDD6" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   메인 페이지
══════════════════════════════════════════════ */
type CompareMode = "전기동월" | "전기말" | "당기전월";

export default function GroupPage() {
  const [compareMode, setCompareMode] = useState<CompareMode>("전기동월");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(["EV Korea", "EV USA", "EV China"]);

  const curr = useMemo(() => generateMockData(compareMode), [compareMode]);
  const prev = useMemo(() => getPriorData(compareMode), [compareMode]);

  // 연결 합계
  const totals = useMemo(() => {
    const sum = (arr: CompanyData[], key: keyof CompanyData) => arr.reduce((s, c) => s + (Number(c[key]) || 0), 0);
    const currSum = { revenue: sum(curr, "revenue"), op: sum(curr, "op"), ni: sum(curr, "ni"), assets: sum(curr, "assets") };
    const prevSum = { revenue: sum(prev, "revenue"), op: sum(prev, "op"), ni: sum(prev, "ni"), assets: sum(prev, "assets") };
    return { currSum, prevSum };
  }, [curr, prev]);

  // 히트맵 min/max 계산
  const stats = useMemo(() => {
    const getRange = (key: keyof CompanyData) => {
      const vals = curr.map(c => Number(c[key]) || 0);
      return { min: Math.min(...vals), max: Math.max(...vals) };
    };
    return {
      revenue: getRange("revenue"),
      op: getRange("op"),
      opMargin: getRange("opMargin"),
      niMargin: getRange("niMargin"),
      debtRatio: getRange("debtRatio"),
      roe: getRange("roe"),
      budgetAchievement: getRange("budgetAchievement"),
    };
  }, [curr]);

  // 버블차트 데이터
  const bubbleData = curr.map(c => ({
    name: c.name, x: c.revenue, y: c.opMargin, z: c.assets,
  }));

  // 트리맵 데이터 (매출 기여도)
  const treemapData = curr.map(c => ({ name: c.name, size: c.revenue }))
    .sort((a, b) => b.size - a.size);
  const totalRev = treemapData.reduce((s, v) => s + v.size, 0);

  // 레이더차트 데이터 (선택한 법인들)
  const radarData = [
    { metric: "매출액", ...Object.fromEntries(selectedCompanies.map(name => {
      const c = curr.find(x => x.name === name);
      const maxRev = Math.max(...curr.map(x => x.revenue));
      return [name, c ? (c.revenue / maxRev) * 100 : 0];
    })) },
    { metric: "영업이익률", ...Object.fromEntries(selectedCompanies.map(name => {
      const c = curr.find(x => x.name === name);
      const maxVal = Math.max(...curr.map(x => x.opMargin));
      return [name, c ? (c.opMargin / maxVal) * 100 : 0];
    })) },
    { metric: "ROE", ...Object.fromEntries(selectedCompanies.map(name => {
      const c = curr.find(x => x.name === name);
      const maxVal = Math.max(...curr.map(x => x.roe));
      return [name, c ? (c.roe / maxVal) * 100 : 0];
    })) },
    { metric: "유동비율", ...Object.fromEntries(selectedCompanies.map(name => {
      const c = curr.find(x => x.name === name);
      const maxVal = Math.max(...curr.map(x => x.currentRatio));
      return [name, c ? (c.currentRatio / maxVal) * 100 : 0];
    })) },
    { metric: "예산달성", ...Object.fromEntries(selectedCompanies.map(name => {
      const c = curr.find(x => x.name === name);
      return [name, c ? c.budgetAchievement : 0];
    })) },
    { metric: "FCF", ...Object.fromEntries(selectedCompanies.map(name => {
      const c = curr.find(x => x.name === name);
      const maxVal = Math.max(...curr.map(x => x.freeCF));
      return [name, c ? (c.freeCF / maxVal) * 100 : 0];
    })) },
  ];

  const radarColors = ["#D04A02", "#295477", "#C9A84C", "#059669", "#7A3B1E"];

  const toggleCompany = (name: string) => {
    setSelectedCompanies(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : prev.length < 5 ? [...prev, name] : prev
    );
  };

  return (
    <div className="space-y-6">

      {/* ══ 헤더 ══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#1A1A2E", whiteSpace: "nowrap" }}>모회사 뷰 — 법인별 비교</span>
        <span style={{ fontSize: 12, color: "#A1A8B3", marginLeft: 4 }}>EV Holdings Group · 8개 법인</span>
        <div style={{ flex: 1, height: 1, backgroundColor: "#C8CDD6", marginLeft: 8 }} />
        <div style={{ display: "flex", border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden" }}>
          {(["전기동월", "전기말", "당기전월"] as CompareMode[]).map(mode => (
            <button key={mode} onClick={() => setCompareMode(mode)}
              style={{
                padding: "6px 18px", fontSize: 13, border: "none", cursor: "pointer",
                backgroundColor: compareMode === mode ? "#1A1A2E" : "#fff",
                color: compareMode === mode ? "#fff" : "#6B7280",
                fontWeight: compareMode === mode ? 600 : 400,
              }}>
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ══ 연결 KPI 카드 ══ */}
      <div>
        <SectionHeader title="연결 재무 요약" />
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "연결 매출액",   curr: totals.currSum.revenue, prev: totals.prevSum.revenue },
            { label: "연결 영업이익",  curr: totals.currSum.op,      prev: totals.prevSum.op },
            { label: "연결 당기순이익", curr: totals.currSum.ni,      prev: totals.prevSum.ni },
            { label: "연결 총자산",   curr: totals.currSum.assets,  prev: totals.prevSum.assets },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#A1A8B3", marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: ACCENT, marginBottom: 6 }}>{formatKRW(kpi.curr * 1_000_000)}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#A1A8B3" }}>{compareMode}</span>
                <span style={{ color: yoyColor(kpi.curr, kpi.prev), fontWeight: 600 }}>{fmtYoY(kpi.curr, kpi.prev)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ 랭킹 테이블 (히트맵) ══ */}
      <div>
        <SectionHeader title="법인별 상세 비교 (히트맵)" />
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: 1100 }}>
              <thead>
                <tr style={{ backgroundColor: "#1A1A2E" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontWeight: 600, position: "sticky", left: 0, backgroundColor: "#1A1A2E", zIndex: 2, minWidth: 120 }}>법인</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    매출액
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>(백만원)</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    YoY
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>(당기−전기)/전기</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    영업이익
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>(백만원)</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    OP 마진
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>영업이익/매출액</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    순이익
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>(백만원)</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    NI 마진
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>순이익/매출액</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    ROE
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>순이익/자본</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    부채비율
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>부채/자본</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    FCF
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>OCF−Capex</div>
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", color: "#fff", fontWeight: 600 }}>
                    예산달성
                    <div style={{ fontSize: 10, fontWeight: 400, color: "#A1A8B3", marginTop: 2 }}>실적/예산</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {curr.map((c, i) => {
                  const p = prev[i];
                  const alerts: string[] = [];
                  if (c.debtRatio > 100) alerts.push("부채위험");
                  if (c.budgetAchievement < 90) alerts.push("예산미달");
                  if (c.ni < p.ni) alerts.push("이익감소");
                  return (
                    <tr key={c.name} style={{ borderBottom: "1px solid #EEEFF1" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAFBFC")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}>
                      <td style={{ padding: "9px 14px", fontWeight: 600, color: "#1A1A2E", position: "sticky", left: 0, backgroundColor: "inherit", zIndex: 1 }}>
                        {c.name}
                        {alerts.length > 0 && (
                          <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                            {alerts.map(a => (
                              <span key={a} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, backgroundColor: "#FEE2E2", color: "#DC2626", fontWeight: 600 }}>{a}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", backgroundColor: heatColor(c.revenue, stats.revenue.min, stats.revenue.max) }}>{formatKRW(c.revenue * 1_000_000)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: yoyColor(c.revenue, p.revenue), fontWeight: 600 }}>{fmtYoY(c.revenue, p.revenue)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", backgroundColor: heatColor(c.op, stats.op.min, stats.op.max) }}>{formatKRW(c.op * 1_000_000)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", backgroundColor: heatColor(c.opMargin, stats.opMargin.min, stats.opMargin.max) }}>{fmtPct(c.opMargin)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatKRW(c.ni * 1_000_000)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", backgroundColor: heatColor(c.niMargin, stats.niMargin.min, stats.niMargin.max) }}>{fmtPct(c.niMargin)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", backgroundColor: heatColor(c.roe, stats.roe.min, stats.roe.max) }}>{fmtPct(c.roe)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", backgroundColor: heatColorReverse(c.debtRatio, stats.debtRatio.min, stats.debtRatio.max), color: c.debtRatio > 100 ? NEG : undefined, fontWeight: c.debtRatio > 100 ? 600 : undefined }}>{fmtPct(c.debtRatio)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatKRW(c.freeCF * 1_000_000)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", backgroundColor: heatColor(c.budgetAchievement, stats.budgetAchievement.min, stats.budgetAchievement.max), color: c.budgetAchievement < 90 ? NEG : c.budgetAchievement >= 100 ? POS : undefined, fontWeight: 600 }}>{fmtPct(c.budgetAchievement)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══ 포지셔닝 + 기여도 ══ */}
      <div className="grid grid-cols-2 gap-4">
        {/* 버블차트 — 포지셔닝 맵 (사분면) */}
        {(() => {
          // 사분면 기준선 = 중앙값(median)
          const xVals = [...bubbleData.map(d => d.x)].sort((a, b) => a - b);
          const yVals = [...bubbleData.map(d => d.y)].sort((a, b) => a - b);
          const xMedian = xVals[Math.floor(xVals.length / 2)];
          const yMedian = yVals[Math.floor(yVals.length / 2)];
          const xMax = Math.max(...xVals) * 1.1;
          const yMax = Math.max(...yVals) * 1.15;
          const xMin = 0;
          const yMin = 0;

          // 사분면별 색상
          const getQuadrantColor = (x: number, y: number) => {
            if (x >= xMedian && y >= yMedian) return "#059669"; // 스타
            if (x >= xMedian && y < yMedian) return "#F59E0B";  // 규모만
            if (x < xMedian && y >= yMedian) return "#295477";  // 알짜
            return "#DC2626"; // 문제
          };

          return (
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>법인 포지셔닝 맵</span>
                  <span style={{ fontSize: 11, color: "#A1A8B3" }}>X: 매출 · Y: OP마진 · 크기: 자산</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#059669" }} />
                    <span style={{ color: "#374151" }}>⭐ 스타 (큰 매출+고마진)</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                    <span style={{ color: "#374151" }}>⚠ 규모형 (큰 매출+저마진)</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#295477" }} />
                    <span style={{ color: "#374151" }}>💎 알짜 (작은 매출+고마진)</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#DC2626" }} />
                    <span style={{ color: "#374151" }}>🔴 부진 (작은 매출+저마진)</span>
                  </span>
                </div>
              </div>
              <div style={{ height: 380, padding: "12px 12px 8px", position: "relative" }}>
                {/* 사분면 라벨 (절대 위치) */}
                <div style={{ position: "absolute", top: 20, right: 40, fontSize: 11, color: "#059669", fontWeight: 600, pointerEvents: "none" }}>⭐ STAR</div>
                <div style={{ position: "absolute", top: 20, left: 50, fontSize: 11, color: "#295477", fontWeight: 600, pointerEvents: "none" }}>💎 NICHE</div>
                <div style={{ position: "absolute", bottom: 50, right: 40, fontSize: 11, color: "#F59E0B", fontWeight: 600, pointerEvents: "none" }}>⚠ SCALE</div>
                <div style={{ position: "absolute", bottom: 50, left: 50, fontSize: 11, color: "#DC2626", fontWeight: 600, pointerEvents: "none" }}>🔴 UNDER</div>

                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis type="number" dataKey="x" name="매출액" domain={[xMin, xMax]}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}천`} tick={AXIS_STYLE} tickLine={false} axisLine={false}
                      label={{ value: "매출액 (백만원)", position: "insideBottom", offset: -15, fontSize: 11, fill: "#6B7280" }} />
                    <YAxis type="number" dataKey="y" name="영업이익률" domain={[yMin, yMax]}
                      tickFormatter={(v) => `${v}%`} tick={AXIS_STYLE} tickLine={false} axisLine={false}
                      label={{ value: "OP 마진", angle: -90, position: "insideLeft", fontSize: 11, fill: "#6B7280" }} />
                    <ZAxis type="number" dataKey="z" range={[400, 2000]} />
                    {/* 사분면 분할선 */}
                    <ReferenceLine x={xMedian} stroke="#B5BCC4" strokeDasharray="4 4" strokeWidth={1.5} />
                    <ReferenceLine y={yMedian} stroke="#B5BCC4" strokeDasharray="4 4" strokeWidth={1.5} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }: any) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      const qColor = getQuadrantColor(d.x, d.y);
                      const qLabel = d.x >= xMedian && d.y >= yMedian ? "⭐ 스타"
                        : d.x >= xMedian ? "⚠ 규모형"
                        : d.y >= yMedian ? "💎 알짜" : "🔴 부진";
                      return (
                        <div style={{ ...TOOLTIP_STYLE, backgroundColor: "#fff" }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: qColor }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: qColor, fontWeight: 600, marginBottom: 6 }}>{qLabel}</div>
                          <div style={{ fontSize: 12, color: "#6B7280" }}>매출: {d.x.toLocaleString()} 백만원</div>
                          <div style={{ fontSize: 12, color: "#6B7280" }}>OP 마진: {d.y.toFixed(1)}%</div>
                          <div style={{ fontSize: 12, color: "#6B7280" }}>자산: {d.z.toLocaleString()} 백만원</div>
                        </div>
                      );
                    }} />
                    <Scatter data={bubbleData}>
                      {bubbleData.map((d, i) => {
                        const c = getQuadrantColor(d.x, d.y);
                        return <Cell key={i} fill={c} fillOpacity={0.55} stroke={c} strokeWidth={2} />;
                      })}
                      <LabelList dataKey="name" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#1A1A2E" }} offset={10} />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* 기여도 트리맵 */}
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>법인별 매출 기여도</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#A1A8B3" }}>연결 전체 매출</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                {totalRev.toLocaleString("ko-KR")}
                <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", marginLeft: 4 }}>백만원</span>
              </div>
            </div>
          </div>
          <div style={{ height: 360, padding: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap data={treemapData} dataKey="size" stroke="#fff" fill={ACCENT}
                content={(props: any) => {
                  const { x, y, width, height, name, size } = props;
                  if (!size) return <g />;
                  const pct = (size / totalRev) * 100;
                  // 모두 진한 오렌지/남색 계열만 사용 — 흰색 글씨 가독성 확보
                  const shades = ["#8B2E00", "#A63A00", "#D04A02", "#E85A0C", "#FD5108", "#FE7C39", "#295477", "#54565A"];
                  const idx = treemapData.findIndex(d => d.name === name);
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={shades[idx % shades.length]} stroke="#fff" strokeWidth={2} />
                      {width > 90 && height > 70 && (
                        <>
                          <text x={x + width / 2} y={y + height / 2 - 18} textAnchor="middle" fill="#fff" fontSize={16} fontWeight={500}>{name}</text>
                          <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={400}>
                            {size.toLocaleString("ko-KR")} 백만원
                          </text>
                          <text x={x + width / 2} y={y + height / 2 + 24} textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize={13} fontWeight={400}>
                            ({pct.toFixed(1)}%)
                          </text>
                        </>
                      )}
                      {width > 90 && height <= 70 && height > 40 && (
                        <>
                          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={500}>{name}</text>
                          <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={400}>{pct.toFixed(1)}%</text>
                        </>
                      )}
                      {(width <= 90 || height <= 40) && width > 40 && height > 20 && (
                        <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={500}>{pct.toFixed(1)}%</text>
                      )}
                    </g>
                  );
                }}>
                <Tooltip formatter={(v: any) => `${Number(v).toLocaleString("ko-KR")} 백만원`} contentStyle={TOOLTIP_STYLE} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ══ 레이더 차트 (법인 비교) ══ */}
      <div>
        <SectionHeader title="법인 간 상세 지표 비교 (최대 5개 선택)" />
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {curr.map(c => (
              <button key={c.name} onClick={() => toggleCompany(c.name)}
                style={{
                  padding: "4px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer",
                  border: `1px solid ${selectedCompanies.includes(c.name) ? ACCENT : "#DFE3E6"}`,
                  backgroundColor: selectedCompanies.includes(c.name) ? "#FFF5ED" : "#fff",
                  color: selectedCompanies.includes(c.name) ? ACCENT : "#6B7280",
                  fontWeight: selectedCompanies.includes(c.name) ? 600 : 400,
                }}>
                {c.name}
              </button>
            ))}
          </div>
          {/* 선택 법인 카드 비교 */}
          {selectedCompanies.length > 0 && (
            <div style={{ padding: "16px 16px 0", display: "grid", gridTemplateColumns: `repeat(${Math.min(selectedCompanies.length, 5)}, 1fr)`, gap: 12 }}>
              {selectedCompanies.map((name, i) => {
                const c = curr.find(x => x.name === name);
                if (!c) return null;
                const color = radarColors[i % radarColors.length];
                return (
                  <div key={name} style={{
                    border: `1.5px solid ${color}`, borderRadius: 8, padding: 14,
                    backgroundColor: `${color}08`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
                      {name}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#A1A8B3" }}>매출액</span>
                        <span style={{ color: "#1A1A2E", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.revenue.toLocaleString("ko-KR")}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#A1A8B3" }}>영업이익</span>
                        <span style={{ color: "#1A1A2E", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.op.toLocaleString("ko-KR")}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#A1A8B3" }}>OP 마진</span>
                        <span style={{ color: "#1A1A2E", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.opMargin.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#A1A8B3" }}>ROE</span>
                        <span style={{ color: "#1A1A2E", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.roe.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#A1A8B3" }}>부채비율</span>
                        <span style={{ color: c.debtRatio > 100 ? NEG : "#1A1A2E", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.debtRatio.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #DFE3E6", paddingTop: 6, marginTop: 2 }}>
                        <span style={{ color: "#A1A8B3" }}>예산달성</span>
                        <span style={{ color: c.budgetAchievement >= 100 ? POS : c.budgetAchievement < 90 ? NEG : "#1A1A2E", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.budgetAchievement.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ height: 400, padding: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#DFE3E6" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "#374151" }} />
                <PolarRadiusAxis angle={90} domain={[0, 110]} tick={{ fontSize: 10, fill: "#A1A8B3" }} />
                {selectedCompanies.map((name, i) => (
                  <Radar key={name} name={name} dataKey={name} stroke={radarColors[i % radarColors.length]} fill={radarColors[i % radarColors.length]} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  // label = metric 이름 (매출액, 영업이익률 등)
                  const metric = label;
                  return (
                    <div style={{ ...TOOLTIP_STYLE, backgroundColor: "#fff", minWidth: 180 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, color: "#1A1A2E" }}>{metric}</div>
                      {payload.map((p: any) => {
                        const companyName = p.name;
                        const c = curr.find(x => x.name === companyName);
                        if (!c) return null;
                        let actualValue = "";
                        if (metric === "매출액") actualValue = `${c.revenue.toLocaleString("ko-KR")} 백만원`;
                        else if (metric === "영업이익률") actualValue = `${c.opMargin.toFixed(1)}%`;
                        else if (metric === "ROE") actualValue = `${c.roe.toFixed(1)}%`;
                        else if (metric === "유동비율") actualValue = `${c.currentRatio.toFixed(1)}%`;
                        else if (metric === "예산달성") actualValue = `${c.budgetAchievement.toFixed(1)}%`;
                        else if (metric === "FCF") actualValue = `${c.freeCF.toLocaleString("ko-KR")} 백만원`;
                        return (
                          <div key={companyName} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: p.color, fontWeight: 600 }}>{companyName}</span>
                            <span style={{ color: "#374151", fontVariantNumeric: "tabular-nums" }}>{actualValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ══ 주의 법인 요약 ══ */}
      <div>
        <SectionHeader title="주의 필요 법인" />
        <div className="grid grid-cols-3 gap-4">
          {curr.filter(c => c.debtRatio > 100 || c.budgetAchievement < 95 || c.niMargin < 10).map(c => {
            const issues: { label: string; severity: "high" | "mid" }[] = [];
            if (c.debtRatio > 100) issues.push({ label: `부채비율 ${c.debtRatio.toFixed(0)}%`, severity: "high" });
            if (c.budgetAchievement < 95) issues.push({ label: `예산 달성 ${c.budgetAchievement.toFixed(0)}%`, severity: c.budgetAchievement < 90 ? "high" : "mid" });
            if (c.niMargin < 10) issues.push({ label: `순이익률 ${c.niMargin.toFixed(1)}%`, severity: "mid" });
            return (
              <div key={c.name} className="bg-white rounded-lg border" style={{ borderColor: "#FFAA72", padding: 14, boxShadow: "var(--shadow-card)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", marginBottom: 8 }}>{c.name}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {issues.map(iss => (
                    <div key={iss.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: iss.severity === "high" ? NEG : "#F59E0B", flexShrink: 0 }} />
                      <span style={{ color: iss.severity === "high" ? NEG : "#92400E" }}>{iss.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ 당월 특이사항 / 시나리오 ══ */}
      <div>
        <SectionHeader title="당월 특이사항 · 시나리오" />
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              company: "EV USA", type: "M&A", icon: "🤝", color: "#295477",
              title: "Tesla 공급계약 체결",
              desc: "연간 $250M 규모 배터리 부품 공급 3년 계약 체결. 2026년 Q3부터 매출 반영 예정.",
              impact: "연 매출 +12% 전망", impactType: "positive",
              date: "2026-04-15",
            },
            {
              company: "EV China", type: "환율", icon: "💱", color: "#F59E0B",
              title: "위안화 약세 영향",
              desc: "CNY/USD 8.3% 하락으로 수출단가 조정 불가피. 환차손 발생 (약 12억원 규모).",
              impact: "영업외손실 -1,200 백만원", impactType: "negative",
              date: "2026-04-10",
            },
            {
              company: "EV Vietnam", type: "규제", icon: "⚖️", color: "#DC2626",
              title: "베트남 법인세율 인상",
              desc: "법인세율 20% → 22% 인상 확정 (2026-07 시행). 하반기 순이익 약 5% 감소 예상.",
              impact: "법인세 부담 +8%", impactType: "negative",
              date: "2026-04-08",
            },
            {
              company: "EV Korea", type: "일회성", icon: "💼", color: "#059669",
              title: "판교 부지 매각 이익",
              desc: "판교 본사 부지 일부 매각 완료. 유형자산 처분이익 45억원 실현.",
              impact: "기타수익 +4,500 백만원 (일회성)", impactType: "positive",
              date: "2026-04-22",
            },
            {
              company: "EV Germany", type: "투자", icon: "🏭", color: "#295477",
              title: "뮌헨 신규 R&D 센터 투자 결정",
              desc: "EUR 35M 투자 승인. 2026 하반기 착공, 2027년 가동. Capex 증가로 단기 FCF 감소.",
              impact: "Capex +1,800 백만원", impactType: "neutral",
              date: "2026-04-18",
            },
            {
              company: "EV Japan", type: "소송", icon: "⚠️", color: "#DC2626",
              title: "특허 침해 소송 피소",
              desc: "경쟁사 A로부터 기술 특허 침해 소송 제기. 예상 소송 충당금 20억원 설정.",
              impact: "충당부채 +2,000 백만원", impactType: "negative",
              date: "2026-04-12",
            },
          ].map((s, i) => {
            const impactColor = s.impactType === "positive" ? POS : s.impactType === "negative" ? NEG : "#6B7280";
            return (
              <div key={i} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", borderLeft: `4px solid ${s.color}` }}>
                <div style={{ padding: 16 }}>
                  {/* 상단: 법인 + 타입 뱃지 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{s.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>{s.company}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, backgroundColor: `${s.color}18`, color: s.color, fontWeight: 600 }}>{s.type}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#A1A8B3" }}>{s.date}</span>
                  </div>
                  {/* 제목 */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", marginBottom: 6 }}>{s.title}</div>
                  {/* 설명 */}
                  <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5, marginBottom: 10 }}>{s.desc}</div>
                  {/* 재무 영향 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 5, backgroundColor: `${impactColor}10` }}>
                    <span style={{ fontSize: 10, color: "#A1A8B3", fontWeight: 600 }}>재무영향</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: impactColor }}>{s.impact}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
