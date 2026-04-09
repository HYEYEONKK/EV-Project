"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, ScenarioEntry } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import SortableTable from "@/components/ui/SortableTable";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";

const SCENARIOS: Record<string, { title: string; risk: string; desc: string }> = {
  "1": {
    title: "시나리오 1. 동일 금액 중복 전표",
    risk: "예상 위험: 정확한 금액 대신 반올림된 금액이 반복 기표되는 오류 가능성",
    desc: "동일 금액이 동일 계정에 이중 기표되는 경우를 탐색합니다.",
  },
  "2": {
    title: "시나리오 2. 현금지급 후 동일금액 부채인식",
    risk: "예상 위험: 현금 집행 후 동일금액의 부채를 재인식하여 부채금액 변동 없이 처리하는 패턴 식별",
    desc: "동일 전표번호에 현금 대변과 부채 차변이 동시 존재하는 전표를 식별합니다.",
  },
  "3": {
    title: "시나리오 3. 주말 현금 지급 전표",
    risk: "예상 위험: 주말에 별도 통제 없이 승인 없이 현금 전표 집행",
    desc: "주말(토/일)에 기표된 현금 대변 전표를 식별합니다.",
  },
  "4": {
    title: "시나리오 4. 고액 현금 전표",
    risk: "예상 위험: 임계금액(10억 원) 이상의 현금 전표를 통한 비정상 거래 가능성",
    desc: "10억 원 이상 현금 계정 전표를 식별합니다.",
  },
  "5": {
    title: "시나리오 5. 비용 인식과 동시에 현금지급",
    risk: "예상 위험: 중간 부채를 거치지 않고 비용 인식과 동시에 현금지급 — 발생주의 위배 가능성",
    desc: "동일 전표번호에 비용 차변(PL)과 현금 대변(BS)이 동시 존재하는 전표를 식별합니다.",
  },
  "6": {
    title: "시나리오 6. Seldom Used (저빈도 거래처)",
    risk: "예상 위험: 사용 빈도가 낮은 거래처를 통한 회계 오류 또는 부정 가능성",
    desc: "분석 기간 내 전표 수가 3건 이하인 저빈도 거래처 전표를 식별합니다.",
  },
  "7": {
    title: "시나리오 7. 주말/공휴일 기표 전표 (전체)",
    risk: "예상 위험: 승인 절차 없이 수동으로 입력된 비정상 조정 전표 식별",
    desc: "현금 여부와 무관하게 주말(토/일)에 기표된 전체 전표를 식별합니다.",
  },
};

// ─── 커스텀 툴팁 ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #DFE3E6", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px #0000001A" }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#1A1A2E" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? "#FD5108", marginBottom: 2 }}>
          {p.name}: {typeof p.value === "number" && p.name === "금액" ? formatKRW(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── 전표 테이블 ─────────────────────────────────────────
function EntryTable({ title, entries, loading, filename }: { title: string; entries: ScenarioEntry[]; loading: boolean; filename: string }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>{title}</h4>
        <span style={{ fontSize: 11, color: "#A1A8B3" }}>{entries.length}건</span>
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
          rows={entries.map((e) => [
            e.date,
            e.je_number,
            e.account,
            e.vendor,
            e.debit ? e.debit : "-",
            e.credit ? e.credit : "-",
          ])}
          filename={filename}
          maxHeight={300}
          loading={loading}
          emptyText="탐지된 전표 없음"
        />
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────
export default function ScenarioPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = use(params);
  const scenarioId = parseInt(n) || 1;
  const scenario = SCENARIOS[n] ?? SCENARIOS["1"];
  const { scenarioDateFrom, scenarioDateTo } = useFilterStore();

  const queryParams = { date_from: scenarioDateFrom, date_to: scenarioDateTo };

  const { data: summary = [], isLoading: summaryLoading } = useQuery({
    queryKey: ["scenario-summary", n, scenarioDateFrom, scenarioDateTo],
    queryFn: () => api.scenarios.summary(scenarioId, queryParams),
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["scenario-entries", n, scenarioDateFrom, scenarioDateTo],
    queryFn: () => api.scenarios.entries(scenarioId, { ...queryParams, limit: 200 }),
  });

  const chartData = (summary as any[]).map((d) => ({
    month: (d.month as string).slice(2, 4) + "." + (d.month as string).slice(5),
    건수: d.count,
    금액: d.amount,
  }));

  const totalCount = (summary as any[]).reduce((s, d) => s + (d.count || 0), 0);
  const totalAmount = (summary as any[]).reduce((s, d) => s + (d.amount || 0), 0);

  const entryList = entries as ScenarioEntry[];
  // Split entries for 2 tables — first half / second half (or by type if needed)
  const half = Math.ceil(entryList.length / 2);
  const table1 = entryList.slice(0, half);
  const table2 = entryList.slice(half);

  return (
    <div>
      {/* 시나리오 헤더 카드 */}
      <div className="bg-white rounded-lg border card-hover"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
            {/* 좌: 시나리오 정보 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#FD5108", letterSpacing: "-0.4px", marginBottom: 12 }}>
                {scenario.title}
              </h3>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFAA72" strokeWidth={2.5}
                  strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", lineHeight: 1.6 }}>{scenario.risk}</p>
              </div>
              <p style={{ fontSize: 13, color: "#A1A8B3", lineHeight: 1.6, paddingLeft: 23 }}>{scenario.desc}</p>
            </div>
            {/* 우: 탐지 통계 */}
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <div style={{ textAlign: "center", backgroundColor: "#FFF5ED", border: "1px solid #FFCDA8", borderRadius: 10, padding: "16px 26px", minWidth: 108 }}>
                <div style={{ fontSize: 13, color: "#A1A8B3", fontWeight: 500, marginBottom: 8, letterSpacing: "-0.2px" }}>탐지 건수</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: "#FD5108", letterSpacing: "-0.5px", lineHeight: 1 }}>
                  {totalCount.toLocaleString("ko-KR")}
                </div>
                <div style={{ fontSize: 13, color: "#FD5108", marginTop: 4, fontWeight: 500 }}>건</div>
              </div>
              <div style={{ textAlign: "center", backgroundColor: "#FFF5ED", border: "1px solid #FFCDA8", borderRadius: 10, padding: "16px 26px", minWidth: 108 }}>
                <div style={{ fontSize: 13, color: "#A1A8B3", fontWeight: 500, marginBottom: 8, letterSpacing: "-0.2px" }}>탐지 금액</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: "#FD5108", letterSpacing: "-0.5px", lineHeight: 1 }}>
                  {formatKRW(totalAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 콘텐츠 — 헤더 카드와 충분한 간격 */}
      <div className="space-y-4" style={{ marginTop: 28 }}>

      {/* Exception 차트 + 전표 추출 내역 (좌:우 = 1:1) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* 월별 Exception 차트 */}
        <div className="bg-white rounded-lg border overflow-hidden card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 Exception 내역</h4>
          </div>
          {summaryLoading ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="금액" fill="#FD5108" radius={[3,3,0,0]} name="금액" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 전표 추출 내역 1 */}
        <EntryTable title="전표 추출 내역 (1/2)" entries={table1} loading={entriesLoading} filename={`시나리오${n}`} />
      </div>

      {/* 전표 상세 내역 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <EntryTable title="전표 추출 내역 (2/2)" entries={table2} loading={entriesLoading} filename={`시나리오${n}`} />
        {/* 건수 추이 차트 */}
        <div className="bg-white rounded-lg border overflow-hidden card-hover" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>월별 탐지 건수</h4>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="건수" fill="#6B7280" radius={[3,3,0,0]} name="건수" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      </div>{/* end space-y-4 */}
    </div>
  );
}
