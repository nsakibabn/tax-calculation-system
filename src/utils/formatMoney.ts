export function formatMoney(value: number): string {
  return `৳${value.toLocaleString("en-US")}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}
