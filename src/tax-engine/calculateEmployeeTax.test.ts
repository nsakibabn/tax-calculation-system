import { describe, it, expect } from 'vitest'
import { calculateEmployeeTax } from './calculateEmployeeTax'
import type { EmployeeTaxInput } from './types'

const BASE: EmployeeTaxInput = {
  monthlySalary: 0,
  yearlyBonus: 0,
  otherIncome: 0,
  investment: 0,
  sanchayapatra: 0,
  taxpayerCategory: 'general',
}

describe('calculateEmployeeTax — golden tests (AY 2026-27)', () => {
  // ─── Case 1: Zero income ───────────────────────────────────────────────────
  it('zero income — all monetary fields are 0, no NaN/Infinity', () => {
    const r = calculateEmployeeTax(BASE)
    expect(r.grossIncome).toBe(0)
    expect(r.finalTax).toBe(0)
    expect(r.monthlyTDS).toBe(0)
    expect(r.calculatedRebate).toBe(0)
    expect(r.effectiveRebate).toBe(0)
    expect(r.minimumTaxApplied).toBe(0)
    for (const v of Object.values(r)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
    }
  })

  // ─── Case 2: Below threshold ───────────────────────────────────────────────
  it('general taxpayer below threshold — taxableIncome=0, finalTax=0', () => {
    // annualSalary=300k, exemption=100k → after exemption 200k < threshold 375k
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 25000 })
    expect(r.taxableIncome).toBe(0)
    expect(r.grossTax).toBe(0)
    expect(r.finalTax).toBe(0)
    expect(r.minimumTaxApplied).toBe(0)
    expect(r.minimumTaxFloorIsBinding).toBe(false)
  })

  // ─── Case 3: Minimum floor binding ────────────────────────────────────────
  it('minimum floor is binding — finalTax equals floor (৳5,000)', () => {
    // annualSalary=600k, exemption=200k, taxable=25k, grossTax=2500 < floor 5000
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 50000 })
    expect(r.taxableIncome).toBeGreaterThan(0)
    expect(r.minimumTaxFloorIsBinding).toBe(true)
    expect(r.finalTax).toBe(5000)
    expect(r.finalTax).toBe(r.minimumTaxApplied)
  })

  // ─── Case 4: Minimum floor non-binding ────────────────────────────────────
  it('minimum floor non-binding — high income, finalTax >> floor', () => {
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 200000 })
    expect(r.minimumTaxFloorIsBinding).toBe(false)
    expect(r.finalTax).toBeGreaterThan(r.minimumTaxApplied)
    expect(r.effectiveRebate).toBe(0)
  })

  // ─── Case 5: calculatedRebate vs effectiveRebate ──────────────────────────
  it('calculatedRebate > effectiveRebate when floor blocks full rebate', () => {
    // grossTax=9167, floor=5000, calculatedRebate=9167, effectiveRebate=4167
    const r = calculateEmployeeTax({
      ...BASE,
      monthlySalary: 50000,
      yearlyBonus: 100000,
      investment: 100000,
    })
    expect(r.minimumTaxFloorIsBinding).toBe(true)
    expect(r.calculatedRebate).toBeGreaterThan(r.effectiveRebate)
    expect(r.rebate).toBe(r.effectiveRebate)
    expect(r.effectiveRebate).toBeGreaterThan(0)
    expect(r.finalTax).toBe(5000)
  })

  // ─── Case 6a: investmentSuggestion = 0 when floor removes all headroom ────
  it('investmentSuggestion=0 when floor consumes all rebate headroom', () => {
    // grossTax=2500, floor=5000 → taxReductionCapacity=0 → no useful investment
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 50000 })
    expect(r.minimumTaxFloorIsBinding).toBe(true)
    expect(r.investmentSuggestion).toBe(0)
  })

  // ─── Case 6b: investmentSuggestion capped by taxReductionCapacity ─────────
  it('investmentSuggestion is capped by taxReductionCapacity, not grossTax', () => {
    // grossTax=9167, floor=5000, investment=0 → taxReductionCapacity=4167
    // suggest ≈ 27780 so that 27780×15%=4167 (max useful rebate)
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 50000, yearlyBonus: 100000 })
    const taxReductionCapacity = r.grossTax - r.minimumTaxApplied
    expect(r.investmentSuggestion).toBeGreaterThan(0)
    // rebate from suggestion must not exceed capacity
    expect(Math.round(r.investmentSuggestion * 0.15)).toBeLessThanOrEqual(taxReductionCapacity + 1)
  })

  // ─── Case 7: Sanchayapatra only ───────────────────────────────────────────
  it('sanchayapatra only — included in regularIncome, 15% credit applied, minimum floor binds', () => {
    // sanchayapatra=500k → regularIncome=500k, taxable=125k, grossTax=12500
    // credit=75000 > grossTax → finalTaxBeforeMinimumTax=0, floor=5000 binds
    const r = calculateEmployeeTax({ ...BASE, sanchayapatra: 500000 })
    expect(r.regularIncome).toBe(500000)
    expect(r.finalTaxIncome).toBe(0)
    expect(r.taxableIncome).toBe(125000)
    expect(r.grossTax).toBe(12500)
    expect(r.sanchayapatraTaxCredit).toBe(75000)
    expect(r.finalTaxBeforeMinimumTax).toBe(0)
    expect(r.minimumTaxFloorIsBinding).toBe(true)
    expect(r.finalTax).toBe(5000)
    expect(r.warnings.some(w => /sanchayapatra/i.test(w))).toBe(true)
  })

  // ─── Case 8: Salary + Sanchayapatra ───────────────────────────────────────
  it('salary + sanchayapatra — both in regularIncome, finalTaxIncome=0', () => {
    // annualSalary=960k, exemption=320k, sanchayapatra=2M
    // regularIncome=2960k, taxable=2960k−320k−375k=2265k
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, sanchayapatra: 2000000 })
    expect(r.finalTaxIncome).toBe(0)
    expect(r.regularIncome).toBe(2960000)
    expect(r.taxableIncome).toBe(2265000)
    expect(r.grossTax).toBe(456250)
    expect(r.sanchayapatraTaxCredit).toBe(300000)
    expect(r.finalTax).toBe(156250)
    expect(r.warnings.some(w => /sanchayapatra/i.test(w))).toBe(true)
  })

  // ─── Case 9: Rebate base includes Sanchayapatra ───────────────────────────
  it('rebateEligibleIncome includes sanchayapatra (2640k not 640k)', () => {
    // annualSalary=960k, exemption=320k, sanchayapatra=2M → rebateEligibleIncome=2640k
    // rebate = min(2640k×3%=79200, 300k×15%=45000, 1M) = 45000
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, investment: 300000, sanchayapatra: 2000000 })
    expect(r.rebateEligibleIncome).toBe(2640000)
    expect(r.calculatedRebate).toBe(45000)
  })

  // ─── Case 10: New taxpayer minimum tax ────────────────────────────────────
  it('new taxpayer — minimum tax floor is 1000, warning present', () => {
    // grossTax=6500, large rebate → floor=1000 binds; finalTax=1000
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 55000, investment: 300000, isNewTaxpayer: true })
    expect(r.minimumTaxCandidate).toBe(1000)
    expect(r.finalTax).toBe(1000)
    expect(r.minimumTaxFloorIsBinding).toBe(true)
    expect(r.warnings.some(w => /new taxpayer/i.test(w))).toBe(true)
  })

  // ─── Case 11: disabledChildParentGuardian warning ─────────────────────────
  it('disabledChildParentGuardian — threshold=425000 and simplified warning', () => {
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 60000, taxpayerCategory: 'disabledChildParentGuardian' })
    expect(r.taxFreeThreshold).toBe(425000)
    expect(r.warnings.some(w => /disabledChildParentGuardian/i.test(w))).toBe(true)
  })

  // ─── Case 12: slab sum = grossTax ─────────────────────────────────────────
  it('slabBreakdown tax values sum exactly equals grossTax', () => {
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 200000, yearlyBonus: 400000, otherIncome: 200000 })
    const slabSum = r.slabBreakdown.reduce((s, x) => s + x.tax, 0)
    expect(r.slabBreakdown.length).toBeGreaterThan(1)
    expect(slabSum).toBe(r.grossTax)
  })

  // ─── Case 13: Invalid input sanitization ──────────────────────────────────
  it('invalid inputs sanitized — finalTax=0, no NaN/Infinity/negative', () => {
    const r = calculateEmployeeTax({
      monthlySalary: -5000,
      yearlyBonus: -10000,
      otherIncome: NaN,
      investment: Infinity,
      sanchayapatra: -100,
      taxpayerCategory: 'general',
    })
    expect(r.finalTax).toBe(0)
    for (const v of Object.values(r)) {
      if (typeof v === 'number') {
        expect(Number.isFinite(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // ─── Case 14: Unknown category fallback ───────────────────────────────────
  it('unknown taxpayerCategory falls back to general (375k) with warning', () => {
    const r = calculateEmployeeTax({ ...BASE, taxpayerCategory: 'invalid_cat' as never })
    expect(r.taxFreeThreshold).toBe(375000)
    expect(r.warnings.some(w => /unknown taxpayer category/i.test(w))).toBe(true)
  })

  // ─── Case 15: Alternative threshold tiers ─────────────────────────────────
  it('female and senior taxpayer threshold is 425k', () => {
    const female = calculateEmployeeTax({ ...BASE, taxpayerCategory: 'female' })
    const senior = calculateEmployeeTax({ ...BASE, taxpayerCategory: 'senior' })
    expect(female.taxFreeThreshold).toBe(425000)
    expect(senior.taxFreeThreshold).toBe(425000)
  })

  it('disabled and thirdGender taxpayer threshold is 500k', () => {
    const disabled = calculateEmployeeTax({ ...BASE, taxpayerCategory: 'disabled' })
    const thirdGender = calculateEmployeeTax({ ...BASE, taxpayerCategory: 'thirdGender' })
    expect(disabled.taxFreeThreshold).toBe(500000)
    expect(thirdGender.taxFreeThreshold).toBe(500000)
  })

  it('freedomFighter and julyWarrior taxpayer threshold is 525k', () => {
    const ff = calculateEmployeeTax({ ...BASE, taxpayerCategory: 'freedomFighter' })
    const jw = calculateEmployeeTax({ ...BASE, taxpayerCategory: 'julyWarrior' })
    expect(ff.taxFreeThreshold).toBe(525000)
    expect(jw.taxFreeThreshold).toBe(525000)
  })

  // ─── Case 16: otherIncome excluded from salaryExemption ───────────────────
  it('otherIncome does NOT inflate salaryExemption — only employmentIncome counts', () => {
    // annualSalary=600k, exemption=min(600k/3,500k)=200k — otherIncome 120k is ignored
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 50000, otherIncome: 120000 })
    expect(r.salaryExemption).toBe(200000)
    expect(r.rebateEligibleIncome).toBe(520000)      // 720k regularIncome − 200k exemption
  })

  // ─── Case 18: Sanchayapatra credit visibly reduces final tax (no floor) ────
  it('sanchayapatra tax credit reduces finalTax below grossTax', () => {
    // monthlySalary=200k, sanchayapatra=1M → grossTax=521250, credit=150000
    // finalTax=521250−150000=371250, floor does not bind
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 200000, sanchayapatra: 1000000 })
    expect(r.sanchayapatraTaxCredit).toBe(150000)
    expect(r.finalTax).toBe(r.grossTax - r.sanchayapatraTaxCredit)
    expect(r.minimumTaxFloorIsBinding).toBe(false)
  })

  // ─── Case 19: Sanchayapatra credit cannot push finalTaxBeforeMinimumTax negative ─
  it('sanchayapatra credit is clamped — finalTaxBeforeMinimumTax never negative', () => {
    // sanchayapatra=500k only: grossTax=12500, credit=75000 → clamps to 0
    const r = calculateEmployeeTax({ ...BASE, sanchayapatra: 500000 })
    expect(r.finalTaxBeforeMinimumTax).toBe(0)
    expect(r.finalTaxBeforeMinimumTax).toBeGreaterThanOrEqual(0)
  })

  // ─── Case 20: Sanchayapatra warning contains project-rule wording ──────────
  it('sanchayapatra warning references project rule simplification', () => {
    const r = calculateEmployeeTax({ ...BASE, sanchayapatra: 100000 })
    const sanctWarn = r.warnings.find(w => /sanchayapatra/i.test(w))
    expect(sanctWarn).toBeDefined()
    expect(sanctWarn).toMatch(/project rule/i)
  })

  // ─── Case 21: totalTaxReduction = effectiveRebate + sanchayapatraTaxCredit ─
  it('totalTaxReduction is sum of rebate and sanchayapatra credit', () => {
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, investment: 300000, sanchayapatra: 2000000 })
    expect(r.totalTaxReduction).toBe(r.effectiveRebate + r.sanchayapatraTaxCredit)
    expect(r.sanchayapatraTaxCredit).toBe(300000)
  })

  // ─── Case 17: investmentSuggestion with partial existing investment ────────
  it('investmentSuggestion correctly subtracts existing investment', () => {
    // grossTax=9167, floor=5000, taxReductionCapacity=4167, maxUsefulRebate=4167
    // investmentNeeded = 4167/0.15 = 27780; already invested 10000 → suggest 17780
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 50000, yearlyBonus: 100000, investment: 10000 })
    expect(r.investmentSuggestion).toBe(17780)
  })
})
