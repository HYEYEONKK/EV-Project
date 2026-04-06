"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

export default function BsTrendPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data: monthly, isLoading } = useQuery({
    queryKey: ["pl-monthly", dateFrom, dateTo],
    queryFn: () => api.financialStatements.incomeStatementMonthly({ date_from: dateFrom, date_to: dateTo }),
  });

  const chartData = ((monthly as any[]) ?? []).map((d: any) => ({
    month: d.month,
    revenue:  d.revenue  ?? 0,
    cogs:     d.cogs     ?? 0,
    sga:      d.sga      ?? 0,
    op_income: (d.revenue ?? 0) - (d.cogs ?? 0) - (d.sga ?? 0),
  }));

  return (
    <div className="space-y-5">
      <ChartCard title="BS 추이분석" subtitle="월별 손익 기반 자산·수익 추이 (BS 월별 엔드포인트 추가 예정)">
        {isLoading ? (
          <SkeletonChart height={300} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => formatKRW(Number(v))} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue"   name="매출액"  fill="#FD5108" radius={[3,3,0,0]} />
              <Bar dataKey="cogs"      name="매출원가" fill="#A1A8B3" radius={[3,3,0,0]} />
              <Bar dataKey="sga"       name="판관비"   fill="#FFAA72" radius={[3,3,0,0]} />
              <Line dataKey="op_income" name="영업이익" stroke="#059669" strokeWidth={2} dot={false} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
