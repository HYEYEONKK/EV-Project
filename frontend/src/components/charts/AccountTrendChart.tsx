"use client";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import { PWC_CHART_COLORS, AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

export default function AccountTrendChart() {
  const { dateFrom, dateTo } = useFilterStore();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const { data: accountList } = useQuery({
    queryKey: ["accounts-pl"],
    queryFn: () => api.journalEntries.accounts({ entry_type: "PL" }),
  });

  const { data: trendData, isLoading } = useQuery({
    queryKey: ["account-trend", dateFrom, dateTo, selectedAccounts],
    queryFn: () =>
      api.journalEntries.accountTrend({
        date_from: dateFrom,
        date_to: dateTo,
        account_codes: selectedAccounts,
      }),
    enabled: selectedAccounts.length > 0,
  });

  // Pivot: month → { [classification1]: net_amount }
  const pivoted: Record<string, any> = {};
  const seriesKeys = new Set<string>();
  if (Array.isArray(trendData)) {
    trendData.forEach((r: any) => {
      const month = r.month;
      const key = r.classification1 ?? r.account_code;
      seriesKeys.add(key);
      if (!pivoted[month]) pivoted[month] = { month };
      pivoted[month][key] = (pivoted[month][key] ?? 0) + (r.net_amount ?? 0);
    });
  }
  const chartData = Object.values(pivoted).sort((a, b) => a.month.localeCompare(b.month));
  const series = Array.from(seriesKeys).slice(0, 8);

  const accounts = Array.isArray(accountList)
    ? accountList.slice(0, 50)
    : [];

  const toggleAccount = (code: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-lg shadow-lg border p-3 text-xs max-w-xs" style={{ borderColor: "#E5E7EB" }}>
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name.slice(0, 20)}</span>
            <span>{formatKRW(Math.abs(p.value))}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Account selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {accounts.slice(0, 20).map((acc: any) => (
          <button
            key={acc.account_code}
            onClick={() => toggleAccount(acc.account_code)}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: selectedAccounts.includes(acc.account_code)
                ? "#FD5108"
                : "#F3F4F6",
              color: selectedAccounts.includes(acc.account_code) ? "#fff" : "#374151",
            }}
          >
            {(acc.classification1 ?? acc.account_code).slice(0, 15)}
          </button>
        ))}
      </div>

      {selectedAccounts.length === 0 ? (
        <div className="flex items-center justify-center text-sm py-12" style={{ color: "#9CA3AF" }}>
          계정을 선택하면 추이 차트가 표시됩니다
        </div>
      ) : isLoading ? (
        <SkeletonChart height={220} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="line" iconSize={16} wrapperStyle={{ fontSize: 11 }} />
            {series.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={PWC_CHART_COLORS[i % PWC_CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={key.slice(0, 20)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
