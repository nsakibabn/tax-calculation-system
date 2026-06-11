# Bangladesh Income Tax Calculator

A browser-based income tax calculator for **salaried/employed taxpayers** in Bangladesh.

Assessment Year: **AY 2026-2027** | Income Year: **2025-2026**

Tax rules sourced from: **Official NBR Income Tax Paripatra 2025-2026** (21 August 2025, `docs/nbr-income-tax-paripatra-2025-26.pdf`)

---

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS v4

---

## How to Run

```bash
npm install
npm run dev       # development server (localhost:5173)
npm run build     # production build
npm test          # run Vitest golden tests
npm run lint      # ESLint check
npm run verify    # build + lint + test in one command
npm run zip       # create clean source zip (no node_modules/dist/.git)
```

---

## Packaging & Distribution

**IMPORTANT — do not manually zip the project folder.** Manual zips include `node_modules` (≈120 MB), `dist`, `.git`, and nested zip files that break `npm run build` after extraction.

### Correct way to create a shareable zip

```bash
npm run zip
```

This runs `scripts/create-source-zip.mjs`, which calls `git archive` to produce a clean zip in the parent directory (`../income-tax-calculator-source.zip`). It automatically excludes `node_modules`, `dist`, `.git`, `.env`, and any `.zip` files.

> **Note:** Only committed files are included. Run `git add -A && git commit` before zipping if you have changes you want to share.

### After extracting a received zip

**Linux / macOS / Git Bash:**
```bash
rm -rf node_modules dist
npm install
npm run verify
```

**Windows CMD:**
```cmd
rmdir /s /q node_modules
rmdir /s /q dist
npm install
npm run verify
```

If `npm run build` fails with errors like `Cannot find module '../lib/tsc.js'`, the zip still contained `node_modules`. Delete it and reinstall: `rm -rf node_modules && npm install`.

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
  components/
    EmployeeTaxForm.tsx         — income input form
    EmployeeTaxResultView.tsx   — tax result display
    MoneyInput.tsx              — currency input field
    ResultRow.tsx               — result row with visual variants
  data/
    taxpayerCategories.ts       — category labels for the form
  utils/
    formatMoney.ts              — ৳ formatting utilities
  App.tsx                       — root component, wires form + result
docs/
  nbr-income-tax-paripatra-2025-26.pdf   — official source PDF
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
| Sanchayapatra income treatment | ⚠ Project rule — included with regular income, 15% credit applied (unverified) |

---

## Current Limitations

1. **Scope — salaried/employee income only.** Business income, house property income, capital gains, asset surcharge, and full return filing are not implemented yet.

2. **Sanchayapatra (সঞ্চয়পত্র).** Sanchayapatra profit is included with regular income and a 15% tax credit is applied (project rule). The official NBR treatment per Paripatra Example 12 is source-tax-as-final-settlement — this simplified approach should be verified against official NBR guidance before production use.

3. **Salary exemption — simplified.** Salary exemption is currently simplified because detailed salary components such as basic salary, house rent allowance (HRA), medical allowance, conveyance allowance, and other allowances are not collected separately.

4. **Monthly TDS — estimate only.** Monthly TDS is estimated as annual final tax divided by 12. Actual employer payroll deduction may differ based on employer policy, projected annual income, and income changes during the year.

5. **Investment rebate (§78) — pending final verification.** Investment rebate currently uses configured values for 3% of eligible income, 15% of eligible investment, and a ৳10,00,000 cap. These values should be finally verified against Income Tax Act §78 and official NBR guidance before production use.

6. **Disabled child parent/guardian threshold — simplified.** The `disabledChildParentGuardian` category is simplified. Correct calculation may require the taxpayer's primary category and the number of eligible disabled children, which are not collected yet.

---

## Build Status

| Step | Status |
|---|---|
| Step 1 — Tax engine (pure TypeScript) | ✅ Done |
| Step 2 — Verify rules against NBR Paripatra | ✅ Done |
| Step 3 — Input form UI (Tailwind) | ✅ Done |
| Step 3.1 — Core bug fix and stabilization | ✅ Done |
| Step 3.2 — Build / package cleanup | ✅ Done |
| Step 3.3 — Vitest golden tests + strict TypeScript | ✅ Done |
| Step 3.4 — UI wording / format polish | ✅ Done |
| Step 4 — Smart advice (investment guidance) | Pending |
| Step 5 — Report / PDF export | Pending |
| Step 6 — Business taxpayer engine | Pending |
