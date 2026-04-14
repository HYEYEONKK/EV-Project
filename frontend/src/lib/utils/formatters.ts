export function formatKRW(value: number): string {
  if (!value && value !== 0) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toLocaleString("ko-KR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}조`;
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}억`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만`;
  return `${sign}${abs.toLocaleString("ko-KR")}`;
}

export function formatKRWFull(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(value: number, decimals = 1): string {
  if (value === null || value === undefined) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatPctAbs(value: number, decimals = 1): string {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(decimals)}%`;
}

export function chartAxisFormatter(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}조`;
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}억`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만`;
  return value.toLocaleString("ko-KR");
}
