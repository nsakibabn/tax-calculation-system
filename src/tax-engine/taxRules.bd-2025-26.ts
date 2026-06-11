import type { TaxRules } from "./types";

// =============================================================================
// Bangladesh Income Tax Rules — Assessment Year (করবর্ষ) 2026-2027
// Income Year (আয়বর্ষ) 2025-2026 — i.e. income earned in FY 2025-26.
// SINGLE SOURCE OF TRUTH for every tax number. No rates/limits live anywhere
// else. Calculation files import from here only.
// =============================================================================
//
//  SOURCE: Official NBR "আয়কর পরিপত্র ২০২৫-২০২৬" (Income Tax Paripatra 2025-2026),
//          dated 21 August 2025, downloaded from nbr.gov.bd, stored at
//          docs/nbr-income-tax-paripatra-2025-26.pdf.
//  Page citations below use the document's PRINTED page numbers.
//
//  ⚠ IMPORTANT — WHICH ASSESSMENT YEAR?
//  The Paripatra publishes TWO different rate tables:
//    • §2 (printed p.7-8)  → করবর্ষ 2025-2026: threshold 3,50,000; slabs 5/10/15/20/25/30; minimum tax is LOCATION-based.
//    • §1 (printed p.1-2)  → করবর্ষ 2026-2027 & 2027-2028: threshold 3,75,000; slabs 10/15/20/25/30; minimum tax FLAT.
//  This config uses the §1 set (AY 2026-27), because the project architecture
//  document specifies "Assessment Year: AY 2026-27" and its example config lists
//  exactly these numbers (3,75,000 / 4,25,000 / 5,00,000 / 5,25,000, 10/15/20/25/30).
//  To switch to AY 2025-26 instead, replace the thresholds + slabs + minimum-tax
//  blocks below with the §2 values — nothing else in the codebase changes.
// =============================================================================

export const bdTaxRules2025_26: TaxRules = {
  taxYearLabel: "Bangladesh Income Tax — AY 2026-2027 (income year 2025-2026)",
  assessmentYear: "2026-2027",
  incomeYear: "2025-2026",
  currency: "BDT",

  // ---------------------------------------------------------------------------
  // 1. Tax-free thresholds (করমুক্ত আয়সীমা) by taxpayer category — VERIFIED
  // ---------------------------------------------------------------------------
  taxFreeThresholds: {
    // Primary categories — VERIFIED §1.1 p.1-2
    general: 375000,       // সাধারণ স্বাভাবিক ব্যক্তি
    female: 425000,        // মহিলা করদাতা
    senior: 425000,        // ৬৫ বছর বা তদূর্ধ্ব বয়সের করদাতা
    disabled: 500000,      // প্রতিবন্ধী ব্যক্তি
    freedomFighter: 525000, // গেজেটভুক্ত যুদ্ধাহত মুক্তিযোদ্ধা
    // Expanded categories — same thresholds per §1.1, now explicit
    thirdGender: 500000,   // তৃতীয় লিঙ্গের করদাতা — same as disabled per Paripatra §1.1
    julyWarrior: 525000,   // আহত "জুলাই যোদ্ধা" — same as freedomFighter per Paripatra §1.1
    // TODO: disabledChildParentGuardian threshold = primary-category-threshold + 50,000 per
    // disabled child (Paripatra §1.1 p.2). Modeled here as general+50,000=425,000 only.
    // Correct implementation requires: (a) taxpayer's OWN primary category, and
    // (b) number of disabled children. Both are missing from current inputs.
    disabledChildParentGuardian: 425000,
  },
  thresholdsVerified: true,
  thresholdsSourceNote:
    "VERIFIED — Paripatra §1.1 (printed p.1-2, AY 2026-27 & 2027-28). general 3,75,000; female & senior(65+) 4,25,000; third-gender & disabled 5,00,000; freedomFighter & julyWarrior 5,25,000. disabledChildParentGuardian: primary threshold + 50,000 per disabled child — simplified here as 4,25,000 (general+50k). TODO: collect primary category + child count for correct calculation.",

  // ---------------------------------------------------------------------------
  // 2. Progressive slabs (OPTION A: applied to income ABOVE the threshold) — VERIFIED
  //    Each slab taxes ONLY its own layer. `upto` = layer size, null = remainder.
  // ---------------------------------------------------------------------------
  progressiveTaxSlabs: [
    { upto: 300000, rate: 0.10, label: "First 3,00,000 @ 10%" },
    { upto: 400000, rate: 0.15, label: "Next 4,00,000 @ 15%" },
    { upto: 500000, rate: 0.20, label: "Next 5,00,000 @ 20%" },
    { upto: 2000000, rate: 0.25, label: "Next 20,00,000 @ 25%" },
    { upto: null, rate: 0.30, label: "Remaining @ 30%" },
  ],
  slabsVerified: true,
  slabsSourceNote:
    "VERIFIED — Paripatra §1.1 (printed p.2, AY 2026-27 & 2027-28): first 3,75,000 @ 0% (the threshold above), then next 3,00,000 @ 10%, next 4,00,000 @ 15%, next 5,00,000 @ 20%, next 20,00,000 @ 25%, remaining @ 30%.",

  // ---------------------------------------------------------------------------
  // 3. Salary exemption — VERIFIED
  //    Exempt = lower of (employment income ÷ 3) or 5,00,000.
  //    employment income = annual salary + yearly bonus ("চাকরি হইতে আয়").
  // ---------------------------------------------------------------------------
  salaryExemption: {
    enabled: true,
    verified: true,
    method: "one_third_of_employment_income_or_cap",
    exemptDivisor: 3, // one-third
    maxExemption: 500000, // raised from 4,50,000 to 5,00,000
    sourceNote:
      "VERIFIED — Paripatra item 59.5 (printed p.80): 6th Schedule Part 1 clause (27). Exempt portion of 'income from employment' = one-third of that income OR 5,00,000, whichever is LOWER. Cap raised from 4,50,000 to 5,00,000, effective AY 2025-26 onward. NOTE: 'income from employment' here is taken as annual salary + yearly bonus; finer component splits (HRA, medical, conveyance) are not separately modeled.",
  },

  // ---------------------------------------------------------------------------
  // 4. Investment rebate (§78) — PARTIALLY VERIFIED (constants NOT in Paripatra)
  //    rebate = lowest of: 3% of total income, 15% of investment, 10,00,000.
  // ---------------------------------------------------------------------------
  investmentRebate: {
    enabled: true,
    verified: false,
    totalIncomeRate: 0.03, // 3% of total income
    investmentRate: 0.15, // 15% of actual eligible investment
    maxRebate: 1000000, // 10,00,000 absolute cap
    sourceNote:
      "PARTIALLY VERIFIED — Paripatra item 19 (printed p.46) amends only the BASE of §78 (tax-exempt income, reduced-rate income, and minimum-tax income are now excluded from 'total income' for rebate purposes). The actual rebate constants (3% of total income / 15% of investment / 10,00,000 cap) are in Income Tax Act 2023 §78 and the 6th Schedule Part 3 — these are NOT restated in this Paripatra. TODO: verify the three constants directly against the Act §78 before treating rebate as final.",
  },

  // ---------------------------------------------------------------------------
  // 5. Minimum tax — VERIFIED (AY 2026-27 is flat, no location split)
  // ---------------------------------------------------------------------------
  minimumTax: {
    enabled: true,
    verified: true,
    applyInCalculation: true, // safe to apply: AY 2026-27 has no location dependence
    locationBased: false,
    generalAmount: 5000,
    newTaxpayerAmount: 1000,
    sourceNote:
      "VERIFIED — Paripatra §1.1 (printed p.2, AY 2026-27 & 2027-28): if total income EXCEEDS the tax-free threshold, minimum tax = 5,000 (general) or 1,000 (new taxpayer), even if tax after rebate is lower/zero/negative. No location split for AY 2026-27. (Contrast: AY 2025-26 §2.1 printed p.8 IS location-based: 5,000 Dhaka/Ctg city corp, 4,000 other city corp, 3,000 elsewhere.) Engine selects generalAmount or newTaxpayerAmount based on the isNewTaxpayer input collected from the form. PROJECT NOTE: In this simplified employee calculator, minimum tax is applied only when regular taxable income exceeds the tax-free threshold. Final-source-tax income (Sanchayapatra) is shown separately and does not trigger regular minimum tax in this version.",
  },

  // ---------------------------------------------------------------------------
  // 6. Sanchayapatra (সঞ্চয়পত্র) — included in income, but source tax is FINAL
  // ---------------------------------------------------------------------------
  sanchayapatra: {
    enabledAsIncomeInput: true,
    verified: false,
    treatment: "added_to_total_income_simplified",
    sourceNote:
      "PARTIALLY VERIFIED — Paripatra Example 12 (printed p.47) includes sanchayapatra profit in total income, but the source tax withheld on it is treated as FINAL settlement (চূড়ান্ত করদায়) — it is not refundable and not re-taxed. This engine adds the amount to income but does NOT yet model the final-settlement source-tax credit. TODO: model source-tax-as-final-discharge for sanchayapatra.",
    warningNote:
      "Sanchayapatra is added to total income, but its source tax is a FINAL settlement that this engine does not yet credit separately. Treat the sanchayapatra portion of the result as indicative only.",
  },

  // ---------------------------------------------------------------------------
  // 7. Monthly TDS estimate
  // ---------------------------------------------------------------------------
  tdsEstimate: {
    enabled: true,
    method: "final_annual_tax_divided_by_12",
    sourceNote:
      "Estimate only. Official salary TDS (payroll deduction) can differ from final annual tax ÷ 12. Not a Paripatra-defined figure.",
  },
} as const;
