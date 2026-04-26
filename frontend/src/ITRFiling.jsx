/**
 * ITRFiling.jsx — WealthWise v5
 * Personalized ITR filing guide based on planner income sources.
 * FY 2026-27 / AY 2027-28
 *
 * Features:
 *  • Auto-determines correct ITR form from planner income data
 *  • Dynamic document checklist (only shows what's relevant to user)
 *  • Step-by-step portal guide (incometax.gov.in)
 *  • Deadlines & penalty calculator
 *  • Schedule mapper — shows exactly which schedule to fill for each income
 *  • AI filing assistant (backend-proxied, personalized to income profile)
 */

import React, { useState, useMemo } from 'react';
import { aiTaxAdvisor } from './api.js';
import { fmtINR } from './taxEngine.js';

// ─── FORM DATA ────────────────────────────────────────────────────────────────

const ITR_FORMS = {
  'ITR-1': {
    name: 'ITR-1 (Sahaj)',
    color: '#1DB873',
    complexity: 'Simple',
    for: [
      'Resident individual (not NRI)',
      'Salary or pension income',
      'One house property',
      'Other sources: FD interest, savings interest, dividends',
      'Agricultural income ≤ ₹5,000',
      'Total income ≤ ₹50 lakhs',
    ],
    notFor: [
      'Any capital gains (LTCG / STCG)',
      'Business or profession income',
      'F&O trading',
      'Crypto / VDA income',
      'Foreign income or foreign assets',
      'Company directors',
      'Total income above ₹50L',
    ],
    schedules: [
      { name: 'Schedule S', desc: 'Salary income from Form 16' },
      { name: 'Schedule HP', desc: 'One house property income / loss' },
      { name: 'Schedule OS', desc: 'FD interest, savings interest, dividends' },
      { name: 'Schedule VI-A', desc: '80C, 80D, 80CCD(1B) deductions' },
    ],
    filingMode: 'Online on portal — no offline utility needed',
    auditRequired: false,
    portal: 'incometax.gov.in → e-File → File ITR → ITR-1 → Online',
  },
  'ITR-2': {
    name: 'ITR-2',
    color: '#4A9EE8',
    complexity: 'Moderate',
    for: [
      'Individuals/HUF NOT having business income',
      'Capital gains — LTCG/STCG (equity, MF, property, gold)',
      'Crypto / VDA income (Schedule VDA)',
      'Multiple house properties',
      'Foreign income or foreign assets',
      'Company directors',
      'Total income above ₹50L',
    ],
    notFor: [
      'Business or profession income (any)',
      'F&O trading — treated as speculative business → ITR-3',
      'Presumptive income under Sec 44AD/44ADA',
    ],
    schedules: [
      { name: 'Schedule S', desc: 'Salary income' },
      { name: 'Schedule HP', desc: 'House property income / loss' },
      { name: 'Schedule CG', desc: 'Capital gains — LTCG (A1, A2, B) and STCG (A, B)' },
      { name: 'Schedule OS', desc: 'Other sources: FD, dividends, winnings' },
      { name: 'Schedule VDA', desc: 'Virtual Digital Assets (crypto) — each transaction' },
      { name: 'Schedule VI-A', desc: 'Deductions under Chapter VI-A' },
      { name: 'Schedule 112A', desc: 'LTCG equity grandfathering (pre-Jan 31, 2018 holdings)' },
    ],
    filingMode: 'Online on portal or offline utility (JSON upload)',
    auditRequired: false,
    portal: 'incometax.gov.in → e-File → File ITR → ITR-2 → Online / Upload JSON',
  },
  'ITR-3': {
    name: 'ITR-3',
    color: '#E8921A',
    complexity: 'Complex',
    for: [
      'Individuals/HUF having business or profession income',
      'F&O traders (F&O is treated as business income)',
      'Freelancers not opting for presumptive taxation',
      'Also covers salary + capital gains alongside business income',
    ],
    notFor: [
      'Those choosing presumptive taxation → ITR-4 instead',
    ],
    schedules: [
      { name: 'Schedule S', desc: 'Salary income (if any)' },
      { name: 'Schedule BP', desc: 'Business/profession income — P&L summary' },
      { name: 'Schedule CG', desc: 'Capital gains (if any)' },
      { name: 'Schedule HP', desc: 'House property income (if any)' },
      { name: 'Schedule OS', desc: 'Other income' },
      { name: 'Schedule VDA', desc: 'Crypto (if any)' },
      { name: 'Schedule VI-A', desc: 'Deductions' },
      { name: 'P&L + Balance Sheet', desc: 'Full financial statements for the business' },
    ],
    filingMode: 'Offline utility (recommended) — download from portal → upload JSON',
    auditRequired: 'If gross receipts > ₹1Cr (or ₹10Cr for 95%+ digital transactions) — Sec 44AB tax audit by Sep 30',
    portal: 'incometax.gov.in → e-File → File ITR → ITR-3 → Offline Utility',
  },
  'ITR-4': {
    name: 'ITR-4 (Sugam)',
    color: '#9B72CF',
    complexity: 'Simple',
    for: [
      'Presumptive business income — Sec 44AD (turnover ≤ ₹2Cr)',
      'Presumptive professional income — Sec 44ADA (receipts ≤ ₹50L) — doctors, CAs, lawyers',
      'Transport contractors — Sec 44AE',
      'Total income ≤ ₹50 lakhs',
    ],
    notFor: [
      'Capital gains (any) → ITR-2 or ITR-3',
      'Foreign assets',
      'Company directors',
      'Non-presumptive business income',
    ],
    schedules: [
      { name: 'Schedule S', desc: 'Salary (if any)' },
      { name: 'Schedule BP (simplified)', desc: 'Presumptive income — just declare 8% / 6% / 50% of turnover' },
      { name: 'Schedule OS', desc: 'Other sources' },
      { name: 'Schedule VI-A', desc: 'Deductions' },
    ],
    filingMode: 'Online on portal — simplest filing',
    auditRequired: false,
    portal: 'incometax.gov.in → e-File → File ITR → ITR-4 → Online',
  },
};

// ─── SCHEDULE MAPPER ──────────────────────────────────────────────────────────

const SCHEDULE_MAP = {
  salary:           { schedule: 'Schedule S',   note: 'Enter from Form 16 Part B. Verify TDS in Form 26AS.' },
  business:         { schedule: 'Schedule BP',  note: 'P&L figures. If 44AD/44ADA, just declare deemed income.' },
  freelance:        { schedule: 'Schedule BP',  note: '44ADA: declare 50% of gross receipts as income (if receipts ≤ ₹50L).' },
  fno:              { schedule: 'Schedule BP',  note: 'F&O is business income — NOT capital gains. Report net P&L after expenses.' },
  rental:           { schedule: 'Schedule HP',  note: 'Gross rent → minus 30% std deduction → minus loan interest (Sec 24b).' },
  fd_interest:      { schedule: 'Schedule OS',  note: 'Full FD interest is taxable. Cross-check with Form 16A from bank.' },
  savings_int:      { schedule: 'Schedule OS',  note: 'Report full amount. Claim 80TTA (₹10K) / 80TTB (₹50K senior) in deductions.' },
  dividends:        { schedule: 'Schedule OS',  note: 'Full dividend taxable. Check Form 26AS for TDS @10% above ₹5K per company.' },
  ltcg_equity:      { schedule: 'Schedule CG (Part A1/A2)', note: 'LTCG above ₹1.25L taxed @10%. Use broker capital gain statement. Check 112A grandfathering.' },
  stcg_equity:      { schedule: 'Schedule CG (Part A)',     note: 'STCG taxed @15% flat. No exemption. From broker P&L report.' },
  ltcg_property:    { schedule: 'Schedule CG (Part B)',     note: 'LTCG @20% with indexation (pre-Jul 23, 2024). Apply Section 54/54F/54EC if reinvesting.' },
  ltcg_property_new:{ schedule: 'Schedule CG (Part B)',     note: 'LTCG @12.5% without indexation (post-Jul 23, 2024 Budget rule).' },
  agricultural:     { schedule: 'Part B-TI (General)',      note: 'Exempt income. Still declare in "Exempt Income" schedule. Used for rate computation.' },
  crypto:           { schedule: 'Schedule VDA',             note: 'Report every transaction separately. 30% flat + 1% TDS. No loss offset allowed.' },
  other:            { schedule: 'Schedule OS',              note: 'Pension, gifts (>₹50K), winnings — all taxable at slab rate.' },
};

// ─── ITR FORM DETERMINATION ───────────────────────────────────────────────────

function determineITRForm(incomes = {}, entityType = 'individual') {
  const has = (k) => (incomes[k] || 0) > 0;
  const totalIncome = Object.values(incomes).reduce((s, v) => s + (v || 0), 0);

  const hasBusiness  = has('business') || has('fno');
  const hasFreelance = has('freelance');
  const hasCapGains  = has('ltcg_equity') || has('stcg_equity') || has('ltcg_property') || has('ltcg_property_new');
  const hasCrypto    = has('crypto');
  const reasons = [];

  if (has('fno')) {
    reasons.push('F&O income is business income in India — ITR-3 is mandatory');
    return { form: 'ITR-3', reasons, alternateForm: null };
  }

  if (has('business')) {
    reasons.push('Business income reported → ITR-3 required');
    return { form: 'ITR-3', reasons, alternateForm: null };
  }

  if (hasFreelance && !hasCapGains && !hasCrypto && totalIncome <= 5_000_000) {
    reasons.push('Freelance income detected → ITR-3 required (or ITR-4 if opting for Sec 44ADA presumptive)');
    return { form: 'ITR-3', reasons, alternateForm: 'ITR-4' };
  }

  if (hasFreelance) {
    reasons.push('Freelance income with capital gains → ITR-3 required');
    return { form: 'ITR-3', reasons, alternateForm: null };
  }

  if (hasCrypto) reasons.push('Crypto/VDA income → Schedule VDA in ITR-2');
  if (hasCapGains) reasons.push('Capital gains (LTCG/STCG) → Schedule CG in ITR-2');
  if (entityType === 'huf') reasons.push('HUF entity without business income → ITR-2');
  if (totalIncome > 5_000_000) reasons.push('Total income > ₹50L → cannot use ITR-1, ITR-2 required');

  if (hasCapGains || hasCrypto || entityType === 'huf' || totalIncome > 5_000_000) {
    if (!reasons.length) reasons.push('Multiple/complex income sources → ITR-2');
    return { form: 'ITR-2', reasons };
  }

  reasons.push('Salary + simple sources only, income ≤ ₹50L → ITR-1 (simplest option)');
  return { form: 'ITR-1', reasons };
}

// ─── DOCUMENT BUILDER ────────────────────────────────────────────────────────

function buildDocumentList(incomes = {}, entityType = 'individual') {
  const has = (k) => (incomes[k] || 0) > 0;

  const groups = [
    {
      category: 'Always Required',
      color: '#E8921A',
      items: [
        { name: 'PAN Card', desc: 'Permanent Account Number — your filing identifier' },
        { name: 'Aadhaar Card', desc: 'Must be linked with PAN. Used for e-verification.' },
        { name: 'Form 26AS', desc: 'Tax credit statement. Download: IT portal → Services → Form 26AS. Cross-check every TDS entry.' },
        { name: 'AIS (Annual Information Statement)', desc: 'Download: IT portal → AIS. Contains ALL income reported to the department — salary, dividends, cap gains, FD interest, crypto.' },
        { name: 'Bank Account (pre-validated)', desc: 'For refund credit. Validate at: IT portal → My Profile → Bank Account.' },
        { name: 'Previous Year ITR', desc: 'For reference — carry-forward losses, last year regime choice.' },
      ],
    },
  ];

  if (has('salary')) {
    groups.push({
      category: 'Salary Income',
      color: '#4A9EE8',
      items: [
        { name: 'Form 16 (Part A + B)', desc: 'Issued by employer by June 15. Part A = TDS summary. Part B = salary breakup, HRA, perquisites, deductions claimed.' },
        { name: 'Salary Slips (Apr–Mar)', desc: 'Useful if Form 16 is delayed, or if you changed jobs mid-year.' },
        { name: 'Form 12BA', desc: 'Required if perquisites (ESOP, company car, club membership) are part of salary.' },
        { name: 'HRA Rent Receipts', desc: 'If claiming HRA exemption — rent receipts + landlord PAN (if annual rent > ₹1L).' },
      ],
    });
  }

  if (has('rental')) {
    groups.push({
      category: 'Rental Income',
      color: '#9B72CF',
      items: [
        { name: 'Rent Agreement', desc: 'Registered rent agreement for each let-out property.' },
        { name: 'Rent Receipts / Bank Transfers', desc: 'Proof of monthly rent received from tenant.' },
        { name: 'Municipal Tax Receipts', desc: 'Paid municipal tax is deductible in full before 30% standard deduction.' },
        { name: 'Home Loan Interest Certificate', desc: 'From lender (bank/HFC) for the full FY. Deductible under Sec 24(b).' },
      ],
    });
  }

  if (has('fd_interest') || has('savings_int')) {
    groups.push({
      category: 'Interest Income',
      color: '#60a5fa',
      items: [
        { name: 'Bank Statements (all accounts)', desc: 'Shows interest credited on savings accounts and FDs. Include all banks.' },
        { name: 'Form 16A (TDS Certificate)', desc: 'Issued by bank for TDS on FD interest. Download from TRACES or bank portal.' },
        { name: 'Post Office Passbook / Statement', desc: 'For NSC, Post Office FD, RD, MIS interest.' },
        { name: 'Interest Certificates', desc: 'Some banks issue separate annual interest certificates — useful for multi-year FDs.' },
      ],
    });
  }

  if (has('dividends')) {
    groups.push({
      category: 'Dividend Income',
      color: '#FFB84D',
      items: [
        { name: 'Dividend Statement (from broker / registrar)', desc: 'Shows company-wise dividends received in FY 2026-27.' },
        { name: 'Form 26AS verification', desc: 'TDS @10% deducted if dividend > ₹5,000 per company — cross-check against 26AS.' },
      ],
    });
  }

  if (has('ltcg_equity') || has('stcg_equity')) {
    groups.push({
      category: 'Capital Gains — Equity & Mutual Funds',
      color: '#1DB873',
      items: [
        { name: 'Capital Gain Statement (Broker)', desc: 'Download from Zerodha/Groww/Upstox — full FY P&L report with scrip-wise breakup.' },
        { name: 'Consolidated Account Statement (CAS)', desc: 'From CAMS/KFintech — shows all MF transactions and capital gain summary.' },
        { name: 'AMC-specific Cap Gain Statements', desc: 'For SIPs in multiple AMCs — each fund-wise LTCG/STCG computation.' },
        { name: 'Grandfathering Price (pre-Jan 31, 2018)', desc: 'For equity purchased before Jan 31, 2018 — cost as on that date is the indexed cost. Schedule 112A.' },
      ],
    });
  }

  if (has('ltcg_property') || has('ltcg_property_new')) {
    groups.push({
      category: 'Capital Gains — Property / Gold',
      color: '#fb923c',
      items: [
        { name: 'Sale Deed (Registered)', desc: 'Registered sale deed of property sold in FY 2026-27.' },
        { name: 'Original Purchase Deed', desc: 'For computing cost of acquisition — date of purchase matters for indexation.' },
        { name: 'Property Improvement Bills', desc: 'Receipts for any construction/renovation — added to cost of acquisition.' },
        { name: 'Cost Inflation Index (CII) Table', desc: 'For pre-Jul 23, 2024 property — CII for purchase year and sale year (FY 2026-27).' },
        { name: 'Section 54 / 54F Reinvestment Proof', desc: 'If claiming exemption — new property agreement/purchase deed, or CGAS deposit receipt.' },
        { name: '54EC Bond Purchase Receipt', desc: 'NHAI/REC bond purchase within 6 months of sale — up to ₹50L exempt.' },
      ],
    });
  }

  if (has('business') || has('freelance') || has('fno')) {
    groups.push({
      category: 'Business / Freelance / F&O',
      color: '#E8921A',
      items: [
        { name: 'Profit & Loss Statement', desc: 'Full FY P&L — April 2026 to March 2027. All income and business expenses.' },
        { name: 'Balance Sheet', desc: 'Required for ITR-3. Assets, liabilities as on March 31, 2027.' },
        { name: 'GST Returns (if registered)', desc: 'GSTR-1 and GSTR-3B — turnover must reconcile with ITR income.' },
        { name: 'F&O Trading Statement', desc: 'From broker — realized net P&L from futures & options. Treat as business income.' },
        { name: 'Business Bank Statements', desc: 'All transactions through business accounts for the full FY.' },
        { name: 'Tax Audit Report (if applicable)', desc: 'Sec 44AB: required if gross receipts > ₹1Cr (or ₹10Cr for 95%+ digital). Due Sep 30.' },
        { name: 'TDS Certificates (Form 16A)', desc: 'If clients deducted TDS on payments. Verify against Form 26AS.' },
      ],
    });
  }

  if (has('crypto')) {
    groups.push({
      category: 'Crypto / VDA',
      color: '#E84040',
      items: [
        { name: 'Exchange Trade History (full FY)', desc: 'From CoinDCX, WazirX, Binance, CoinSwitch — complete transaction log Apr 2026 to Mar 2027.' },
        { name: 'P&L / Capital Gain Report', desc: 'Gain/loss per trade. Remember: 30% flat tax, no netting of losses between trades.' },
        { name: 'Form 26AS for TDS (Section 194S)', desc: '1% TDS deducted on every sell > ₹10K. Verify it appears in 26AS.' },
        { name: 'Wallet Transaction History', desc: 'For P2P, on-chain transfers, staking rewards, airdrops — all taxable as VDA.' },
        { name: 'Cost Basis Records', desc: 'Purchase price per token for each lot sold — needed to compute gain/loss.' },
      ],
    });
  }

  if (has('agricultural')) {
    groups.push({
      category: 'Agricultural Income',
      color: '#6ee7b7',
      items: [
        { name: 'Land Records / Khasra', desc: 'Proof that income is from agricultural land.' },
        { name: 'Sale Receipts / Mandi Bills', desc: 'Evidence of crop sales and agricultural income received.' },
        { name: 'Note', desc: 'Agricultural income is exempt from central tax but must be declared. It is used for rate computation if total income exceeds basic exemption.' },
      ],
    });
  }

  return groups;
}

// ─── FILING STEPS ─────────────────────────────────────────────────────────────

const FILING_STEPS = [
  {
    num: 1, title: 'Pre-Filing Verification', icon: '🔍', color: '#4A9EE8',
    actions: [
      'Download Form 26AS: IT portal → Services → Form 26AS → View/Download',
      'Download AIS: IT portal → Annual Information Statement → Compare with your records',
      'Flag any mismatch between AIS/26AS and your actual income — you can submit feedback on AIS',
      'Reconcile TDS credits in 26AS with your Form 16/16A',
      'Ensure Aadhaar is linked with PAN: IT portal → My Profile → Link Aadhaar',
      'Pre-validate refund bank account: My Profile → Bank Account → Pre-validate',
    ],
  },
  {
    num: 2, title: 'Login to IT Portal', icon: '🔐', color: '#9B72CF',
    actions: [
      'Go to incometax.gov.in → Login → Enter PAN + Password',
      'New user? Register with PAN, valid mobile, Aadhaar — OTP verification required',
      'Forgot password? Reset via Aadhaar OTP or bank account (EVC)',
      'Dashboard shows your pending actions — check for any notices first',
    ],
  },
  {
    num: 3, title: 'Start Filing', icon: '📝', color: '#E8921A',
    actions: [
      'Dashboard → e-File → Income Tax Returns → File Income Tax Return',
      'Assessment Year: 2027-28 (for income earned in FY 2026-27)',
      'Filing Status: Original (first time for this AY) or Revised (correcting a filed return)',
      'Select ITR form (see recommendation above)',
      'Mode: Online (for ITR-1/4) OR Upload JSON (for ITR-2/3 via offline utility)',
      'For offline mode: download the utility from portal → fill → generate JSON → upload',
    ],
  },
  {
    num: 4, title: 'Personal Info & Regime', icon: '👤', color: '#1DB873',
    actions: [
      'Verify auto-filled personal details: name, DOB, PAN, Aadhaar, address',
      'Filing Type: Select New Regime or Old Regime carefully — THIS IS LOCKED after submission',
      'For salaried employees: employer\'s regime choice can differ from your ITR regime',
      'Select primary bank account for refund (from pre-validated accounts)',
      'Verify email + mobile for communication from the department',
    ],
  },
  {
    num: 5, title: 'Fill Income Schedules', icon: '💰', color: '#FFB84D',
    actions: [
      'Schedule S: Salary — enter from Form 16. Split into exempt allowances (HRA, LTA) and taxable. TDS should match 26AS.',
      'Schedule HP: Rental income → subtract 30% std deduction → subtract home loan interest (Sec 24b, max ₹2L).',
      'Schedule CG: Capital gains — separate LTCG (>1yr equity: 10%) and STCG (15%). Property LTCG separately.',
      'Schedule OS: FD interest, savings interest, dividends, any other income.',
      'Schedule VDA: Each crypto transaction separately — date, buy price, sell price, gain/loss.',
      'Schedule BP: Business/F&O — net P&L from trading or business operations.',
      'IMPORTANT: Numbers here must reconcile with AIS/26AS. Mismatch → notice.',
    ],
  },
  {
    num: 6, title: 'Claim Deductions', icon: '📊', color: '#a78bfa',
    actions: [
      'Schedule VI-A (Old Regime only):',
      '  80C: ELSS, PPF, EPF, LIC, home loan principal — max ₹1.5L combined',
      '  80CCD(1B): NPS additional — ₹50K over and above 80C limit',
      '  80D: Health insurance — self (₹25K) + parents (₹25K/₹50K seniors)',
      '  80E: Education loan interest — full amount, no cap',
      '  80TTA/TTB: Savings interest exemption (₹10K / ₹50K senior)',
      'Sec 24(b): Home loan interest — shown in Schedule HP, not VI-A (max ₹2L self-occupied)',
      'New Regime: Only std deduction (₹75K) + employer NPS (80CCD(2)) available',
    ],
  },
  {
    num: 7, title: 'Tax Computation & Payment', icon: '🧾', color: '#fb923c',
    actions: [
      'Review auto-computed tax — verify it matches your own calculation',
      'Check TDS credit: all Form 26AS TDS entries should reflect (sometimes manual entry needed)',
      'Advance tax paid (Challan 280)? Enter BSR code + challan serial number',
      'Self-assessment tax remaining? Pay via Challan 280 online at tin-nsdl.com BEFORE filing',
      'Enter self-assessment challan details in the ITR',
      'Interest u/s 234A (late filing), 234B (advance tax shortfall), 234C (installment) auto-computed',
    ],
  },
  {
    num: 8, title: 'Preview, Submit & E-Verify', icon: '✅', color: '#1DB873',
    actions: [
      'Preview complete return — review all schedules, tax computation, refund/payable amount',
      'Click Validate → fix all errors flagged',
      'Submit the return',
      'E-verify immediately (mandatory within 30 days):',
      '  Option A: Aadhaar OTP → instant (recommended)',
      '  Option B: Net banking EVC → instant',
      '  Option C: Demat account EVC',
      '  Option D: DSC (Digital Signature Certificate) → for businesses',
      '  Option E: Physical — print ITR-V, sign, send to CPC Bengaluru (not recommended)',
      'After e-verification: ITR-V acknowledgment sent to registered email. Filing complete!',
    ],
  },
];

// ─── DEADLINES ────────────────────────────────────────────────────────────────

const DEADLINES = [
  { date: 'July 31, 2026',     label: 'Individuals (non-audit)',     color: '#E84040', urgent: true,  note: 'Salaried, capital gains, rental, crypto, HUF — if no tax audit required' },
  { date: 'Sep 30, 2026',      label: 'Tax Audit Cases',            color: '#E8921A', urgent: false, note: 'Business/profession with turnover > ₹1Cr (or ₹10Cr digital). Audit + ITR both by this date.' },
  { date: 'Oct 31, 2026',      label: 'Transfer Pricing Cases',     color: '#4A9EE8', urgent: false, note: 'Businesses with international transactions — Sec 92E report required' },
  { date: 'Dec 31, 2026',      label: 'Belated Return',             color: '#9B72CF', urgent: false, note: 'Last chance to file if July 31 missed. Late fee: ₹5,000 (₹1,000 if income ≤ ₹5L). Cannot carry forward losses.' },
  { date: 'March 31, 2027',    label: 'Revised / Updated Return',   color: '#60a5fa', urgent: false, note: 'Revised return (if mistake in original) or ITR-U (updated return to add missed income)' },
];

const ADVANCE_TAX = [
  { date: 'June 15, 2026',   pct: '15%', desc: '15% of total estimated tax for the year' },
  { date: 'Sep 15, 2026',    pct: '45%', desc: '45% cumulative (i.e., another 30% installment)' },
  { date: 'Dec 15, 2026',    pct: '75%', desc: '75% cumulative (another 30%)' },
  { date: 'Mar 15, 2027',    pct: '100%', desc: 'Final 25% — pay balance by March 15' },
];

const PENALTIES = [
  { scenario: 'Filed on time (by Jul 31, 2026)', penalty: '₹0', color: '#1DB873', note: 'No late fee if filed on or before due date' },
  { scenario: 'Filed Aug 1 – Dec 31, 2026',      penalty: '₹5,000', color: '#E8921A', note: 'Sec 234F late fee. Reduced to ₹1,000 if total income ≤ ₹5L.' },
  { scenario: 'Belated after Dec 31',            penalty: 'Not possible', color: '#E84040', note: 'Dec 31 is the final belated filing deadline. After that, only ITR-U (updated) available with 25-50% extra tax.' },
  { scenario: 'Not e-verified within 30 days',   penalty: 'Return invalid', color: '#E84040', note: 'Treated as never filed. Must re-submit or send physical ITR-V.' },
];

const QUICK_QS = [
  'Which ITR form for F&O losses + salary?',
  'How to report crypto bought on WazirX?',
  'Can I change tax regime after filing?',
  'What is e-verification and how to do it?',
  'How to carry forward capital loss to next year?',
  'What if AIS shows income I didn\'t receive?',
  'Is advance tax needed for capital gains?',
  'How to file a revised return?',
];

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  wrap:       { maxWidth: 800, margin: '0 auto', padding: '24px 20px 32px' },
  h2:         { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  sub:        { color: 'var(--muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 },
  tabRow:     { display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  tab:        a => ({ padding: '7px 15px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', border: a ? '1px solid var(--gold)' : '1px solid var(--border)', background: a ? 'rgba(232,146,26,.12)' : 'var(--bg3)', color: a ? 'var(--gold)' : 'var(--muted)' }),
  card:       { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', marginBottom: 14 },
  title:      { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 },
  badge:      c => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}44` }),
  formHero:   c => ({ background: `${c}0d`, border: `2px solid ${c}`, borderRadius: 16, padding: '22px', marginBottom: 14 }),
  formName:   c => ({ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: c, marginBottom: 4 }),
  formMode:   { fontSize: 12, color: 'var(--muted)', marginBottom: 14, fontStyle: 'italic' },
  reasonBox:  { background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 },
  reasonItem: { fontSize: 13, color: 'var(--text)', padding: '3px 0' },
  twoCol:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  colHead:    c => ({ fontSize: 12, fontWeight: 700, color: c, marginBottom: 8 }),
  colItem:    { fontSize: 12, color: 'var(--muted)', padding: '3px 0', lineHeight: 1.5 },
  schedBox:   { marginTop: 14, background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px' },
  schedRow:   { display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12, alignItems: 'baseline' },
  schedName:  { color: 'var(--gold)', fontWeight: 700, flexShrink: 0, minWidth: 200 },
  schedNote:  { color: 'var(--muted)', lineHeight: 1.5 },
  docCard:    { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 12 },
  docHead:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  docItem:    { display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start', fontSize: 13 },
  docName:    { fontWeight: 600, color: 'var(--text)', marginBottom: 2 },
  docDesc:    { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 },
  stepBox:    c => ({ background: 'var(--bg3)', border: `1px solid ${c}44`, borderRadius: 12, padding: '16px 18px', marginBottom: 10 }),
  stepHead:   { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' },
  stepNum:    c => ({ width: 30, height: 30, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#000', flexShrink: 0 }),
  stepTitle:  { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)', flex: 1 },
  actionList: c => ({ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${c}44` }),
  actionItem: { fontSize: 13, color: 'var(--muted)', padding: '4px 0', lineHeight: 1.6 },
  deadline:   c => ({ background: `${c}10`, border: `1px solid ${c}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }),
  dlDate:     c => ({ fontFamily: 'var(--font-display)', fontWeight: 800, color: c, fontSize: 14 }),
  dlLabel:    { fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 },
  dlNote:     { fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 },
  penRow:     { padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  atRow:      { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13, alignItems: 'center' },
  noData:     { background: 'rgba(232,146,26,.07)', border: '1px solid rgba(232,146,26,.25)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 },
  altNote:    { marginTop: 10, padding: '10px 14px', background: 'rgba(155,114,207,.1)', borderRadius: 10, border: '1px solid rgba(155,114,207,.3)', fontSize: 12, color: '#9B72CF' },
  auditNote:  { marginTop: 10, padding: '10px 14px', background: 'rgba(232,64,64,.08)', borderRadius: 10, border: '1px solid rgba(232,64,64,.3)', fontSize: 12, color: '#E84040' },
  textarea:   { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 13px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', marginBottom: 10, resize: 'vertical', minHeight: 60, boxSizing: 'border-box' },
  askBtn:     { background: 'linear-gradient(135deg,var(--emerald),#0ab868)', color: '#000', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)' },
  askBtnOff:  { background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'var(--font-display)' },
  aiResp:     { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginTop: 14, fontSize: 14, color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' },
  chip:       { fontSize: 12, padding: '5px 11px', borderRadius: 20, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' },
  chips:      { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 },
  portalLink: { display: 'inline-block', marginTop: 10, fontSize: 12, padding: '6px 14px', borderRadius: 8, background: 'rgba(74,158,232,.12)', color: '#4A9EE8', border: '1px solid rgba(74,158,232,.3)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 },
  bannerGreen:{ background: 'rgba(29,184,115,.07)', border: '1px solid rgba(29,184,115,.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: 'var(--emerald)', lineHeight: 1.7 },
  bannerRed:  { background: 'rgba(232,64,64,.07)', border: '1px solid rgba(232,64,64,.2)', borderRadius: 10, padding: '12px 16px', marginTop: 10, fontSize: 13, color: '#E84040', lineHeight: 1.6 },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ITRFiling({ plannerResults = null }) {
  const [activeTab,    setActiveTab]    = useState('form');
  const [expandedStep, setExpandedStep] = useState(0);
  const [question,     setQuestion]     = useState('');
  const [answer,       setAnswer]       = useState('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const [expandedForm, setExpandedForm] = useState(null);

  const incomes    = plannerResults?.incomes    || {};
  const taxResult  = plannerResults?.taxResult  || null;
  const entityType = plannerResults?.entityType || 'individual';
  const hasData    = plannerResults !== null && Object.values(incomes).some(v => v > 0);

  const { form: itrForm, reasons, alternateForm } = useMemo(
    () => determineITRForm(incomes, entityType),
    [incomes, entityType]
  );
  const formData  = ITR_FORMS[itrForm];
  const documents = useMemo(() => buildDocumentList(incomes, entityType), [incomes, entityType]);

  // Active income schedule mapping
  const activeSchedules = useMemo(() =>
    Object.entries(SCHEDULE_MAP)
      .filter(([key]) => (incomes[key] || 0) > 0)
  , [incomes]);

  const askAI = async () => {
    if (!question.trim()) return;
    setAiLoading(true); setAnswer('');
    try {
      const context = hasData
        ? `Income sources: ${Object.entries(incomes).filter(([,v]) => v > 0).map(([k, v]) => `${k}: ${fmtINR(v)}`).join(', ')}. Recommended form: ${itrForm}. Best regime: ${taxResult?.bestRegime || 'unknown'}. Total tax: ${fmtINR(taxResult?.bestTax || 0)}.`
        : '';
      const data = await aiTaxAdvisor({
        question: `${question}\n[Context: FY 2026-27, India ITR filing. ${context}]`,
      });
      setAnswer(data.answer);
    } catch {
      setAnswer('⚠️ Could not reach server. Make sure your backend is running.');
    }
    setAiLoading(false);
    setQuestion('');
  };

  const TABS = [
    { key: 'form',      label: '📋 ITR Form'     },
    { key: 'schedule',  label: '📑 Schedules'    },
    { key: 'docs',      label: '📁 Documents'    },
    { key: 'steps',     label: '📝 Filing Steps' },
    { key: 'deadlines', label: '⏰ Deadlines'    },
    { key: 'ai',        label: '🤖 AI Assistant' },
  ];

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>🗂️ ITR Filing Guide</h2>
      <p style={S.sub}>
        Personalized guidance for FY 2026-27 (AY 2027-28) — which form to file, documents needed, and step-by-step portal walkthrough.
        {hasData
          ? <strong style={{ color: 'var(--emerald)' }}> Personalised from your planner data.</strong>
          : <span style={{ color: 'var(--gold)' }}> Fill the Planner section first for personalized guidance.</span>
        }
      </p>

      {!hasData && (
        <div style={S.noData}>
          💡 <strong style={{ color: 'var(--text)' }}>To personalize this guide:</strong> Go to Planner → add your income sources → run analysis. This section will then auto-determine your ITR form, show only your relevant documents, and map your exact schedules on the portal.
          The guide below shows general information applicable to all.
        </div>
      )}

      {/* Tab bar */}
      <div style={S.tabRow}>
        {TABS.map(t => (
          <button key={t.key} style={S.tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════ ITR FORM TAB */}
      {activeTab === 'form' && (
        <>
          {/* Recommended form hero */}
          <div style={S.formHero(formData.color)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
              <div style={S.formName(formData.color)}>{formData.name}</div>
              <span style={S.badge(formData.color)}>{formData.complexity}</span>
              {hasData && <span style={S.badge('#1DB873')}>✓ Your Form</span>}
            </div>
            <div style={S.formMode}>{formData.filingMode}</div>

            {/* Reasons (personalized) */}
            {hasData && reasons.length > 0 && (
              <div style={S.reasonBox}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Why this form?</div>
                {reasons.map((r, i) => <div key={i} style={S.reasonItem}>→ {r}</div>)}
              </div>
            )}

            {/* For / Not For */}
            <div style={S.twoCol}>
              <div>
                <div style={S.colHead('#1DB873')}>✅ Who should file</div>
                {formData.for.map((f, i) => <div key={i} style={S.colItem}>• {f}</div>)}
              </div>
              <div>
                <div style={S.colHead('#E84040')}>❌ Not applicable for</div>
                {formData.notFor.map((f, i) => <div key={i} style={S.colItem}>• {f}</div>)}
              </div>
            </div>

            {alternateForm && (
              <div style={S.altNote}>
                💡 Alternate: If your freelance receipts ≤ ₹50L and you opt for Sec 44ADA presumptive taxation, you can use <strong>{alternateForm}</strong> instead — simpler form with deemed 50% income.
              </div>
            )}
            {formData.auditRequired && (
              <div style={S.auditNote}>⚠️ Audit: {formData.auditRequired}</div>
            )}

            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Portal path: </strong>{formData.portal}
            </div>
          </div>

          {/* All forms comparison table */}
          <div style={S.card}>
            <div style={S.title}>All ITR Forms — Quick Reference</div>
            {Object.entries(ITR_FORMS).map(([key, f]) => {
              const isExpanded = expandedForm === key;
                return (
                  <div key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                    <div
                      onClick={() => setExpandedForm(isExpanded ? null : key)}
                      style={{ display: 'flex', gap: 12, padding: '10px 0', alignItems: 'center', flexWrap: 'wrap', cursor: 'pointer' }}
                    >
                      <div style={{ width: 95, flexShrink: 0 }}>
                        <span style={{ ...S.badge(f.color), border: isExpanded ? `2px solid ${f.color}` : undefined }}>{key}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: key === itrForm && hasData ? f.color : 'var(--text)' }}>
                          {f.name} {key === itrForm && hasData && '← Your Form'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>{f.for[0]}</div>
                      </div>
                      <span style={S.badge(f.complexity === 'Simple' ? '#1DB873' : f.complexity === 'Moderate' ? '#E8921A' : '#E84040')}>
                        {f.complexity}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '12px 0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1DB873', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>✅ Who should file</div>
                          {f.for.map((item, i) => <div key={i} style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 0', lineHeight: 1.5 }}>• {item}</div>)}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#E84040', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>❌ Not applicable for</div>
                          {f.notFor.map((item, i) => <div key={i} style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 0', lineHeight: 1.5 }}>• {item}</div>)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Common mistakes */}
          <div style={S.card}>
            <div style={S.title}>⚠️ Common Filing Mistakes to Avoid</div>
            {[
              'Not reconciling AIS/Form 26AS before filing — biggest cause of IT notices',
              'Choosing wrong Assessment Year — AY 2027-28 for FY 2026-27 income',
              'Using ITR-1 despite having capital gains or crypto income',
              'Reporting F&O P&L under capital gains instead of business income (Schedule BP)',
              'Forgetting crypto TDS (1% per sell) in Form 26AS — mismatches trigger scrutiny',
              'Not declaring employer NPS (80CCD(2)) — available even in new regime',
              'Mixing up old and new regime at last minute — locked after submission',
              'Not e-verifying within 30 days of filing — return becomes invalid',
              'Missing grandfathering computation for equity bought before Jan 31, 2018',
              'Not claiming Section 54/54F/54EC exemption when reinvesting property LTCG',
            ].map((m, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--muted)', padding: '6px 0', lineHeight: 1.5, borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>
                ❌ {m}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════ SCHEDULE TAB */}
      {activeTab === 'schedule' && (
        <>
          {hasData && activeSchedules.length > 0 ? (
            <div style={S.card}>
              <div style={S.title}>📑 Your Schedules — Based on Income Sources</div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                Schedules you need to fill on the portal based on your reported income:
              </p>
              <div style={S.schedBox}>
                <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span style={{ minWidth: 200 }}>Schedule</span>
                  <span>What to enter</span>
                </div>
                {activeSchedules.map(([key, info], i) => (
                  <div key={key} style={{ ...S.schedRow, borderBottom: i < activeSchedules.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={S.schedName}>{info.schedule}</span>
                    <span style={S.schedNote}>{info.note}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={S.noData}>Fill the Planner section with your income sources to see which specific schedules you need to complete.</div>
          )}

          {/* Full schedule reference */}
          <div style={S.card}>
            <div style={S.title}>All Schedules Reference</div>
            {Object.entries(SCHEDULE_MAP).map(([key, info], i) => (
              <div key={key} style={{ ...S.schedRow, borderBottom: i < Object.entries(SCHEDULE_MAP).length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{info.schedule}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', flex: 1, lineHeight: 1.5 }}>{info.note}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════ DOCUMENTS TAB */}
      {activeTab === 'docs' && (
        <>
          {!hasData && (
            <div style={S.noData}>Showing all documents. Fill Planner to see only documents relevant to your income sources.</div>
          )}
          {documents.map((group, gi) => (
            <div key={gi} style={S.docCard}>
              <div style={S.docHead}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{group.category}</div>
                <span style={S.badge(group.color)}>{group.items.length} docs</span>
              </div>
              {group.items.map((item, i) => (
                <div key={i} style={{ ...S.docItem, borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: group.color, fontSize: 16, flexShrink: 0, marginTop: 2 }}>☐</span>
                  <div>
                    <div style={S.docName}>{item.name}</div>
                    <div style={S.docDesc}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, paddingTop: 4 }}>
            📂 Keep all documents for minimum 7 years — IT department can issue notices within this window.
          </div>
        </>
      )}

      {/* ════════════════════════════════════════ FILING STEPS TAB */}
      {activeTab === 'steps' && (
        <>
          <div style={S.bannerGreen}>
            📌 Portal: <strong>incometax.gov.in</strong> · AY: <strong>2027-28</strong> · Deadline: <strong>July 31, 2026</strong>
            {hasData && <span> · Form: <strong>{formData.name}</strong></span>}
          </div>
          {FILING_STEPS.map((step, i) => (
            <div key={i} style={S.stepBox(step.color)}>
              <div style={S.stepHead} onClick={() => setExpandedStep(expandedStep === i ? null : i)}>
                <div style={S.stepNum(step.color)}>{step.num}</div>
                <div style={S.stepTitle}>{step.icon} {step.title}</div>
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>{expandedStep === i ? '▲' : '▼'}</span>
              </div>
              {expandedStep === i && (
                <div style={S.actionList(step.color)}>
                  {step.actions.map((action, j) => (
                    <div key={j} style={{ ...S.actionItem, paddingLeft: action.startsWith(' ') ? 20 : 0 }}>
                      {action.startsWith(' ') ? action : `→ ${action}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div style={S.bannerRed}>
            ⚠️ E-verify within <strong>30 days</strong> of submission. An unverified return is treated as if never filed — you may face penalties even if you submitted on time.
          </div>
        </>
      )}

      {/* ════════════════════════════════════════ DEADLINES TAB */}
      {activeTab === 'deadlines' && (
        <>
          <div style={S.card}>
            <div style={S.title}>📅 Filing Deadlines — FY 2026-27</div>
            {DEADLINES.map((d, i) => (
              <div key={i} style={S.deadline(d.color)}>
                <div>
                  <div style={S.dlDate(d.color)}>{d.date}</div>
                  <div style={S.dlLabel}>{d.label}</div>
                  <div style={S.dlNote}>{d.note}</div>
                </div>
                {d.urgent && <span style={S.badge('#E84040')}>Primary Deadline</span>}
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.title}>💸 Late Filing Penalties (Sec 234F)</div>
            {PENALTIES.map((p, i) => (
              <div key={i} style={{ ...S.penRow, borderBottom: i < PENALTIES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{p.scenario}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.note}</div>
                </div>
                <span style={S.badge(p.color)}>{p.penalty}</span>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.title}>📆 Advance Tax Schedule (Business / High Capital Gains)</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
              Required if total tax liability > ₹10,000 after TDS. Salaried employees with only TDS deducted are usually exempt.
            </p>
            {ADVANCE_TAX.map((at, i) => (
              <div key={i} style={{ ...S.atRow, borderBottom: i < ADVANCE_TAX.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: '#4A9EE8', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{at.date}</span>
                <span style={S.badge('#E8921A')}>{at.pct} cumulative</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1, textAlign: 'right' }}>{at.desc}</span>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.title}>📋 Other Key Dates</div>
            {[
              { date: 'June 15, 2026',  event: 'Employer must issue Form 16 (Part A + B) to employees',      color: '#4A9EE8' },
              { date: 'July 31, 2026',  event: '6-month deadline for 54EC bond purchase (property sold Jan–Jun 2026)', color: '#E8921A' },
              { date: 'Aug 31, 2026',   event: 'Last date to invest capital gains in new property under Sec 54F (for property sold Aug 2024 – Feb 2025)', color: '#9B72CF' },
              { date: 'Sep 30, 2026',   event: 'Tax audit completion deadline for applicable businesses',     color: '#E84040' },
              { date: 'Dec 31, 2026',   event: 'Last date for belated return (with ₹5,000 / ₹1,000 fee)',   color: '#fb923c' },
              { date: 'Mar 31, 2027',   event: 'Last date for revised return or ITR-U (updated return)',     color: '#60a5fa' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ color: item.color, fontWeight: 700, fontFamily: 'var(--font-display)', minWidth: 100, flexShrink: 0 }}>{item.date}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>{item.event}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════ AI TAB */}
      {activeTab === 'ai' && (
        <div style={S.card}>
          <div style={S.title}>🤖 ITR Filing Assistant</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
            Ask anything about ITR forms, schedules, deadlines, corrections, or specific income reporting.
            {hasData && <span style={{ color: 'var(--emerald)' }}> Answers are personalized to your income profile.</span>}
          </p>

          {hasData && (
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--muted)' }}>
              Context loaded: <strong style={{ color: formData.color }}>{formData.name}</strong> recommended ·
              {Object.entries(incomes).filter(([, v]) => v > 0).map(([k]) => k).join(', ')} income ·
              Regime: <strong style={{ color: 'var(--gold)' }}>{taxResult?.bestRegime === 'new' ? 'New' : 'Old'}</strong>
            </div>
          )}

          <div style={S.chips}>
            {QUICK_QS.map(q => (
              <span key={q} style={S.chip} onClick={() => setQuestion(q)}>{q}</span>
            ))}
          </div>

          <textarea
            style={S.textarea}
            placeholder="e.g. I have F&O losses of ₹80,000 and salary income — can I set off and carry forward the loss?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI(); }}}
            onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button style={aiLoading ? S.askBtnOff : S.askBtn} onClick={askAI} disabled={aiLoading}>
            {aiLoading ? '⏳ Thinking...' : '✨ Ask'}
          </button>
          {answer && <div style={S.aiResp}>{answer}</div>}

          <div style={{ marginTop: 18, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            🔗 Key portals: &nbsp;
            <a href="https://incometax.gov.in" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>incometax.gov.in</a> ·&nbsp;
            <a href="https://www.tin-nsdl.com" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>tin-nsdl.com (Challan 280)</a> ·&nbsp;
            <a href="https://www.camsonline.com" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>camsonline.com (MF cap gains)</a>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, paddingTop: 10 }}>
        ℹ️ FY 2026-27 / AY 2027-28 guidance. For complex cases, consult a CA. Portal: incometax.gov.in
      </div>
    </div>
  );
}
