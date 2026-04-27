/**
 * ITSections.jsx
 * Complete IT Act deductions reference — FY 2026-27
 * AI advisor calls go through backend (/ai/tax-advisor) — no key in frontend.
 */

import React, { useState } from 'react';
import { aiTaxAdvisor } from './api.js';
import { fmtINR } from './taxEngine.js';

// ─── DATA ─────────────────────────────────────────────────────────────────────

export const IT_SECTIONS = [
  {
    section: '80C',
    title: 'Investments & Payments',
    limit: '₹1,50,000',
    limitNum: 150_000,
    regime: 'old_only',
    category: 'Investment',
    color: '#10d97e',
    icon: '📈',
    items: [
      { name: 'ELSS Mutual Funds',              detail: '3yr lock-in. Best returns among 80C options.',                    popular: true  },
      { name: 'PPF (Public Provident Fund)',     detail: '15yr lock-in. 7.1% p.a. Fully tax-free at maturity.',           popular: true  },
      { name: 'EPF (Employee Provident Fund)',   detail: 'Auto-deducted for salaried. Employer match also 80C.',           popular: true  },
      { name: 'Life Insurance Premium',         detail: 'For self, spouse, children. Sum assured ≥ 10× premium.',         popular: true  },
      { name: 'Home Loan Principal Repayment',  detail: 'Only principal, not interest. Self-occupied property only.',     popular: true  },
      { name: 'NSC (National Savings Certificate)', detail: '5yr post-office scheme. ~7.7% p.a. Interest taxable.',       popular: false },
      { name: 'Sukanya Samriddhi Yojana',        detail: 'Girl child < 10yrs. 8.2% p.a. Fully tax-free.',                popular: false },
      { name: 'SCSS (Senior Citizen Savings)',   detail: 'For 60+. Quarterly payout. Up to ₹30L deposit.',               popular: false },
      { name: 'Tax Saver FD (5yr)',              detail: 'Bank FD with 5yr lock-in. Interest taxable.',                   popular: false },
      { name: 'Tuition Fees',                    detail: 'Full-time education in India. Max 2 children.',                 popular: false },
      { name: 'Stamp Duty on Property Purchase', detail: 'Claimed only in the year of purchase.',                        popular: false },
    ],
    note: '₹1.5L is the combined aggregate limit for ALL 80C investments together.',
    tip: 'ELSS gives best return (12–15% CAGR) with lowest lock-in (3yr) among all 80C options.',
  },
  {
    section: '80CCD(1B)',
    title: 'NPS — Extra ₹50K Deduction',
    limit: '₹50,000 (OVER & ABOVE 80C)',
    limitNum: 50_000,
    regime: 'old_only',
    category: 'Retirement',
    color: '#f0b429',
    icon: '⭐',
    items: [
      { name: 'NPS Tier I — Additional Contribution', detail: 'Completely separate from 80C. If 30% slab → saves ₹15,600/yr extra.', popular: true },
    ],
    note: 'This extra ₹50K is ON TOP of the ₹1.5L 80C limit. Total potential tax-saving deduction: ₹2L.',
    tip: 'Most underutilised deduction in India. If you\'re in 30% slab and not investing in NPS, you\'re giving away ₹15,600/yr.',
  },
  {
    section: '80CCD(2)',
    title: 'NPS — Employer Contribution',
    limit: '10% of salary (Govt employees: 14%)',
    limitNum: null,
    regime: 'both',
    category: 'Retirement',
    color: '#4fa3f7',
    icon: '🏢',
    items: [
      { name: "Employer's NPS contribution to Tier I", detail: 'One of the very few deductions available in the NEW REGIME too.', popular: true },
    ],
    note: 'Available in BOTH old and new regime — rare exception. Negotiate this in your CTC restructuring.',
    tip: 'Ask HR to restructure CTC: move part of special allowance into employer NPS. Saves tax in both regimes.',
  },
  {
    section: '80D',
    title: 'Health Insurance Premium',
    limit: '₹25K (self) + ₹25K (parents) = ₹50,000',
    limitNum: 50_000,
    regime: 'old_only',
    category: 'Insurance',
    color: '#fb923c',
    icon: '🏥',
    items: [
      { name: 'Health Insurance — Self, Spouse, Children', detail: 'Up to ₹25K. Senior citizen (60+): up to ₹50K.',              popular: true  },
      { name: 'Health Insurance — Parents',                detail: 'Additional ₹25K. Senior citizen parents: up to ₹50K.',        popular: true  },
      { name: 'Preventive Health Check-up',               detail: 'Up to ₹5K within the above limits (no cash payment).',        popular: false },
    ],
    note: 'Max combined = ₹1,00,000 if both self and parents are senior citizens (60+).',
    tip: 'Premium must be paid by cheque/online — cash payments are NOT eligible. Even ₹500/month policy qualifies.',
  },
  {
    section: '80E',
    title: 'Education Loan Interest',
    limit: 'No upper limit',
    limitNum: null,
    regime: 'old_only',
    category: 'Education',
    color: '#60a5fa',
    icon: '🎓',
    items: [
      { name: 'Interest on higher education loan', detail: 'No cap on amount. Valid for 8 consecutive years from repayment start.', popular: true },
    ],
    note: 'Only INTEREST is deductible, not principal. Loan must be from a financial institution, not family/friends.',
    tip: 'If you have a ₹20L+ education loan, this alone can wipe out significant tax for 8 years.',
  },
  {
    section: '80EEA',
    title: 'Affordable Housing Loan Interest',
    limit: '₹1,50,000 (additional, over 24b)',
    limitNum: 150_000,
    regime: 'old_only',
    category: 'Housing',
    color: '#fbbf24',
    icon: '🏘️',
    items: [
      { name: 'Home loan interest — affordable housing', detail: 'Stamp duty value ≤ ₹45L. Loan sanctioned 01/04/19–31/03/22. First-time buyer.', popular: true },
    ],
    note: 'This is EXTRA ₹1.5L on top of Section 24(b) ₹2L. Combined = ₹3.5L interest deduction.',
    tip: 'Check if your property was sanctioned in the eligible window. Many first-time buyers miss this.',
  },
  {
    section: '80G',
    title: 'Donations to Charity',
    limit: '50%–100% of donation (some capped at 10% of income)',
    limitNum: null,
    regime: 'old_only',
    category: 'Donation',
    color: '#34d399',
    icon: '🤝',
    items: [
      { name: 'PM National Relief Fund / PM CARES', detail: '100% deduction. No qualifying limit.',      popular: true  },
      { name: 'National Defence Fund',              detail: '100% deduction. No qualifying limit.',      popular: false },
      { name: 'Registered NGOs / Trusts',           detail: '50% deduction. Subject to 10% of income.', popular: false },
      { name: 'Swachh Bharat Kosh / Clean Ganga',   detail: '100% deduction. No qualifying limit.',      popular: false },
    ],
    note: 'Cash donations above ₹2,000 are NOT eligible. Must use cheque / UPI / bank transfer.',
    tip: 'PM National Relief Fund gives 100% with no cap — most tax-efficient donation route.',
  },
  {
    section: '80GG',
    title: 'Rent Paid (No HRA in Salary)',
    limit: 'Least of: ₹60K/yr | 25% of income | Rent − 10% income',
    limitNum: 60_000,
    regime: 'old_only',
    category: 'Housing',
    color: '#fbbf24',
    icon: '🏠',
    items: [
      { name: 'House rent paid — no HRA component', detail: 'For self-employed, freelancers, or salaried without HRA.', popular: true },
    ],
    note: 'You / spouse / minor child must NOT own any residential property in the city where you live.',
    tip: 'Self-employed people who pay rent but claim no deductions — this is your HRA equivalent.',
  },
  {
    section: '80TTA',
    title: 'Savings Account Interest',
    limit: '₹10,000',
    limitNum: 10_000,
    regime: 'old_only',
    category: 'Savings',
    color: '#4fa3f7',
    icon: '🏦',
    items: [
      { name: 'Interest from savings bank / post office / co-op bank', detail: 'FD interest is NOT covered. Only savings account interest.', popular: true },
    ],
    note: 'Senior citizens (60+) use Section 80TTB instead — which covers FD interest too (up to ₹50K).',
    tip: 'Small but effortless. Always declare and claim ₹10K on your savings account interest.',
  },
  {
    section: '80TTB',
    title: 'Senior Citizen — All Interest Income',
    limit: '₹50,000',
    limitNum: 50_000,
    regime: 'old_only',
    category: 'Savings',
    color: '#a78bfa',
    icon: '👴',
    items: [
      { name: 'Interest from savings + FD + RD + post office', detail: 'For senior citizens (60+) only. Replaces 80TTA entirely.', popular: true },
    ],
    note: 'This is FAR better than 80TTA — covers FD interest too, with 5× higher limit.',
    tip: 'If you\'re 60+, all bank/post-office interest up to ₹50K is fully tax-free under this section.',
  },
  {
    section: '80DD',
    title: 'Disabled Dependent Care',
    limit: '₹75,000 (severe disability: ₹1,25,000)',
    limitNum: 125_000,
    regime: 'old_only',
    category: 'Medical',
    color: '#f472b6',
    icon: '♿',
    items: [
      { name: 'Medical treatment / maintenance of disabled dependent', detail: 'Flat deduction. 40%+ disability: ₹75K. 80%+ disability: ₹1.25L.', popular: true },
      { name: 'Insurance policy for disabled dependent',              detail: 'LIC / approved insurer. Same limits apply.',                       popular: false },
    ],
    note: 'Fixed deduction regardless of actual amount spent. Requires disability certificate from prescribed authority.',
    tip: 'You get ₹75K–₹1.25L even if you spent less. Get the disability certificate — it\'s worth it.',
  },
  {
    section: '80DDB',
    title: 'Specified Disease Treatment',
    limit: '₹40,000 (senior citizen: ₹1,00,000)',
    limitNum: 100_000,
    regime: 'old_only',
    category: 'Medical',
    color: '#f472b6',
    icon: '💊',
    items: [
      { name: 'Cancer, AIDS, Neurological diseases', detail: 'Self or dependent. Specialist prescription from government hospital required.', popular: true },
      { name: 'Chronic Renal Failure, Haematological disorders', detail: 'Senior citizens (60+): limit increases to ₹1,00,000.',             popular: false },
    ],
    note: 'Requires written prescription from a specialist working in a government hospital.',
    tip: 'Often missed. If you or a dependent underwent major illness treatment this year, do claim it.',
  },
  {
    section: '80U',
    title: 'Self Disability Deduction',
    limit: '₹75,000 (severe: ₹1,25,000)',
    limitNum: 125_000,
    regime: 'old_only',
    category: 'Medical',
    color: '#f472b6',
    icon: '♿',
    items: [
      { name: 'Taxpayer with certified disability', detail: 'Flat ₹75K for 40%+ disability. ₹1.25L for 80%+ (severe).', popular: true },
    ],
    note: 'This is for the TAXPAYER THEMSELVES (not a dependent). 80DD is for dependents.',
    tip: 'Fixed deduction — no need to show actual expenditure. Certificate from government doctor is sufficient.',
  },
  {
    section: '24(b)',
    title: 'Home Loan Interest',
    limit: '₹2,00,000 (self-occupied) | Unlimited (let-out)',
    limitNum: 200_000,
    regime: 'old_only',
    category: 'Housing',
    color: '#fbbf24',
    icon: '🏠',
    items: [
      { name: 'Home loan interest — self-occupied property', detail: 'Up to ₹2L/yr. Loan must be for purchase or construction.',                     popular: true  },
      { name: 'Home loan interest — let-out property',       detail: 'No limit on deduction against rental income. Overall loss capped at ₹2L.',     popular: true  },
      { name: 'Pre-construction interest',                   detail: '20% of total pre-construction interest, deductible over 5 years post-handover.', popular: false },
    ],
    note: 'Most impactful deduction for home loan holders. Valid until loan is fully repaid.',
    tip: 'Combined with 80EEA, affordable housing buyers can claim up to ₹3.5L in interest deductions.',
  },
  {
    section: '16 / Std. Deduction',
    title: 'Standard Deduction — Salaried',
    limit: '₹75,000 (new regime) | ₹50,000 (old regime)',
    limitNum: 75_000,
    regime: 'both',
    category: 'Salary',
    color: '#10d97e',
    icon: '💼',
    items: [
      { name: 'Standard deduction from salary income', detail: '₹75K in new regime (Budget 2025 enhancement). ₹50K in old. Zero documentation needed.', popular: true },
    ],
    note: 'Auto-applied by employer in Form 16. You don\'t need to do anything.',
    tip: 'Free ₹75K deduction with zero effort. Always factored in — available to all salaried employees.',
  },
  {
    section: 'HRA',
    title: 'House Rent Allowance',
    limit: 'Least of: Actual HRA | 50% salary (metro) / 40% (non-metro) | Rent − 10% salary',
    limitNum: null,
    regime: 'old_only',
    category: 'Salary',
    color: '#fbbf24',
    icon: '🏠',
    items: [
      { name: 'HRA component of salary — rent paid', detail: 'Metro cities (Delhi, Mumbai, Chennai, Kolkata): 50% of basic+DA. Others: 40%.', popular: true },
    ],
    note: 'If annual rent > ₹1L, landlord\'s PAN is mandatory. Cannot claim BOTH HRA and 80GG.',
    tip: 'Even if you stay with parents — pay them rent formally (₹10–15K/month) and claim HRA. 100% legal.',
  },
  {
    section: 'LTA',
    title: 'Leave Travel Allowance',
    limit: 'Actual domestic travel cost (economy class / AC train)',
    limitNum: null,
    regime: 'old_only',
    category: 'Salary',
    color: '#fb923c',
    icon: '✈️',
    items: [
      { name: 'Domestic travel — self and family', detail: '2 trips in a 4-year block. Current block: 2022–2025. Only airfare/rail fare — no hotel or food.', popular: true },
    ],
    note: 'Only domestic India travel qualifies. Boarding passes + tickets are required as proof.',
    tip: 'You can carry forward 1 unused trip from the previous block to the first year of the new block.',
  },
  {
    section: '54',
    title: 'LTCG Exemption — Property Reinvestment',
    limit: 'Full LTCG exempt if reinvested in new residential property',
    limitNum: null,
    regime: 'both',
    category: 'Capital Gains',
    color: '#f472b6',
    icon: '🏗️',
    items: [
      { name: 'Sell one house → buy another', detail: 'Buy new residential property within 2 years, or construct within 3 years. LTCG fully exempt.', popular: true },
    ],
    note: 'New property cannot be sold within 3 years of purchase. Only ONE new property allowed (Budget 2023+). Note: Properties purchased after July 23, 2024 are taxed at 12.5% without indexation — not 20%.',
    tip: 'Biggest tax-saving tool for real estate investors. If you sold property purchased after Jul 23, 2024, you pay 12.5% (no indexation) — check if 54F or 54EC route saves more.',
  },
  {
    section: '54EC',
    title: 'LTCG — NHAI / REC Bonds',
    limit: '₹50,00,000 per financial year',
    limitNum: 5_000_000,
    regime: 'both',
    category: 'Capital Gains',
    color: '#f472b6',
    icon: '📜',
    items: [
      { name: 'Invest LTCG in NHAI or REC bonds', detail: 'Within 6 months of property sale. 5yr lock-in. ~5.25% interest (taxable).', popular: true },
    ],
    note: 'Applicable only to LTCG from land or building. Max ₹50L investment per FY.',
    tip: 'Great option if you sold a property but don\'t want to buy another. Low risk, LTCG fully saved.',
  },
  {
    section: '54F',
    title: 'LTCG Exemption — Any Asset → Residential Property',
    limit: 'Full LTCG exempt if net consideration reinvested in house',
    limitNum: null,
    regime: 'both',
    category: 'Capital Gains',
    color: '#a78bfa',
    icon: '🏠',
    items: [
      { name: 'Sell stocks / gold / bonds / any long-term asset → buy house',
        detail: 'Invest the FULL net sale proceeds (not just profit) in one residential house. Within 1yr before or 2yr after sale.',
        popular: true },
      { name: 'Under construction allowed',
        detail: 'Can invest in a property under construction — must be completed within 3 years of sale.',
        popular: false },
    ],
    note: 'You must not own MORE than 1 residential house on the date of transfer. New house cannot be sold within 3 years. Not available if you already own 2+ houses.',
    tip: 'Key difference from Section 54: that section is only for property-to-property. Section 54F covers ANY long-term capital asset (stocks, gold, mutual funds, bonds) reinvested into a house.',
  },
  {
    section: '54B',
    title: 'LTCG Exemption — Agricultural Land Sale',
    limit: 'Full LTCG exempt if reinvested in agricultural land within 2 years',
    limitNum: null,
    regime: 'both',
    category: 'Capital Gains',
    color: '#6ee7b7',
    icon: '🌾',
    items: [
      { name: 'Sale of urban agricultural land used for agriculture',
        detail: 'Land must have been used for agricultural purposes by the taxpayer or parent for at least 2 years before sale.',
        popular: true },
      { name: 'Reinvest in new agricultural land within 2 years',
        detail: 'Can deposit in Capital Gains Account Scheme (CGAS) if reinvestment not done before ITR filing date.',
        popular: false },
    ],
    note: 'Only applies to agricultural land that is a "capital asset" (urban land). Rural agricultural land is not a capital asset and is fully exempt anyway.',
    tip: 'If you are selling inherited farmland on the outskirts of a city, check if it qualifies as urban agricultural land — Section 54B can save the full LTCG tax.',
  },
  {
    section: '10(13A)',
    title: 'HRA Exemption Formula',
    limit: 'Least of: Actual HRA | 50% basic (metro) / 40% (non-metro) | Rent − 10% basic',
    limitNum: null,
    regime: 'old_only',
    category: 'Salary',
    color: '#fbbf24',
    icon: '🏠',
    items: [
      { name: 'House Rent Allowance — actual exemption computation', detail: 'Exempt amount = least of 3 values. Metro cities: Delhi, Mumbai, Chennai, Kolkata. Basic salary ≈ 40-50% of CTC typically.', popular: true },
    ],
    note: 'The HRA exemption card in ITSections shows limits; this section shows the actual formula. Both must match in your ITR filing.',
    tip: 'Living with parents? Pay them formal rent of ₹10,000–₹15,000/month by bank transfer and claim HRA. 100% legal. Get a rent agreement.',
  },
  {
    section: '10(14)',
    title: 'Special Allowances — Children & Others',
    limit: '₹100/mo per child (education) | ₹300/mo (hostel) | Max 2 children',
    limitNum: 9600,
    regime: 'old_only',
    category: 'Salary',
    color: '#60a5fa',
    icon: '🎒',
    items: [
      { name: "Children's Education Allowance", detail: '₹100/month per child, max 2 children = ₹2,400/yr max.', popular: true },
      { name: 'Hostel Expenditure Allowance', detail: '₹300/month per child, max 2 children = ₹7,200/yr max.', popular: true },
      { name: 'Uniform Allowance', detail: 'Actual uniform cost reimbursed by employer — fully exempt. No fixed limit.', popular: false },
      { name: 'Helper Allowance', detail: 'Reimbursement for helper employed to perform official duties — exempt up to actual.', popular: false },
    ],
    note: 'These are part of salary slip. Ask your employer to restructure CTC to include these components — it reduces taxable salary.',
    tip: 'Max combined benefit: ₹9,600/yr for 2 children. Small but zero-effort once CTC is restructured.',
  },
  {
    section: '89(1)',
    title: 'Salary Arrears Relief',
    limit: 'Difference in tax computed with vs without arrears spread back',
    limitNum: null,
    regime: 'both',
    category: 'Salary',
    color: '#fb923c',
    icon: '📦',
    items: [
      { name: 'Relief on arrears / advance salary received', detail: 'If you received salary of a past year this year, you can spread it back and pay lower tax than the lump sum would attract.', popular: true },
    ],
    note: 'File Form 10E BEFORE filing your ITR — if you claim 89(1) without Form 10E, IT dept sends a notice. Available in both regimes.',
    tip: 'Always file Form 10E online at incometax.gov.in first. It takes 5 minutes and can save thousands if arrears pushed you to a higher slab.',
  },
  {
    section: '112',
    title: 'LTCG — Debt MF & Bonds (Pre Apr 2023)',
    limit: '20% with indexation OR 10% without — choose lower',
    limitNum: null,
    regime: 'both',
    category: 'Capital Gains',
    color: '#7c8cf8',
    icon: '📋',
    items: [
      { name: 'Debt Mutual Funds (purchased before Apr 1, 2023, held > 3 years)', detail: '20% with Cost Inflation Index (CII) OR 10% flat without indexation — taxpayer can choose whichever gives lower tax.', popular: true },
      { name: 'Listed Bonds / Debentures (held > 12 months)', detail: '10% without indexation. No choice — flat rate applies.', popular: false },
      { name: 'Unlisted shares (held > 24 months)', detail: '20% with indexation.', popular: false },
    ],
    note: 'Debt MFs purchased after April 1, 2023 are taxed at SLAB RATE (no LTCG benefit) — this section only applies to older purchases.',
    tip: 'For pre-Apr 2023 debt MF, compute tax both ways (20% after CII vs 10% flat) and pick the lower one. The app defaults to 20% — check manually if you have large gains.',
  },
  {
    section: '44AD',
    title: 'Presumptive Taxation — Small Business',
    limit: '8% of turnover (6% if digital) | Turnover ≤ ₹2Cr',
    limitNum: null,
    regime: 'both',
    category: 'Salary',
    color: '#1DB873',
    icon: '🏪',
    items: [
      { name: 'Small business — presumptive income at 8% of turnover', detail: 'No books of accounts needed. Income = 8% of gross turnover. If 95%+ receipts are digital → 6% rate.', popular: true },
      { name: 'Cannot claim actual expenses — only deemed income applies', detail: 'If actual profit > 8%, you benefit. If actual profit < 8% and you have losses, opt out and maintain proper accounts.', popular: false },
    ],
    note: 'Once you opt in for a year, you must continue for 5 years or you cannot use 44AD again for 5 years. Choose carefully.',
    tip: 'Works in BOTH regimes. Best for cash-heavy small businesses (kirana, transport, trading) where actual margins are 10%+.',
  },
  {
    section: '44ADA',
    title: 'Presumptive Taxation — Professionals',
    limit: '50% of gross receipts | Receipts ≤ ₹75L',
    limitNum: null,
    regime: 'both',
    category: 'Salary',
    color: '#4fa3f7',
    icon: '👨‍⚕️',
    items: [
      { name: 'Eligible professions: doctor, lawyer, CA, engineer, architect, consultant', detail: 'Deemed income = 50% of gross receipts. Other 50% assumed as expenses — no documentation needed.', popular: true },
      { name: 'Software consultants, management consultants, interior designers', detail: 'Also covered. Gross receipts limit ₹75L (raised from ₹50L in Budget 2023).', popular: true },
    ],
    note: 'Like 44AD, opting out after one year triggers a 5-year ban. Also works in both regimes.',
    tip: 'If your actual expenses are less than 50% of receipts, 44ADA saves you tax and bookkeeping. Most freelancers qualify.',
  },
  {
    section: '44AB',
    title: 'Tax Audit Threshold',
    limit: '>₹1Cr turnover (business) | >₹50L receipts (professional) | >₹10Cr digital',
    limitNum: null,
    regime: 'both',
    category: 'Salary',
    color: '#E84040',
    icon: '🔍',
    items: [
      { name: 'Business: turnover > ₹1Cr → mandatory audit (Sec 44AB)', detail: 'Exception: if 95%+ transactions are digital AND declared profit ≥ 8% of turnover → audit threshold is ₹10Cr.', popular: true },
      { name: 'F&O traders: turnover = absolute sum of all trade P&Ls', detail: 'Even with small profits, turnover can exceed ₹1Cr easily in F&O. Get CA help.', popular: true },
      { name: 'Professionals: gross receipts > ₹50L → audit required', detail: 'Unless opting for 44ADA presumptive — then audit is not required even above ₹50L.', popular: false },
    ],
    note: 'Tax audit must be completed by September 30. Penalty for non-compliance: 0.5% of turnover or ₹1.5L, whichever is lower.',
    tip: 'F&O traders — even if your NET profit is small, your GROSS TURNOVER (sum of absolute values of all trades) might trigger audit. Track it throughout the year.',
  },
  {
    section: '80EEB',
    title: 'EV Loan Interest',
    limit: '₹1,50,000',
    limitNum: 150_000,
    regime: 'old_only',
    category: 'Housing',
    color: '#34d399',
    icon: '🚗',
    items: [
      { name: 'Interest on loan for electric vehicle purchase', detail: 'Loan must be sanctioned between April 1, 2019 and March 31, 2023. Both personal and commercial EVs covered.', popular: true },
    ],
    note: 'Available only for loans sanctioned in the specified window. If your EV loan was taken after March 2023, this deduction is not available.',
    tip: 'Up to ₹1.5L interest deduction. At 30% slab, this saves ₹46,800/yr. EV + tax benefit = strong argument for electric.',
  },
  {
    section: '80QQB',
    title: 'Royalty — Authors & Literary Works',
    limit: '₹3,00,000',
    limitNum: 300_000,
    regime: 'old_only',
    category: 'Education',
    color: '#a78bfa',
    icon: '📖',
    items: [
      { name: 'Royalty income from books, novels, plays, artistic works', detail: 'Deduction up to ₹3L on royalty from books published in India. Author must be an individual Indian resident.', popular: true },
      { name: 'Lump sum consideration for copyright also covered', detail: 'One-time payments for copyright assignment also qualify, capped at ₹3L.', popular: false },
    ],
    note: 'Does NOT apply to textbooks for schools and universities — those have a separate sub-clause. Royalty from foreign publishers also eligible if received in India.',
    tip: 'Often missed by first-time authors. If you received ₹3L+ in royalties, the full ₹3L is deductible — reducing taxable income significantly.',
  },
  {
    section: '80RRB',
    title: 'Royalty — Patents',
    limit: '₹3,00,000',
    limitNum: 300_000,
    regime: 'old_only',
    category: 'Education',
    color: '#f472b6',
    icon: '🔬',
    items: [
      { name: 'Royalty on patents registered under the Patents Act 1970', detail: 'Patent must be registered in the name of the individual. Deduction up to ₹3L on royalty received.', popular: true },
    ],
    note: 'Patent must be registered in India. International patent royalties also qualify if the assessee is an Indian resident and the income is received in India.',
    tip: 'Researchers and innovators with registered patents — this is a clean ₹3L deduction. Make sure your patent is individually registered, not under your employer or company.',
  },
  {
    section: '10(13A)',
    title: 'HRA Exemption — Actual Formula',
    limit: 'Least of: Actual HRA received | 50% basic (metro) / 40% (non-metro) | Rent − 10% basic',
    limitNum: null,
    regime: 'old_only',
    category: 'Salary',
    color: '#fbbf24',
    icon: '🏠',
    items: [
      { name: 'Actual HRA received from employer', detail: 'From your salary slip — NOT the CTC figure. HRA is a component of CTC, not additional to it.', popular: true },
      { name: '50% of basic salary (metro) / 40% (non-metro)', detail: 'Metro = Delhi, Mumbai, Chennai, Kolkata only. All other cities including Hyderabad, Bengaluru, Pune = non-metro (40%).', popular: true },
      { name: 'Rent paid minus 10% of basic salary', detail: 'If you pay ₹15K/month rent and basic is ₹50K/month → limit = ₹15K×12 − ₹50K×12×10% = ₹1.2L.', popular: true },
    ],
    note: 'CTC input in the Planner includes HRA — do not subtract HRA before entering CTC. The app computes the exemption separately using HRA sub-fields.',
    tip: 'Staying with parents? Pay them formal rent via bank transfer (₹10K–15K/month), get a rent agreement, and claim HRA. 100% legal and one of the highest-impact zero-cost deductions.',
  },
  {
    section: '10(14)',
    title: 'Special Salary Allowances',
    limit: '₹100/mo per child (education) + ₹300/mo (hostel) | Max 2 children | = ₹9,600/yr',
    limitNum: 9600,
    regime: 'old_only',
    category: 'Salary',
    color: '#60a5fa',
    icon: '🎒',
    items: [
      { name: "Children's Education Allowance", detail: '₹100/month per child for up to 2 children = max ₹2,400/yr.', popular: true },
      { name: 'Hostel Expenditure Allowance', detail: '₹300/month per child for up to 2 children = max ₹7,200/yr.', popular: true },
      { name: 'Uniform Allowance', detail: 'Actual cost of uniform required for the job — exempt up to actual. Ask HR to add to CTC.', popular: false },
      { name: 'Helper/Assistant Allowance', detail: 'If employer reimburses cost of helper for official duties — exempt up to actual.', popular: false },
    ],
    note: 'These are part of your salary slip structure. You cannot claim them if your employer does not include them as separate CTC components — ask HR for CTC restructuring.',
    tip: 'Max ₹9,600/yr for 2 children — small but zero effort. CTC restructuring takes one HR email and reduces your taxable salary every month.',
  },
  {
    section: '89(1)',
    title: 'Salary Arrears Relief',
    limit: 'Tax difference computed by spreading arrear back to original FY',
    limitNum: null,
    regime: 'both',
    category: 'Salary',
    color: '#fb923c',
    icon: '📦',
    items: [
      { name: 'Relief on salary arrears received in current year', detail: 'If you received salary that belongs to a prior FY (backdated increment, pending DA), this prevents double-slab impact.', popular: true },
      { name: 'Advance salary received', detail: 'Salary received in advance for future FY also eligible for 89(1) spread-back relief.', popular: false },
    ],
    note: '⚠️ CRITICAL: You MUST file Form 10E on the income tax portal BEFORE filing your ITR. Claiming 89(1) without Form 10E = IT notice. Form 10E is free and takes 5 minutes.',
    tip: 'Available in both old and new regime. If a large arrear pushed you to a higher slab, 89(1) can save thousands. Always file Form 10E first at incometax.gov.in → e-File → Income Tax Forms → Form 10E.',
  },
  {
    section: '112',
    title: 'LTCG — Debt MF & Bonds (Pre Apr 2023)',
    limit: '20% with indexation OR 10% without — choose whichever is lower',
    limitNum: null,
    regime: 'both',
    category: 'Capital Gains',
    color: '#7c8cf8',
    icon: '📋',
    items: [
      { name: 'Debt mutual funds purchased before April 1, 2023 (held > 3 years)', detail: 'You can choose: 20% with Cost Inflation Index (CII) adjustment OR 10% without. Pick whichever gives lower tax.', popular: true },
      { name: 'Listed bonds / debentures (held > 12 months)', detail: '10% flat without indexation. No choice — fixed rate.', popular: false },
      { name: 'Unlisted shares (held > 24 months)', detail: '20% with indexation applies.', popular: false },
    ],
    note: 'Debt MFs purchased AFTER April 1, 2023 are taxed at SLAB RATE — no LTCG benefit at all. This section only applies to older purchases. The Planner defaults to 20% — compute both manually for large gains.',
    tip: 'For pre-Apr 2023 debt MF: compute (gain × 20%) vs (indexed gain × 20%) and check if 10% flat is lower. In rising inflation years, indexation usually wins. Use the CII table at incometax.gov.in.',
  },
  {
    section: '111A',
    title: 'STCG — Equity & Equity MF',
    limit: '15% flat | No exemption | Held < 1 year',
    limitNum: null,
    regime: 'both',
    category: 'Capital Gains',
    color: '#E8921A',
    icon: '📊',
    items: [
      { name: 'Short-term capital gains from equity shares', detail: 'Shares listed on recognised stock exchange, held < 12 months. 15% flat — no basic exemption, no deductions.', popular: true },
      { name: 'Short-term gains from equity-oriented mutual funds', detail: 'Equity MF (>65% in equity) held < 12 months. Same 15% flat rate.', popular: true },
    ],
    note: 'STT (Securities Transaction Tax) must have been paid on the transaction for Sec 111A rate to apply. Off-market deals taxed at slab rate instead.',
    tip: 'If you are in a low slab (0% or 5%), your STCG at 15% may actually be HIGHER than your slab. Consider holding for 12 months to convert STCG to LTCG.',
  },
  {
    section: '115BAC',
    title: 'New Tax Regime — Formal Election',
    limit: 'Must be elected at time of ITR filing (salaried) or by July 31 (business)',
    limitNum: null,
    regime: 'new_only',
    category: 'Salary',
    color: '#4fa3f7',
    icon: '🔄',
    items: [
      { name: 'Salaried employees — elect new regime in ITR', detail: 'Can switch between old and new regime every year. No lock-in for salaried. Inform employer at start of FY (Form 12BAA) for TDS purposes.', popular: true },
      { name: 'Business / professional income — once locked, 5-year restriction', detail: 'If you have business income and opt for new regime, switching back to old regime and then back again is restricted for 5 years.', popular: true },
    ],
    note: 'New regime is DEFAULT from FY 2023-24. If you want old regime, you must actively elect it. The app shows you which is better — verify before filing.',
    tip: 'Tell your employer which regime you prefer at the start of the FY using Form 12BAA. This determines your monthly TDS. You can still change at ITR filing time if salaried.',
  },
  {
    section: '44AD',
    title: 'Presumptive Tax — Small Business',
    limit: '8% of turnover (6% if digital) | Turnover ≤ ₹2Cr',
    limitNum: null,
    regime: 'both',
    category: 'Business',
    color: '#1DB873',
    icon: '🏪',
    items: [
      { name: 'Gross turnover × 8% = deemed taxable income', detail: 'No bookkeeping needed. No expense claims. Just declare 8% of turnover as profit. If actual margin > 8%, you save tax too.', popular: true },
      { name: '6% rate for fully digital receipts', detail: 'If 95%+ of receipts are through banking channels (cheque, NEFT, UPI, card) → rate drops to 6%.', popular: true },
      { name: 'Cannot opt out for 5 years once opted in', detail: 'If you opt out before 5 years, you cannot use 44AD again for 5 years. Choose carefully — evaluate actual vs deemed profit first.', popular: false },
    ],
    note: 'Works in BOTH regimes. Eligible: any business (not profession). Turnover must be ≤ ₹2Cr. Not available for commission agents, brokerage businesses, or those with foreign business income.',
    tip: 'Best for small traders, shopkeepers, contractors. If your actual net margin is 10%+ of turnover, 44AD saves both tax AND accounting costs. Run the numbers before committing.',
  },
  {
    section: '44ADA',
    title: 'Presumptive Tax — Professionals',
    limit: '50% of gross receipts | Receipts ≤ ₹75L',
    limitNum: null,
    regime: 'both',
    category: 'Business',
    color: '#4fa3f7',
    icon: '👨‍⚕️',
    items: [
      { name: 'Gross receipts × 50% = deemed taxable income', detail: 'Eligible professionals: doctors, lawyers, engineers, CAs, architects, interior designers, management consultants, film artists, technical consultants.', popular: true },
      { name: 'No books of accounts required', detail: 'You declare 50% as profit — the other 50% is assumed to cover all expenses. No audit, no P&L, no balance sheet.', popular: true },
      { name: 'Receipts limit: ₹75L (raised from ₹50L in Budget 2023)', detail: 'If gross receipts exceed ₹75L, must maintain full books and get tax audit.', popular: false },
    ],
    note: 'Works in BOTH regimes. Same 5-year opt-out restriction as 44AD. Most Indian freelance professionals qualify — this is one of the most underutilised provisions in the IT Act.',
    tip: 'If your actual expenses are <50% of receipts (typical for consultants, doctors in private practice), 44ADA reduces taxable income significantly. A doctor earning ₹60L paying real expenses of ₹15L saves tax on ₹15L by using 44ADA vs books.',
  },
  {
    section: '44AB',
    title: 'Tax Audit Threshold',
    limit: 'Business: >₹1Cr | Professional: >₹50L | Digital exception: >₹10Cr',
    limitNum: null,
    regime: 'both',
    category: 'Business',
    color: '#E84040',
    icon: '🔍',
    items: [
      { name: 'Business: gross turnover > ₹1Cr → mandatory audit', detail: 'Exception: 95%+ digital receipts AND declared profit ≥ 8% of turnover → threshold rises to ₹10Cr.', popular: true },
      { name: 'F&O traders: turnover = sum of absolute values of all trade P&Ls', detail: 'Even small profits with large trading volume can cross ₹1Cr easily. Track gross turnover, not just net P&L.', popular: true },
      { name: 'Professionals: gross receipts > ₹50L → audit required', detail: 'Unless opting for 44ADA — presumptive professionals are exempt from audit even above ₹50L.', popular: false },
    ],
    note: 'Tax audit by a CA must be completed by September 30. Penalty for non-compliance: 0.5% of turnover or ₹1.5L, whichever is lower. The audit report (Form 3CB/3CD) must be filed before ITR.',
    tip: 'F&O traders — your "turnover" for audit purposes is NOT your net P&L. It is the sum of absolute values of every settled profit or loss. A trader with 200 trades of ₹5K each has ₹10L turnover regardless of net result.',
  },
  {
    section: '80EEB',
    title: 'EV Loan Interest',
    limit: '₹1,50,000',
    limitNum: 150_000,
    regime: 'old_only',
    category: 'Housing',
    color: '#34d399',
    icon: '🚗',
    items: [
      { name: 'Interest on loan for electric vehicle purchase', detail: 'Loan must be sanctioned between April 1, 2019 and March 31, 2023. Both personal and commercial EVs covered.', popular: true },
      { name: 'Two-wheelers, three-wheelers, four-wheelers all eligible', detail: 'Electric two-wheelers (bikes, scooters) also covered — not just cars. Very useful for delivery workers.', popular: false },
    ],
    note: '⚠️ Loan sanction window has CLOSED (was Apr 2019 – Mar 2023). If your EV loan was taken after March 31, 2023, this deduction is NOT available. Check your loan agreement date.',
    tip: 'At 30% slab with ₹1.5L deduction: saves ₹46,800/yr. If you have an eligible loan, make sure it is declared — often missed. Old regime only.',
  },
  {
    section: '80QQB',
    title: 'Royalty — Authors & Literary Works',
    limit: '₹3,00,000',
    limitNum: 300_000,
    regime: 'old_only',
    category: 'Education',
    color: '#a78bfa',
    icon: '📖',
    items: [
      { name: 'Royalty from books (literary, artistic, scientific)', detail: 'Deduction on royalty income received during the year, capped at ₹3L. Author must be an individual Indian resident.', popular: true },
      { name: 'Lump-sum payment for copyright assignment', detail: 'One-time payments for assigning copyright also qualify, subject to ₹3L cap.', popular: false },
      { name: 'Foreign publisher royalties', detail: 'Also eligible if received in India in convertible foreign exchange and brought within prescribed time.', popular: false },
    ],
    note: 'Does NOT cover royalty from textbooks prescribed for school/university courses — those fall under a separate sub-section. Also excludes software or technical manuals.',
    tip: 'First-time authors often miss this entirely. If you received ₹3L+ in book royalties, the entire ₹3L is exempt from taxable income in old regime — reducing tax by up to ₹93,600 at 30% slab.',
  },
  {
    section: '80RRB',
    title: 'Royalty — Registered Patents',
    limit: '₹3,00,000',
    limitNum: 300_000,
    regime: 'old_only',
    category: 'Education',
    color: '#f472b6',
    icon: '🔬',
    items: [
      { name: 'Royalty income from Indian registered patents', detail: 'Patent must be registered under the Patents Act 1970 in the name of the individual assessee. Deduction capped at ₹3L/yr.', popular: true },
      { name: 'Lump-sum on assignment of patent rights', detail: 'One-time payments for assigning patent rights also covered, capped at ₹3L.', popular: false },
    ],
    note: 'Patent must be individually registered — not in a company name. International patent royalties also eligible if received as foreign exchange in India.',
    tip: 'Researchers and innovators with registered patents — this is a clean ₹3L deduction most people in this category miss. Confirm your patent registration document is in your individual name.',
  },
  {
    section: '87A',
    title: 'Tax Rebate — New Regime',
    limit: 'Zero tax for net taxable income up to ₹12,00,000',
    limitNum: 1_200_000,
    regime: 'new_only',
    category: 'Rebate',
    color: '#10d97e',
    icon: '🎯',
    items: [
      { name: 'Full rebate under new regime', detail: 'Net taxable ≤ ₹12L = zero tax. With ₹75K std deduction → gross CTC ≤ ₹12.75L = zero tax.', popular: true },
    ],
    note: 'This is a Budget 2025 enhancement. Gross income of ₹12.75L = zero tax in new regime.',
    tip: 'If your CTC is ₹12–₹13L, restructure salary to maximize this rebate before filing.',
  },
  {
    section: 'New Regime Perks',
    title: 'What\'s Available in New Regime',
    limit: 'Various',
    limitNum: null,
    regime: 'new_only',
    category: 'Salary',
    color: '#4fa3f7',
    icon: '✅',
    items: [
      { name: 'Standard Deduction ₹75,000',       detail: 'Available in new regime from FY 2023-24.',                          popular: true  },
      { name: "Employer NPS (80CCD(2))",           detail: '10% of basic salary (Govt: 14%). Works in new regime.',            popular: true  },
      { name: 'Agniveer Corpus Fund',              detail: 'Contribution to Agniveer corpus is deductible.',                   popular: false },
      { name: 'Gratuity exemption (up to ₹20L)',  detail: 'On retirement / resignation — both regimes.',                      popular: false },
      { name: 'VRS compensation (up to ₹5L)',     detail: 'Voluntary Retirement Scheme payout — both regimes.',               popular: false },
      { name: 'Leave encashment (up to ₹25L)',    detail: 'On retirement for government employees — both regimes.',            popular: false },
    ],
    note: 'Most popular deductions (HRA, LTA, 80C, 80D, 80CCD(1B)) are NOT available in new regime.',
    tip: 'New regime is best if your total old-regime deductions are less than the tax slab benefit difference.',
  },
];

const CATEGORIES = ['All','Investment','Retirement','Insurance','Housing','Medical','Education','Salary','Capital Gains','Donation','Savings','Rebate','Business','Other'];

const REGIME_META = {
  both:     { text: 'Both Regimes',    color: '#10d97e' },
  old_only: { text: 'Old Regime Only', color: '#f0b429' },
  new_only: { text: 'New Regime Only', color: '#4fa3f7' },
};

const QUICK_QS = [
  'Which deductions work in the new regime?',
  'I pay rent but no HRA. What can I claim?',
  'How much tax does NPS save me?',
  'I sold my flat. How do I avoid capital gains tax?',
  'Best 80C investments for 30% slab?',
  'Can I claim 80C and 80CCD(1B) both?',
  'Is education loan interest fully deductible?',
  'Should I choose old or new tax regime?',
];

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  wrap:    { maxWidth: 800, margin: '0 auto', padding: '24px 20px 32px' },
  heading: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  sub:     { color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 },

  summaryBar: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  summaryCard: c => ({ flex: '1 1 120px', background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 10, padding: '10px 14px' }),
  summaryLabel: { fontSize: 11, color: 'var(--muted)', marginBottom: 3 },
  summaryVal:   c => ({ fontSize: 16, fontWeight: 800, color: c, fontFamily: 'var(--font-display)' }),

  aiBox:    { background: 'linear-gradient(135deg,rgba(16,217,126,.07),rgba(79,163,247,.05))', border: '1px solid rgba(16,217,126,.2)', borderRadius: 14, padding: 20, marginBottom: 20 },
  aiHeader: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  aiSub:    { fontSize: 13, color: 'var(--muted)', marginBottom: 14 },
  chips:    { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 },
  chip:     { fontSize: 12, padding: '5px 11px', borderRadius: 20, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s' },
  textarea: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 13px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', marginBottom: 10, resize: 'vertical', minHeight: 54 },
  askBtn:   { background: 'linear-gradient(135deg,var(--emerald),#0ab868)', color: '#000', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)' },
  askBtnOff:{ background: 'var(--bg3)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'var(--font-display)' },
  aiResp:   { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginTop: 14, fontSize: 14, color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' },
  aiErr:    { background: 'rgba(255,87,87,.1)', border: '1px solid rgba(255,87,87,.3)', borderRadius: 10, padding: '12px 16px', marginTop: 12, fontSize: 13, color: 'var(--red)' },

  searchBox: { width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', marginBottom: 12 },
  regRow:    { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  regBtn:    (a,c) => ({ padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', background: a ? `${c}22` : 'var(--bg3)', color: a ? c : 'var(--muted)', border: a ? `1px solid ${c}55` : '1px solid var(--border)', transition: 'all .15s' }),
  catRow:    { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 },
  catBtn:    a => ({ padding: '5px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', background: a ? 'var(--gold)' : 'var(--bg3)', color: a ? '#000' : 'var(--muted)', transition: 'all .15s' }),
  count:     { fontSize: 12, color: 'var(--muted)', marginBottom: 14 },

  card:       { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 12, overflow: 'hidden', transition: 'border-color .2s' },
  cardHead:   (c, open) => ({ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: open ? `${c}08` : 'transparent', borderBottom: open ? `1px solid ${c}22` : 'none', transition: 'all .2s' }),
  badge:      c => ({ background: `${c}22`, color: c, border: `1px solid ${c}44`, borderRadius: 8, padding: '3px 9px', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)', flexShrink: 0 }),
  cardTitle:  { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flex: 1 },
  chevron:    open => ({ color: 'var(--muted)', fontSize: 12, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }),
  regimePill: r => { const m = REGIME_META[r]; return { fontSize: 11, fontWeight: 600, color: m.color, background: `${m.color}18`, border: `1px solid ${m.color}44`, borderRadius: 20, padding: '2px 8px', flexShrink: 0 }; },

  cardBody:  { padding: '16px 18px' },
  itemRow:   (last) => ({ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }),
  itemName:  { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  itemDetail:{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 },
  popTag:    { fontSize: 10, fontWeight: 700, color: 'var(--gold)', background: 'rgba(240,180,41,.15)', borderRadius: 4, padding: '2px 6px', flexShrink: 0, alignSelf: 'center' },
  noteBox:   { background: 'var(--bg3)', borderRadius: 8, padding: '10px 13px', marginTop: 12, marginBottom: 8, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 },
  tipBox:    { background: 'rgba(16,217,126,.08)', border: '1px solid rgba(16,217,126,.2)', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: 'var(--emerald)', lineHeight: 1.6 },
  askSecBtn: c => ({ marginTop: 10, fontSize: 12, padding: '6px 14px', borderRadius: 8, background: `${c}18`, color: c, border: `1px solid ${c}44`, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }),
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ITSections({ userProfile = null }) {
  const [open,         setOpen]         = useState(null);
  const [category,     setCategory]     = useState('All');
  const [regimeFilter, setRegimeFilter] = useState('all');
  const [search,       setSearch]       = useState('');
  const [question,     setQuestion]     = useState('');
  const [answer,       setAnswer]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [history,      setHistory]      = useState([]);

  const ask = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true); setAnswer(''); setError('');
    try {
      const data = await aiTaxAdvisor({ question: query, userProfile });
      setAnswer(data.answer);
      setHistory(h => [{ q: query, a: data.answer }, ...h.slice(0, 3)]);
    } catch (e) {
      setError(`⚠️ ${e.message || 'Could not reach server. Is your backend running?'}`);
    }
    setLoading(false);
    setQuestion('');
  };

  const filtered = IT_SECTIONS.filter(s => {
    if (category !== 'All' && s.category !== category) return false;
    if (regimeFilter === 'new' && s.regime === 'old_only') return false;
    if (regimeFilter === 'old' && s.regime === 'new_only') return false;
    if (search) {
      const q = search.toLowerCase();
      return s.section.toLowerCase().includes(q) ||
             s.title.toLowerCase().includes(q) ||
             s.items.some(i => i.name.toLowerCase().includes(q));
    }
    return true;
  });

  const maxOldDeductions = IT_SECTIONS
    .filter(s => s.regime !== 'new_only' && s.limitNum)
    .reduce((t, s) => t + s.limitNum, 0);

  return (
    <div style={S.wrap}>
      <h2 style={S.heading}>📋 IT Deductions & Exemptions Guide</h2>
      <p style={S.sub}>
        Complete reference for all sections you can claim while filing your ITR — FY 2026-27.
        Tap any section to explore eligible investments, limits, conditions, and pro tips.
      </p>

      {/* Summary bar */}
      <div style={S.summaryBar}>
        {[
          { label: 'Sections Covered',      value: `${IT_SECTIONS.length}`,         color: '#4fa3f7' },
          { label: 'Max Old Regime Savings', value: fmtINR(maxOldDeductions),       color: '#f0b429' },
          { label: 'New Regime Zero Tax',    value: 'Upto ₹12.75L gross',           color: '#10d97e' },
          { label: 'Financial Year',         value: '2026-27',                      color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={S.summaryCard(s.color)}>
            <div style={S.summaryLabel}>{s.label}</div>
            <div style={S.summaryVal(s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* AI Tax Advisor */}
      <div style={S.aiBox}>
        <div style={S.aiHeader}>🤖 AI Tax Advisor</div>
        <div style={S.aiSub}>
          Ask anything about deductions, exemptions, or which sections apply to your situation.
          {userProfile && <span style={{ color: 'var(--emerald)' }}> Personalised to your profile.</span>}
        </div>

        <div style={S.chips}>
          {QUICK_QS.map(q => (
            <span key={q} style={S.chip} onClick={() => ask(q)}>{q}</span>
          ))}
        </div>

        <textarea
          style={S.textarea}
          placeholder="e.g. I'm 32, salaried at ₹18L p.a. Which deductions should I claim?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
          onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        <button style={loading ? S.askBtnOff : S.askBtn} onClick={() => ask()} disabled={loading}>
          {loading ? '⏳ Thinking...' : '✨ Ask'}
        </button>

        {error  && <div style={S.aiErr}>{error}</div>}
        {answer && <div style={S.aiResp}>{answer}</div>}

        {history.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Previous Questions</div>
            {history.slice(1).map((h, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 3 }}>Q: {h.q}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{h.a.slice(0, 220)}…</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <input
        style={S.searchBox}
        placeholder="🔍  Search sections… e.g. 'home loan', 'NPS', '80D'"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onFocus={e => e.target.style.borderColor = 'var(--gold)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />

      <div style={S.regRow}>
        {[
          { key: 'all', label: '🔀 All',         color: 'var(--text)' },
          { key: 'new', label: '✅ New Regime',   color: '#4fa3f7'     },
          { key: 'old', label: '📜 Old Regime',   color: '#f0b429'     },
        ].map(r => (
          <button key={r.key} style={S.regBtn(regimeFilter === r.key, r.color)} onClick={() => setRegimeFilter(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      <div style={S.catRow}>
        {CATEGORIES.map(c => (
          <button key={c} style={S.catBtn(category === c)} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <div style={S.count}>Showing {filtered.length} of {IT_SECTIONS.length} sections</div>

      {/* Cards */}
      {filtered.map(sec => {
        const isOpen = open === sec.section;
        return (
          <div key={sec.section} style={{ ...S.card, borderColor: isOpen ? `${sec.color}55` : 'var(--border)' }}>
            <div style={S.cardHead(sec.color, isOpen)} onClick={() => setOpen(isOpen ? null : sec.section)}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{sec.icon}</span>
              <span style={S.badge(sec.color)}>§ {sec.section}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.cardTitle}>{sec.title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={S.regimePill(sec.regime)}>{REGIME_META[sec.regime].text}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sec.category}</span>
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, flexShrink: 0, textAlign: 'right' }}>
                {sec.limitNum ? fmtINR(sec.limitNum) : ''}
              </span>
              <span style={S.chevron(isOpen)}>▼</span>
            </div>

            {isOpen && (
              <div style={S.cardBody}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Eligible Investments / Items
                </div>

                {sec.items.map((item, i) => (
                  <div key={i} style={S.itemRow(i === sec.items.length - 1)}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sec.color, marginTop: 7, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={S.itemName}>{item.name}</div>
                      <div style={S.itemDetail}>{item.detail}</div>
                    </div>
                    {item.popular && <span style={S.popTag}>POPULAR</span>}
                  </div>
                ))}

                <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginTop: 12, marginBottom: 4 }}>
                  Limit: {sec.limit}
                </div>

                <div style={S.noteBox}>📌 <strong>Note:</strong> {sec.note}</div>
                <div style={S.tipBox}>💡 <strong>Pro Tip:</strong> {sec.tip}</div>

                <button
                  style={S.askSecBtn(sec.color)}
                  onClick={() => ask(`Explain Section ${sec.section} (${sec.title}) for FY 2026-27 in detail. Conditions, eligibility, and any recent changes?`)}
                >
                  🤖 Ask AI about § {sec.section}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, paddingTop: 16 }}>
        ℹ️ Reference only — consult a CA for personalised advice. FY 2026-27.
      </div>
    </div>
  );
}
