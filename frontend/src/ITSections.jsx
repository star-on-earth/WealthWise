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
    note: 'New property cannot be sold within 3 years of purchase. Only ONE new property allowed (Budget 2023+).',
    tip: 'Biggest tax-saving tool for real estate investors. Plan the timeline of sale and reinvestment carefully.',
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

const CATEGORIES = ['All','Investment','Retirement','Insurance','Housing','Medical','Education','Salary','Capital Gains','Donation','Savings','Rebate'];

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
