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

  // 4. Income streams
  //
  //   employmentIncome — salary + bonus ("চাকরি হইতে আয়"). Base for salary exemption only.
  //   finalTaxIncome   — always 0. Sanchayapatra is now merged into regularIncome.
  //   regularIncome    — all slab-taxable income: employment + other + sanchayapatra.
  //   grossIncome      — equals regularIncome (no separate final-settlement stream).
  const employmentIncome = roundMoney(annualSalary + yearlyBonus);
  const finalTaxIncome = 0;
  const regularIncome = roundMoney(employmentIncome + otherIncome + sanchayapatra);
  const grossIncome = regularIncome;

  if (sanchayapatra > 0) {
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
    warnings.push(
      "Salary exemption is simplified: calculated as one-third of total employment income " +
      "(salary + bonus), capped at ৳5,00,000. Actual exemption may differ if individual " +
      "salary components (basic, HRA, medical, conveyance, etc.) are considered separately."
    );
  }

  // 6. Regular income after salary exemption.
  //    This is the base for both slab tax and §78 rebate.
  //    sanchayapatra is intentionally excluded — it is final-settlement income.
  const regularIncomeAfterSalaryExemption = clampMoney(regularIncome - salaryExemption);

  // 7. Rebate eligible income — no final-tax income, no threshold deduction yet.
  //    Paripatra item 19 excludes tax-exempt income from the §78 base. Salary exemption (above)
  //    is excluded. Open question: does the tax-free threshold band also qualify as tax-exempt
  //    income? If yes, base should be taxableIncome (line 87). If no, base is here (pre-threshold).
  //    Verify against Income Tax Act 2023 §78 before changing. Currently uses pre-threshold base.
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

  // 11. Minimum tax — computed BEFORE rebate (depends only on taxableIncome, not on rebate).
  //     In this simplified calculator, minimum tax applies only when regular taxable income
  //     exceeds the tax-free threshold. Final-source-tax income (Sanchayapatra) is shown
  //     separately and does NOT trigger regular minimum tax in this version.
  //
  //   minimumTaxCandidate — configured floor for this taxpayer (always populated)
  //   minimumTaxApplied   — floor actually enforced: 0 when taxableIncome = 0
  const minimumTaxCandidate = clampMoney(isNewTaxpayer
    ? rules.minimumTax.newTaxpayerAmount
    : rules.minimumTax.generalAmount);

  const minimumTaxApplies =
    rules.minimumTax.enabled &&
    rules.minimumTax.applyInCalculation &&
    taxableIncome > 0;

  const minimumTaxApplied = minimumTaxApplies ? minimumTaxCandidate : 0;

  // 12. Investment rebate (§78)
  //     calculatedRebate = raw §78 formula result (displayed in UI; may exceed effectiveRebate)
  //     rebate           = effectiveRebate — capped at taxReductionCapacity (actual tax saving)
  //
  //     rebateEligibleIncome excludes sanchayapatra — only regular income qualifies.
  const { investmentRebate } = rules;
  let calculatedRebate = 0;
  if (investmentRebate.enabled) {
    calculatedRebate = clampMoney(
      Math.min(
        rebateEligibleIncome * investmentRebate.totalIncomeRate,
        investment * investmentRebate.investmentRate,
        investmentRebate.maxRebate
      )
    );
    calculatedRebate = Math.min(calculatedRebate, grossTax);
    if (!investmentRebate.verified && calculatedRebate > 0) {
      warnings.push(
        "Investment rebate constants (3% / 15% / cap) are not restated in the Paripatra — verify against Income Tax Act 2023 §78."
      );
    }
  }

  // effectiveRebate capped at taxReductionCapacity — investment rebate cannot alone reduce tax below floor.
  const taxReductionCapacity = Math.max(grossTax - minimumTaxApplied, 0);
  const effectiveRebate = Math.min(calculatedRebate, taxReductionCapacity);
  const rebate = effectiveRebate; // backward-compatible alias

  // 13. Sanchayapatra tax credit (PROJECT RULE: 15% of sanchayapatra amount).
  //     Applied after investment rebate. Credit rate is from taxRules config.
  const sanchayapatraTaxCredit = clampMoney(sanchayapatra * rules.sanchayapatra.taxCreditRate);
  const totalTaxReduction = clampMoney(effectiveRebate + sanchayapatraTaxCredit);

  // 14. Final tax calculation.
  //     Calculation order:
  //       (a) Apply investment rebate (effectiveRebate) to grossTax.
  //       (b) Apply sanchayapatra credit to the result.
  //       (c) Clamp to ≥ 0 → finalTaxBeforeMinimumTax.
  //       (d) Apply minimum tax floor: finalTax = max(finalTaxBeforeMinimumTax, minimumTaxApplied).
  //
  //     minimumTaxFloorIsBinding uses finalTaxTheoretical (full calculatedRebate + credit, no floor)
  //     to detect whether the floor is needed — consistent with how calculatedRebate represents
  //     the full theoretical §78 entitlement.
  const finalTaxBeforeMinimumTax = clampMoney(grossTax - effectiveRebate - sanchayapatraTaxCredit);
  const finalTaxTheoretical = clampMoney(grossTax - calculatedRebate - sanchayapatraTaxCredit);
  const minimumTaxFloorIsBinding = minimumTaxApplied > 0 && finalTaxTheoretical < minimumTaxApplied;
  const finalTax = clampMoney(Math.max(finalTaxBeforeMinimumTax, minimumTaxApplied));

  if (minimumTaxApplies) {
    if (minimumTaxFloorIsBinding) {
      warnings.push(
        `Minimum tax floor applied${isNewTaxpayer ? " (new taxpayer rate)" : ""}.`
      );
    }
  } else if (rules.minimumTax.enabled && !rules.minimumTax.applyInCalculation) {
    warnings.push(
      "Minimum tax is defined but not applied in this calculation; verify location/applicability."
    );
  }

  // 14. Monthly TDS (estimate = final annual tax / 12)
  const monthlyTDS = roundMoney(finalTax / 12);
  if (rules.tdsEstimate.enabled && finalTax > 0) {
    warnings.push("Monthly TDS is estimated as final annual tax divided by 12.");
  }

  // 15. Investment suggestion — how much MORE to invest to exhaust all useful rebate headroom.
  //     Remaining capacity for investment rebate = total capacity minus sanchayapatra credit already used.
  //     When sanchayapatra credit fills all headroom, or floor leaves no room, suggestion = 0.
  let investmentSuggestion = 0;
  if (investmentRebate.enabled) {
    const remainingCapacityForRebate = Math.max(taxReductionCapacity - sanchayapatraTaxCredit, 0);
    const maxUsefulRebate = Math.min(
      remainingCapacityForRebate,
      rebateEligibleIncome * investmentRebate.totalIncomeRate,
      investmentRebate.maxRebate
    );
    const investmentNeededForUsefulRebate =
      investmentRebate.investmentRate > 0
        ? maxUsefulRebate / investmentRebate.investmentRate
        : 0;
    investmentSuggestion = clampMoney(investmentNeededForUsefulRebate - investment);
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
    calculatedRebate,
    effectiveRebate,
    rebate,
    sanchayapatraTaxCredit,
    totalTaxReduction,
    finalTaxBeforeMinimumTax,
    minimumTaxFloorIsBinding,
    minimumTaxCandidate,
    minimumTaxApplied,
    finalTax,
    monthlyTDS,
    investmentSuggestion,
    warnings,
  };
}
