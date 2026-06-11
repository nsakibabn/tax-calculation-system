import type { ReactNode } from "react";
import type { EmployeeTaxResult } from "../tax-engine/types";
import { formatMoney, formatPercent } from "../utils/formatMoney";
import ResultRow from "./ResultRow";

interface EmployeeTaxResultViewProps {
  result: EmployeeTaxResult;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 bg-gray-50 border-b border-gray-100">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

export default function EmployeeTaxResultView({ result }: EmployeeTaxResultViewProps) {
  // Floor is binding when it actually controls (or equals) the final payable tax.
  const minimumTaxFloorIsBinding =
    result.minimumTaxApplied > 0 &&
    result.finalTaxBeforeMinimumTax <= result.minimumTaxApplied;

  function getInvestmentAdviceMessage(): string {
    if (result.grossTax <= 0) return "No tax to reduce";
    if (result.minimumTaxApplied > 0 && result.grossTax <= result.minimumTaxApplied)
      return "Tax is at the minimum floor — no rebate headroom";
    if (minimumTaxFloorIsBinding)
      return "Further rebate limited by minimum tax floor";
    if (result.investmentSuggestion > 0) return formatMoney(result.investmentSuggestion);
    return "Rebate opportunity already used";
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800">Tax Calculation Result</h2>
        <p className="text-xs text-gray-400 mt-0.5">AY 2026-2027 · Income Year 2025-2026</p>
      </div>

      {/* Final Tax Summary — always visible */}
      <div className="px-6 py-5 bg-gray-50 border-b border-gray-200 grid grid-cols-2 gap-4">
        <div className="text-center bg-white rounded-lg border border-gray-200 py-4 px-2">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
            {result.finalTaxIncome > 0 ? "Estimated Regular Income Tax" : "Estimated Annual Tax Payable"}
          </p>
          <p className="text-2xl font-bold text-gray-900">{formatMoney(result.finalTax)}</p>
        </div>
        <div className="text-center bg-white rounded-lg border border-blue-200 py-4 px-2">
          <p className="text-xs text-blue-500 mb-1 uppercase tracking-wide">Monthly TDS</p>
          <p className="text-2xl font-bold text-blue-700">{formatMoney(result.monthlyTDS)}</p>
        </div>
      </div>

      {/* Sanchayapatra notice — shown whenever final-source-tax income is present */}
      {result.finalTaxIncome > 0 && (
        <div className="mx-6 my-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 leading-relaxed">
            Sanchayapatra/source-tax income is shown separately. This calculator does not fully
            model final settlement/source-tax credit or adjustment for Sanchayapatra.
          </p>
        </div>
      )}

      {/* Scrollable detail sections */}
      <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>

        {/* 1. Income Summary */}
        <Section title="Income Summary">
          <ResultRow label="Monthly Salary × 12" value={formatMoney(result.annualSalary)} />
          {result.yearlyBonus > 0 && (
            <ResultRow label="Yearly Bonus" value={formatMoney(result.yearlyBonus)} />
          )}
          <ResultRow label="Employment Income" value={formatMoney(result.employmentIncome)} />
          {result.otherIncome > 0 && (
            <ResultRow label="Other Income" value={formatMoney(result.otherIncome)} />
          )}
          <ResultRow label="Regular Income (slab-taxable)" value={formatMoney(result.regularIncome)} />
          {result.sanchayapatra > 0 && (
            <ResultRow
              label="Sanchayapatra (final-settlement)"
              value={formatMoney(result.sanchayapatra)}
              muted
            />
          )}
          <ResultRow label="Gross Income" value={formatMoney(result.grossIncome)} />
        </Section>

        {/* 2. Taxable Income */}
        <Section title="Taxable Income">
          <ResultRow label="Salary Exemption" value={`− ${formatMoney(result.salaryExemption)}`} muted />
          <ResultRow label="Income After Exemption" value={formatMoney(result.rebateEligibleIncome)} />
          <ResultRow label="Tax-Free Threshold" value={`− ${formatMoney(result.taxFreeThreshold)}`} muted />
          <ResultRow label="Taxable Income" value={formatMoney(result.taxableIncome)} highlight />
        </Section>

        {/* 3. Tax Calculation */}
        <Section title="Tax Calculation">
          <ResultRow label="Gross Tax" value={formatMoney(result.grossTax)} />
          {result.rebate > 0 && (
            <ResultRow
              label="Investment Rebate (§78)"
              value={`− ${formatMoney(result.rebate)}`}
              muted
            />
          )}
          <ResultRow
            label="Tax Before Minimum"
            value={formatMoney(result.grossTax - result.rebate)}
          />
          {minimumTaxFloorIsBinding && (
            <ResultRow
              label="Minimum Tax Applied"
              value={formatMoney(result.minimumTaxApplied)}
              danger
            />
          )}
          <ResultRow label="Final Tax" value={formatMoney(result.finalTax)} highlight />
          <ResultRow label="Monthly TDS (estimate)" value={formatMoney(result.monthlyTDS)} highlight />
        </Section>

        {/* 4. Investment Advice */}
        <Section title="Investment Advice (§78)">
          <ResultRow label="Rebate Eligible Income" value={formatMoney(result.rebateEligibleIncome)} />
          {result.rebateEligibleIncome > 0 ? (
            <ResultRow
              label="Additional Investment Suggested"
              value={getInvestmentAdviceMessage()}
              highlight={result.investmentSuggestion > 0 && result.grossTax > 0}
            />
          ) : (
            <ResultRow
              label="Additional Investment Suggested"
              value="N/A — no taxable income"
              muted
            />
          )}
        </Section>

        {/* 5. Slab Breakdown */}
        <Section title="Slab Breakdown">
          {result.slabBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-4 text-center">
              No taxable slab applied.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Slab</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Amount</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Rate</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {result.slabBreakdown.map((slab, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-600 text-xs">{slab.label}</td>
                      <td className="py-2 px-3 text-right font-mono text-gray-800">
                        {formatMoney(slab.slabAmount)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600">
                        {formatPercent(slab.rate)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900">
                        {formatMoney(slab.tax)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-2 px-3 text-sm font-semibold text-gray-700">
                      Total
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                      {formatMoney(result.grossTax)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* 6. Warnings / Notices */}
        {result.warnings.length > 0 && (
          <div className="mx-3 my-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
              Notices ({result.warnings.length})
            </p>
            <ul className="space-y-1.5">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-800 flex gap-2">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Debug: Raw JSON */}
        <details className="mx-3 mb-4 mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 py-1 select-none">
            Debug: Raw JSON output
          </summary>
          <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto border border-gray-100 text-gray-500 leading-relaxed">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
