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
  it('sanchayapatra only — no slab tax, finalTax=0, warning present', () => {
    const r = calculateEmployeeTax({ ...BASE, sanchayapatra: 500000 })
    expect(r.regularIncome).toBe(0)
    expect(r.finalTaxIncome).toBe(500000)
    expect(r.taxableIncome).toBe(0)
    expect(r.grossTax).toBe(0)
    expect(r.finalTax).toBe(0)
    expect(r.slabBreakdown).toHaveLength(0)
    expect(r.warnings.some(w => /sanchayapatra/i.test(w))).toBe(true)
  })

  // ─── Case 8: Salary + Sanchayapatra ───────────────────────────────────────
  it('salary + sanchayapatra — sanchayapatra absent from slab base', () => {
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, sanchayapatra: 2000000 })
    const slabTotal = r.slabBreakdown.reduce((s, x) => s + x.slabAmount, 0)
    expect(slabTotal).toBe(r.taxableIncome)          // sanchayapatra not in slabs
    expect(r.finalTaxIncome).toBe(2000000)
    expect(r.warnings.some(w => /sanchayapatra/i.test(w))).toBe(true)
  })

  // ─── Case 9: Rebate base excludes Sanchayapatra ───────────────────────────
  it('rebateEligibleIncome excludes sanchayapatra (640k not 2640k)', () => {
    // annualSalary=960k, exemption=320k, rebateEligibleIncome=640k
    const r = calculateEmployeeTax({ ...BASE, monthlySalary: 80000, investment: 300000, sanchayapatra: 2000000 })
    expect(r.rebateEligibleIncome).toBe(640000)
    // rebate = min(640k×3%, 300k×15%, 1M) = min(19200, 45000, 1M) = 19200
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
})
