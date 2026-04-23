/**
 * taxEngine.js — WealthWise v4
 * FY 2026-27 India
 *
 * NEW in v4:
 *  • HUF (Hindu Undivided Family) entity type with correct tax treatment
 *  • Agricultural income — partial integration method
 *  • Loans as deduction sources (home loan, education loan, personal loan)
 *  • "Other" income correctly taxed at slab rate
 *  • Expenditure-based deductions passed in from tracker
 *  • Fixed: regime corpus glitch — each regime now gets its own slab rate → corpus
 *  • 10-year projection default (20yr also available)
 *  • Goals integration — goal-aware portfolio adjustment
 */

// ─── ENTITY TYPES ─────────────────────────────────────────────────────────────

export const ENTITY_TYPES = [
  { key: 'individual', label: 'Individual',            icon: '👤' },
  { key: 'huf',        label: 'HUF (Hindu Undivided Family)', icon: '🏛️' },
];

// ─── INCOME SOURCES ───────────────────────────────────────────────────────────

export const INCOME_SOURCES = [
  { key: 'salary',         label: 'Salary / CTC',              icon: '💼', taxType: 'slab',    regime: 'both',
    note: 'Standard deduction (₹75K new / ₹50K old) auto-applied' },
  { key: 'business',       label: 'Business Profit',           icon: '🏢', taxType: 'slab',    regime: 'both',
    note: 'Net profit after all business expenses' },
  { key: 'freelance',      label: 'Freelance / Consulting',    icon: '💻', taxType: 'slab',    regime: 'both',
    note: 'Net receipts after deductible expenses' },
  { key: 'rental',         label: 'Rental Income',             icon: '🏠', taxType: 'slab',    regime: 'both',
    note: '30% standard deduction auto-applied (Sec 24). Municipal taxes also deductible.' },
  { key: 'fd_interest',    label: 'FD / RD / Post Office Int.', icon: '🏦', taxType: 'slab',   regime: 'both',
    note: 'Taxable at slab. TDS @10% if >₹40K/yr (₹50K seniors). Deduct TDS already paid.' },
  { key: 'savings_int',    label: 'Savings Account Interest',  icon: '💰', taxType: 'slab',    regime: 'both',
    note: '80TTA: ₹10K exempt (individual <60). 80TTB: ₹50K exempt (senior 60+). Auto-applied based on age.' },
  { key: 'dividends',      label: 'Dividend Income',           icon: '📈', taxType: 'slab',    regime: 'both',
    note: 'Taxable at slab rate. TDS @10% if >₹5K per company.' },
  { key: 'ltcg_equity',    label: 'LTCG — Equity / MF',        icon: '📊', taxType: 'ltcg10',  regime: 'both',
    note: '10% above ₹1.25L exemption (FY26-27). Enter gross LTCG before exemption.' },
  { key: 'stcg_equity',    label: 'STCG — Equity / MF',        icon: '📊', taxType: 'stcg15',  regime: 'both',
    note: '15% flat on short-term gains (held <1yr). No exemption.' },
  { key: 'ltcg_property',     label: 'LTCG — Property / Gold (Pre Jul 23, 2024)', icon: '🏗️', taxType: 'ltcg20',   regime: 'both',
    note: '20% WITH indexation. Property or gold sold/purchased before July 23, 2024. Sec 54/54F/54EC exemption may apply.' },
  { key: 'ltcg_property_new', label: 'LTCG — Property / Gold (Post Jul 23, 2024)', icon: '🥇', taxType: 'ltcg12_5', regime: 'both',
    note: '12.5% WITHOUT indexation. Budget 2024 rule — property or gold purchased/sold after July 23, 2024. Enter gross LTCG amount.' },
  { key: 'agricultural',   label: 'Agricultural Income',       icon: '🌾', taxType: 'agri',    regime: 'both',
    note: 'Fully exempt from central tax. But used for rate computation if total income > basic exemption.' },
  { key: 'crypto',         label: 'Crypto / VDA Income',       icon: '₿',  taxType: 'crypto30', regime: 'both',
    note: '30% flat tax + 1% TDS on every transaction. No deductions, no exemptions, no loss set-off.' },
  { key: 'other',          label: 'Other Income',              icon: '💵', taxType: 'slab',    regime: 'both',
    note: 'Taxed at your marginal slab rate (e.g. pension, gifts above ₹50K, winnings, etc.)' },
];

// ─── LOAN TYPES (deduction sources, not income) ──────────────────────────────

export const LOAN_TYPES = [
  { key: 'home_loan_principal', label: 'Home Loan Principal',   icon: '🏠',
    section: '80C', limit: 150000, note: 'Principal repayment counts toward 80C ₹1.5L limit (old regime only)' },
  { key: 'home_loan_interest',  label: 'Home Loan Interest',    icon: '🏠',
    section: '24b', limit: 200000, note: 'Up to ₹2L/yr on self-occupied (old regime). No limit on let-out.' },
  { key: 'education_loan_int',  label: 'Education Loan Interest',icon: '🎓',
    section: '80E', limit: null,  note: 'Full interest deductible. No cap. Valid for 8 years. Old regime.' },
  { key: 'personal_loan',       label: 'Personal Loan',         icon: '💳',
    section: null,  limit: null,  note: 'No tax deduction on personal loan interest. Enter for financial planning only.' },
];

// ─── ASSET TAX RULES ─────────────────────────────────────────────────────────

export const ASSET_TAX_RULES = {
  TAX_FREE:      { label: 'Tax-Free',            color: '#1DB873', postTaxCAGR: (g)    => g        },
  LTCG_EQUITY:   { label: 'LTCG 10%',            color: '#4A9EE8', postTaxCAGR: (g)    => g * 0.90 },
  STCG_EQUITY:   { label: 'STCG 15%',            color: '#E8921A', postTaxCAGR: (g)    => g * 0.85 },
  SLAB_RATE:     { label: 'Slab Rate',            color: '#9B72CF', postTaxCAGR: (g, r) => g * (1 - r) },
  LTCG_PROPERTY:     { label: 'LTCG 20% (indexed)',  color: '#fb923c', postTaxCAGR: (g) => g * 0.80 },
  LTCG_PROPERTY_NEW: { label: 'LTCG 12.5%',          color: '#ffa726', postTaxCAGR: (g) => g * 0.875 },
  CRYPTO:        { label: '30% Flat',             color: '#E84040', postTaxCAGR: (g)    => g * 0.70 },
  SGB:           { label: 'Tax-Free (SGB)',        color: '#1DB873', postTaxCAGR: (g)    => g        },
  NPS:           { label: 'Partly Tax-Free',      color: '#6ee7b7', postTaxCAGR: (g)    => g * 0.88 },
};

// ─── ASSETS v4 ────────────────────────────────────────────────────────────────

export const ASSETS = {
  PPF:        { cagr:7.1,  label:'PPF',                  color:'#4A9EE8', lock:'15yr',    taxRule:'TAX_FREE',      note:'EEE status. Fully tax-free maturity.' },
  SavingsAcc: { cagr:3.5,  label:'Savings Account',      color:'#818cf8', lock:'None',    taxRule:'SLAB_RATE',     note:'80TTA/TTB exemption on first ₹10K-₹50K. Emergency fund only.' },
  FD:         { cagr:7.2,  label:'Fixed Deposit',         color:'#7c8cf8', lock:'1-5yr',  taxRule:'SLAB_RATE',     note:'Interest fully taxable at slab. TDS @10% above threshold.' },
  NPS:        { cagr:11.0, label:'NPS',                   color:'#9B72CF', lock:'Till 60',taxRule:'NPS',           note:'60% lump sum tax-free. 40% annuity taxable. Excellent 80CCD(1B) benefit.' },
  DebtMF:     { cagr:7.5,  label:'Debt Mutual Fund',      color:'#60a5fa', lock:'None',   taxRule:'SLAB_RATE',     note:'No indexation post Apr 2023. Gains at slab rate.' },
  Gold:       { cagr:11.0, label:'Digital Gold / ETF',    color:'#E8921A', lock:'None',   taxRule:'LTCG_PROPERTY_NEW', note:'LTCG (>3yr) 12.5% without indexation (Budget 2024). Better via SGB for tax-free gains.' },
  SGB:        { cagr:11.0, label:'Sovereign Gold Bond',   color:'#FFB84D', lock:'8yr',    taxRule:'SGB',           note:'Best gold option. 2.5% p.a. interest (taxable). Maturity fully tax-free.' },
  ELSS:       { cagr:14.0, label:'ELSS (Tax Saver MF)',   color:'#1DB873', lock:'3yr',    taxRule:'LTCG_EQUITY',   note:'LTCG above ₹1.25L at 10%. 80C eligible. Best equity tax-saver.' },
  IndexMF:    { cagr:13.0, label:'Index MF (Nifty 50)',   color:'#34d399', lock:'None',   taxRule:'LTCG_EQUITY',   note:'LTCG above ₹1.25L at 10%. Low expense ratio.' },
  LargeCapMF: { cagr:14.5, label:'Large Cap MF',          color:'#6ee7b7', lock:'None',   taxRule:'LTCG_EQUITY',   note:'LTCG above ₹1.25L at 10%.' },
  MidSmallMF: { cagr:17.0, label:'Mid / Small Cap MF',    color:'#FFB84D', lock:'None',   taxRule:'LTCG_EQUITY',   note:'7yr+ horizon. LTCG above ₹1.25L at 10%.' },
  Stocks:     { cagr:15.0, label:'Direct Stocks',         color:'#fb923c', lock:'None',   taxRule:'LTCG_EQUITY',   note:'LTCG/STCG as applicable. High research required.' },
  RealEstate: { cagr:9.5,  label:'Real Estate',           color:'#f472b6', lock:'5yr+',   taxRule:'LTCG_PROPERTY', note:'LTCG (>2yr) 20% with indexation. Section 54 exemption if reinvested.' },
  Bitcoin:    { cagr:35.0, label:'Bitcoin / Crypto',      color:'#E84040', lock:'None',   taxRule:'CRYPTO',        note:'30% flat + 1% TDS per transaction. No loss set-off allowed.' },
};

// ─── MULTI-INCOME TAX ENGINE (v4) ─────────────────────────────────────────────

/**
 * Compute tax for multiple income sources.
 *
 * @param {Object} incomes      - Income amounts by key (salary, rental, crypto, etc.)
 * @param {number} age          - User age (auto-applies 80TTA vs 80TTB)
 * @param {string} entityType   - 'individual' or 'huf'
 * @param {Object} loanDeductions - { home_loan_interest, education_loan_int, home_loan_principal }
 * @param {Object} trackerDeductions - { health, insurance } from expense tracker
 * @returns Comprehensive tax breakdown for both regimes
 */
export function computeMultiIncomeTax(
  incomes = {},
  age = 30,
  entityType = 'individual',
  loanDeductions = {},
  trackerDeductions = {}
) {
  const isSenior = age >= 60;
  const isHUF    = entityType === 'huf';

  const {
    salary        = 0, business     = 0, freelance    = 0,
    rental        = 0, fd_interest  = 0, savings_int  = 0,
    dividends     = 0, ltcg_equity  = 0, stcg_equity  = 0,
    ltcg_property = 0, ltcg_property_new = 0, agricultural = 0, crypto = 0,
    other         = 0,
  } = incomes;

  // ── Agricultural income (partial integration) ─────────────────────────────
  // Agricultural income is exempt but used to push ordinary income into higher slabs
  const agriIncome = agricultural;

  // ── Rental: 30% standard deduction under Sec 24 ─────────────────────────
  const rentalTaxable = rental * 0.70;

  // ── Savings interest exemption (auto from age) ───────────────────────────
  const savingsExemption = (isSenior || isHUF) ? 50_000 : 10_000;
  const savingsIntTaxable = Math.max(0, savings_int - savingsExemption);

  // ── LTCG equity exemption ₹1.25L (FY26-27) ───────────────────────────────
  const LTCG_EQUITY_EXEMPTION = 125_000;
  const ltcgEquityTaxable = Math.max(0, ltcg_equity - LTCG_EQUITY_EXEMPTION);

  // ── Ordinary income (slab-taxed) ─────────────────────────────────────────
  const ordinaryGross = salary + business + freelance + rentalTaxable +
    fd_interest + savingsIntTaxable + dividends + other;

  // ── Total gross ───────────────────────────────────────────────────────────
  const totalGrossIncome = salary + business + freelance + rental +
    fd_interest + savings_int + dividends +
    ltcg_equity + stcg_equity + ltcg_property + ltcg_property_new + agricultural + crypto + other;

  // ── Loan deductions (for old regime only) ────────────────────────────────
  const homeLoanInterest   = Math.min(loanDeductions.home_loan_interest  || 0, 200_000);
  const eduLoanInterest    = loanDeductions.education_loan_int || 0; // no cap
  const homeLoanPrincipal  = Math.min(loanDeductions.home_loan_principal || 0, 150_000); // part of 80C

  // ── Tracker-derived deductions ────────────────────────────────────────────
  // Health insurance premiums from expense tracker (80D)
  const trackerHealth80D   = Math.min(trackerDeductions.health80D || 0, isSenior ? 50_000 : 25_000);
  const trackerParents80D  = Math.min(trackerDeductions.parents80D || 0, 50_000);
  const totalTrackerDeductions = trackerHealth80D + trackerParents80D;

  // ── Compute old regime ────────────────────────────────────────────────────
  const oldRegimeDeductions = {
    d80C:      Math.min(150_000, 150_000), // assume max claimed
    d80D:      totalTrackerDeductions || 25_000, // from tracker or default
    nps:       50_000,
    section24b: homeLoanInterest,
    section80E: eduLoanInterest,
    homeLoanPrincipal,
  };
  const newOrdinary = _newRegime(ordinaryGross, agriIncome);
  const oldOrdinary = _oldRegime(ordinaryGross, agriIncome, oldRegimeDeductions, isSenior, isHUF);

  // ── Special rate taxes (same both regimes) ────────────────────────────────
  const ltcgEquityTax    = ltcgEquityTaxable * 0.10;
  const stcgEquityTax    = stcg_equity * 0.15;
  const ltcgPropertyTax    = ltcg_property * 0.20;
  const ltcgPropertyNewTax = ltcg_property_new * 0.125;
  const cryptoTax          = crypto * 0.30;
  const specialTax         = (ltcgEquityTax + stcgEquityTax + ltcgPropertyTax + ltcgPropertyNewTax + cryptoTax) * 1.04;

  const newTotal = newOrdinary.tax + specialTax;
  const oldTotal = oldOrdinary.tax + specialTax;
  const bestIsNew = newTotal <= oldTotal;
  const bestRegime = bestIsNew ? 'new' : 'old';
  const bestTax    = Math.round(Math.min(newTotal, oldTotal));

  // ── Per-regime marginal rates (KEY FIX: corpus now differs per regime) ───
  const newSlabRate = getMarginalRate(ordinaryGross - (agriIncome > 0 ? 0 : 0), 'new');
  const oldSlabRate = getMarginalRate(oldOrdinary.taxableIncome, 'old');

  return {
    totalGrossIncome:     Math.round(totalGrossIncome),
    ordinaryGross:        Math.round(ordinaryGross),
    agriIncome:           Math.round(agriIncome),
    rentalTaxable:        Math.round(rentalTaxable),
    savingsIntTaxable:    Math.round(savingsIntTaxable),
    savingsExemption,
    ltcgEquityTaxable:    Math.round(ltcgEquityTaxable),
    // Special taxes
    ltcgEquityTax:        Math.round(ltcgEquityTax),
    stcgEquityTax:        Math.round(stcgEquityTax),
    ltcgPropertyTax:      Math.round(ltcgPropertyTax),
    ltcgPropertyNewTax:   Math.round(ltcgPropertyNewTax),
    cryptoTax:            Math.round(cryptoTax),
    specialTaxTotal:      Math.round(specialTax),
    // Regime details
    newRegime: { ...newOrdinary, totalTax: Math.round(newTotal), slabRate: newSlabRate },
    oldRegime: { ...oldOrdinary, totalTax: Math.round(oldTotal), slabRate: oldSlabRate,
                 deductionsApplied: oldRegimeDeductions },
    // Best regime
    bestRegime,
    bestTax,
    taxSaving:            Math.round(Math.abs(newTotal - oldTotal)),
    // Per-regime slab rates (used to compute two different corpora)
    newSlabRate,
    oldSlabRate,
    marginalSlabRate:     bestIsNew ? newSlabRate : oldSlabRate,
    // Metadata
    isSenior,
    isHUF,
    trackerDeductionsUsed: totalTrackerDeductions,
    loanDeductionsUsed: homeLoanInterest + eduLoanInterest,
  };
}

// ─── REGIME CALCULATION HELPERS ───────────────────────────────────────────────

function _newRegime(gross, agriIncome = 0) {
  const std = 75_000;
  let taxable = Math.max(0, gross - std);

  // Agricultural integration: if agri income exists and ordinary taxable > 0
  // Tax = Tax(taxable + agri) - Tax(2.5L + agri) [partial integration]
  let tax = 0;
  if (agriIncome > 0 && taxable > 0) {
    tax = _newSlabTax(taxable + agriIncome) - _newSlabTax(250_000 + agriIncome);
    tax = Math.max(0, tax);
  } else {
    // 87A rebate — zero tax if net taxable ≤ ₹12L
    if (taxable <= 1_200_000) {
      return { tax: 0, taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'new', rebate: true };
    }
    tax = _newSlabTax(taxable);
  }
  return { tax: Math.round(tax * 1.04), taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'new', rebate: false };
}

function _newSlabTax(income) {
  const slabs = [
    [400_000, 0.00], [400_000, 0.05], [400_000, 0.10],
    [400_000, 0.15], [400_000, 0.20], [400_000, 0.25], [Infinity, 0.30],
  ];
  let tax = 0, rem = income;
  for (const [slab, rate] of slabs) {
    if (rem <= 0) break;
    tax += Math.min(rem, slab) * rate;
    rem -= slab;
  }
  return tax;
}

function _oldRegime(gross, agriIncome = 0, deductions = {}, isSenior = false, isHUF = false) {
  const std       = 50_000;
  const d80C      = Math.min((deductions.d80C || 150_000) + (deductions.homeLoanPrincipal || 0), 150_000);
  const d80D      = Math.min(deductions.d80D || 25_000, 75_000);
  const nps       = Math.min(deductions.nps || 50_000, 50_000);
  const s24b      = Math.min(deductions.section24b || 0, 200_000);
  const s80E      = deductions.section80E || 0;

  // HUF has same basic exemption as individual. No senior citizen benefit.
  const totalDeductions = (isHUF ? 0 : std) + d80C + d80D + nps + s24b + s80E;
  let taxable = Math.max(0, gross - totalDeductions);

  const basicExemption = isSenior ? 300_000 : 250_000; // seniors get 3L
  let tax = 0;

  if (agriIncome > 0 && taxable > 0) {
    tax = _oldSlabTax(taxable + agriIncome, isSenior) - _oldSlabTax(basicExemption + agriIncome, isSenior);
    tax = Math.max(0, tax);
  } else {
    if (taxable <= 500_000) {
      return { tax: 0, taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'old', rebate: true };
    }
    tax = _oldSlabTax(taxable, isSenior);
  }
  return { tax: Math.round(tax * 1.04), taxable: Math.round(taxable), taxableIncome: Math.round(taxable), regime: 'old', rebate: false };
}

function _oldSlabTax(income, isSenior = false) {
  const basicEx = isSenior ? 300_000 : 250_000;
  const slabs = [
    [basicEx, 0.00], [250_000, 0.05], [500_000, 0.20], [Infinity, 0.30],
  ];
  let tax = 0, rem = income;
  for (const [slab, rate] of slabs) {
    if (rem <= 0) break;
    tax += Math.min(rem, slab) * rate;
    rem -= slab;
  }
  return tax;
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
  } else {
    if (taxableIncome <= 250_000)   return 0.00;
    if (taxableIncome <= 500_000)   return 0.05;
    if (taxableIncome <= 1_000_000) return 0.20;
    return 0.30;
  }
}

// Legacy single-income helpers (backward compat)
export function calcNewRegime(gross) { return _newRegime(gross, 0); }
export function calcOldRegime(gross, deductions = {}) { return _oldRegime(gross, 0, deductions); }
export function bestRegime(income) {
  const n = _newRegime(income, 0), o = _oldRegime(income, 0);
  return n.tax <= o.tax ? { ...n, saving: o.tax - n.tax } : { ...o, saving: n.tax - o.tax };
}

// ─── PORTFOLIO TEMPLATES ──────────────────────────────────────────────────────

const TEMPLATES = {
  Conservative:    [['PPF',25],['FD',20],['NPS',20],['DebtMF',15],['SGB',10],['SavingsAcc',10]],
  Moderate:        [['ELSS',20],['IndexMF',20],['PPF',15],['NPS',15],['SGB',15],['FD',15]],
  Aggressive:      [['IndexMF',25],['LargeCapMF',20],['MidSmallMF',15],['ELSS',15],['SGB',10],['Stocks',10],['RealEstate',5]],
  'Very Aggressive':[['MidSmallMF',20],['Stocks',20],['IndexMF',20],['Bitcoin',10],['SGB',10],['ELSS',10],['RealEstate',10]],
};
const TAX_OPT = [['ELSS',25],['NPS',20],['PPF',25],['IndexMF',15],['SGB',15]];

// ─── GOALS-AWARE PORTFOLIO ADJUSTMENT ────────────────────────────────────────

/**
 * Adjusts portfolio allocation based on user's financial goals.
 * Goals with timeline < 3yr → shift that proportion to FD/Debt
 * Goals with timeline 3-7yr → shift to ELSS/PPF/Hybrid
 * Goals with timeline 7yr+ → maintain equity allocation
 *
 * @param {Array}  baseTemplate  - [[assetKey, pct], ...]
 * @param {Array}  goals         - [{targetAmount, years, amountSaved}, ...]
 * @param {number} annualSavings
 * @returns adjusted template + goal alignment notes
 */
export function adjustPortfolioForGoals(baseTemplate, goals = [], annualSavings) {
  if (!goals.length || !annualSavings) return { template: baseTemplate, notes: [] };

  const totalTarget = goals.reduce((s, g) => s + Math.max(0, g.targetAmount - (g.amountSaved || 0)), 0);
  const notes = [];

  // Sort goals by urgency
  const shortTerm = goals.filter(g => g.years <= 3);
  const medTerm   = goals.filter(g => g.years > 3 && g.years <= 7);

  let safeShift = 0; // % to shift to safe assets
  let medShift  = 0; // % to shift to medium assets

  shortTerm.forEach(g => {
    const needed = Math.max(0, g.targetAmount - (g.amountSaved || 0));
    const pct    = Math.min(40, Math.round((needed / Math.max(1, totalTarget)) * 100));
    safeShift += pct;
    notes.push(`⏰ "${g.label}" in ${g.years}yr → ${pct}% shifted to FD/Debt for capital safety`);
  });

  medTerm.forEach(g => {
    const needed = Math.max(0, g.targetAmount - (g.amountSaved || 0));
    const pct    = Math.min(30, Math.round((needed / Math.max(1, totalTarget)) * 50));
    medShift += pct;
    notes.push(`🎯 "${g.label}" in ${g.years}yr → ${pct}% in ELSS/PPF for balanced growth`);
  });

  safeShift = Math.min(safeShift, 45);
  medShift  = Math.min(medShift, 30);
  const totalShift = safeShift + medShift;

  if (totalShift === 0) return { template: baseTemplate, notes: [] };

  // Reduce equity allocation by totalShift, add to safe/medium
  let adjusted = baseTemplate.map(([k, p]) => [k, p]);
  const equityKeys = new Set(['IndexMF','LargeCapMF','MidSmallMF','Stocks','Bitcoin']);
  let equityTotal  = adjusted.filter(([k]) => equityKeys.has(k)).reduce((s,[,p])=>s+p,0);
  let reduction    = Math.min(totalShift, equityTotal - 5);

  if (reduction > 0) {
    // Reduce equity proportionally
    adjusted = adjusted.map(([k, p]) =>
      equityKeys.has(k) ? [k, Math.max(2, Math.round(p * (1 - reduction / equityTotal)))] : [k, p]
    );
    // Add safe/medium assets
    const fdIdx  = adjusted.findIndex(([k]) => k === 'FD');
    const elssIdx= adjusted.findIndex(([k]) => k === 'ELSS');
    if (fdIdx  >= 0 && safeShift > 0) adjusted[fdIdx][1]  += safeShift;
    else if (safeShift > 0) adjusted.push(['FD', safeShift]);
    if (elssIdx >= 0 && medShift > 0) adjusted[elssIdx][1] += medShift;
    else if (medShift > 0) adjusted.push(['ELSS', medShift]);
  }

  // Normalise to 100%
  const total = adjusted.reduce((s,[,p])=>s+p, 0);
  const normalised = adjusted.map(([k,p]) => [k, Math.round(p * 100 / total)]);

  return { template: normalised, notes };
}

// ─── PORTFOLIO GENERATOR ──────────────────────────────────────────────────────

export function generatePortfolios(riskLabel, savings, slabRateNew = 0.30, slabRateOld = 0.30, goals = []) {
  const keys   = Object.keys(TEMPLATES);
  const idx    = keys.indexOf(riskLabel);
  const safer  = keys[Math.max(0, idx - 1)];
  const bolder = keys[Math.min(keys.length - 1, idx + 1)];

  const { template: goalAdjusted, notes: goalNotes } = adjustPortfolioForGoals(
    TEMPLATES[riskLabel], goals, savings
  );

  const build = (tmpl, name, rl, useGoalAdj = false) =>
    buildPortfolio(useGoalAdj ? goalAdjusted : tmpl, savings, name, rl, slabRateNew, slabRateOld);

  const portfolios = [
    { ...build(TEMPLATES[riskLabel], '⭐ Recommended for You', riskLabel, true), goalNotes },
    build(TEMPLATES[safer],           '🛡️ Safer Alternative',   safer),
    build(TEMPLATES[bolder],          '🚀 Bolder Alternative',  bolder),
    build(TAX_OPT,                    '💰 Tax Optimizer',       'Moderate'),
  ];

  return portfolios;
}

function buildPortfolio(template, savings, name, riskLabel, slabRateNew, slabRateOld) {
  const alloc = template.map(([key, pct]) => {
    const a    = ASSETS[key];
    if (!a) return null;
    const rule = ASSET_TAX_RULES[a.taxRule];
    // ← KEY FIX: compute post-tax CAGR for BOTH regimes separately
    const postTaxNew = +rule.postTaxCAGR(a.cagr, slabRateNew).toFixed(2);
    const postTaxOld = +rule.postTaxCAGR(a.cagr, slabRateOld).toFixed(2);
    return { key, pct, amount: Math.round(savings * pct / 100), ...a,
      postTaxCagrNew: postTaxNew, postTaxCagrOld: postTaxOld,
      taxRuleLabel: rule.label, taxRuleColor: rule.color };
  }).filter(Boolean);

  const blendedPreTax    = +alloc.reduce((s,a) => s + a.cagr        * a.pct / 100, 0).toFixed(2);
  const blendedPostNew   = +alloc.reduce((s,a) => s + a.postTaxCagrNew * a.pct / 100, 0).toFixed(2);
  const blendedPostOld   = +alloc.reduce((s,a) => s + a.postTaxCagrOld * a.pct / 100, 0).toFixed(2);

  return {
    name, riskLabel, alloc,
    blendedCagr:        blendedPreTax,
    blendedPostTaxNew:  blendedPostNew,
    blendedPostTaxOld:  blendedPostOld,
    // Use new regime CAGR as display default (user sees difference in chart)
    blendedPostTaxCagr: blendedPostNew,
    goalNotes: [],
  };
}

// ─── PROJECTIONS ──────────────────────────────────────────────────────────────

export function projectNetWorth(cagrPct, annualSavings, years = 10) {
  const r = cagrPct / 100;
  return Array.from({ length: years + 1 }, (_, i) => ({
    year:  `Y${i}`,
    value: i === 0 ? 0 : +(annualSavings * ((Math.pow(1 + r, i) - 1) / r) / 100_000).toFixed(2),
  }));
}

// ─── RISK PROFILER ────────────────────────────────────────────────────────────

export function getRiskProfile(age, occupation, income, savings) {
  let score = 0;
  if      (age < 25) score += 30;
  else if (age < 35) score += 25;
  else if (age < 45) score += 18;
  else if (age < 55) score += 10;
  else               score += 4;
  const low  = ['Government Employee','PSU Employee','Retired'];
  const mid  = ['Salaried (MNC/Private)','Doctor / Lawyer (Professional)'];
  const high = ['Self-Employed / Freelancer','Business Owner','Startup Founder'];
  if      (low.includes(occupation))  score += 10;
  else if (mid.includes(occupation))  score += 18;
  else if (high.includes(occupation)) score += 25;
  else                                score += 12;
  const ratio = income > 0 ? savings / income : 0;
  if      (ratio >= 0.4)  score += 20;
  else if (ratio >= 0.25) score += 14;
  else                    score += 7;
  if      (score <= 35) return { score, label: 'Conservative',   color: '#4A9EE8' };
  else if (score <= 55) return { score, label: 'Moderate',       color: '#E8921A' };
  else if (score <= 70) return { score, label: 'Aggressive',     color: '#fb923c' };
  else                  return { score, label: 'Very Aggressive', color: '#E84040' };
}

// ─── TRACKER-DERIVED SAVINGS ─────────────────────────────────────────────────

/**
 * Compute annual savings from localStorage transaction data.
 * Returns { annualSavings, monthsCovered, income, expenses, isPartialYear }
 */
export function computeSavingsFromTracker() {
  try {
    const txs = JSON.parse(localStorage.getItem('wealthwise_transactions') || '[]');
    if (!txs.length) return null;

    const byMonth = {};
    txs.forEach(t => {
      const d   = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0 };
      if (t.type === 'income')  byMonth[key].income   += t.amount;
      if (t.type === 'expense') byMonth[key].expenses += t.amount;
    });

    const months = Object.values(byMonth);
    const monthsCovered = months.length;
    if (!monthsCovered) return null;

    const totalIncome   = months.reduce((s, m) => s + m.income, 0);
    const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
    const monthlySavings = (totalIncome - totalExpenses) / monthsCovered;
    const annualSavings  = Math.max(0, Math.round(monthlySavings * 12));

    return {
      annualSavings,
      monthsCovered,
      totalIncome:   Math.round(totalIncome),
      totalExpenses: Math.round(totalExpenses),
      isPartialYear: monthsCovered < 12,
      monthlySavings: Math.round(monthlySavings),
    };
  } catch { return null; }
}

/**
 * Extract 80D-eligible health spending from tracker transactions.
 */
export function extractTrackerDeductions() {
  try {
    const txs = JSON.parse(localStorage.getItem('wealthwise_transactions') || '[]');
    const health80D = txs
      .filter(t => t.type === 'expense' && t.category === 'health')
      .reduce((s, t) => s + t.amount, 0);
    const investmentFrom80C = txs
      .filter(t => t.type === 'expense' && t.category === 'investment')
      .reduce((s, t) => s + t.amount, 0);
    return { health80D: Math.round(health80D), potential80C: Math.round(investmentFrom80C) };
  } catch { return {}; }
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

export function fmtINR(n) {
  if (!n && n !== 0) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

export const OCCUPATIONS = [
  'Government Employee', 'PSU Employee', 'Salaried (MNC/Private)',
  'Self-Employed / Freelancer', 'Business Owner',
  'Doctor / Lawyer (Professional)', 'Startup Founder', 'Retired', 'Student / Part-time',
];
