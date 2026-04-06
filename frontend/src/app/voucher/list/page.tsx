"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

export default function VoucherListPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data: monthly, isLoading } = useQuery({
    queryKey: ["je-monthly", dateFrom, dateTo],
    queryFn: () => api.journalEntries.monthlyTrend({ date_from: dateFrom, date_to: dateTo }),
  });

  const chartData = ((monthly as any[]) ?? []).map((d: any) => ({
    month: d.month,
    debit:  d.total_debit  ?? 0,
    credit: d.total_credit ?? 0,
  }));

  return (
    <div className="space-y-5">
      {/* 일자별 대변합계 차트 */}
      <ChartCard title="월별 전표 분석" subtitle="FILTER에서 분석대상을 선택하여 일자별/계정과목별/거래처별 기표내역 분석">
        {isLoading ? (
          <SkeletonChart height={260} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => formatKRW(Number(v))} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="debit"  name="차변합계" fill="#A1A8B3" radius={[3,3,0,0]} />
              <Bar dataKey="credit" name="대변합계" fill="#FD5108" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 전표 상세 내역 테이블 placeholder */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
          <h4 className="text-sm font-semibold" style={{ color: "#000" }}>전표 상세 내역</h4>
          <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>전표 상세 조회 API 연동 예정 — 좌측 FILTER에서 계정과목 선택</p>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "#F5F7F8" }}>
                {["일자","전표번호","계정과목","거래처","적요","차변","대변"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: "#A1A8B3", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: "#A1A8B3" }}>
                  계정과목 필터를 적용하면 전표 내역이 표시됩니다
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
