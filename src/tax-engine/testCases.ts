import type { EmployeeTaxInput } from "./types";
import { calculateEmployeeTax } from "./calculateEmployeeTax";

interface TestCase {
  name: string;
  input: EmployeeTaxInput;
  expectedBehavior: string;
}

// Rules are VERIFIED against the official NBR Paripatra 2025-26 for AY 2026-27
// (general threshold 3,75,000; slabs 10/15/20/25/30; salary exemption = min(⅓ of
// employment income, 5,00,000); minimum tax flat 5,000 above threshold). The
// investment-rebate CONSTANTS still need an Act §78 cross-check.
// expectedBehavior describes the logic; convert to exact-value Vitest golden
// assertions in the next step.
export const employeeTaxTestCases: TestCase[] = [
  {
    name: "Case 1 — Zero income",
    input: {
      monthlySalary: 0, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "general",
    },
    expectedBehavior: "grossIncome = 0, finalTax = 0, monthlyTDS = 0, no NaN.",
  },
  {
    name: "Case 2 — General taxpayer below threshold",
    input: {
      monthlySalary: 25000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "general",
    },
    expectedBehavior: "After exemption + threshold, taxableIncome = 0, finalTax = 0.",
  },
  {
    name: "Case 3 — General taxpayer just above threshold",
    input: {
      monthlySalary: 55000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "general",
    },
    expectedBehavior: "Slab tax applies only on income above the general threshold; first slab(s) only.",
  },
  {
    name: "Case 4 — Female taxpayer, taxable income ~500000, no investment",
    input: {
      monthlySalary: 60000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "female",
    },
    expectedBehavior: "Female threshold applies (higher than general). rebate = 0.",
  },
  {
    name: "Case 5 — Senior taxpayer",
    input: {
      monthlySalary: 60000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "senior",
    },
    expectedBehavior: "Senior threshold applies (taxFreeThreshold matches senior config value).",
  },
  {
    name: "Case 6 — Disabled taxpayer",
    input: {
      monthlySalary: 60000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "disabled",
    },
    expectedBehavior: "Disabled threshold applies (highest among first four categories).",
  },
  {
    name: "Case 7 — Freedom fighter taxpayer",
    input: {
      monthlySalary: 60000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "freedomFighter",
    },
    expectedBehavior: "Freedom fighter threshold applies (highest threshold).",
  },
  {
    name: "Case 8 — Salary + bonus + investment",
    input: {
      monthlySalary: 50000, yearlyBonus: 100000, otherIncome: 0,
      investment: 150000, sanchayapatra: 0, taxpayerCategory: "general",
    },
    expectedBehavior: "grossIncome includes salary + bonus; investment rebate reduces tax within eligible limit; investmentSuggestion >= 0.",
  },
  {
    name: "Case 9 — High income, multiple slabs",
    input: {
      monthlySalary: 200000, yearlyBonus: 400000, otherIncome: 200000,
      investment: 500000, sanchayapatra: 0, taxpayerCategory: "general",
    },
    expectedBehavior: "slabBreakdown has multiple taxable slabs (5/10/15/20/25%...); large rebate from investment.",
  },
  {
    name: "Case 10 — Negative / invalid input",
    input: {
      monthlySalary: -5000, yearlyBonus: -10000, otherIncome: NaN,
      investment: Infinity, sanchayapatra: -100, taxpayerCategory: "general",
    },
    expectedBehavior: "All invalid values sanitized to 0. finalTax = 0, never negative, no NaN/Infinity.",
  },
  {
    name: "Case 11 — Sanchayapatra only (no salary)",
    input: {
      monthlySalary: 0, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 500000, taxpayerCategory: "general",
    },
    expectedBehavior: "grossIncome = finalTaxIncome = 500000; regularIncome = 0; taxableIncome = 0 (no regular income to slab-tax); finalTax = 0; sanchayapatra warning must appear.",
  },
  {
    name: "Case 12 — Salary + sanchayapatra (sanchayapatra must NOT affect slab tax)",
    input: {
      monthlySalary: 50000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 500000, taxpayerCategory: "general",
    },
    expectedBehavior: "annualSalary=600000, employmentIncome=600000, finalTaxIncome=500000, regularIncome=600000. salaryExemption=200000. taxableIncome=(600000-200000)-375000=25000. grossTax=2500. Sanchayapatra (500000) must NOT appear in slab calculation.",
  },
  {
    name: "Case 13 — New taxpayer minimum tax (isNewTaxpayer: true)",
    input: {
      monthlySalary: 55000, yearlyBonus: 0, otherIncome: 0,
      investment: 300000, sanchayapatra: 0, taxpayerCategory: "general",
      isNewTaxpayer: true,
    },
    expectedBehavior: "Income just above threshold. After large rebate, finalTaxBeforeMinimumTax near 0. minimumTax must be 1000 (new taxpayer), finalTax = 1000. Warning must mention 'new taxpayer rate'.",
  },
  {
    name: "Case 14 — Rebate base excludes sanchayapatra",
    input: {
      monthlySalary: 80000, yearlyBonus: 0, otherIncome: 0,
      investment: 300000, sanchayapatra: 2000000, taxpayerCategory: "general",
    },
    expectedBehavior: "annualSalary=960000, salaryExemption=320000, rebateEligibleIncome=640000 (NOT 2640000). rebate = min(640000*3%, 300000*15%, 10L) = min(19200, 45000, 10L) = 19200. Sanchayapatra must NOT inflate the rebate base.",
  },
  {
    name: "Case 15 — Regular income below threshold but sanchayapatra present",
    input: {
      monthlySalary: 30000, yearlyBonus: 0, otherIncome: 0,
      investment: 50000, sanchayapatra: 300000, taxpayerCategory: "general",
    },
    expectedBehavior: "regularIncome=360000, salaryExemption=120000, regularIncomeAfterExemption=240000, taxableIncome=0 (below threshold 375000). grossTax=0, rebate=0, finalTax=0. sanchayapatra warning shown. Minimum tax does NOT apply (taxableIncome=0).",
  },
  {
    name: "Case 16 — Third-gender taxpayer",
    input: {
      monthlySalary: 60000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "thirdGender",
    },
    expectedBehavior: "taxFreeThreshold = 500000 (same as disabled). annualSalary=720000, salaryExemption=240000, taxableIncome=720000-240000-500000=-20000 → 0. finalTax=0.",
  },
  {
    name: "Case 17 — July warrior taxpayer",
    input: {
      monthlySalary: 60000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "julyWarrior",
    },
    expectedBehavior: "taxFreeThreshold = 525000 (same as freedomFighter). Higher threshold than thirdGender.",
  },
  {
    name: "Case 18 — Disabled child parent/guardian",
    input: {
      monthlySalary: 60000, yearlyBonus: 0, otherIncome: 0,
      investment: 0, sanchayapatra: 0, taxpayerCategory: "disabledChildParentGuardian",
    },
    expectedBehavior: "taxFreeThreshold = 425000 (general 375000 + 50000 simplified). A warning about simplified implementation must appear in warnings[].",
  },
];

export function runEmployeeTaxTestCases(): void {
  console.log("=".repeat(64));
  console.log("Bangladesh Income Tax Calculator — Employee Tax Engine Test Run");
  console.log("=".repeat(64));

  employeeTaxTestCases.forEach((tc, index) => {
    const result = calculateEmployeeTax(tc.input);
    console.log(`\n[${index + 1}] ${tc.name}`);
    console.log("  Input:    ", JSON.stringify(tc.input));
    console.log("  Expected: ", tc.expectedBehavior);
    console.log("  Result:   ", JSON.stringify(result));
    console.log("  Warnings: ", result.warnings);
    console.log("-".repeat(64));
  });

  console.log("\nAll test cases completed.");
}
