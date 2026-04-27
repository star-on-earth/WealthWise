/**
 * taxEngine.js — WealthWise v5.1  |  FY 2026-27 India
 *
 * CHANGES FROM v4:
 *  • CRASH FIX  — businessLoanInt declared before businessTaxable (TDZ fix)
 *  • PROJ FIX   — projectNetWorth defaults to 20yr (fixes ₹undefinedL on 20Y view)
 *  • NEW INCOME — ltcg_debt (Sec 112, debt MF/bonds 20% with indexation)
 *  • NEW DEDUC  — ev_loan_int (80EEB), royalty_author (80QQB), patent_royalty (80RRB)
 *  • NEW HELPER — computeHRAExemption (Sec 10(13A) — 3-limit formula)
 *  • NEW HELPER — compute44AD / compute44ADA / requires44AB
 *  • NEW PARAM  — computeMultiIncomeTax accepts extraData (6th param, backward-compat)
 */

// ─── ENTITY TYPES ─────────────────────────────────────────────────────────────

export const ENTITY_TYPES = [
  { key: 'individual', label: 'Individual',                   icon: '👤' },
  { key: 'huf',        label: 'HUF (Hindu Undivided Family)', icon: '🏛️' },
];

// ─── INCOME SOURCES ───────────────────────────────────────────────────────────

export const INCOME_SOURCES = [
  {
    key: 'salary', label: 'Salary / CTC', icon: '💼', taxType: 'slab', regime: 'both',
    note: 'Enter your TOTAL annual CTC — includes ALL components (basic, HRA, DA, bonus, allowances). Do NOT subtract HRA here. HRA exemption is computed separately via the HRA sub-section below.',
  },
  {
    key: 'business', label: 'Business Profit', icon: '🏢', taxType: 'slab', regime: 'both',
    note: 'Enter NET profit after all business expenses. OR toggle 44AD Presumptive below — enter gross turnover and 8% (or 6% digital) is auto-deemed as income (no bookkeeping needed for turnover ≤ ₹2Cr).',
  },
  {
    key: 'fno', label: 'Futures & Options (F&O)', icon: '📉', taxType: 'slab', regime: 'both',
    note: 'Enter NET P&L — profit minus loss. F&O is treated as business income under ITR-3. Also enter F&O gross turnover in the expanded panel for the Section 44AB audit threshold check.',
  },
  {
    key: 'freelance', label: 'Freelance / Consulting', icon: '💻', taxType: 'slab', regime: 'both',
    note: 'Enter NET receipts after expenses. Professionals (doctors, CAs, lawyers, engineers) with gross receipts ≤ ₹75L can opt for 44ADA Presumptive — 50% is auto-deemed income, no detailed books needed.',
  },
  {
    key: 'rental', label: 'Rental Income', icon: '🏠', taxType: 'slab', regime: 'both',
    note: 'Enter GROSS annual rent received. 30% standard deduction is auto-applied (Sec 24). Municipal tax paid is also deductible — enter net of that.',
  },
  {
    key: 'fd_interest', label: 'FD / RD / Post Office Interest', icon: '🏦', taxType: 'slab', regime: 'both',
    note: 'Fully taxable at slab. TDS @10% deducted by bank if interest >₹40K/yr (₹50K for seniors).',
  },
  {
    key: 'savings_int', label: 'Savings Account Interest', icon: '💰', taxType: 'slab', regime: 'both',
    note: '80TTA: first ₹10K exempt (under 60). 80TTB: first ₹50K exempt (60+). Auto-applied based on your age. Enter full interest received.',
  },
  {
    key: 'dividends', label: 'Dividend Income', icon: '📈', taxType: 'slab', regime: 'both',
    note: 'Taxable at your slab rate. TDS @10% above ₹5K per company.',
  },
  {
    key: 'ltcg_equity', label: 'LTCG — Equity / Equity MF', icon: '📊', taxType: 'ltcg10', regime: 'both',
    note: '10% tax on gains above ₹1.25L exemption (FY26-27). Enter GROSS LTCG before the exemption. Equity shares or equity-oriented MF held >1 year.',
  },
  {
    key: 'stcg_equity', label: 'STCG — Equity / Equity MF', icon: '📊', taxType: 'stcg15', regime: 'both',
    note: '15% flat on the full gain. No exemption. Equity or equity MF held <1 year.',
  },
  {
    key: 'ltcg_debt', label: 'LTCG — Debt MF / Bonds (Sec 112)', icon: '🏛️', taxType: 'ltcg20', regime: 'both',
    note: 'Debt MF or bonds purchased BEFORE April 2023, held >3 years. Sec 112: 20% with indexation. Enter the gain AFTER applying your indexation adjustment (use CII table from incometax.gov.in).',
  },
  {
    key: 'ltcg_property', label: 'LTCG — Property/Gold (Pre Jul 23, 2024)', icon: '🏗️', taxType: 'ltcg20', regime: 'both',
    note: '20% WITH indexation. Property or gold purchased before July 23, 2024. Sec 54/54F/54EC exemptions may apply — see IT Guide.',
  },
  {
    key: 'ltcg_property_new', label: 'LTCG — Property/Gold (Post Jul 23, 2024)', icon: '🥇', taxType: 'ltcg12_5', regime: 'both',
    note: '12.5% WITHOUT indexation. Budget 2024 rule for property/gold acquired after July 23, 2024.',
  },
  {
    key: 'agricultural', label: 'Agricultural Income', icon: '🌾', taxType: 'agri', regime: 'both',
    note: 'Exempt from central income tax. Still declare — it is used for rate computation (partial integration) if total income exceeds basic exemption.',
  },
  {
    key: 'crypto', label: 'Crypto / VDA Income', icon: '₿', taxType: 'crypto30', regime: 'both',
    note: '30% flat tax + 1% TDS per transaction. No deductions allowed, no loss set-off against any other head.',
  },
  {
    key: 'other', label: 'Other Income', icon: '💵', taxType: 'slab', regime: 'both',
    note: 'Pension, gifts above ₹50K, winnings, lottery, etc. Taxed at your marginal slab rate.',
  },
];

// ─── LOAN / DEDUCTION TYPES ───────────────────────────────────────────────────

export const LOAN_TYPES = [
  {
    key: 'home_loan_principal', label: 'Home Loan Principal', icon: '🏠',
    section: '80C', limit: 150_000,
    note: 'Principal repayment. Counted within the ₹1.5L 80C aggregate cap. Old regime only.',
  },
  {
    key: 'home_loan_interest', label: 'Home Loan Interest (Sec 24b)', icon: '🏠',
    section: '24b', limit: 200_000,
    note: 'Up to ₹2L/yr for self-occupied. Unlimited for let-out property. Old regime only.',
  },
  {
    key: 'education_loan_int', label: 'Education Loan Interest (80E)', icon: '🎓',
    section: '80E', limit: null,
    note: 'FULL interest deductible — no cap. Valid for 8 consecutive years from first repayment. Old regime only.',
  },
  {
    key: 'business_loan_int', label: 'Business Loan Interest', icon: '🏢',
    section: null, limit: null,
    note: 'Deductible as business expense — BOTH regimes. Reduces net profit before tax. Enter annual interest paid.',
  },
  {
    key: 'ev_loan_int', label: 'EV Loan Interest (80EEB)', icon: '🚗',
    section: '80EEB', limit: 150_000,
    note: 'Interest on electric vehicle loan sanctioned Apr 1 2019 – Mar 31 2023. Max ₹1.5L/yr. Old regime only. Tick eligibility checkbox below.',
  },
  {
    key: 'royalty_author', label: 'Author Royalty Income (80QQB)', icon: '📚',
    section: '80QQB', limit: 300_000,
    note: 'Royalty from books (literary/artistic/scientific). Enter royalty received — deduction capped at ₹3L. Old regime only.',
  },
  {
    key: 'patent_royalty', label: 'Patent Royalty Income (80RRB)', icon: '🔬',
    section: '80RRB', limit: 300_000,
    note: 'Royalty from registered Indian patents. Confirm you have a registered patent (checkbox below). Max ₹3L. Old regime only.',
  },
  {
    key: 'personal_loan', label: 'Personal Loan', icon: '💳',
    section: null, limit: null,
    note: 'No tax deduction on personal loan interest. Enter for financial-planning tracking only.',
  },
];

// ─── ASSET TAX RULES ─────────────────────────────────────────────────────────

export const ASSET_TAX_RULES = {
  TAX_FREE:          { label: 'Tax-Free',           color: '#1DB873', postTaxCAGR: (g)    => g         },
  LTCG_EQUITY:       { label: 'LTCG 10%',           color: '#4A9EE8', postTaxCAGR: (g)    => g * 0.90  },
  STCG_EQUITY:       { label: 'STCG 15%',           color: '#E8921A', postTaxCAGR: (g)    => g * 0.85  },
  SLAB_RATE:         { label: 'Slab Rate',           color: '#9B72CF', postTaxCAGR: (g, r) => g * (1-r) },
  LTCG_PROPERTY:     { label: 'LTCG 20% (indexed)', color: '#fb923c', postTaxCAGR: (g)    => g * 0.80  },
  LTCG_PROPERTY_NEW: { label: 'LTCG 12.5%',         color: '#ffa726', postTaxCAGR: (g)    => g * 0.875 },
  CRYPTO:            { label: '30% Flat',            color: '#E84040', postTaxCAGR: (g)    => g * 0.70  },
  SGB:               { label: 'Tax-Free (SGB)',      color: '#1DB873', postTaxCAGR: (g)    => g         },
  NPS:               { label: 'Partly Tax-Free',     color: '#6ee7b7', postTaxCAGR: (g)    => g * 0.88  },
};

// ─── ASSETS ───────────────────────────────────────────────────────────────────

export const ASSETS = {
  PPF:        { cagr: 7.1,  label: 'PPF',                color: '#4A9EE8', lock: '15yr',    taxRule: 'TAX_FREE',          note: 'EEE. Fully tax-free at maturity.' },
  SavingsAcc: { cagr: 3.5,  label: 'Savings Account',    color: '#818cf8', lock: 'None',    taxRule: 'SLAB_RATE',         note: 'Emergency fund. First ₹10K–50K exempt.' },
  FD:         { cagr: 7.2,  label: 'Fixed Deposit',       color: '#7c8cf8', lock: '1-5yr',  taxRule: 'SLAB_RATE',         note: 'Interest taxable at slab. TDS @10%.' },
  NPS:        { cagr: 11.0, label: 'NPS',                 color: '#9B72CF', lock: 'Till 60',taxRule: 'NPS',               note: '60% lump sum tax-free. 40% annuity taxable.' },
  DebtMF:     { cagr: 7.5,  label: 'Debt Mutual Fund',    color: '#60a5fa', lock: 'None',   taxRule: 'SLAB_RATE',         note: 'Gains taxable at slab (post Apr 2023).' },
  Gold:       { cagr: 11.0, label: 'Digital Gold / ETF',  color: '#E8921A', lock: 'None',   taxRule: 'LTCG_PROPERTY_NEW', note: '12.5% without indexation (Budget 2024).' },
  SGB:        { cagr: 11.0, label: 'Sovereign Gold Bond', color: '#FFB84D', lock: '8yr',    taxRule: 'SGB',               note: 'Maturity fully tax-free. 2.5% interest taxable.' },
  ELSS:       { cagr: 14.0, label: 'ELSS (Tax Saver MF)', color: '#1DB873', lock: '3yr',    taxRule: 'LTCG_EQUITY',       note: 'LTCG above ₹1.25L at 10%. 80C eligible.' },
  IndexMF:    { cagr: 13.0, label: 'Index MF (Nifty 50)', color: '#34d399', lock: 'None',   taxRule: 'LTCG_EQUITY',       note: 'LTCG above ₹1.25L at 10%. Low cost.' },
  LargeCapMF: { cagr: 14.5, label: 'Large Cap MF',        color: '#6ee7b7', lock: 'None',   taxRule: 'LTCG_EQUITY',       note: 'LTCG above ₹1.25L at 10%.' },
  MidSmallMF: { cagr: 17.0, label: 'Mid / Small Cap MF',  color: '#FFB84D', lock: 'None',   taxRule: 'LTCG_EQUITY',       note: '7yr+ horizon. LTCG above ₹1.25L at 10%.' },
  Stocks:     { cagr: 15.0, label: 'Direct Stocks',       color: '#fb923c', lock: 'None',   taxRule: 'LTCG_EQUITY',       note: 'LTCG/STCG. High research required.' },
  RealEstate: { cagr: 9.5,  label: 'Real Estate',         color: '#f472b6', lock: '5yr+',   taxRule: 'LTCG_PROPERTY',     note: 'LTCG 20% with indexation. Sec 54 if reinvested.' },
  Bitcoin:    { cagr: 35.0, label: 'Bitcoin / Crypto',    color: '#E84040', lock: 'None',   taxRule: 'CRYPTO',            note: '30% flat + 1% TDS. No loss set-off.' },
};

// ─── NEW: HRA EXEMPTION HELPER (Sec 10(13A)) ─────────────────────────────────

/**
 * Computes HRA exemption = MINIMUM of three statutory limits.
 *
 * @param {number} hraReceived  Annual HRA received per salary slip (≠ CTC)
 * @param {number} annualRent   Annual rent actually paid by the employee
 * @param {number} basicSalary  Annual basic salary (check salary slip — ~40-50% of CTC)
 * @param {string} cityType     'metro' = Delhi/Mumbai/Chennai/Kolkata  |  'nonmetro' = rest
 */
export function computeHRAExemption({ hraReceived = 0, annualRent = 0, basicSalary = 0, cityType = 'metro' }) {
  if (!hraReceived || !annualRent || !basicSalary) return 0;
  const limit1 = hraReceived;                                          // (a) actual HRA received
  const limit2 = Math.max(0, annualRent - basicSalary * 0.10);        // (b) rent − 10% basic
  const limit3 = basicSalary * (cityType === 'metro' ? 0.50 : 0.40); // (c) 50%/40% of basic
  return Math.round(Math.min(limit1, limit2, limit3));
}

// ─── NEW: PRESUMPTIVE INCOME HELPERS (44AD / 44ADA / 44AB) ───────────────────

/** Section 44AD: deemed business income = 8% of turnover (6% if fully digital) */
export function compute44AD(turnover = 0, isDigital = false) {
  return Math.round(turnover * (isDigital ? 0.06 : 0.08));
}

/** Section 44ADA: deemed professional income = 50% of gross receipts */
export function compute44ADA(grossReceipts = 0) {
  return Math.round(grossReceipts * 0.50);
}

/** Section 44AB: true if turnover triggers mandatory tax audit */
export function requires44AB({ businessTurnover = 0, fnoTurnover = 0, isDigital = false }) {
  const threshold = isDigital ? 10_000_000 : 1_000_000; // ₹10Cr digital / ₹1Cr cash
  return (businessTurnover > threshold) || (fnoTurnover > threshold);
}

// ─── MULTI-INCOME TAX ENGINE ─────────────────────────────────────────────────

/**
 * @param {Object} incomes           — Income amounts keyed by source
 * @param {number} age               — User age (determines senior citizen thresholds)
 * @param {string} entityType        — 'individual' | 'huf'
 * @param {Object} loanDeductions    — Deduction amounts keyed by LOAN_TYPES.key
 * @param {Object} trackerDeductions — { health80D, parents80D } from Expense Tracker
 * @param {Object} extraData         — v5 NEW (optional, backward-compatible):
 *   {
 *     // HRA (Sec 10(13A))
 *     hraReceived:       number,   // from salary slip — NOT part of CTC input above
 *     annualRent:        number,   // rent paid annually
 *     basicSalary:       number,   // from salary slip; falls back to 40% of CTC
 *     cityType:          string,   // 'metro' | 'nonmetro'
 *     // Children allowances (Sec 10(14))
 *     childrenCount:     number,   // school-going children ≤ 2 considered
 *     // 44AD presumptive for business
 *     presumptive44AD:   bool,
 *     turnover44AD:      number,   // gross turnover
 *     digital44AD:       bool,     // true = 6%, false = 8%
 *     // 44ADA presumptive for professionals
 *     presumptive44ADA:  bool,
 *     grossReceipts44ADA:number,   // must be ≤ ₹75L
 *     // F&O gross turnover (for 44AB audit check)
 *     fnoTurnover:       number,
 *     // EV / royalty eligibility flags
 *     evLoanEligible:    bool,
 *     patentRegistered:  bool,
 *   }
 */
export function computeMultiIncomeTax(
  incomes          = {},
  age              = 30,
  entityType       = 'individual',
  loanDeductions   = {},
  trackerDeductions = {},
  extraData        = {}            // ← v5 addition, optional
) {
  const isSenior = age >= 60;
  const isHUF    = entityType === 'huf';

  const {
    salary            = 0, business          = 0, freelance         = 0, fno    = 0,
    rental            = 0, fd_interest       = 0, savings_int       = 0, dividends = 0,
    ltcg_equity       = 0, stcg_equity       = 0, ltcg_debt         = 0,
    ltcg_property     = 0, ltcg_property_new = 0, agricultural      = 0,
    crypto            = 0, other             = 0,
  } = incomes;

  // ── LOAN DEDUCTIONS — ALL declared before businessTaxable (TDZ fix) ────────
  const businessLoanInt   = loanDeductions.business_loan_int   || 0;
  const homeLoanInterest  = Math.min(loanDeductions.home_loan_interest  || 0, 200_000);
  const eduLoanInterest   = loanDeductions.education_loan_int  || 0;
  const homeLoanPrincipal = Math.min(loanDeductions.home_loan_principal || 0, 150_000);
  // EV loan — only if user confirmed eligibility
  const evLoanInt         = (extraData.evLoanEligible || loanDeductions.ev_loan_int)
                            ? Math.min(loanDeductions.ev_loan_int || 0, 150_000) : 0;
  // Royalty deductions — gated on eligibility flags
  const royaltyDeduction  = Math.min(loanDeductions.royalty_author || 0, 300_000);
  const patentDeduction   = extraData.patentRegistered
                            ? Math.min(loanDeductions.patent_royalty || 0, 300_000) : 0;

  // ── 44AD presumptive override ─────────────────────────────────────────────
  let effectiveBusiness = Math.max(0, business - businessLoanInt);
  if (extraData.presumptive44AD && (extraData.turnover44AD || 0) > 0) {
    effectiveBusiness = compute44AD(extraData.turnover44AD, extraData.digital44AD || false);
  }

  // ── 44ADA presumptive override ────────────────────────────────────────────
  let effectiveFreelance = freelance;
  if (extraData.presumptive44ADA && (extraData.grossReceipts44ADA || 0) > 0) {
    // Eligibility: gross receipts ≤ ₹75L
    if (extraData.grossReceipts44ADA <= 7_500_000) {
      effectiveFreelance = compute44ADA(extraData.grossReceipts44ADA);
    }
  }

  // ── HRA exemption (Sec 10(13A)) ───────────────────────────────────────────
  let hraExemption = 0;
  if (salary > 0 && (extraData.hraReceived || 0) > 0 && (extraData.annualRent || 0) > 0) {
    const basicSalary = extraData.basicSalary || salary * 0.40;
    hraExemption = computeHRAExemption({
      hraReceived: extraData.hraReceived,
      annualRent:  extraData.annualRent,
      basicSalary,
      cityType:    extraData.cityType || 'metro',
    });
  }

  // ── Sec 10(14) children allowances ───────────────────────────────────────
  const childCount = Math.min(+(extraData.childrenCount || 0), 2);
  const sec1014    = childCount * (1_200 + 3_600); // ₹100/mo edu + ₹300/mo hostel × 12

  // ── Effective salary after exemptions ────────────────────────────────────
  const totalSalaryExempt = hraExemption + sec1014;
  const effectiveSalary   = Math.max(0, salary - totalSalaryExempt);

  // ── Other income adjustments ──────────────────────────────────────────────
  const agriIncome        = agricultural;
  const rentalTaxable     = rental * 0.70;
  const savingsExemption  = (isSenior || isHUF) ? 50_000 : 10_000;
  const savingsIntTaxable = Math.max(0, savings_int - savingsExemption);

  // ── LTCG equity exemption ─────────────────────────────────────────────────
  const ltcgEquityTaxable = Math.max(0, ltcg_equity - 125_000);

  // ── Ordinary slab income ──────────────────────────────────────────────────
  const ordinaryGross =
    effectiveSalary + effectiveBusiness + fno + effectiveFreelance +
    rentalTaxable + fd_interest + savingsIntTaxable + dividends + other;

  // ── Total gross (for display) ─────────────────────────────────────────────
  const totalGrossIncome =
    salary + effectiveBusiness + fno + effectiveFreelance + rental +
    fd_interest + savings_int + dividends +
    ltcg_equity + stcg_equity + ltcg_debt +
    ltcg_property + ltcg_property_new + agricultural + crypto + other;

  // ── Tracker-derived deductions ────────────────────────────────────────────
  const tracker80D     = Math.min(trackerDeductions.health80D  || 0, isSenior ? 50_000 : 25_000);
  const trackerPar80D  = Math.min(trackerDeductions.parents80D || 0, 50_000);
  const totalTracker80D = tracker80D + trackerPar80D;

  // ── Old regime deductions object ──────────────────────────────────────────
  const oldDed = {
    d80C:             150_000,
    d80D:             totalTracker80D || 25_000,
    nps:              50_000,
    section24b:       homeLoanInterest,
    section80E:       eduLoanInterest,
    homeLoanPrincipal,
    evLoan:           evLoanInt,
    royalty:          royaltyDeduction,
    patent:           patentDeduction,
  };

  // ── Compute regime taxes ──────────────────────────────────────────────────
  const newOrdinary = _newRegime(ordinaryGross, agriIncome);
  const oldOrdinary = _oldRegime(ordinaryGross, agriIncome, oldDed, isSenior, isHUF);

  // ── Special-rate taxes (same in both regimes) ─────────────────────────────
  const ltcgEquityTax      = ltcgEquityTaxable * 0.10;
  const stcgEquityTax      = stcg_equity       * 0.15;
  const ltcgDebtTax        = ltcg_debt         * 0.20;   // Sec 112
  const ltcgPropertyTax    = ltcg_property     * 0.20;
  const ltcgPropertyNewTax = ltcg_property_new * 0.125;
  const cryptoTax          = crypto            * 0.30;
  const specialTax = (ltcgEquityTax + stcgEquityTax + ltcgDebtTax + ltcgPropertyTax + ltcgPropertyNewTax + cryptoTax) * 1.04;

  const newTotal  = newOrdinary.tax + specialTax;
  const oldTotal  = oldOrdinary.tax + specialTax;
  const bestIsNew = newTotal <= oldTotal;

  const newSlabRate = getMarginalRate(ordinaryGross, 'new');
  const oldSlabRate = getMarginalRate(oldOrdinary.taxableIncome, 'old');

  const auditRequired = requires44AB({
    businessTurnover: extraData.turnover44AD || 0,
    fnoTurnover:      extraData.fnoTurnover  || 0,
    isDigital:        extraData.digital44AD  || false,
  });

  return {
    // Totals
    totalGrossIncome:      Math.round(totalGrossIncome),
    ordinaryGross:         Math.round(ordinaryGross),
    // Breakdowns
    agriIncome:            Math.round(agriIncome),
    rentalTaxable:         Math.round(rentalTaxable),
    savingsIntTaxable:     Math.round(savingsIntTaxable),
    savingsExemption,
    ltcgEquityTaxable:     Math.round(ltcgEquityTaxable),
    // New exemptions
    hraExemption:          Math.round(hraExemption),
    sec1014Exemption:      Math.round(sec1014),
    totalSalaryExemptions: Math.round(totalSalaryExempt),
    // Special taxes
    ltcgEquityTax:         Math.round(ltcgEquityTax),
    stcgEquityTax:         Math.round(stcgEquityTax),
    ltcgDebtTax:           Math.round(ltcgDebtTax),
    ltcgPropertyTax:       Math.round(ltcgPropertyTax),
    ltcgPropertyNewTax:    Math.round(ltcgPropertyNewTax),
    cryptoTax:             Math.round(cryptoTax),
    specialTaxTotal:       Math.round(specialTax),
    // Regimes
    newRegime: { ...newOrdinary, totalTax: Math.round(newTotal), slabRate: newSlabRate },
    oldRegime: { ...oldOrdinary, totalTax: Math.round(oldTotal), slabRate: oldSlabRate, deductionsApplied: oldDed },
    // Best
    bestRegime:            bestIsNew ? 'new' : 'old',
    bestTax:               Math.round(Math.min(newTotal, oldTotal)),
    taxSaving:             Math.round(Math.abs(newTotal - oldTotal)),
    newSlabRate,
    oldSlabRate,
    marginalSlabRate:      bestIsNew ? newSlabRate : oldSlabRate,
    // Metadata
    isSenior, isHUF,
    trackerDeductionsUsed: totalTracker80D,
    loanDeductionsUsed:    homeLoanInterest + eduLoanInterest + evLoanInt,
    auditRequired,
    presumptive44ADIncome:  extraData.presumptive44AD  ? effectiveBusiness  : null,
    presumptive44ADAIncome: extraData.presumptive44ADA ? effectiveFreelance : null,
  };
}

// ─── REGIME HELPERS ──────────────────────────────────────────────────────────

function _newRegime(gross, agri = 0) {
  const taxable = Math.max(0, gross - 75_000);
  if (agri > 0 && taxable > 0) {
    const tax = Math.max(0, _ns(taxable + agri) - _ns(250_000 + agri));
    return { tax: Math.round(tax * 1.04), taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'new', rebate: false };
  }
  if (taxable <= 1_200_000) return { tax: 0, taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'new', rebate: true };
  return { tax: Math.round(_ns(taxable) * 1.04), taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'new', rebate: false };
}
function _ns(x) {
  const s = [[400_000,0],[400_000,.05],[400_000,.10],[400_000,.15],[400_000,.20],[400_000,.25],[Infinity,.30]];
  let t=0,r=x; for(const[sl,rt] of s){if(r<=0)break;t+=Math.min(r,sl)*rt;r-=sl;} return t;
}

function _oldRegime(gross, agri = 0, d = {}, isSenior = false, isHUF = false) {
  const std  = isHUF ? 0 : 50_000;
  const d80C = Math.min((d.d80C||150_000)+(d.homeLoanPrincipal||0), 150_000);
  const d80D = Math.min(d.d80D||25_000, 75_000);
  const nps  = Math.min(d.nps||50_000,  50_000);
  const s24b = Math.min(d.section24b||0,200_000);
  const s80E = d.section80E||0;
  const evL  = Math.min(d.evLoan||0, 150_000);
  const roy  = Math.min(d.royalty||0,300_000);
  const pat  = Math.min(d.patent||0, 300_000);
  const taxable = Math.max(0, gross - std - d80C - d80D - nps - s24b - s80E - evL - roy - pat);
  const basic   = isSenior ? 300_000 : 250_000;
  if (agri > 0 && taxable > 0) {
    const tax = Math.max(0, _os(taxable+agri,isSenior) - _os(basic+agri,isSenior));
    return { tax: Math.round(tax*1.04), taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'old', rebate: false };
  }
  if (taxable <= 500_000) return { tax: 0, taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'old', rebate: true };
  return { tax: Math.round(_os(taxable,isSenior)*1.04), taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'old', rebate: false };
}
function _os(x, senior=false) {
  const b=senior?300_000:250_000, s=[[b,0],[250_000,.05],[500_000,.20],[Infinity,.30]];
  let t=0,r=x; for(const[sl,rt] of s){if(r<=0)break;t+=Math.min(r,sl)*rt;r-=sl;} return t;
}

export function getMarginalRate(taxableIncome, regime = 'new') {
  if (regime === 'new') {
    if (taxableIncome <= 400_000)   return 0.00;
    if (taxableIncome <= 800_000)   return 0.05;
    if (taxableIncome <= 1_200_000) return 0.10;
    if (taxableIncome <= 1_600_000) return 0.15;
    if (taxableIncome <= 2_000_000) return 0.20;
    if (taxableIncome <= 2_400_000) return 0.25;
    return 0.30;
  }
  if (taxableIncome <= 250_000)  return 0.00;
  if (taxableIncome <= 500_000)  return 0.05;
  if (taxableIncome <= 1_000_000)return 0.20;
  return 0.30;
}

// ─── LEGACY COMPAT ───────────────────────────────────────────────────────────
export function calcNewRegime(gross)             { return _newRegime(gross, 0); }
export function calcOldRegime(gross, d={})       { return _oldRegime(gross, 0, d); }
export function bestRegime(income) {
  const n=_newRegime(income,0), o=_oldRegime(income,0);
  return n.tax<=o.tax ? {...n,saving:o.tax-n.tax} : {...o,saving:n.tax-o.tax};
}
export function postTaxCAGR(assetKey, slabRate) {
  const a=ASSETS[assetKey]; if(!a) return 0;
  return ASSET_TAX_RULES[a.taxRule].postTaxCAGR(a.cagr, slabRate);
}

// ─── PORTFOLIO TEMPLATES ─────────────────────────────────────────────────────

const TEMPLATES = {
  Conservative:     [['PPF',25],['FD',20],['NPS',20],['DebtMF',15],['SGB',10],['SavingsAcc',10]],
  Moderate:         [['ELSS',20],['IndexMF',20],['PPF',15],['NPS',15],['SGB',15],['FD',15]],
  Aggressive:       [['IndexMF',25],['LargeCapMF',20],['MidSmallMF',15],['ELSS',15],['SGB',10],['Stocks',10],['RealEstate',5]],
  'Very Aggressive':[['MidSmallMF',20],['Stocks',20],['IndexMF',20],['Bitcoin',10],['SGB',10],['ELSS',10],['RealEstate',10]],
};
const TAX_OPT = [['ELSS',25],['NPS',20],['PPF',25],['IndexMF',15],['SGB',15]];

export function adjustPortfolioForGoals(baseTemplate, goals=[], annualSavings) {
  if (!goals.length||!annualSavings) return {template:baseTemplate,notes:[]};
  const totalTarget=goals.reduce((s,g)=>s+Math.max(0,g.targetAmount-(g.amountSaved||0)),0);
  const notes=[]; let safeShift=0, medShift=0;
  goals.filter(g=>g.years<=3).forEach(g=>{const p=Math.min(40,Math.round((Math.max(0,g.targetAmount-(g.amountSaved||0))/Math.max(1,totalTarget))*100));safeShift+=p;notes.push(`⏰ "${g.label}" in ${g.years}yr → ${p}% to FD/Debt`);});
  goals.filter(g=>g.years>3&&g.years<=7).forEach(g=>{const p=Math.min(30,Math.round((Math.max(0,g.targetAmount-(g.amountSaved||0))/Math.max(1,totalTarget))*50));medShift+=p;notes.push(`🎯 "${g.label}" in ${g.years}yr → ${p}% in ELSS/PPF`);});
  safeShift=Math.min(safeShift,45); medShift=Math.min(medShift,30);
  const totalShift=safeShift+medShift; if(!totalShift) return {template:baseTemplate,notes:[]};
  let adj=baseTemplate.map(([k,p])=>[k,p]);
  const eq=new Set(['IndexMF','LargeCapMF','MidSmallMF','Stocks','Bitcoin']);
  const eqT=adj.filter(([k])=>eq.has(k)).reduce((s,[,p])=>s+p,0);
  const red=Math.min(totalShift,eqT-5);
  if(red>0){adj=adj.map(([k,p])=>eq.has(k)?[k,Math.max(2,Math.round(p*(1-red/eqT)))]:[k,p]);const fi=adj.findIndex(([k])=>k==='FD'),ei=adj.findIndex(([k])=>k==='ELSS');if(fi>=0&&safeShift>0)adj[fi][1]+=safeShift;else if(safeShift>0)adj.push(['FD',safeShift]);if(ei>=0&&medShift>0)adj[ei][1]+=medShift;else if(medShift>0)adj.push(['ELSS',medShift]);}
  const tot=adj.reduce((s,[,p])=>s+p,0);
  return {template:adj.map(([k,p])=>[k,Math.round(p*100/tot)]),notes};
}

export function generatePortfolios(riskLabel, savings, slabRateNew=0.30, slabRateOld=0.30, goals=[]) {
  const keys=Object.keys(TEMPLATES), idx=keys.indexOf(riskLabel);
  const {template:ga, notes:gn}=adjustPortfolioForGoals(TEMPLATES[riskLabel],goals,savings);
  const build=(tmpl,name,rl,useGA=false)=>buildPortfolio(useGA?ga:tmpl,savings,name,rl,slabRateNew,slabRateOld);
  return [
    {...build(TEMPLATES[riskLabel],'⭐ Recommended for You',riskLabel,true), goalNotes:gn},
    build(TEMPLATES[keys[Math.max(0,idx-1)]], '🛡️ Safer Alternative',  keys[Math.max(0,idx-1)]),
    build(TEMPLATES[keys[Math.min(3,idx+1)]], '🚀 Bolder Alternative',  keys[Math.min(3,idx+1)]),
    build(TAX_OPT,                            '💰 Tax Optimizer',       'Moderate'),
  ];
}

function buildPortfolio(template, savings, name, riskLabel, slabNew, slabOld) {
  const alloc=template.map(([key,pct])=>{
    const a=ASSETS[key]; if(!a) return null;
    const rule=ASSET_TAX_RULES[a.taxRule];
    return {key,pct,amount:Math.round(savings*pct/100),...a,
      postTaxCagrNew:+rule.postTaxCAGR(a.cagr,slabNew).toFixed(2),
      postTaxCagrOld:+rule.postTaxCAGR(a.cagr,slabOld).toFixed(2),
      taxRuleLabel:rule.label,taxRuleColor:rule.color};
  }).filter(Boolean);
  return {name,riskLabel,alloc,goalNotes:[],
    blendedCagr:       +alloc.reduce((s,a)=>s+a.cagr*a.pct/100,0).toFixed(2),
    blendedPostTaxNew: +alloc.reduce((s,a)=>s+a.postTaxCagrNew*a.pct/100,0).toFixed(2),
    blendedPostTaxOld: +alloc.reduce((s,a)=>s+a.postTaxCagrOld*a.pct/100,0).toFixed(2),
    blendedPostTaxCagr:+alloc.reduce((s,a)=>s+a.postTaxCagrNew*a.pct/100,0).toFixed(2),
  };
}

// ─── PROJECTIONS — default 20yr to prevent ₹undefinedL on 20Y view ───────────

export function projectNetWorth(cagrPct, annualSavings, years = 20) {
  const r = cagrPct / 100;
  return Array.from({length: years + 1}, (_, i) => ({
    year:  `Y${i}`,
    value: i === 0 ? 0 : +(annualSavings * ((Math.pow(1+r,i)-1)/r) / 100_000).toFixed(2),
  }));
}

// ─── RISK PROFILER ────────────────────────────────────────────────────────────

export function getRiskProfile(age, occupation, income, savings) {
  let s=0;
  if(age<25)s+=30;else if(age<35)s+=25;else if(age<45)s+=18;else if(age<55)s+=10;else s+=4;
  const low=['Government Employee','PSU Employee','Retired'];
  const mid=['Salaried (MNC/Private)','Doctor / Lawyer (Professional)'];
  const high=['Self-Employed / Freelancer','Business Owner','Startup Founder'];
  if(low.includes(occupation))s+=10;else if(mid.includes(occupation))s+=18;else if(high.includes(occupation))s+=25;else s+=12;
  const r=income>0?savings/income:0;
  if(r>=0.4)s+=20;else if(r>=0.25)s+=14;else s+=7;
  if(s<=35)return{score:s,label:'Conservative',  color:'#4A9EE8'};
  if(s<=55)return{score:s,label:'Moderate',       color:'#E8921A'};
  if(s<=70)return{score:s,label:'Aggressive',     color:'#fb923c'};
  return      {score:s,label:'Very Aggressive',   color:'#E84040'};
}

// ─── TRACKER HELPERS ─────────────────────────────────────────────────────────

export function computeSavingsFromTracker() {
  try {
    const txs=JSON.parse(localStorage.getItem('wealthwise_transactions')||'[]');
    if(!txs.length) return null;
    const bm={};
    txs.forEach(t=>{const d=new Date(t.date),k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;if(!bm[k])bm[k]={income:0,expenses:0};if(t.type==='income')bm[k].income+=t.amount;if(t.type==='expense')bm[k].expenses+=t.amount;});
    const months=Object.values(bm),mc=months.length; if(!mc) return null;
    const ti=months.reduce((s,m)=>s+m.income,0),te=months.reduce((s,m)=>s+m.expenses,0),ms=(ti-te)/mc;
    return{annualSavings:Math.max(0,Math.round(ms*12)),monthsCovered:mc,totalIncome:Math.round(ti),totalExpenses:Math.round(te),isPartialYear:mc<12,monthlySavings:Math.round(ms)};
  } catch { return null; }
}

export function extractTrackerDeductions() {
  try {
    const txs=JSON.parse(localStorage.getItem('wealthwise_transactions')||'[]');
    return{
      health80D:    Math.round(txs.filter(t=>t.type==='expense'&&t.category==='health').reduce((s,t)=>s+t.amount,0)),
      potential80C: Math.round(txs.filter(t=>t.type==='expense'&&t.category==='investment').reduce((s,t)=>s+t.amount,0)),
    };
  } catch { return {}; }
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

export function fmtINR(n) {
  if(!n&&n!==0) return '—';
  if(n>=10_000_000) return `₹${(n/10_000_000).toFixed(2)}Cr`;
  if(n>=100_000)    return `₹${(n/100_000).toFixed(2)}L`;
  if(n>=1_000)      return `₹${(n/1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

export const OCCUPATIONS = [
  'Government Employee','PSU Employee','Salaried (MNC/Private)',
  'Self-Employed / Freelancer','Business Owner',
  'Doctor / Lawyer (Professional)','Startup Founder','Retired','Student / Part-time',
];
