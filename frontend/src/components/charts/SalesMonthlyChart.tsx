"use client";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import { AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

const ORANGE = "#FD5108";
const AMBER = "#EB8C00";

export default function SalesMonthlyChart() {
  const { dateFrom, dateTo, activeMonth, activeProductCategory, activeVendor, activeRegion, setCrossFilter } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["sales-monthly", dateFrom, dateTo, activeProductCategory, activeVendor, activeRegion],
    queryFn: () =>
      api.sales.monthlyTrend({
        date_from: dateFrom,
        date_to: dateTo,
        product_category: activeProductCategory ?? undefined,
        vendor: activeVendor ?? undefined,
        region: activeRegion ?? undefined,
      }),
  });

  if (isLoading) return <SkeletonChart height={260} />;
  if (!data?.length) return <div className="text-sm text-gray-400 py-8 text-center">데이터 없음</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-lg shadow-lg border p-3 text-xs" style={{ borderColor: "#E5E7EB" }}>
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span>{p.name}: {p.name === "누적매출" ? formatKRW(p.value) : formatKRW(p.value)}</span>
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
        <Bar yAxisId="left" dataKey="revenue" name="매출액" radius={[3, 3, 0, 0]} cursor="pointer"
          onClick={(entry: any) => setCrossFilter("activeMonth", entry.month)}>
          {data.map((entry) => (
            <Cell key={entry.month} fill={ORANGE}
              opacity={activeMonth && activeMonth !== entry.month ? 0.3 : 1} />
          ))}
        </Bar>
        <Line yAxisId="right" dataKey="cumulative_revenue" name="누적매출" stroke={AMBER}
          strokeWidth={2} dot={false} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
