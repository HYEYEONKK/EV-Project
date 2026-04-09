"use client";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { chartAxisFormatter, formatKRW } from "@/lib/utils/formatters";
import { CHART_MARGIN, AXIS_STYLE, GRID_STROKE } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

const ORANGE = "#FD5108";
const NAVY = "#6B7280";
const AMBER = "#EB8C00";

export default function RevenueChart() {
  const { dateFrom, dateTo, activeMonth, setCrossFilter } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["pl-monthly", dateFrom, dateTo],
    queryFn: () =>
      api.financialStatements.incomeStatementMonthly({
        date_from: dateFrom,
        date_to: dateTo,
      }),
  });

  if (isLoading) return <SkeletonChart height={260} />;
  if (!data?.length) return <div className="text-sm text-gray-400 py-8 text-center">데이터 없음</div>;

  const handleBarClick = (entry: any) => {
    setCrossFilter("activeMonth", entry.month);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-lg shadow-lg border p-3 text-xs" style={{ borderColor: "#E5E7EB" }}>
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span>{p.name}: {formatKRW(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="left" dataKey="revenue" name="매출액" fill={ORANGE} radius={[3, 3, 0, 0]}
          cursor="pointer" onClick={handleBarClick}>
          {data.map((entry) => (
            <Cell
              key={entry.month}
              fill={ORANGE}
              opacity={activeMonth && activeMonth !== entry.month ? 0.3 : 1}
            />
          ))}
        </Bar>
        <Bar yAxisId="left" dataKey="expense" name="비용" fill={NAVY} radius={[3, 3, 0, 0]}
          opacity={0.7}>
          {data.map((entry) => (
            <Cell
              key={entry.month}
              fill={NAVY}
              opacity={activeMonth && activeMonth !== entry.month ? 0.2 : 0.7}
            />
          ))}
        </Bar>
        <Line yAxisId="right" dataKey="cumulative_revenue" name="누적매출" stroke={AMBER}
          strokeWidth={2} dot={false} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
