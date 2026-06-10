import type { TaxSlab, SlabBreakdownItem } from "./types";

export function safeNumber(value: unknown): number {
  if (typeof value !== "number" || !isFinite(value) || value < 0) return 0;
  return value;
}

export function roundMoney(value: number): number {
  return Math.round(value);
}

export function clampMoney(value: number): number {
  if (typeof value !== "number" || !isFinite(value) || value < 0) return 0;
  return roundMoney(value);
}

// Progressive slab tax — ARCHITECTURE = OPTION A.
// The caller has ALREADY removed the tax-free threshold, so `taxableIncome` here
// is income that sits entirely ABOVE the threshold. Slabs are therefore the
// taxable layers only; the 0% tax-free band is NOT represented here. This avoids
// double-counting the threshold. Each slab taxes only its own portion.
export function calculateSlabTax(
  taxableIncome: number,
  slabs: readonly TaxSlab[]
): { grossTax: number; slabBreakdown: SlabBreakdownItem[] } {
  if (taxableIncome <= 0) {
    return { grossTax: 0, slabBreakdown: [] };
  }

  const breakdown: SlabBreakdownItem[] = [];
  let remaining = taxableIncome;
  let cursor = 0;
  let grossTax = 0;

  for (const slab of slabs) {
    if (remaining <= 0) break;

    const slabAmount =
      slab.upto === null ? remaining : Math.min(remaining, slab.upto);

    const tax = roundMoney(slabAmount * slab.rate);

    breakdown.push({
      from: cursor,
      to: slab.upto === null ? null : cursor + slabAmount,
      slabAmount,
      rate: slab.rate,
      tax,
      label: slab.label,
    });

    grossTax += tax;
    cursor += slabAmount;
    remaining -= slabAmount;
  }

  return { grossTax: roundMoney(grossTax), slabBreakdown: breakdown };
}
