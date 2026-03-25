/**
 * taxEngine.js
 * Pure JS — runs in browser instantly, no backend needed.
 * FY 2026-27 India Income Tax rules.
 */

// ─── TAX CALCULATION ─────────────────────────────────────────────────────────

export function calcNewRegime(grossIncome) {
  const std = 75000;
  const taxable = Math.max(0, grossIncome - std);

  // Rebate u/s 87A — zero tax if net taxable ≤ ₹12L (Budget 2025)
  if (taxable <= 1_200_000) {
    return { tax: 0, taxable, regime: 'new', rebate: true };
  }

  const slabs = [
    [400_000, 0.00],
    [400_000, 0.05],
    [400_000, 0.10],
    [400_000, 0.15],
    [400_000, 0.20],
    [400_000, 0.25],
    [Infinity, 0.30],
  ];

  let tax = 0, rem = taxable;
  for (const [slab, rate] of slabs) {
    if (rem <= 0) break;
    tax += Math.min(rem, slab) * rate;
    rem -= slab;
  }
  tax = Math.round(tax * 1.04); // 4% cess
  return { tax, taxable, regime: 'new', rebate: false };
}

export function calcOldRegime(grossIncome, deductions = {}) {
  const std   = 50_000;
  const d80C  = Math.min(deductions.d80C  ?? 150_000, 150_000);
  const d80D  = Math.min(deductions.d80D  ?? 25_000,   50_000);
  const nps   = Math.min(deductions.nps   ?? 50_000,   50_000);
  const taxable = Math.max(0, grossIncome - std - d80C - d80D - nps);

  if (taxable <= 500_000) {
    return { tax: 0, taxable, regime: 'old', rebate: true };
  }

  const slabs = [
    [250_000, 0.00],
    [250_000, 0.05],
    [500_000, 0.20],
    [Infinity, 0.30],
  ];

  let tax = 0, rem = taxable;
  for (const [slab, rate] of slabs) {
    if (rem <= 0) break;
    tax += Math.min(rem, slab) * rate;
    rem -= slab;
  }
  tax = Math.round(tax * 1.04);
  return { tax, taxable, regime: 'old', rebate: false };
}

export function bestRegime(income) {
  const deductions = { d80C: 150_000, d80D: 25_000, nps: 50_000 };
  const n = calcNewRegime(income);
  const o = calcOldRegime(income, deductions);
  return n.tax <= o.tax
    ? { ...n, saving: o.tax - n.tax }
    : { ...o, saving: n.tax - o.tax };
}

// ─── RISK PROFILER ────────────────────────────────────────────────────────────

export function getRiskProfile(age, occupation, income, savings) {
  let score = 0;

  if      (age < 25) score += 30;
  else if (age < 35) score += 25;
  else if (age < 45) score += 18;
  else if (age < 55) score += 10;
  else               score += 4;

  const lowRisk  = ['Government Employee', 'PSU Employee', 'Retired'];
  const midRisk  = ['Salaried (MNC/Private)', 'Doctor / Lawyer (Professional)'];
  const highRisk = ['Self-Employed / Freelancer', 'Business Owner', 'Startup Founder'];

  if      (lowRisk.includes(occupation))  score += 10;
  else if (midRisk.includes(occupation))  score += 18;
  else if (highRisk.includes(occupation)) score += 25;
  else                                    score += 12;

  const ratio = income > 0 ? savings / income : 0;
  if      (ratio >= 0.4)  score += 20;
  else if (ratio >= 0.25) score += 14;
  else                    score += 7;

  if      (score <= 35) return { score, label: 'Conservative',    color: '#4fa3f7' };
  else if (score <= 55) return { score, label: 'Moderate',        color: '#f0b429' };
  else if (score <= 70) return { score, label: 'Aggressive',      color: '#fb923c' };
  else                  return { score, label: 'Very Aggressive',  color: '#ff5757' };
}

// ─── ASSETS ───────────────────────────────────────────────────────────────────

export const ASSETS = {
  PPF:        { cagr: 7.1,  label: 'PPF',               color: '#4fa3f7', lock: '15yr',  taxFree: true  },
  FD:         { cagr: 7.0,  label: 'Fixed Deposit',      color: '#7c8cf8', lock: '1-5yr', taxFree: false },
  NPS:        { cagr: 11.0, label: 'NPS',                color: '#a78bfa', lock: 'Till 60',taxFree: true },
  DebtMF:     { cagr: 7.5,  label: 'Debt Mutual Fund',   color: '#60a5fa', lock: 'None',  taxFree: false },
  Gold:       { cagr: 11.0, label: 'Digital Gold / SGB', color: '#f0b429', lock: '8yr',   taxFree: false },
  ELSS:       { cagr: 14.0, label: 'ELSS (Tax Saver)',   color: '#34d399', lock: '3yr',   taxFree: true  },
  IndexMF:    { cagr: 13.0, label: 'Index MF (Nifty 50)',color: '#10d97e', lock: 'None',  taxFree: false },
  LargeCapMF: { cagr: 14.5, label: 'Large Cap MF',       color: '#6ee7b7', lock: 'None',  taxFree: false },
  MidSmallMF: { cagr: 17.0, label: 'Mid / Small Cap MF', color: '#fbbf24', lock: 'None',  taxFree: false },
  Stocks:     { cagr: 15.0, label: 'Direct Stocks',      color: '#fb923c', lock: 'None',  taxFree: false },
  RealEstate: { cagr: 9.5,  label: 'Real Estate',        color: '#f472b6', lock: '5yr+',  taxFree: false },
  Bitcoin:    { cagr: 35.0, label: 'Bitcoin / Crypto',   color: '#ff5757', lock: 'None',  taxFree: false },
};

// ─── PORTFOLIO TEMPLATES ──────────────────────────────────────────────────────

const TEMPLATES = {
  Conservative:    [['PPF',30],['FD',25],['NPS',20],['DebtMF',15],['Gold',10]],
  Moderate:        [['ELSS',20],['IndexMF',25],['PPF',15],['NPS',15],['Gold',15],['FD',10]],
  Aggressive:      [['IndexMF',25],['LargeCapMF',20],['MidSmallMF',20],['ELSS',15],['Gold',10],['Stocks',10]],
  'Very Aggressive':[['MidSmallMF',25],['Stocks',25],['IndexMF',20],['Bitcoin',10],['Gold',10],['ELSS',10]],
};

const TAX_OPTIMIZER = [['ELSS',30],['NPS',20],['PPF',25],['IndexMF',15],['Gold',10]];

function buildPortfolio(template, savings, name, riskLabel) {
  const alloc = template.map(([key, pct]) => ({
    key, pct,
    amount: Math.round(savings * pct / 100),
    ...ASSETS[key],
  }));
  const blendedCagr = alloc.reduce((s, a) => s + a.cagr * a.pct / 100, 0);
  return { name, riskLabel, alloc, blendedCagr: +blendedCagr.toFixed(2) };
}

export function generatePortfolios(riskLabel, savings) {
  const keys  = Object.keys(TEMPLATES);
  const idx   = keys.indexOf(riskLabel);
  const safer  = keys[Math.max(0, idx - 1)];
  const bolder = keys[Math.min(keys.length - 1, idx + 1)];

  return [
    buildPortfolio(TEMPLATES[riskLabel], savings, '⭐ Recommended for You', riskLabel),
    buildPortfolio(TEMPLATES[safer],     savings, '🛡️ Safer Alternative',   safer),
    buildPortfolio(TEMPLATES[bolder],    savings, '🚀 Bolder Alternative',  bolder),
    buildPortfolio(TAX_OPTIMIZER,        savings, '💰 Tax Optimizer',       'Moderate'),
  ];
}

// ─── NET WORTH PROJECTION ─────────────────────────────────────────────────────

export function projectNetWorth(blendedCagrPct, annualSavings, years = 20) {
  const r = blendedCagrPct / 100;
  return Array.from({ length: years + 1 }, (_, i) => ({
    year: `Y${i}`,
    value: i === 0 ? 0 : +(annualSavings * ((Math.pow(1 + r, i) - 1) / r) / 100_000).toFixed(2),
  }));
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

export function fmtINR(n) {
  if (!n && n !== 0) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

export const OCCUPATIONS = [
  'Government Employee', 'PSU Employee', 'Salaried (MNC/Private)',
  'Self-Employed / Freelancer', 'Business Owner',
  'Doctor / Lawyer (Professional)', 'Startup Founder',
  'Retired', 'Student / Part-time',
];
