export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "৳0";
  return `৳${value.toLocaleString("en-IN")}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}
