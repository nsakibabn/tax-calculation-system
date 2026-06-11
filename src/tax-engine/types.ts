export type TaxpayerCategory =
  | "general"
  | "female"
  | "senior"
  | "disabled"
  | "freedomFighter"
  | "thirdGender"
  | "julyWarrior"
  | "disabledChildParentGuardian";

export interface EmployeeTaxInput {
  monthlySalary: number;
  yearlyBonus: number;
  otherIncome: number;
  investment: number;
  sanchayapatra: number;
  taxpayerCategory: TaxpayerCategory;
  isNewTaxpayer?: boolean;
}

// A progressive tax slab.
// ARCHITECTURE = OPTION A: the tax-free threshold is subtracted BEFORE slabs run,
// so these slabs represent the TAXABLE layers that sit ABOVE the threshold.
// `upto` = size of this layer (number) OR null = "all remaining income".
// `rate` = e.g. 0.10 means 10%.
export interface TaxSlab {
  upto: number | null;
  rate: number;
  label: string;
  sourceNote?: string;
}

export interface SlabBreakdownItem {
  from: number;
  to: number | null;
  slabAmount: number;
  rate: number;
  tax: number;
  label: string;
}

export interface EmployeeTaxResult {
  // Income stream breakdown
  employmentIncome: number;         // annualSalary + yearlyBonus
  regularIncome: number;            // employmentIncome + otherIncome (slab-taxable stream)
  finalTaxIncome: number;           // sanchayapatra (final-settlement — NOT slab-taxed)
  rebateEligibleIncome: number;     // regularIncome − salaryExemption (§78 rebate base)
  // Raw inputs echoed back
  annualSalary: number;
  yearlyBonus: number;
  otherIncome: number;
  sanchayapatra: number;
  // Income progression
  grossIncome: number;              // regularIncome + finalTaxIncome
  salaryExemption: number;
  taxFreeThreshold: number;
  taxableIncome: number;            // amount above threshold, sent to progressive slabs
  // Tax calculation
  slabBreakdown: SlabBreakdownItem[];
  grossTax: number;
  rebate: number;
  finalTaxBeforeMinimumTax: number;
  minimumTaxCandidate: number;   // configured floor for this taxpayer status (always populated)
  minimumTaxApplied: number;     // floor actually applied: 0 when taxableIncome ≤ 0
  finalTax: number;
  monthlyTDS: number;
  investmentSuggestion: number;
  // Transparency channel: every simplification / unverified rule surfaces here.
  warnings: string[];
}

// Each rule block carries its OWN `verified` flag + `sourceNote` so the engine
// can warn precisely about which rules are confirmed against the official NBR
// Paripatra and which still need checking against the underlying Act.

export interface SalaryExemptionRule {
  enabled: boolean;
  verified: boolean;
  method: string;
  // Exempt amount = min(employmentIncome / exemptDivisor, maxExemption).
  // employmentIncome = annual salary + yearly bonus (income "from employment").
  exemptDivisor: number; // 3  => one-third
  maxExemption: number; // 500000
  sourceNote: string;
}

export interface InvestmentRebateRule {
  enabled: boolean;
  verified: boolean;
  // §78 rebate = lowest of:
  //   totalIncomeRate * totalIncome
  //   investmentRate  * actualInvestment
  //   maxRebate
  totalIncomeRate: number; // 0.03
  investmentRate: number; // 0.15
  maxRebate: number; // 1000000
  sourceNote: string;
}

export interface MinimumTaxRule {
  enabled: boolean;
  verified: boolean;
  // When true, finalTax is floored at the minimum amount for taxpayers whose
  // income exceeds the tax-free threshold. AY 2026-27 has NO location split,
  // so this can be applied safely without a location input.
  applyInCalculation: boolean;
  locationBased: boolean;
  generalAmount: number; // 5000
  newTaxpayerAmount: number; // 1000
  sourceNote: string;
}

export interface SanchayapatraRule {
  enabledAsIncomeInput: boolean;
  verified: boolean;
  treatment: string;
  sourceNote: string;
  warningNote: string;
}

export interface TdsEstimateRule {
  enabled: boolean;
  method: string;
  sourceNote: string;
}

export interface TaxRules {
  taxYearLabel: string;
  assessmentYear: string;
  incomeYear: string;
  currency: string;

  taxFreeThresholds: Record<TaxpayerCategory, number>;
  thresholdsVerified: boolean;
  thresholdsSourceNote: string;

  progressiveTaxSlabs: TaxSlab[];
  slabsVerified: boolean;
  slabsSourceNote: string;

  salaryExemption: SalaryExemptionRule;
  investmentRebate: InvestmentRebateRule;
  minimumTax: MinimumTaxRule;
  sanchayapatra: SanchayapatraRule;
  tdsEstimate: TdsEstimateRule;
}
