"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import { PWC_CHART_COLORS, AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

export default function SalesByCategoryChart() {
  const { dateFrom, dateTo, activeMonth, activeProductCategory, setCrossFilter } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["sales-category", dateFrom, dateTo, activeMonth],
    queryFn: () =>
      api.sales.byCategory({
        date_from: activeMonth ? `${activeMonth}-01` : dateFrom,
        date_to: activeMonth ? `${activeMonth}-31` : dateTo,
      }),
  });

  if (isLoading) return <SkeletonChart height={240} />;
  if (!data?.length) return <div className="text-sm text-gray-400 py-8 text-center">데이터 없음</div>;

  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white rounded-lg shadow-lg border p-3 text-xs" style={{ borderColor: "#E5E7EB" }}>
        <p className="font-semibold">{label}</p>
        <p>매출: {formatKRW(d.revenue)}</p>
        <p style={{ color: "#6B7280" }}>비중: {d.share}%</p>
        <p style={{ color: "#6B7280" }}>거래: {d.transactions.toLocaleString()}건</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={sorted} layout="vertical" margin={{ ...CHART_MARGIN, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
        <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="category" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="revenue" radius={[0, 3, 3, 0]} cursor="pointer"
          onClick={(entry: any) => setCrossFilter("activeProductCategory", entry.category)}>
          {sorted.map((entry, i) => (
            <Cell
              key={entry.category}
              fill={PWC_CHART_COLORS[i % PWC_CHART_COLORS.length]}
              opacity={activeProductCategory && activeProductCategory !== entry.category ? 0.3 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
