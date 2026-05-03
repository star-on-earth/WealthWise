/**
 * taxEngine.test.js
 * Run: npm run test (from frontend/)
 *
 * Tests every critical tax calculation so slab changes next Budget
 * can't silently break the app.
 *
 * v2 additions:
 *  • HRA exemption (Sec 10(13A)) — 3-limit formula
 *  • 44AD presumptive business — 8% and 6% digital variants
 *  • 44ADA presumptive professional — 50% of gross receipts
 *  • ltcg_debt (Sec 112) — 20% flat
 *  • Marginal rate computed on POST-DEDUCTION taxable income (the bug that existed)
 *  • computeHRAExemption standalone helper
 *  • compute44AD / compute44ADA helpers
 *  • requires44AB audit threshold
 *  • getRiskProfileFromAnswers — new 7-factor profiler
 */

import { describe, it, expect } from 'vitest';
import {
  computeMultiIncomeTax,
  calcNewRegime,
  calcOldRegime,
  getRiskProfile,
  generatePortfolios,
  postTaxCAGR,
  getMarginalRate,
  fmtINR,
  computeHRAExemption,
  compute44AD,
  compute44ADA,
  requires44AB,
} from '../taxEngine.js';
import { getRiskProfileFromAnswers } from '../RiskProfiler.jsx';

// ─── NEW REGIME SLAB TESTS ─────────────────────────────────────────────────

describe('New Regime — Section 87A Rebate', () => {
  it('Zero tax: gross ₹12,00,000 net taxable (₹12L - ₹75K std = ₹11.25L ≤ ₹12L)', () => {
    const result = calcNewRegime(1_200_000);
    expect(result.tax).toBe(0);
    expect(result.rebate).toBe(true);
  });

  it('Zero tax: gross ₹12,75,000 (exactly at ₹12.75L gross limit)', () => {
    const result = calcNewRegime(1_275_000);
    expect(result.tax).toBe(0);
  });

  it('Tax applies: gross ₹13,00,000 (above ₹12.75L limit)', () => {
    const result = calcNewRegime(1_300_000);
    expect(result.tax).toBeGreaterThan(0);
    expect(result.rebate).toBe(false);
  });
});

describe('New Regime — Slab Rates', () => {
  it('₹5L gross → 0 tax', () => {
    expect(calcNewRegime(500_000).tax).toBe(0);
  });

  it('₹10L gross → ₹33,800 tax (with 4% cess)', () => {
    // ₹10L - ₹75K = ₹9.25L taxable → 0% on ₹4L, 5% on ₹4L=₹20K, 10% on ₹1.25L=₹12.5K
    // Subtotal = ₹32.5K × 1.04 = ₹33,800
    expect(calcNewRegime(1_000_000).tax).toBe(33_800);
  });

  it('₹30L gross → 30% slab applies', () => {
    const r = calcNewRegime(3_000_000);
    expect(r.tax).toBeGreaterThan(0);
    expect(r.rebate).toBe(false);
  });
});

// ─── OLD REGIME ────────────────────────────────────────────────────────────

describe('Old Regime', () => {
  it('₹5L gross → zero tax', () => {
    expect(calcOldRegime(500_000).tax).toBe(0);
  });

  it('₹8L gross → tax payable', () => {
    expect(calcOldRegime(800_000).tax).toBeGreaterThan(0);
  });
});

// ─── MULTI-INCOME TAX ENGINE ──────────────────────────────────────────────

describe('computeMultiIncomeTax — core', () => {
  it('Salary only ₹12,75,000 → zero tax (87A rebate)', () => {
    const r = computeMultiIncomeTax({ salary: 1_275_000 }, 30, 'individual');
    expect(r.bestTax).toBe(0);
    expect(r.bestRegime).toBe('new');
  });

  it('Rental income gets 30% Sec 24 deduction', () => {
    const r = computeMultiIncomeTax({ rental: 1_000_000 }, 30, 'individual');
    expect(r.rentalTaxable).toBe(700_000);
  });

  it('Savings interest: 80TTA ₹10K exemption for individual <60', () => {
    const r = computeMultiIncomeTax({ savings_int: 50_000 }, 30, 'individual');
    expect(r.savingsIntTaxable).toBe(40_000);
    expect(r.savingsExemption).toBe(10_000);
  });

  it('Savings interest: 80TTB ₹50K exemption for senior 60+', () => {
    const r = computeMultiIncomeTax({ savings_int: 80_000 }, 65, 'individual');
    expect(r.savingsIntTaxable).toBe(30_000);
    expect(r.savingsExemption).toBe(50_000);
  });

  it('HUF gets ₹50K interest exemption regardless of age', () => {
    const r = computeMultiIncomeTax({ savings_int: 60_000 }, 35, 'huf');
    expect(r.savingsExemption).toBe(50_000);
    expect(r.savingsIntTaxable).toBe(10_000);
  });

  it('LTCG equity: ₹1.25L exemption applied', () => {
    const r = computeMultiIncomeTax({ ltcg_equity: 200_000 }, 30, 'individual');
    expect(r.ltcgEquityTaxable).toBe(75_000);
    expect(r.ltcgEquityTax).toBe(7_500);
  });

  it('LTCG equity below ₹1.25L: zero tax', () => {
    const r = computeMultiIncomeTax({ ltcg_equity: 100_000 }, 30, 'individual');
    expect(r.ltcgEquityTaxable).toBe(0);
    expect(r.ltcgEquityTax).toBe(0);
  });

  it('STCG equity: 15% flat', () => {
    const r = computeMultiIncomeTax({ stcg_equity: 100_000 }, 30, 'individual');
    expect(r.stcgEquityTax).toBe(15_000);
  });

  it('Crypto: 30% flat, no deductions', () => {
    const r = computeMultiIncomeTax({ crypto: 100_000 }, 30, 'individual');
    expect(r.cryptoTax).toBe(30_000);
  });

  it('"Other" income taxed at slab rate', () => {
    const r = computeMultiIncomeTax({ other: 2_000_000 }, 30, 'individual');
    expect(r.newRegime.tax).toBeGreaterThan(0);
    expect(r.ordinaryGross).toBe(2_000_000);
  });

  it('Agricultural income: exempt but used for rate computation', () => {
    const withAgri    = computeMultiIncomeTax({ salary: 500_000, agricultural: 200_000 }, 30);
    const withoutAgri = computeMultiIncomeTax({ salary: 500_000 }, 30);
    expect(withAgri.totalGrossIncome).toBe(700_000);
    expect(withAgri.bestTax).toBeGreaterThanOrEqual(withoutAgri.bestTax);
  });
});

// ─── LTCG DEBT (SEC 112) — NEW TESTS ─────────────────────────────────────

describe('ltcg_debt — Sec 112 (20% with indexation)', () => {
  it('₹5L debt MF LTCG → 20% tax before cess', () => {
    const r = computeMultiIncomeTax({ ltcg_debt: 500_000 }, 30, 'individual');
    // 20% of ₹5L = ₹1L, + 4% cess = ₹1,04,000
    expect(r.ltcgDebtTax).toBe(100_000);
    // With cess applied in specialTaxTotal
    expect(r.specialTaxTotal).toBe(Math.round(100_000 * 1.04));
  });

  it('ltcg_debt does not affect ordinaryGross (special rate, not slab)', () => {
    const withDebt    = computeMultiIncomeTax({ salary: 600_000, ltcg_debt: 200_000 }, 30);
    const withoutDebt = computeMultiIncomeTax({ salary: 600_000 }, 30);
    // Slab income unchanged — only special tax increases
    expect(withDebt.ordinaryGross).toBe(withoutDebt.ordinaryGross);
    expect(withDebt.ltcgDebtTax).toBe(200_000 * 0.20);
  });

  it('ltcg_debt zero → zero ltcgDebtTax', () => {
    const r = computeMultiIncomeTax({ salary: 1_000_000 }, 30, 'individual');
    expect(r.ltcgDebtTax).toBe(0);
  });
});

// ─── HRA EXEMPTION — NEW TESTS ────────────────────────────────────────────

describe('computeHRAExemption — Sec 10(13A)', () => {
  it('Metro: HRA exemption = min of 3 limits', () => {
    // basic=40K/mo=480K/yr, HRA=20K/mo=240K, rent=18K/mo=216K
    // limit1=240K (actual HRA), limit2=216K-(480K×10%)=216K-48K=168K, limit3=480K×50%=240K
    // min = 168K
    const exempt = computeHRAExemption({ hraReceived: 240_000, annualRent: 216_000, basicSalary: 480_000, cityType: 'metro' });
    expect(exempt).toBe(168_000);
  });

  it('Non-metro: 40% of basic used instead of 50%', () => {
    // basic=480K, limit3=480K×40%=192K, limit2=216K-48K=168K, limit1=240K → min=168K
    const exempt = computeHRAExemption({ hraReceived: 240_000, annualRent: 216_000, basicSalary: 480_000, cityType: 'non-metro' });
    expect(exempt).toBe(168_000);
  });

  it('No exemption if rent paid = 0', () => {
    const exempt = computeHRAExemption({ hraReceived: 200_000, annualRent: 0, basicSalary: 400_000, cityType: 'metro' });
    expect(exempt).toBe(0);
  });

  it('No exemption if HRA received = 0', () => {
    const exempt = computeHRAExemption({ hraReceived: 0, annualRent: 150_000, basicSalary: 400_000, cityType: 'metro' });
    expect(exempt).toBe(0);
  });

  it('HRA exemption reduces taxable salary in computeMultiIncomeTax', () => {
    // ₹15L CTC, ₹3L HRA received, ₹2.4L rent paid, basic ₹6L, metro
    // limit1=3L, limit2=2.4L-(6L×10%)=2.4L-60K=1.8L, limit3=6L×50%=3L → exempt=1.8L
    const r = computeMultiIncomeTax(
      { salary: 1_500_000 }, 30, 'individual', {}, {},
      { hraReceived: 300_000, annualRent: 240_000, basicSalary: 600_000, cityType: 'metro' }
    );
    expect(r.hraExemption).toBe(180_000);
    // effective salary = 1_500_000 - 180_000 = 1_320_000
    expect(r.ordinaryGross).toBeLessThan(1_500_000 - 75_000); // less than no-HRA scenario
  });

  it('HRA exemption capped at actual HRA received (limit1)', () => {
    // Even if rent is very high, exemption ≤ actual HRA received
    const exempt = computeHRAExemption({ hraReceived: 50_000, annualRent: 500_000, basicSalary: 400_000, cityType: 'metro' });
    expect(exempt).toBeLessThanOrEqual(50_000);
  });
});

// ─── 44AD PRESUMPTIVE — NEW TESTS ─────────────────────────────────────────

describe('compute44AD — Sec 44AD presumptive business', () => {
  it('8% of turnover for cash/mixed receipts', () => {
    expect(compute44AD(5_000_000, false)).toBe(400_000); // 8% of ₹50L = ₹4L
  });

  it('6% of turnover for digital receipts', () => {
    expect(compute44AD(5_000_000, true)).toBe(300_000); // 6% of ₹50L = ₹3L
  });

  it('zero turnover → zero income', () => {
    expect(compute44AD(0, false)).toBe(0);
  });

  it('44AD income flows into slab computation via extraData', () => {
    // Turnover ₹20L, digital → deemed income = 6% = ₹1.2L
    const r = computeMultiIncomeTax(
      { business: 20_000_000 }, 30, 'individual', {}, {},
      { presumptive44AD: true, turnover44AD: 20_000_000, digital44AD: true }
    );
    // Effective business = 1_200_000, not 20_000_000
    expect(r.ordinaryGross).toBeLessThan(20_000_000 - 75_000);
  });
});

// ─── 44ADA PRESUMPTIVE — NEW TESTS ────────────────────────────────────────

describe('compute44ADA — Sec 44ADA presumptive professional', () => {
  it('50% of gross receipts is deemed income', () => {
    expect(compute44ADA(2_000_000)).toBe(1_000_000); // 50% of ₹20L = ₹10L
  });

  it('zero receipts → zero income', () => {
    expect(compute44ADA(0)).toBe(0);
  });

  it('44ADA not applied if receipts exceed ₹75L', () => {
    // extraData with grossReceipts44ADA > 7_500_000 should be ignored
    const r = computeMultiIncomeTax(
      { freelance: 8_000_000 }, 30, 'individual', {}, {},
      { presumptive44ADA: true, grossReceipts44ADA: 8_000_000 }
    );
    // Over limit → no presumptive override → freelance taxed in full
    expect(r.ordinaryGross).toBeGreaterThan(7_000_000);
  });

  it('44ADA applied correctly when receipts ≤ ₹75L', () => {
    // Gross receipts ₹50L → deemed income = ₹25L
    const r = computeMultiIncomeTax(
      { freelance: 5_000_000 }, 30, 'individual', {}, {},
      { presumptive44ADA: true, grossReceipts44ADA: 5_000_000 }
    );
    // ordinaryGross should be ~₹25L (after std deduction)
    expect(r.ordinaryGross).toBeCloseTo(2_500_000, -3);
  });
});

// ─── REQUIRES44AB AUDIT THRESHOLD — NEW TESTS ─────────────────────────────

describe('requires44AB — tax audit threshold', () => {
  it('Business turnover ₹1.5Cr (non-digital) → audit required', () => {
    expect(requires44AB({ businessTurnover: 15_000_000, fnoTurnover: 0, isDigital: false })).toBe(true);
  });

  it('Business turnover ₹90L → no audit', () => {
    expect(requires44AB({ businessTurnover: 9_000_000, fnoTurnover: 0, isDigital: false })).toBe(false);
  });

  it('Digital: threshold rises to ₹10Cr — ₹5Cr should not require audit', () => {
    expect(requires44AB({ businessTurnover: 50_000_000, fnoTurnover: 0, isDigital: true })).toBe(false);
  });

  it('Digital: ₹15Cr turnover → audit required even with digital', () => {
    expect(requires44AB({ businessTurnover: 150_000_000, fnoTurnover: 0, isDigital: true })).toBe(true);
  });

  it('F&O turnover ₹1.5Cr → audit required', () => {
    expect(requires44AB({ businessTurnover: 0, fnoTurnover: 15_000_000, isDigital: false })).toBe(true);
  });
});

// ─── MARGINAL RATE — THE ORIGINAL BUG ────────────────────────────────────
// These tests verify the fix: getMarginalRate must receive POST-deduction
// taxable income, not pre-deduction ordinaryGross.

describe('getMarginalRate — uses post-deduction taxable income', () => {
  it('New regime: ₹12L taxable → 10% slab', () => {
    expect(getMarginalRate(1_200_000, 'new')).toBe(0.10);
  });

  it('New regime: ₹25L taxable → 30%', () => {
    expect(getMarginalRate(2_500_000, 'new')).toBe(0.30);
  });

  it('Old regime: ₹6L taxable → 20%', () => {
    expect(getMarginalRate(600_000, 'old')).toBe(0.20);
  });

  it('Old regime: ₹2L taxable → 0%', () => {
    expect(getMarginalRate(200_000, 'old')).toBe(0.00);
  });

  it('BUG REGRESSION: ₹12.5L gross → new regime taxable=₹11.75L → rebate → slab=0%, NOT 10%', () => {
    // This was the bug: ordinaryGross=12.5L was passed, getMarginalRate returned 10%.
    // After fix: newOrdinary.taxableIncome=11.75L (≤12L → rebate) → slab=0%.
    const r = computeMultiIncomeTax({ salary: 1_250_000 }, 30, 'individual');
    // taxable = 12.5L - 75K = 11.75L → rebate → effective slab = 0%
    expect(r.newRegime.rebate).toBe(true);
    expect(r.newSlabRate).toBe(0.00);
  });

  it('BUG REGRESSION: ₹13.5L gross → taxable=₹12.75L > ₹12L → slab=10%, not 15%', () => {
    // ordinaryGross=13.5L was previously returned as 15% slab.
    // After fix: taxable=12.5L → 10% slab band.
    const r = computeMultiIncomeTax({ salary: 1_350_000 }, 30, 'individual');
    expect(r.newSlabRate).toBe(0.10);
  });
});

// ─── POST-TAX CAGR ────────────────────────────────────────────────────────

describe('postTaxCAGR', () => {
  it('PPF is tax-free: post-tax = pre-tax', () => {
    expect(postTaxCAGR('PPF', 0.30)).toBe(7.1);
  });
  it('Bitcoin: 30% flat → 70% retained', () => {
    expect(postTaxCAGR('Bitcoin', 0.30)).toBe(24.5);
  });
  it('ELSS: LTCG 10% → 90% retained', () => {
    expect(postTaxCAGR('ELSS', 0.30)).toBe(12.6);
  });
  it('FD at 30% slab: post-tax = 70% of 7.2', () => {
    expect(postTaxCAGR('FD', 0.30)).toBeCloseTo(5.04, 1);
  });
  it('SGB: tax-free at maturity', () => {
    expect(postTaxCAGR('SGB', 0.30)).toBe(11.0);
  });
  it('Higher slab rate = lower FD post-tax CAGR', () => {
    expect(postTaxCAGR('FD', 0.10)).toBeGreaterThan(postTaxCAGR('FD', 0.30));
  });
});

// ─── RISK PROFILER (OLD — 3-variable) ────────────────────────────────────

describe('getRiskProfile — legacy 3-variable', () => {
  it('Young (24), startup founder, high savings → Very Aggressive', () => {
    const r = getRiskProfile(24, 'Startup Founder', 1_000_000, 500_000);
    expect(r.label).toBe('Very Aggressive');
    expect(r.score).toBeGreaterThan(70);
  });

  it('Senior (58), government employee, low savings → Conservative', () => {
    const r = getRiskProfile(58, 'Government Employee', 800_000, 100_000);
    expect(r.label).toBe('Conservative');
  });
});

// ─── RISK PROFILER (NEW — 7-factor) — NEW TESTS ───────────────────────────

describe('getRiskProfileFromAnswers — 7-factor profiler', () => {
  const BASE = {
    age: 30, occupation: 'Salaried (MNC/Private)',
    annualIncome: 1_200_000, annualSavings: 360_000,
    hasHighDebt: false, dependents: 0,
    horizonYears: 15, selfRating: 3,
  };

  it('High debt burden reduces score vs no debt', () => {
    const noDebt   = getRiskProfileFromAnswers({ ...BASE, hasHighDebt: false });
    const highDebt = getRiskProfileFromAnswers({ ...BASE, hasHighDebt: true });
    expect(highDebt.score).toBeLessThan(noDebt.score);
  });

  it('3 dependents reduces score vs 0 dependents', () => {
    const no  = getRiskProfileFromAnswers({ ...BASE, dependents: 0 });
    const yes = getRiskProfileFromAnswers({ ...BASE, dependents: 3 });
    expect(yes.score).toBeLessThan(no.score);
  });

  it('Short horizon (2yr) gives lower score than long (20yr)', () => {
    const short = getRiskProfileFromAnswers({ ...BASE, horizonYears: 2  });
    const long  = getRiskProfileFromAnswers({ ...BASE, horizonYears: 20 });
    expect(long.score).toBeGreaterThan(short.score);
  });

  it('Self-rating 1 (panic seller) gives lower score than 5 (aggressive buyer)', () => {
    const panic      = getRiskProfileFromAnswers({ ...BASE, selfRating: 1 });
    const aggressive = getRiskProfileFromAnswers({ ...BASE, selfRating: 5 });
    expect(aggressive.score).toBeGreaterThan(panic.score);
  });

  it('Broke 25yr-old (high debt, 3 dependents) gets lower score than wealthy 25yr-old', () => {
    const wealthy = getRiskProfileFromAnswers({
      age: 25, occupation: 'Startup Founder',
      annualIncome: 2_000_000, annualSavings: 1_000_000,
      hasHighDebt: false, dependents: 0,
      horizonYears: 20, selfRating: 5,
    });
    const broke = getRiskProfileFromAnswers({
      age: 25, occupation: 'Startup Founder',
      annualIncome: 2_000_000, annualSavings: 100_000,
      hasHighDebt: true, dependents: 3,
      horizonYears: 2, selfRating: 1,
    });
    expect(wealthy.score).toBeGreaterThan(broke.score);
    // They should get different risk labels
    expect(wealthy.label).not.toBe(broke.label);
  });

  it('Score is clamped to 0-100', () => {
    const extremeLow = getRiskProfileFromAnswers({
      age: 80, occupation: 'Retired', annualIncome: 100_000, annualSavings: 0,
      hasHighDebt: true, dependents: 3, horizonYears: 1, selfRating: 1,
    });
    const extremeHigh = getRiskProfileFromAnswers({
      age: 22, occupation: 'Startup Founder', annualIncome: 5_000_000, annualSavings: 4_000_000,
      hasHighDebt: false, dependents: 0, horizonYears: 20, selfRating: 5,
    });
    expect(extremeLow.score).toBeGreaterThanOrEqual(0);
    expect(extremeHigh.score).toBeLessThanOrEqual(100);
  });
});

// ─── PORTFOLIO GENERATOR ──────────────────────────────────────────────────

describe('generatePortfolios', () => {
  it('Returns 4 portfolio options', () => {
    expect(generatePortfolios('Moderate', 300_000, 0.20, 0.30)).toHaveLength(4);
  });

  it('Each portfolio alloc sums to 100%', () => {
    for (const p of generatePortfolios('Aggressive', 500_000, 0.30, 0.30)) {
      expect(p.alloc.reduce((s, a) => s + a.pct, 0)).toBeCloseTo(100, 0);
    }
  });

  it('New vs old post-tax CAGR differ at different slab rates', () => {
    const [p] = generatePortfolios('Moderate', 300_000, 0.10, 0.30);
    expect(p.blendedPostTaxNew).not.toBe(p.blendedPostTaxOld);
  });

  it('Conservative portfolio has no Bitcoin', () => {
    const [recommended] = generatePortfolios('Conservative', 200_000, 0.20, 0.20);
    expect(recommended.alloc.some(a => a.key === 'Bitcoin')).toBe(false);
  });

  it('Very Aggressive portfolio: Bitcoin ≤ 5% (capped from 10%)', () => {
    const [recommended] = generatePortfolios('Very Aggressive', 500_000, 0.30, 0.30);
    const btc = recommended.alloc.find(a => a.key === 'Bitcoin');
    expect(btc?.pct).toBeLessThanOrEqual(5);
  });
});

// ─── FORMATTER ────────────────────────────────────────────────────────────

describe('fmtINR', () => {
  it('Crores', () => { expect(fmtINR(10_000_000)).toBe('₹1.00Cr'); });
  it('Lakhs',  () => { expect(fmtINR(500_000)).toBe('₹5.00L'); });
  it('Thousands', () => { expect(fmtINR(5_000)).toBe('₹5.0K'); });
  it('Small', () => { expect(fmtINR(500)).toBe('₹500'); });
  it('Zero',  () => { expect(fmtINR(0)).toBe('₹0'); });
});
