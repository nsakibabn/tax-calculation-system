import type { EmployeeTaxInput, EmployeeTaxResult, TaxpayerCategory } from "./types";
import { bdTaxRules2025_26 } from "./taxRules.bd-2025-26";
import { safeNumber, roundMoney, clampMoney, calculateSlabTax } from "./helpers";

const rules = bdTaxRules2025_26;

function getThreshold(category: TaxpayerCategory): number {
  return rules.taxFreeThresholds[category] ?? rules.taxFreeThresholds.general;
}

// Pure function. Same input => same output. No UI, DB, DOM, or storage.
// All tax NUMBERS come from bdTaxRules2025_26 — none are hard-coded here.
export function calculateEmployeeTax(input: EmployeeTaxInput): EmployeeTaxResult {
  const warnings: string[] = [];

  // 1. Sanitize inputs (invalid / negative / NaN / Infinity => 0)
  const monthlySalary = safeNumber(input.monthlySalary);
  const yearlyBonus = safeNumber(input.yearlyBonus);
  const otherIncome = safeNumber(input.otherIncome);
  const investment = safeNumber(input.investment);
  const sanchayapatra = safeNumber(input.sanchayapatra);
  const isNewTaxpayer = input.isNewTaxpayer === true;

  // 2. Validate taxpayer category, fallback to "general"
  const taxpayerCategory: TaxpayerCategory =
    input.taxpayerCategory in rules.taxFreeThresholds
      ? input.taxpayerCategory
      : "general";
  if (!(input.taxpayerCategory in rules.taxFreeThresholds)) {
    warnings.push(
      `Unknown taxpayer category "${String(input.taxpayerCategory)}" — defaulted to "general".`
    );
  }

  // 3. Annual salary
  const annualSalary = roundMoney(monthlySalary * 12);

  // 4. Income stream separation
  //
  //   employmentIncome — salary + bonus ("চাকরি হইতে আয়"). Base for salary exemption.
  //   finalTaxIncome   — sanchayapatra. Source tax is FINAL settlement (চূড়ান্ত করদায়).
  //                      NOT slab-taxed. NOT included in rebate base.
  //   regularIncome    — all income subject to progressive slabs (no sanchayapatra).
  //   grossIncome      — total income including final-tax items.
  const employmentIncome = roundMoney(annualSalary + yearlyBonus);
  const finalTaxIncome = roundMoney(sanchayapatra);
  const regularIncome = roundMoney(employmentIncome + otherIncome);
  const grossIncome = roundMoney(regularIncome + finalTaxIncome);

  if (sanchayapatra > 0 && rules.sanchayapatra.enabledAsIncomeInput) {
    warnings.push(rules.sanchayapatra.warningNote);
  }

  // 5. Salary exemption — applied to employmentIncome ONLY.
  //    sanchayapatra and otherIncome are not employment income.
  let salaryExemption = 0;
  if (rules.salaryExemption.enabled && employmentIncome > 0) {
    salaryExemption = clampMoney(
      Math.min(
        employmentIncome / rules.salaryExemption.exemptDivisor,
        rules.salaryExemption.maxExemption
      )
    );
  }

  // 6. Regular income after salary exemption.
  //    This is the base for both slab tax and §78 rebate.
  //    sanchayapatra is intentionally excluded — it is final-settlement income.
  const regularIncomeAfterSalaryExemption = clampMoney(regularIncome - salaryExemption);

  // 7. Rebate eligible income — no final-tax income, no threshold deduction yet.
  const rebateEligibleIncome = regularIncomeAfterSalaryExemption;

  // 8. Tax-free threshold by category
  const taxFreeThreshold = getThreshold(taxpayerCategory);

  // Warning for disabledChildParentGuardian — threshold is simplified
  if (taxpayerCategory === "disabledChildParentGuardian") {
    warnings.push(
      "Category 'disabledChildParentGuardian': threshold set to 4,25,000 (general 3,75,000 + 50,000 extra). " +
      "Correct threshold should stack on the taxpayer's primary category and scale with number of disabled children — not yet modeled."
    );
  }

  // 9. Taxable income for progressive slabs (OPTION A: threshold subtracted first)
  //    Only regularIncomeAfterSalaryExemption goes through slabs — never finalTaxIncome.
  const taxableIncome = clampMoney(regularIncomeAfterSalaryExemption - taxFreeThreshold);

  // 10. Progressive slab tax
  const { grossTax, slabBreakdown } = calculateSlabTax(
    taxableIncome,
    rules.progressiveTaxSlabs
  );

  // 11. Investment rebate (§78)
  //     Base = rebateEligibleIncome (regular income after exemption, sanchayapatra excluded).
  //     rebate = lowest of: (3% of eligible income), (15% of investment), (10L cap).
  const { investmentRebate } = rules;
  let rebate = 0;
  if (investmentRebate.enabled) {
    rebate = clampMoney(
      Math.min(
        rebateEligibleIncome * investmentRebate.totalIncomeRate,
        investment * investmentRebate.investmentRate,
        investmentRebate.maxRebate
      )
    );
    rebate = Math.min(rebate, grossTax); // rebate can never exceed gross tax
    if (!investmentRebate.verified && rebate > 0) {
      warnings.push(
        "Investment rebate constants (3% / 15% / cap) are not restated in the Paripatra — verify against Income Tax Act 2023 §78."
      );
    }
  }

  // 12. Final tax before minimum tax
  const finalTaxBeforeMinimumTax = clampMoney(grossTax - rebate);

  // 13. Minimum tax — flat for AY 2026-27 (no location split).
  //     new taxpayer pays 1,000; general taxpayer pays 5,000.
  //     Applied ONLY when regular taxable income exceeds the tax-free threshold
  //     (taxableIncome > 0). Sanchayapatra-only income does NOT trigger minimum tax.
  //
  //   minimumTaxCandidate — configured floor for this taxpayer (always set, even when not applied)
  //   minimumTaxApplied   — floor actually enforced: 0 when taxableIncome = 0
  const minimumTaxCandidate = isNewTaxpayer
    ? clampMoney(rules.minimumTax.newTaxpayerAmount)
    : clampMoney(rules.minimumTax.generalAmount);

  const minimumTaxApplies =
    rules.minimumTax.enabled &&
    rules.minimumTax.applyInCalculation &&
    taxableIncome > 0;

  const minimumTaxApplied = minimumTaxApplies ? minimumTaxCandidate : 0;

  let finalTax = finalTaxBeforeMinimumTax;
  if (minimumTaxApplies) {
    finalTax = Math.max(finalTaxBeforeMinimumTax, minimumTaxApplied);
    if (finalTaxBeforeMinimumTax < minimumTaxApplied) {
      warnings.push(
        `Minimum tax applied: tax raised to ${minimumTaxApplied.toLocaleString("en-US")} (floor${isNewTaxpayer ? " — new taxpayer rate" : ""}).`
      );
    }
  } else if (rules.minimumTax.enabled && !rules.minimumTax.applyInCalculation) {
    warnings.push(
      "Minimum tax is defined but not applied in this calculation; verify location/applicability."
    );
  }
  finalTax = clampMoney(finalTax);

  // 14. Monthly TDS (estimate = final annual tax / 12)
  const monthlyTDS = roundMoney(finalTax / 12);
  if (rules.tdsEstimate.enabled && finalTax > 0) {
    warnings.push("Monthly TDS is estimated as final annual tax divided by 12.");
  }

  // 15. Investment suggestion — additional investment that can still produce useful tax rebate.
  //     Effective ceiling = grossTax - minimumTaxApplied: rebate can only reduce tax down to
  //     the minimum tax floor (not below it), so any rebate exceeding that gap is wasted.
  //     When grossTax = 0 or minimum tax consumes the full gross, ceiling = 0, suggestion = 0.
  let investmentSuggestion = 0;
  if (investmentRebate.enabled) {
    const maxUsefulRebate = Math.min(
      Math.max(grossTax - minimumTaxApplied, 0),
      rebateEligibleIncome * investmentRebate.totalIncomeRate,
      investmentRebate.maxRebate
    );
    const investmentForUsefulRebate =
      investmentRebate.investmentRate > 0
        ? maxUsefulRebate / investmentRebate.investmentRate
        : 0;
    investmentSuggestion = clampMoney(investmentForUsefulRebate - investment);
  }

  return {
    employmentIncome,
    regularIncome,
    finalTaxIncome,
    rebateEligibleIncome,
    annualSalary,
    yearlyBonus: roundMoney(yearlyBonus),
    otherIncome: roundMoney(otherIncome),
    sanchayapatra: roundMoney(sanchayapatra),
    grossIncome,
    salaryExemption,
    taxFreeThreshold,
    taxableIncome,
    slabBreakdown,
    grossTax,
    rebate,
    finalTaxBeforeMinimumTax,
    minimumTaxCandidate,
    minimumTaxApplied,
    finalTax,
    monthlyTDS,
    investmentSuggestion,
    warnings,
  };
}
