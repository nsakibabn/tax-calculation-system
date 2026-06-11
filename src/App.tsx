import { useState, useMemo } from "react";
import type { EmployeeTaxInput } from "./tax-engine/types";
import { calculateEmployeeTax } from "./tax-engine/calculateEmployeeTax";
import { bdTaxRules2025_26 } from "./tax-engine/taxRules.bd-2025-26";
import EmployeeTaxForm from "./components/EmployeeTaxForm";
import EmployeeTaxResultView from "./components/EmployeeTaxResultView";

const DEFAULT_INPUT: EmployeeTaxInput = {
  monthlySalary: 50000,
  yearlyBonus: 100000,
  otherIncome: 0,
  investment: 100000,
  sanchayapatra: 0,
  taxpayerCategory: "general",
  isNewTaxpayer: false,
};

export default function App() {
  const [input, setInput] = useState<EmployeeTaxInput>(DEFAULT_INPUT);
  const result = useMemo(() => calculateEmployeeTax(input), [input]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bangladesh Employee Income Tax Calculator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Development preview · FY&nbsp;{bdTaxRules2025_26.incomeYear}&nbsp;/&nbsp;AY&nbsp;{bdTaxRules2025_26.assessmentYear}
          </p>
        </header>

        {/* Two-column layout — stacks on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <EmployeeTaxForm
            value={input}
            onChange={setInput}
            onReset={() => setInput(DEFAULT_INPUT)}
          />
          <EmployeeTaxResultView result={result} />
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400">
          Core slab and threshold rules are based on NBR Income Tax Paripatra 2025-2026 · AY 2026-2027 · Some items are simplified — development preview
        </footer>
      </div>
    </div>
  );
}
