"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";

const SCENARIOS: Record<string, { title: string; risk: string; desc: string }> = {
  "1": {
    title: "시나리오 1 — 끝자리 반복 금액",
    risk: "예상 위험: 정확한 금액 대신 반올림된 금액이 반복 기표되는 오류 가능성",
    desc: "동일한 끝자리(예: 000, 5000) 금액이 반복적으로 기표된 전표를 식별합니다.",
  },
  "2": {
    title: "시나리오 2 — 주말/공휴일 현금 전표",
    risk: "예상 위험: 통제가 약한 주말/공휴일에 기표된 비정상적인 현금 전표 식별",
    desc: "주말 및 공휴일에 기표된 현금 관련 전표를 식별합니다.",
  },
  "3": {
    title: "시나리오 3 — 고액 현금 전표",
    risk: "예상 위험: 임계금액 이상의 현금 전표를 통한 비정상 거래 가능성",
    desc: "기준 금액 이상의 대규모 현금 전표를 식별합니다.",
  },
  "4": {
    title: "시나리오 4 — 동일 일자 차·대변 상계 전표",
    risk: "예상 위험: 동일 일자에 동일 금액으로 차·대변이 상계되는 비정상 전표 식별",
    desc: "같은 날짜에 동일 금액으로 차·대변이 상계되는 전표 패턴을 식별합니다.",
  },
  "5": {
    title: "시나리오 5 — 관계사 거래 전표",
    risk: "예상 위험: 관계사 간 비정상적인 거래 조건이 포함된 전표 식별",
    desc: "관계회사 코드가 포함된 전표의 거래 패턴을 분석합니다.",
  },
  "6": {
    title: "시나리오 6 — 사용 빈도가 낮은 거래처",
    risk: "예상 위험: 사용 빈도가 낮은 거래처를 통한 회계 오류의 가능성이 있는 전표 식별",
    desc: "분석 기간 내 거래 횟수가 적은 거래처를 통해 기표된 전표를 식별합니다.",
  },
  "7": {
    title: "시나리오 7 — 미승인/수동 조정 전표",
    risk: "예상 위험: 승인 절차 없이 수동으로 입력된 비정상 조정 전표 식별",
    desc: "자동 생성이 아닌 수동 입력 전표 중 비정상적인 패턴을 식별합니다.",
  },
};

export default function ScenarioPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = use(params);
  const scenario = SCENARIOS[n] ?? SCENARIOS["1"];
  const { dateFrom, dateTo } = useFilterStore();

  const { data: monthly, isLoading } = useQuery({
    queryKey: ["je-monthly-scenario", n, dateFrom, dateTo],
    queryFn: () => api.journalEntries.monthlyTrend({ date_from: dateFrom, date_to: dateTo }),
  });

  // Placeholder: show monthly JE amounts as proxy for scenario exceptions
  const chartData = ((monthly as any[]) ?? []).map((d: any) => ({
    month: d.month,
    금액: d.total_credit ?? 0,
    전표수: d.entry_count ?? 0,
  }));

  return (
    <div className="space-y-5">
      {/* Scenario header */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#DFE3E6", borderLeftWidth: 4, borderLeftColor: "#FD5108", boxShadow: "var(--shadow-card)" }}>
        <h3 className="text-base font-bold" style={{ color: "#FD5108" }}>{scenario.title}</h3>
        <p className="text-sm mt-1 font-medium" style={{ color: "#000" }}>{scenario.risk}</p>
        <p className="text-xs mt-2" style={{ color: "#A1A8B3" }}>{scenario.desc}</p>
      </div>

      {/* Exception 내역 chart */}
      <ChartCard title="시나리오 Exception 내역" subtitle="월별 Exception 금액 및 전표 수 (실제 시나리오 API 연동 예정)">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs" style={{ color: "#A1A8B3" }}>Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => formatKRW(Number(v))} />
              <Bar dataKey="금액" fill="#FD5108" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 전표 상세 내역 */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
          <h4 className="text-sm font-semibold" style={{ color: "#000" }}>전표 상세 내역</h4>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#FFE8D4", color: "#FD5108" }}>
            시나리오 {n} 적용
          </span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "#F5F7F8" }}>
                {["일자","전표번호","구분","계정과목","거래처","적요","차변","대변"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: "#A1A8B3", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs" style={{ color: "#A1A8B3" }}>
                  시나리오 {n} 전표 조회 API 연동 예정
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
