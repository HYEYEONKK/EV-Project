"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import { PWC_CHART_COLORS, AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

export default function SalesByVendorChart() {
  const { dateFrom, dateTo, activeMonth, activeProductCategory, activeRegion, activeVendor, setCrossFilter } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["sales-vendor", dateFrom, dateTo, activeMonth, activeProductCategory, activeRegion],
    queryFn: () =>
      api.sales.byVendor({
        date_from: activeMonth ? `${activeMonth}-01` : dateFrom,
        date_to: activeMonth ? `${activeMonth}-31` : dateTo,
        product_category: activeProductCategory ?? undefined,
        region: activeRegion ?? undefined,
        top_n: 15,
      }),
  });

  if (isLoading) return <SkeletonChart height={280} />;
  if (!data?.length) return <div className="text-sm text-gray-400 py-8 text-center">데이터 없음</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white rounded-lg shadow-lg border p-3 text-xs" style={{ borderColor: "#E5E7EB" }}>
        <p className="font-semibold">{label}</p>
        <p>매출: {formatKRW(d.revenue)}</p>
        <p style={{ color: "#6B7280" }}>거래: {d.transactions.toLocaleString()}건</p>
      </div>
    );
  };

  const maxLabelLen = 10;
  const chartData = data.map((d) => ({
    ...d,
    vendorShort: d.vendor.length > maxLabelLen ? d.vendor.slice(0, maxLabelLen) + "…" : d.vendor,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} layout="vertical" margin={{ ...CHART_MARGIN, left: 100 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
        <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="vendorShort" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={100} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="revenue" radius={[0, 3, 3, 0]} cursor="pointer"
          onClick={(entry: any) => setCrossFilter("activeVendor", entry.vendor)}>
          {chartData.map((entry, i) => (
            <Cell key={entry.vendor}
              fill={PWC_CHART_COLORS[i % PWC_CHART_COLORS.length]}
              opacity={activeVendor && activeVendor !== entry.vendor ? 0.3 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
