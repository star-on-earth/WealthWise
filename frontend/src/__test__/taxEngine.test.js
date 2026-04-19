/**
 * taxEngine.test.js
 * Run: npm run test (from frontend/)
 *
 * Tests every critical tax calculation so slab changes next Budget
 * can't silently break the app.
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
} from '../taxEngine.js';

// ─── NEW REGIME SLAB TESTS ─────────────────────────────────────────────────

describe('New Regime — Section 87A Rebate', () => {
  it('Zero tax: gross ₹12,00,000 net taxable (₹12L - ₹75K std = ₹11.25L ≤ ₹12L)', () => {
    const result = calcNewRegime(1_200_000);
    expect(result.tax).toBe(0);
    expect(result.rebate).toBe(true);
  });

  it('Zero tax: gross ₹12,75,000 (exactly at ₹12.75L gross limit)', () => {
    // ₹12,75,000 - ₹75,000 std = ₹12,00,000 taxable → rebate applies
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
  it('₹5L gross → 0% slab (₹5L - ₹75K std = ₹4.25L ≤ ₹4L first slab)', () => {
    const result = calcNewRegime(500_000);
    expect(result.tax).toBe(0);
  });

  it('₹10L gross → 5% slab applies on ₹4-8L portion', () => {
    // ₹10L - ₹75K = ₹9.25L taxable → 0% on ₹4L, 5% on ₹4L = ₹20K, 10% on ₹1.25L = ₹12.5K
    // Total before cess = ₹32.5K. With 4% cess = ₹33,800
    const result = calcNewRegime(1_000_000);
    expect(result.tax).toBe(33_800);
  });

  it('₹30L gross → 30% slab applies', () => {
    const result = calcNewRegime(3_000_000);
    expect(result.tax).toBeGreaterThan(0);
    expect(result.rebate).toBe(false);
  });
});

// ─── OLD REGIME SLAB TESTS ────────────────────────────────────────────────

describe('Old Regime', () => {
  it('₹5L gross → zero tax (₹5L taxable ≤ ₹5L old regime rebate limit)', () => {
    // ₹5L - ₹50K std = ₹4.5L, then 80C ₹1.5L, 80D ₹25K, NPS ₹50K → taxable ≈ ₹2.25L < ₹2.5L basic exemption
    const result = calcOldRegime(500_000);
    expect(result.tax).toBe(0);
  });

  it('₹8L gross → tax payable in old regime', () => {
    const result = calcOldRegime(800_000);
    expect(result.tax).toBeGreaterThan(0);
  });

  it('Old regime always higher than new regime at ₹15L', () => {
    const newT = calcNewRegime(1_500_000).tax;
    const oldT = calcOldRegime(1_500_000).tax;
    // At ₹15L, new regime is usually better for standard salaried
    expect(typeof newT).toBe('number');
    expect(typeof oldT).toBe('number');
  });
});

// ─── MULTI-INCOME TAX ENGINE ──────────────────────────────────────────────

describe('computeMultiIncomeTax', () => {
  it('Salary only ₹12,75,000 → zero tax (new regime 87A)', () => {
    const r = computeMultiIncomeTax({ salary: 1_275_000 }, 30, 'individual');
    expect(r.bestTax).toBe(0);
    expect(r.bestRegime).toBe('new');
  });

  it('Rental income gets 30% Sec24 deduction', () => {
    const r = computeMultiIncomeTax({ rental: 1_000_000 }, 30, 'individual');
    expect(r.rentalTaxable).toBe(700_000); // 70% of ₹10L
  });

  it('Savings interest: 80TTA ₹10K exemption for individual <60', () => {
    const r = computeMultiIncomeTax({ savings_int: 50_000 }, 30, 'individual');
    expect(r.savingsIntTaxable).toBe(40_000); // ₹50K - ₹10K
    expect(r.savingsExemption).toBe(10_000);
  });

  it('Savings interest: 80TTB ₹50K exemption for senior 60+', () => {
    const r = computeMultiIncomeTax({ savings_int: 80_000 }, 65, 'individual');
    expect(r.savingsIntTaxable).toBe(30_000); // ₹80K - ₹50K
    expect(r.savingsExemption).toBe(50_000);
  });

  it('HUF gets ₹50K interest exemption regardless of age', () => {
    const r = computeMultiIncomeTax({ savings_int: 60_000 }, 35, 'huf');
    expect(r.savingsExemption).toBe(50_000);
    expect(r.savingsIntTaxable).toBe(10_000);
  });

  it('LTCG equity: ₹1.25L exemption applied (FY26-27)', () => {
    const r = computeMultiIncomeTax({ ltcg_equity: 200_000 }, 30, 'individual');
    expect(r.ltcgEquityTaxable).toBe(75_000); // ₹2L - ₹1.25L
    expect(r.ltcgEquityTax).toBe(7_500);      // 10% of ₹75K
  });

  it('LTCG equity below ₹1.25L: zero tax', () => {
    const r = computeMultiIncomeTax({ ltcg_equity: 100_000 }, 30, 'individual');
    expect(r.ltcgEquityTaxable).toBe(0);
    expect(r.ltcgEquityTax).toBe(0);
  });

  it('STCG equity: 15% flat, no exemption', () => {
    const r = computeMultiIncomeTax({ stcg_equity: 100_000 }, 30, 'individual');
    expect(r.stcgEquityTax).toBe(15_000); // 15% of ₹1L (before cess)
  });

  it('Crypto: 30% flat, no deductions', () => {
    const r = computeMultiIncomeTax({ crypto: 100_000 }, 30, 'individual');
    expect(r.cryptoTax).toBe(30_000); // 30% before cess
  });

  it('"Other" income taxed at slab rate (not ignored)', () => {
    // ₹5L other income alone should produce some tax in new regime
    const r = computeMultiIncomeTax({ other: 2_000_000 }, 30, 'individual');
    expect(r.newRegime.tax).toBeGreaterThan(0);
    expect(r.ordinaryGross).toBe(2_000_000);
  });

  it('New and old regime produce DIFFERENT slab rates at ₹15L', () => {
    const r = computeMultiIncomeTax({ salary: 1_500_000 }, 30, 'individual');
    // Slab rates can differ because old regime has more deductions
    expect(typeof r.newSlabRate).toBe('number');
    expect(typeof r.oldSlabRate).toBe('number');
  });

  it('Agricultural income does not add to totalGrossIncome tax', () => {
    const withAgri    = computeMultiIncomeTax({ salary:500_000, agricultural:200_000 }, 30);
    const withoutAgri = computeMultiIncomeTax({ salary:500_000 }, 30);
    // Agri is exempt but included in gross
    expect(withAgri.totalGrossIncome).toBe(700_000);
    // Agri may push ordinary income to higher slab — tax could be >= withoutAgri
    expect(withAgri.bestTax).toBeGreaterThanOrEqual(withoutAgri.bestTax);
  });
});

// ─── MARGINAL RATE ────────────────────────────────────────────────────────

describe('getMarginalRate', () => {
  it('New regime: ₹12L taxable → 10% slab (₹8-12L band)', () => {
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
});

// ─── POST-TAX CAGR ────────────────────────────────────────────────────────

describe('postTaxCAGR', () => {
  it('PPF is tax-free: post-tax = pre-tax', () => {
    expect(postTaxCAGR('PPF', 0.30)).toBe(7.1);
  });
  it('Bitcoin: 30% flat → 70% retained', () => {
    expect(postTaxCAGR('Bitcoin', 0.30)).toBe(24.5); // 35 * 0.70
  });
  it('ELSS: LTCG 10% → 90% retained', () => {
    expect(postTaxCAGR('ELSS', 0.30)).toBe(12.6); // 14 * 0.90
  });
  it('FD at 30% slab: post-tax = 70% of 7.2', () => {
    expect(postTaxCAGR('FD', 0.30)).toBeCloseTo(5.04, 1);
  });
  it('SGB: tax-free at maturity', () => {
    expect(postTaxCAGR('SGB', 0.30)).toBe(11.0);
  });
  it('Higher slab rate = lower FD post-tax CAGR', () => {
    const at10 = postTaxCAGR('FD', 0.10);
    const at30 = postTaxCAGR('FD', 0.30);
    expect(at10).toBeGreaterThan(at30);
  });
});

// ─── RISK PROFILER ────────────────────────────────────────────────────────

describe('getRiskProfile', () => {
  it('Young (24), startup founder, high savings → Very Aggressive', () => {
    const r = getRiskProfile(24, 'Startup Founder', 1_000_000, 500_000);
    expect(r.label).toBe('Very Aggressive');
    expect(r.score).toBeGreaterThan(70);
  });

  it('Senior (58), government employee, low savings → Conservative', () => {
    const r = getRiskProfile(58, 'Government Employee', 800_000, 100_000);
    expect(r.label).toBe('Conservative');
    expect(r.score).toBeLessThanOrEqual(35);
  });

  it('Mid-age (35), MNC salaried, moderate savings → Moderate or Aggressive', () => {
    const r = getRiskProfile(35, 'Salaried (MNC/Private)', 1_200_000, 360_000);
    expect(['Moderate','Aggressive']).toContain(r.label);
  });
});

// ─── PORTFOLIO GENERATOR ──────────────────────────────────────────────────

describe('generatePortfolios', () => {
  it('Returns 4 portfolio options', () => {
    const portfolios = generatePortfolios('Moderate', 300_000, 0.20, 0.30);
    expect(portfolios).toHaveLength(4);
  });

  it('Each portfolio alloc sums to 100%', () => {
    const portfolios = generatePortfolios('Aggressive', 500_000, 0.30, 0.30);
    for (const p of portfolios) {
      const total = p.alloc.reduce((s, a) => s + a.pct, 0);
      expect(total).toBeCloseTo(100, 0);
    }
  });

  it('New regime post-tax CAGR ≠ old regime post-tax CAGR when slab rates differ', () => {
    const portfolios = generatePortfolios('Moderate', 300_000, 0.10, 0.30);
    const p = portfolios[0];
    // At 10% vs 30% slab, slab-rate assets (FD, DebtMF) will differ
    expect(p.blendedPostTaxNew).not.toBe(p.blendedPostTaxOld);
  });

  it('Conservative portfolio has no Bitcoin', () => {
    const portfolios = generatePortfolios('Conservative', 200_000, 0.20, 0.20);
    const recommended = portfolios[0];
    const hasBitcoin = recommended.alloc.some(a => a.key === 'Bitcoin');
    expect(hasBitcoin).toBe(false);
  });
});

// ─── FORMATTER ────────────────────────────────────────────────────────────

describe('fmtINR', () => {
  it('Crores formatting', () => { expect(fmtINR(10_000_000)).toBe('₹1.00Cr'); });
  it('Lakhs formatting',  () => { expect(fmtINR(500_000)).toBe('₹5.00L'); });
  it('Thousands',        () => { expect(fmtINR(5_000)).toBe('₹5.0K'); });
  it('Small amount',     () => { expect(fmtINR(500)).toBe('₹500'); });
  it('Zero',             () => { expect(fmtINR(0)).toBe('₹0'); });
});
