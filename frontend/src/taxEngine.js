/**
 * taxEngine.js — WealthWise v3
 * ─────────────────────────────────────────────────────────────────────────────
 * FY 2026-27 India
 *
 * NEW in v3:
 *  • Multiple income sources (salary, rental, FD interest, savings interest,
 *    capital gains, business, freelance, dividends)
 *  • Per-asset tax type and post-tax CAGR calculation
 *  • Rental income with 30% standard deduction
 *  • Savings interest with 80TTA (₹10K) / 80TTB (₹50K senior) exemption
 *  • Crypto 30% flat tax
 *  • Real estate as both income source and investment asset
 *  • Savings account as a trackable asset
 */

// ─── INCOME SOURCES ───────────────────────────────────────────────────────────

export const INCOME_SOURCES = [
  { key: 'salary',         label: 'Salary / CTC',             icon: '💼', note: 'Standard deduction auto-applied' },
  { key: 'business',       label: 'Business Profit',          icon: '🏢', note: 'Net profit after expenses' },
  { key: 'freelance',      label: 'Freelance / Consulting',   icon: '💻', note: 'Net receipts' },
  { key: 'rental',         label: 'Rental Income',            icon: '🏠', note: '30% standard deduction auto-applied under Sec 24' },
  { key: 'fd_interest',    label: 'FD / RD Interest',         icon: '🏦', note: 'Taxable at slab rate. TDS may already be deducted.' },
  { key: 'savings_int',    label: 'Savings A/C Interest',     icon: '💰', note: '80TTA: first ₹10K exempt (80TTB: ₹50K for 60+)' },
  { key: 'dividends',      label: 'Dividend Income',          icon: '📈', note: 'Taxable at slab rate. TDS @10% if >₹5K/company.' },
  { key: 'ltcg_equity',    label: 'LTCG — Equity / MF',      icon: '📊', note: 'Taxed @10% above ₹1.25L (FY26-27 limit). Enter gross gains.' },
  { key: 'stcg_equity',    label: 'STCG — Equity / MF',      icon: '📊', note: 'Taxed @15% flat. Enter gross gains.' },
  { key: 'ltcg_property',  label: 'LTCG — Property',         icon: '🏗️',  note: '20% with indexation (held >2 years). Enter gross gains.' },
  { key: 'crypto',         label: 'Crypto / VDA Income',      icon: '₿',  note: '30% flat tax + 1% TDS. No deductions allowed.' },
  { key: 'other',          label: 'Other Income',             icon: '💵', note: 'Taxable at slab rate' },
];

export const INCOME_SOURCE_MAP = Object.fromEntries(INCOME_SOURCES.map(s => [s.key, s]));

// ─── ASSET TAX TYPES ─────────────────────────────────────────────────────────

/**
 * Tax type definitions.
 * postTaxCAGR(grossCagr, slabRate) → effective CAGR after taxes
 */
export const ASSET_TAX_RULES = {
  // Tax-free
  TAX_FREE: {
    label: 'Tax-Free',
    color: '#10d97e',
    description: 'Maturity proceeds fully exempt. No tax on gains.',
    postTaxCAGR: (gross) => gross,
  },
  // LTCG equity @ 10% above ₹1.25L exemption
  // Approximation: applies 10% on all gains (conservative — for large corpora)
  LTCG_EQUITY: {
    label: 'LTCG 10% (equity)',
    color: '#4fa3f7',
    description: 'Long-term capital gains taxed at 10% above ₹1.25L/yr exemption.',
    postTaxCAGR: (gross) => gross * 0.90,
  },
  // STCG equity @ 15%
  STCG_EQUITY: {
    label: 'STCG 15% (equity)',
    color: '#f0b429',
    description: 'Short-term capital gains (held <1yr) taxed at 15%.',
    postTaxCAGR: (gross) => gross * 0.85,
  },
  // Debt MF / FD / Savings — taxed at income slab (post Apr 2023 amendment)
  SLAB_RATE: {
    label: 'Slab Rate',
    color: '#a78bfa',
    description: 'Returns added to income and taxed at your marginal slab rate.',
    postTaxCAGR: (gross, slabRate) => gross * (1 - slabRate),
  },
  // LTCG property — 20% with indexation benefit
  LTCG_PROPERTY: {
    label: 'LTCG 20% (property)',
    color: '#fb923c',
    description: 'Long-term capital gains on property taxed at 20% with indexation.',
    postTaxCAGR: (gross) => gross * 0.80,
  },
  // Crypto — 30% flat, no deductions
  CRYPTO: {
    label: '30% Flat (Crypto)',
    color: '#ff5757',
    description: 'Virtual Digital Assets taxed at 30% flat. No deductions or exemptions. 1% TDS.',
    postTaxCAGR: (gross) => gross * 0.70,
  },
  // SGB — tax-free on redemption after 8 years; pre-maturity = LTCG with indexation
  SGB: {
    label: 'Tax-Free (SGB maturity)',
    color: '#10d97e',
    description: 'RBI Sovereign Gold Bond: redemption after 8 years is fully tax-free. Pre-maturity LTCG applies.',
    postTaxCAGR: (gross) => gross,
  },
  // NPS — 60% lump sum tax-free, 40% annuity taxable
  NPS: {
    label: 'Partially Tax-Free (NPS)',
    color: '#6ee7b7',
    description: '60% lump sum at maturity is tax-free; 40% must be used for annuity (income taxable at slab).',
    postTaxCAGR: (gross) => gross * 0.88, // approx 60% free + 40% at ~30% slab
  },
};

// ─── ASSETS ───────────────────────────────────────────────────────────────────

export const ASSETS = {
  PPF: {
    cagr: 7.1, label: 'PPF', color: '#4fa3f7', lock: '15yr',
    taxRule: 'TAX_FREE',
    note: 'Exempt-Exempt-Exempt (EEE). Best guaranteed tax-free return.',
  },
  SavingsAcc: {
    cagr: 3.5, label: 'Savings Account', color: '#818cf8', lock: 'None',
    taxRule: 'SLAB_RATE',
    note: 'Interest taxable at slab; 80TTA gives ₹10K exemption. Best for emergency fund only.',
  },
  FD: {
    cagr: 7.2, label: 'Fixed Deposit', color: '#7c8cf8', lock: '1-5yr',
    taxRule: 'SLAB_RATE',
    note: 'Interest fully taxable at your slab rate. TDS @10% if interest >₹40K/yr (₹50K for seniors).',
  },
  NPS: {
    cagr: 11.0, label: 'NPS', color: '#a78bfa', lock: 'Till 60',
    taxRule: 'NPS',
    note: '60% lump sum tax-free at 60. 40% must buy annuity (annuity income taxable). Excellent for 80CCD(1B) deduction.',
  },
  DebtMF: {
    cagr: 7.5, label: 'Debt Mutual Fund', color: '#60a5fa', lock: 'None',
    taxRule: 'SLAB_RATE',
    note: 'Post Apr 2023: no indexation. Gains taxed at slab rate regardless of holding period.',
  },
  Gold: {
    cagr: 11.0, label: 'Digital Gold / Gold ETF', color: '#f0b429', lock: 'None',
    taxRule: 'LTCG_PROPERTY',
    note: 'LTCG (>3yr hold) at 20% with indexation. STCG at slab rate. Better held via SGB for tax-free gains.',
  },
  SGB: {
    cagr: 11.0, label: 'Sovereign Gold Bond (SGB)', color: '#fbbf24', lock: '8yr',
    taxRule: 'SGB',
    note: 'Best gold investment: 2.5% p.a. interest (taxable) + gold appreciation. Redemption after 8yr fully tax-free.',
  },
  ELSS: {
    cagr: 14.0, label: 'ELSS (Tax Saver MF)', color: '#34d399', lock: '3yr',
    taxRule: 'LTCG_EQUITY',
    note: 'LTCG above ₹1.25L taxed at 10%. Section 80C eligible. Best equity option for tax-saving.',
  },
  IndexMF: {
    cagr: 13.0, label: 'Index MF (Nifty 50)', color: '#10d97e', lock: 'None',
    taxRule: 'LTCG_EQUITY',
    note: 'LTCG above ₹1.25L at 10%. Low expense ratio. Best passive equity vehicle.',
  },
  LargeCapMF: {
    cagr: 14.5, label: 'Large Cap MF', color: '#6ee7b7', lock: 'None',
    taxRule: 'LTCG_EQUITY',
    note: 'LTCG above ₹1.25L at 10%. Slightly higher returns than pure index with more fund manager risk.',
  },
  MidSmallMF: {
    cagr: 17.0, label: 'Mid / Small Cap MF', color: '#fbbf24', lock: 'None',
    taxRule: 'LTCG_EQUITY',
    note: 'Higher volatility. LTCG above ₹1.25L at 10%. Best for 7yr+ horizon.',
  },
  Stocks: {
    cagr: 15.0, label: 'Direct Stocks', color: '#fb923c', lock: 'None',
    taxRule: 'LTCG_EQUITY',
    note: 'LTCG >1yr at 10% (above ₹1.25L). STCG <1yr at 15%. High research required.',
  },
  RealEstate: {
    cagr: 9.5, label: 'Real Estate', color: '#f472b6', lock: '5yr+',
    taxRule: 'LTCG_PROPERTY',
    note: 'LTCG (>2yr) at 20% with indexation. High ticket size. Section 54 exemption if reinvested.',
  },
  Bitcoin: {
    cagr: 35.0, label: 'Bitcoin / Crypto', color: '#ff5757', lock: 'None',
    taxRule: 'CRYPTO',
    note: '30% flat tax on ALL gains. No deduction of losses allowed. 1% TDS on every sale. Very high volatility.',
  },
};

// ─── POST-TAX CAGR CALCULATOR ─────────────────────────────────────────────────

/**
 * Returns post-tax CAGR for an asset given the user's marginal slab rate.
 * slabRate: 0.0 to 0.30 (e.g. 0.30 for 30% slab)
 */
export function postTaxCAGR(assetKey, slabRate = 0.30) {
  const asset = ASSETS[assetKey];
  if (!asset) return 0;
  const rule = ASSET_TAX_RULES[asset.taxRule];
  if (!rule) return asset.cagr;
  return +rule.postTaxCAGR(asset.cagr, slabRate).toFixed(2);
}

// ─── MULTI-INCOME TAX ENGINE ─────────────────────────────────────────────────

/**
 * Compute total taxable income from multiple sources.
 *
 * incomes: { salary, business, freelance, rental, fd_interest, savings_int,
 *            dividends, ltcg_equity, stcg_equity, ltcg_property, crypto, other }
 * All values in ₹, can be 0 or undefined.
 * isSenior: boolean (60+) — affects 80TTB vs 80TTA, FD TDS threshold
 *
 * Returns:
 *  totalGrossIncome, taxableIncomeOrdinary, taxableLTCG, taxableSTCG,
 *  taxableCrypto, taxablePropertyLTCG, incomeTax (both regimes), bestRegime
 */
export function computeMultiIncomeTax(incomes = {}, isSenior = false) {
  const {
    salary        = 0,
    business      = 0,
    freelance     = 0,
    rental        = 0,
    fd_interest   = 0,
    savings_int   = 0,
    dividends     = 0,
    ltcg_equity   = 0,
    stcg_equity   = 0,
    ltcg_property = 0,
    crypto        = 0,
    other         = 0,
  } = incomes;

  // ── Rental: 30% standard deduction under Sec 24 ─────────────────────────
  const rentalTaxable = rental * 0.70;

  // ── Savings interest: 80TTA (₹10K) or 80TTB for senior (₹50K) ──────────
  const savingsExemption = isSenior ? 50_000 : 10_000;
  const savingsIntTaxable = Math.max(0, savings_int - savingsExemption);

  // ── LTCG equity: ₹1.25L exemption (FY26-27 limit raised from ₹1L) ──────
  const LTCG_EQUITY_EXEMPTION = 125_000;
  const ltcgEquityTaxable = Math.max(0, ltcg_equity - LTCG_EQUITY_EXEMPTION);

  // ── Ordinary income (taxed at slab) ──────────────────────────────────────
  const ordinaryGross = salary + business + freelance + rentalTaxable +
    fd_interest + savingsIntTaxable + dividends + other;

  const totalGrossIncome = salary + business + freelance + rental +
    fd_interest + savings_int + dividends +
    ltcg_equity + stcg_equity + ltcg_property + crypto + other;

  // ── New Regime — ordinary income ─────────────────────────────────────────
  const newOrdinary = calcNewRegime(ordinaryGross);

  // ── Old Regime — ordinary income ─────────────────────────────────────────
  const oldOrdinary = calcOldRegime(ordinaryGross);

  // ── Special rate taxes (same in both regimes) ────────────────────────────
  const ltcgEquityTax    = ltcgEquityTaxable * 0.10;         // 10%
  const stcgEquityTax    = stcg_equity * 0.15;               // 15%
  const ltcgPropertyTax  = ltcg_property * 0.20;             // 20%
  const cryptoTax        = crypto * 0.30;                    // 30% flat

  const specialTax = (ltcgEquityTax + stcgEquityTax + ltcgPropertyTax + cryptoTax) * 1.04; // +4% cess

  const newTotal = newOrdinary.tax + specialTax;
  const oldTotal = oldOrdinary.tax + specialTax;

  const bestIsNew = newTotal <= oldTotal;

  return {
    totalGrossIncome,
    ordinaryGross,
    rentalTaxable,
    savingsIntTaxable,
    ltcgEquityTaxable,
    // Individual special taxes
    ltcgEquityTax:   +ltcgEquityTax.toFixed(0),
    stcgEquityTax:   +stcgEquityTax.toFixed(0),
    ltcgPropertyTax: +ltcgPropertyTax.toFixed(0),
    cryptoTax:       +cryptoTax.toFixed(0),
    specialTaxTotal: +specialTax.toFixed(0),
    // Regime comparison
    newRegime: { ...newOrdinary, totalTax: Math.round(newTotal) },
    oldRegime: { ...oldOrdinary, totalTax: Math.round(oldTotal) },
    bestRegime: bestIsNew ? 'new' : 'old',
    bestTax:   Math.round(Math.min(newTotal, oldTotal)),
    taxSaving: Math.round(Math.abs(newTotal - oldTotal)),
    // Marginal slab rate for post-tax asset return calculations
    marginalSlabRate: getMarginalRate(ordinaryGross, bestIsNew ? 'new' : 'old'),
  };
}

/**
 * Get marginal slab rate for a given ordinary income and regime.
 */
export function getMarginalRate(ordinaryIncome, regime = 'new') {
  if (regime === 'new') {
    const taxable = Math.max(0, ordinaryIncome - 75_000);
    if (taxable <= 400_000)  return 0.00;
    if (taxable <= 800_000)  return 0.05;
    if (taxable <= 1_200_000) return 0.10;
    if (taxable <= 1_600_000) return 0.15;
    if (taxable <= 2_000_000) return 0.20;
    if (taxable <= 2_400_000) return 0.25;
    return 0.30;
  } else {
    const taxable = Math.max(0, ordinaryIncome - 50_000 - 150_000 - 25_000 - 50_000);
    if (taxable <= 250_000) return 0.00;
    if (taxable <= 500_000) return 0.05;
    if (taxable <= 1_000_000) return 0.20;
    return 0.30;
  }
}

// ─── LEGACY SINGLE-INCOME TAX FUNCTIONS (kept for backward compatibility) ────

export function calcNewRegime(grossIncome) {
  const taxable = Math.max(0, grossIncome - 75_000);
  if (taxable <= 1_200_000) return { tax: 0, taxable, regime: 'new', rebate: true };
  const slabs = [[400_000,0],[400_000,.05],[400_000,.10],[400_000,.15],[400_000,.20],[400_000,.25],[Infinity,.30]];
  let tax = 0, rem = taxable;
  for (const [slab, rate] of slabs) { if (rem<=0) break; tax += Math.min(rem,slab)*rate; rem-=slab; }
  return { tax: Math.round(tax*1.04), taxable, regime: 'new', rebate: false };
}

export function calcOldRegime(grossIncome, deductions = {}) {
  const std=50_000, d80C=Math.min(deductions.d80C??150_000,150_000),
        d80D=Math.min(deductions.d80D??25_000,50_000), nps=Math.min(deductions.nps??50_000,50_000);
  const taxable = Math.max(0, grossIncome - std - d80C - d80D - nps);
  if (taxable <= 500_000) return { tax: 0, taxable, regime: 'old', rebate: true };
  const slabs = [[250_000,0],[250_000,.05],[500_000,.20],[Infinity,.30]];
  let tax=0, rem=taxable;
  for (const [slab,rate] of slabs) { if (rem<=0) break; tax+=Math.min(rem,slab)*rate; rem-=slab; }
  return { tax: Math.round(tax*1.04), taxable, regime: 'old', rebate: false };
}

export function bestRegime(income) {
  const n=calcNewRegime(income), o=calcOldRegime(income);
  return n.tax<=o.tax ? {...n, saving: o.tax-n.tax} : {...o, saving: n.tax-o.tax};
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
  const ratio = income > 0 ? savings/income : 0;
  if      (ratio >= 0.4)  score += 20;
  else if (ratio >= 0.25) score += 14;
  else                    score += 7;
  if      (score <= 35) return { score, label: 'Conservative',   color: '#4fa3f7' };
  else if (score <= 55) return { score, label: 'Moderate',       color: '#f0b429' };
  else if (score <= 70) return { score, label: 'Aggressive',     color: '#fb923c' };
  else                  return { score, label: 'Very Aggressive', color: '#ff5757' };
}

// ─── PORTFOLIO TEMPLATES ──────────────────────────────────────────────────────

const TEMPLATES = {
  Conservative:    [['PPF',25],['FD',20],['NPS',20],['DebtMF',15],['SGB',10],['SavingsAcc',10]],
  Moderate:        [['ELSS',20],['IndexMF',20],['PPF',15],['NPS',15],['SGB',15],['FD',15]],
  Aggressive:      [['IndexMF',25],['LargeCapMF',20],['MidSmallMF',15],['ELSS',15],['SGB',10],['Stocks',10],['RealEstate',5]],
  'Very Aggressive':[['MidSmallMF',20],['Stocks',20],['IndexMF',20],['Bitcoin',10],['SGB',10],['ELSS',10],['RealEstate',10]],
};
const TAX_OPT = [['ELSS',25],['NPS',20],['PPF',25],['IndexMF',15],['SGB',15]];

export function generatePortfolios(riskLabel, savings, slabRate = 0.30) {
  const keys  = Object.keys(TEMPLATES);
  const idx   = keys.indexOf(riskLabel);
  const safer  = keys[Math.max(0, idx-1)];
  const bolder = keys[Math.min(keys.length-1, idx+1)];
  const build  = (tmpl, name, rl) => buildPortfolio(tmpl, savings, name, rl, slabRate);
  return [
    build(TEMPLATES[riskLabel], '⭐ Recommended for You', riskLabel),
    build(TEMPLATES[safer],     '🛡️ Safer Alternative',   safer),
    build(TEMPLATES[bolder],    '🚀 Bolder Alternative',  bolder),
    build(TAX_OPT,              '💰 Tax Optimizer',       'Moderate'),
  ];
}

function buildPortfolio(template, savings, name, riskLabel, slabRate) {
  const alloc = template.map(([key, pct]) => {
    const a = ASSETS[key];
    const rule = ASSET_TAX_RULES[a.taxRule];
    const postTax = +rule.postTaxCAGR(a.cagr, slabRate).toFixed(2);
    return { key, pct, amount: Math.round(savings*pct/100), ...a,
      postTaxCagr: postTax, taxRule: a.taxRule,
      taxRuleLabel: rule.label, taxRuleColor: rule.color,
      taxNote: a.note };
  });
  const blendedPreTax  = +alloc.reduce((s,a)=>s+a.cagr*a.pct/100, 0).toFixed(2);
  const blendedPostTax = +alloc.reduce((s,a)=>s+a.postTaxCagr*a.pct/100, 0).toFixed(2);
  return { name, riskLabel, alloc, blendedCagr: blendedPreTax, blendedPostTaxCagr: blendedPostTax };
}

// ─── NET WORTH PROJECTION (pre and post tax) ──────────────────────────────────

export function projectNetWorth(cagrPct, annualSavings, years = 20) {
  const r = cagrPct / 100;
  return Array.from({ length: years+1 }, (_,i) => ({
    year: `Y${i}`,
    value: i===0 ? 0 : +(annualSavings*((Math.pow(1+r,i)-1)/r)/100_000).toFixed(2),
  }));
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

export function fmtINR(n) {
  if (!n && n!==0) return '—';
  if (n>=10_000_000) return `₹${(n/10_000_000).toFixed(2)}Cr`;
  if (n>=100_000)    return `₹${(n/100_000).toFixed(2)}L`;
  if (n>=1_000)      return `₹${(n/1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

export const OCCUPATIONS = [
  'Government Employee','PSU Employee','Salaried (MNC/Private)',
  'Self-Employed / Freelancer','Business Owner',
  'Doctor / Lawyer (Professional)','Startup Founder','Retired','Student / Part-time',
];
