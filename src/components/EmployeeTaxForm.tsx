import type { EmployeeTaxInput } from "../tax-engine/types";
import MoneyInput from "./MoneyInput";
import { TAXPAYER_CATEGORIES } from "../data/taxpayerCategories";
import { bdTaxRules2025_26 } from "../tax-engine/taxRules.bd-2025-26";
import { formatMoney } from "../utils/formatMoney";

interface EmployeeTaxFormProps {
  value: EmployeeTaxInput;
  onChange: (value: EmployeeTaxInput) => void;
  onReset: () => void;
}

export default function EmployeeTaxForm({
  value,
  onChange,
  onReset,
}: EmployeeTaxFormProps) {
  const update = (updates: Partial<EmployeeTaxInput>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800">Income Details</h2>
        <p className="text-xs text-gray-400 mt-0.5">Results update automatically</p>
      </div>

      {/* Step 1 — Salary */}
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Step 1 — Salary & Income
        </p>
        <MoneyInput
          label="Monthly Salary"
          name="monthlySalary"
          value={value.monthlySalary}
          onChange={(v) => update({ monthlySalary: v })}
          placeholder="50,000"
        />
        <MoneyInput
          label="Yearly Bonus"
          name="yearlyBonus"
          value={value.yearlyBonus}
          onChange={(v) => update({ yearlyBonus: v })}
          placeholder="0"
        />
        <MoneyInput
          label="Other Income (non-salary)"
          name="otherIncome"
          value={value.otherIncome}
          onChange={(v) => update({ otherIncome: v })}
          placeholder="0"
        />
      </div>

      {/* Step 2 — Investment */}
      <div className="px-6 py-5 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Step 2 — Investment & Savings
        </p>
        <MoneyInput
          label="Investment (eligible for §78 rebate)"
          name="investment"
          value={value.investment}
          onChange={(v) => update({ investment: v })}
          placeholder="0"
        />
        <MoneyInput
          label="Sanchayapatra"
          name="sanchayapatra"
          value={value.sanchayapatra}
          onChange={(v) => update({ sanchayapatra: v })}
          placeholder="0"
          helperText="Included with regular income; a 15% tax credit is applied (project rule — verify before production use)."
        />
      </div>

      {/* Step 3 — Taxpayer Info */}
      <div className="px-6 py-5 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Step 3 — Taxpayer Info
        </p>

        <div className="mb-4">
          <label
            htmlFor="taxpayerCategory"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Taxpayer Category
          </label>
          <select
            id="taxpayerCategory"
            value={value.taxpayerCategory}
            onChange={(e) =>
              update({
                taxpayerCategory: e.target.value as EmployeeTaxInput["taxpayerCategory"],
              })
            }
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {TAXPAYER_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-start gap-2.5">
          <input
            id="isNewTaxpayer"
            type="checkbox"
            checked={value.isNewTaxpayer ?? false}
            onChange={(e) => update({ isNewTaxpayer: e.target.checked })}
            className="mt-0.5 h-4 w-4 border-gray-300 rounded cursor-pointer accent-blue-600"
          />
          <label htmlFor="isNewTaxpayer" className="text-sm text-gray-700 cursor-pointer">
            New Taxpayer
            <span className="block text-xs text-gray-400 mt-0.5">
              Minimum tax {formatMoney(bdTaxRules2025_26.minimumTax.newTaxpayerAmount)} instead of {formatMoney(bdTaxRules2025_26.minimumTax.generalAmount)}
            </span>
          </label>
        </div>
      </div>

      <div className="px-6 pb-6 border-t border-gray-100 pt-4">
        <button
          onClick={onReset}
          className="w-full py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
        >
          Reset Inputs
        </button>
      </div>
    </div>
  );
}
