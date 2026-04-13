"use client";
import { usePathname } from "next/navigation";
import { useFilterStore } from "@/lib/store/filterStore";
import CustomSelect from "@/components/ui/CustomSelect";

const LS = "-0.3px";
const DIVIDER = <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6", flexShrink: 0 }} />;
const CURRENCIES = ["USD", "EUR", "JPY", "CNY"];
const RATE_YEARS = ["2022", "2023", "2024", "2025", "2026"];
const thisYear = new Date().getFullYear();
const FX_YEARS = Array.from({ length: 5 }, (_, i) => String(thisYear - i));

export default function MarketFilterBar() {
  const pathname = usePathname();
  const {
    marketRateYear, setMarketRateYear,
    marketExchangeYear, setMarketExchangeYear,
    marketExchangeCurrency, setMarketExchangeCurrency,
  } = useFilterStore();

  if (pathname === "/market/rate") {
    return (
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 13, color: "#A1A8B3", letterSpacing: LS, whiteSpace: "nowrap" }}>조회 시작</span>
        <CustomSelect
          value={marketRateYear}
          onChange={v => setMarketRateYear(String(v))}
          options={RATE_YEARS.map(y => ({ value: y, label: `${y}년 1월` }))}
        />
      </div>
    );
  }

  if (pathname === "/market/exchange") {
    return (
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 13, color: "#A1A8B3", letterSpacing: LS, whiteSpace: "nowrap" }}>연도</span>
        <CustomSelect
          value={marketExchangeYear}
          onChange={v => setMarketExchangeYear(String(v))}
          options={FX_YEARS.map(y => ({ value: y, label: `${y}년` }))}
        />
        {DIVIDER}
        <span style={{ fontSize: 13, color: "#A1A8B3", letterSpacing: LS, whiteSpace: "nowrap" }}>통화</span>
        <CustomSelect
          value={marketExchangeCurrency}
          onChange={v => setMarketExchangeCurrency(String(v))}
          options={CURRENCIES}
        />
      </div>
    );
  }

  return null;
}
