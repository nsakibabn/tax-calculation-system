# Bangladesh Income Tax Calculator

A browser-based income tax calculator for **salaried/employed taxpayers** in Bangladesh.

Assessment Year: **AY 2026-2027** | Income Year: **2025-2026**

Tax rules sourced from: **Official NBR Income Tax Paripatra 2025-2026** (21 August 2025, `docs/nbr-income-tax-paripatra-2025-26.pdf`)

---

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS (available, not yet applied in UI)

---

## How to Run

```bash
npm install
npm run dev       # development server (localhost:5173)
npm run build     # production build
npm run lint      # ESLint check
```

---

## Project Structure

```
src/
  tax-engine/
    types.ts                    — all TypeScript interfaces
    taxRules.bd-2025-26.ts      — ONLY file where tax numbers live
    helpers.ts                  — pure math utilities
    calculateEmployeeTax.ts     — main calculation function
    testCases.ts                — 18 console-based test cases
  App.tsx                       — dev preview screen
docs/
  nbr-income-tax-paripatra-2025-26.pdf   — official source PDF
Architectures/
  income-tax-calculator-architecture-package.zip
```

---

## Tax Year

| Field | Value |
|---|---|
| Assessment Year | AY 2026-2027 |
| Income Year | 2025-2026 |
| Source | NBR Paripatra 2025-2026, §1.1 (printed p.1-2) |

---

## Supported Taxpayer Categories

| Category | Tax-Free Threshold |
|---|---|
| General | ৳3,75,000 |
| Female | ৳4,25,000 |
| Senior (65+) | ৳4,25,000 |
| Disabled | ৳5,00,000 |
| Third-gender | ৳5,00,000 |
| Freedom fighter (gazetted) | ৳5,25,000 |
| July warrior (injured) | ৳5,25,000 |
| Disabled child parent/guardian | ৳4,25,000 *(simplified — see limitations)* |

---

## Verified Tax Rules

| Rule | Status |
|---|---|
| Thresholds (all categories) | ✅ Verified — Paripatra §1.1 p.1-2 |
| Progressive slabs (10/15/20/25/30%) | ✅ Verified — Paripatra §1.1 p.2 |
| Salary exemption min(⅓ income, 5,00,000) | ✅ Verified — Paripatra item 59.5 p.80 |
| Minimum tax ৳5,000 / ৳1,000 new taxpayer | ✅ Verified — Paripatra §1.1 p.2 |
| Investment rebate §78 (3% / 15% / 10L cap) | ⚠ Partially verified — constants in Act §78, not in Paripatra |
| Sanchayapatra income treatment | ⚠ Simplified — source tax final-settlement not fully modeled |

---

## Current Limitations

1. **Investment rebate (§78)** — rebate constants (3% / 15% / 10-lakh cap) come from Income Tax Act 2023 §78, not restated in this Paripatra. Flagged `verified: false` in config.

2. **Sanchayapatra** — added to gross income for display, but source tax is a final settlement (চূড়ান্ত করদায়). It is intentionally excluded from the slab tax base and from the §78 rebate base. The final-settlement source-tax credit is not yet modeled.

3. **Disabled child parent/guardian threshold** — should be taxpayer's primary category threshold + ৳50,000 per disabled child. Current model uses general + 50,000 = ৳4,25,000 (simplified). Requires primary category + child count inputs.

4. **Salary components** — exemption uses total employment income (salary + bonus). HRA, medical, conveyance allowances are not split separately.

5. **Monthly TDS** — estimated as annual tax ÷ 12. Actual payroll TDS may differ.

6. **Business taxpayers** — not supported. Salaried/employed only.

---

## Build Status

| Step | Status |
|---|---|
| Step 1 — Tax engine (pure TypeScript) | ✅ Done |
| Step 2 — Verify rules against NBR Paripatra | ✅ Done |
| Step 3 — Input form UI (Tailwind) | Pending |
| Step 4 — Report / PDF export | Pending |
| Step 5 — Business taxpayer engine | Pending |
