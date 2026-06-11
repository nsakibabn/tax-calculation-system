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
  it('sanchayapatra only — NOT counted as income; 15% rebate applied; finalTax=0', () => {
    // sanchayapatra=500k is NOT income → regularIncome=0, grossIncome=0, taxableIncome=0
    // no slab tax, no minimum floor (taxableIncome=0), sanchayapatraRebate=75000, finalTax=0
    const r = calculateEmployeeTax({ ...BASE, sanchayapatra: 500000 })
    expect(r.regularIncome).toBe(0)
    expect(r.grossIncome).toBe(0)
    expect(r.taxableIncome).toBe(0)
    expect(r.grossTax).toBe(0)
    expect(r.finalTaxIncome).toBe(0)
    expect(r.sanchayapatraRebate).toBe(75000)
    expect(r.finalTaxBeforeMinimumTax).toBe(0)
    expect(r.minimumTaxFloorIsBinding).toBe(false)
    expect(r.finalTax).toBe(0)
    expect(r.monthlyTDS).toBe(0)
    expect(r.warnings.some(w => /sanchayapatra/i.test(w))).toBe(true)
  })

  // ─── Case 8: Salary + Sanchayapatra ───────────────────────────────────────
  it('salary + sanchayapatra — sanchayapatra excluded from regularIncome', () => {
    // annualSalary=960k, exemption=320k, sanchayapatra=2M NOT in income
    // regularIncome=960k, taxable=265k, grossTax=26500
    // sanchayapatraRebate=300000 >> grossTax → clamps to 0, minimum floor binds → finalTax=5000
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, sanchayapatra: 2000000 })
    expect(r.finalTaxIncome).toBe(0)
    expect(r.regularIncome).toBe(960000)
    expect(r.grossIncome).toBe(960000)
    expect(r.taxableIncome).toBe(265000)
    expect(r.grossTax).toBe(26500)
    expect(r.sanchayapatraRebate).toBe(300000)
    expect(r.minimumTaxFloorIsBinding).toBe(true)
    expect(r.finalTax).toBe(5000)
    expect(r.warnings.some(w => /sanchayapatra/i.test(w))).toBe(true)
  })

  // ─── Case 9: Rebate base excludes Sanchayapatra ───────────────────────────
  it('rebateEligibleIncome excludes sanchayapatra (640k not 2640k)', () => {
    // annualSalary=960k, exemption=320k → rebateEligibleIncome=640k (sanchayapatra not income)
    // rebate = min(640k×3%=19200, 300k×15%=45000, 1M) = 19200
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, investment: 300000, sanchayapatra: 2000000 })
    expect(r.rebateEligibleIncome).toBe(640000)
    expect(r.calculatedRebate).toBe(19200)
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

  // ─── Case 18: Sanchayapatra rebate visibly reduces final tax (no floor) ────
  it('sanchayapatra rebate reduces finalTax below grossTax', () => {
    // monthlySalary=200k, sanchayapatra=1M — sanchayapatra NOT in income
    // grossTax=271250 (salary-only), rebate=150000 → finalTax=121250
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 200000, sanchayapatra: 1000000 })
    expect(r.sanchayapatraRebate).toBe(150000)
    expect(r.finalTax).toBe(r.grossTax - r.sanchayapatraRebate)
    expect(r.minimumTaxFloorIsBinding).toBe(false)
  })

  // ─── Case 19: Sanchayapatra rebate cannot push finalTaxBeforeMinimumTax negative ─
  it('sanchayapatra rebate is clamped — finalTaxBeforeMinimumTax never negative', () => {
    // sanchayapatra=500k (NOT income): grossTax=0, rebate=75000 → max(0-75000,0)=0
    const r = calculateEmployeeTax({ ...BASE, sanchayapatra: 500000 })
    expect(r.finalTaxBeforeMinimumTax).toBe(0)
    expect(r.finalTaxBeforeMinimumTax).toBeGreaterThanOrEqual(0)
  })

  // ─── Case 20: Sanchayapatra warning says amount is not counted as income ────
  it('sanchayapatra warning says amount is not counted as income', () => {
    const r = calculateEmployeeTax({ ...BASE, sanchayapatra: 100000 })
    const sanctWarn = r.warnings.find(w => /sanchayapatra/i.test(w))
    expect(sanctWarn).toBeDefined()
    expect(sanctWarn).toMatch(/not counted as income/i)
  })

  // ─── Case 21: totalRebate = effectiveRebate + sanchayapatraRebate ───────────
  it('totalRebate is sum of effectiveRebate and sanchayapatraRebate', () => {
    // monthlySalary=80k, invest=300k, sanch=2M → effectiveRebate=19200, sanchayapatraRebate=300000
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, investment: 300000, sanchayapatra: 2000000 })
    expect(r.totalRebate).toBe(r.effectiveRebate + r.sanchayapatraRebate)
    expect(r.sanchayapatraRebate).toBe(300000)
  })

  // ─── Case 22: Sanchayapatra does not affect slab tax ──────────────────────
  it('sanchayapatra does not affect grossTax — same salary produces same grossTax', () => {
    const without = calculateEmployeeTax({ ...BASE, monthlySalary: 80000 })
    const withSanch = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, sanchayapatra: 2000000 })
    expect(withSanch.grossTax).toBe(without.grossTax)
    expect(withSanch.regularIncome).toBe(without.regularIncome)
    expect(withSanch.grossIncome).toBe(without.grossIncome)
    expect(withSanch.taxableIncome).toBe(without.taxableIncome)
  })

  // ─── Case 23: Old sanchayapatra warnings no longer present ────────────────
  it('sanchayapatra warnings do not mention old treatment (final settlement, source-tax)', () => {
    const r = calculateEmployeeTax({ ...BASE, sanchayapatra: 100000 })
    const warns = r.warnings.join(' ')
    expect(warns).not.toMatch(/final.?settlement/i)
    expect(warns).not.toMatch(/included.*regular.*income/i)
    expect(warns).not.toMatch(/source.?tax income.*shown separately/i)
  })

  // ─── Case 17: investmentSuggestion with partial existing investment ────────
  it('investmentSuggestion correctly subtracts existing investment', () => {
    // grossTax=9167, floor=5000, taxReductionCapacity=4167, maxUsefulRebate=4167
    // investmentNeeded = 4167/0.15 = 27780; already invested 10000 → suggest 17780
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 50000, yearlyBonus: 100000, investment: 10000 })
    expect(r.investmentSuggestion).toBe(17780)
  })
})
