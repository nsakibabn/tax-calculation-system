import { calculateEmployeeTax } from "./tax-engine/calculateEmployeeTax";
import { employeeTaxTestCases } from "./tax-engine/testCases";
import { bdTaxRules2025_26 } from "./tax-engine/taxRules.bd-2025-26";

const sampleInput = {
  monthlySalary: 50000,
  yearlyBonus: 100000,
  otherIncome: 0,
  investment: 150000,
  sanchayapatra: 50000,
  taxpayerCategory: "general" as const,
};

const result = calculateEmployeeTax(sampleInput);

function App() {
  return (
    <main style={{ fontFamily: "monospace", padding: "2rem", maxWidth: "900px" }}>
      <h1>Bangladesh Income Tax Calculator — Dev Preview</h1>
      <p style={{ color: "#888" }}>
        Phase 1 · Tax Engine Only · {bdTaxRules2025_26.taxYearLabel}
      </p>

      <div
        style={{
          background: "#e7f5e9",
          border: "1px solid #74c084",
          color: "#1e4620",
          padding: "1rem",
          borderRadius: "4px",
          margin: "1rem 0",
        }}
      >
        <strong>Rule verification status (vs official NBR Paripatra 2025-26)</strong>
        <ul style={{ margin: "0.5rem 0 0" }}>
          <li>Thresholds: {bdTaxRules2025_26.thresholdsVerified ? "✅ verified" : "⚠ unverified"}</li>
          <li>Slabs: {bdTaxRules2025_26.slabsVerified ? "✅ verified" : "⚠ unverified"}</li>
          <li>Salary exemption: {bdTaxRules2025_26.salaryExemption.verified ? "✅ verified" : "⚠ unverified"}</li>
          <li>Minimum tax: {bdTaxRules2025_26.minimumTax.verified ? "✅ verified" : "⚠ unverified"}</li>
          <li>Investment rebate: {bdTaxRules2025_26.investmentRebate.verified ? "✅ verified" : "⚠ constants need Act §78 check"}</li>
        </ul>
      </div>

      <h2>Sample Input</h2>
      <pre style={{ background: "#f4f4f4", padding: "1rem", borderRadius: "4px" }}>
        {JSON.stringify(sampleInput, null, 2)}
      </pre>

      <h2>Income Breakdown</h2>
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "1rem" }}>
        <tbody>
          {([
            ["Employment income (salary + bonus)", result.employmentIncome],
            ["Other income", result.otherIncome],
            ["Regular income (slab-taxable)", result.regularIncome],
            ["Final-tax income (sanchayapatra)", result.finalTaxIncome],
            ["Gross income", result.grossIncome],
            ["Salary exemption", result.salaryExemption],
            ["Rebate eligible income (§78 base)", result.rebateEligibleIncome],
            ["Tax-free threshold", result.taxFreeThreshold],
            ["Taxable income (above threshold)", result.taxableIncome],
          ] as [string, number][]).map(([label, value]) => (
            <tr key={label} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "0.3rem 0.5rem", color: "#555" }}>{label}</td>
              <td style={{ padding: "0.3rem 0.5rem", textAlign: "right", fontWeight: "bold" }}>
                ৳{value.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Calculation Result</h2>
      <pre style={{ background: "#f4f4f4", padding: "1rem", borderRadius: "4px" }}>
        {JSON.stringify(result, null, 2)}
      </pre>

      <h2>Warnings ({result.warnings.length})</h2>
      <ul style={{ color: "#8a6d00" }}>
        {result.warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>

      <h2>All Test Cases</h2>
      {employeeTaxTestCases.map((tc, i) => {
        const tcResult = calculateEmployeeTax(tc.input);
        return (
          <details key={i} style={{ marginBottom: "1rem" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold", padding: "0.5rem 0" }}>
              [{i + 1}] {tc.name}
            </summary>
            <p style={{ color: "#555", marginTop: "0.5rem" }}>{tc.expectedBehavior}</p>
            <pre style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "4px" }}>
              {JSON.stringify(tcResult, null, 2)}
            </pre>
          </details>
        );
      })}

      <hr />
      <p style={{ color: "#aaa", fontSize: "0.8rem" }}>
        Temporary developer screen — final UI will be built in Phase 2.
      </p>
    </main>
  );
}

export default App;
