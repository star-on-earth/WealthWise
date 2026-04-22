/**
 * App.jsx — WealthWise v4
 *
 * Changes from v3:
 *  • Annual savings: toggle between manual input and auto-calc from tracker
 *  • Goals loaded and passed to portfolio generator for goal-aware allocation
 *  • Projection default: 10 years (toggle to 20yr available)
 *  • Corpus glitch fixed: new regime and old regime show DIFFERENT post-tax corpora
 *  • HUF entity type
 *  • 80TTB toggle removed — auto from age input
 *  • Loan deductions state added
 *  • Kuber/Laxmi theme colours throughout
 */

import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuth }     from './AuthContext.jsx';
import { logout }      from './firebase.js';
import Login           from './Login.jsx';
import Tracker         from './Tracker.jsx';
import Goals           from './Goals.jsx';
import Scenarios       from './Scenarios.jsx';
import ITSections      from './ITSections.jsx';
import IncomeForm      from './IncomeForm.jsx';
import {
  computeMultiIncomeTax, getRiskProfile, generatePortfolios,
  projectNetWorth, fmtINR, OCCUPATIONS, ASSET_TAX_RULES,
  computeSavingsFromTracker, extractTrackerDeductions,
} from './taxEngine.js';
import { aiExplainPortfolio } from './api.js';

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  app:       { minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' },
  hero:      {
    background: 'linear-gradient(135deg,#0e0806 0%,#1a0e08 50%,#120a06 100%)',
    borderBottom: '1px solid var(--border)', padding: '36px 24px 30px',
    textAlign: 'center', position: 'relative', overflow: 'hidden',
  },
  heroGlow:  {
    position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
    width: 600, height: 300,
    background: 'radial-gradient(ellipse,rgba(232,146,26,.18) 0%,transparent 70%)',
    pointerEvents: 'none',
  },
  logoRow:   { display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 18 },
  logoIcon:  {
    width: 44, height: 44,
    background: 'linear-gradient(135deg,#E8921A,#1DB873)',
    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 900, color: '#fff',
  },
  logoText:  {
    fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800,
    background: 'linear-gradient(90deg,#E8921A,#FFB84D)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,5vw,44px)',
    fontWeight: 800, lineHeight: 1.15, color: 'var(--text)', marginBottom: 10,
  },
  heroSub:   { color: 'var(--muted)', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 },
  userBar:   { position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 8 },
  avatar:    { width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--emerald))',
               display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#000' },
  logoutBtn: { fontSize: 11, color: 'var(--muted)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer' },
  signInBtn: { fontSize: 11, color: 'var(--gold)', background: 'transparent', border: '1px solid var(--gold)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer' },
  container: { maxWidth: 800, margin: '0 auto', padding: '28px 20px' },
  card:      { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 22px', marginBottom: 18, animation: 'fadeUp .35s ease both' },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 18 },
  row:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 14 },
  field:     { display: 'flex', flexDirection: 'column', gap: 5 },
  label:     { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:     { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-body)', width: '100%', transition: 'border-color .2s' },
  select:    { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-body)', width: '100%', cursor: 'pointer' },
  btn:       { background: 'linear-gradient(135deg,var(--gold),var(--goldDim))', color: '#000', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', cursor: 'pointer', width: '100%' },
  btnOutline:{ background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 12, padding: '12px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  regimeBox: (a) => ({ flex: 1, padding: 16, borderRadius: 12, cursor: 'pointer', transition: 'all .2s', border: a ? '2px solid var(--gold)' : '1px solid var(--border)', background: a ? 'rgba(232,146,26,.08)' : 'var(--bg3)' }),
  statRow:   { display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' },
  statCard:  { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 110 },
  statLabel: { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 },
  statVal:   { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--gold)' },
  tabBar:    { display: 'flex', gap: 7, marginBottom: 18, overflowX: 'auto', paddingBottom: 4 },
  tab:       (a) => ({ padding: '7px 15px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', border: a ? '1px solid var(--gold)' : '1px solid var(--border)', background: a ? 'rgba(232,146,26,.12)' : 'var(--bg3)', color: a ? 'var(--gold)' : 'var(--muted)', fontSize: 13, fontWeight: 600 }),
  badge:     (c) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}44` }),
  assetRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  aiBox:     { background: 'linear-gradient(135deg,rgba(29,184,115,.07),rgba(232,146,26,.04))', border: '1px solid rgba(29,184,115,.22)', borderRadius: 12, padding: 18, marginTop: 16 },
  aiLabel:   { fontSize: 11, fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 },
  aiText:    { fontSize: 14, color: 'var(--text)', lineHeight: 1.75 },
  btnGreen:  { background: 'transparent', color: 'var(--emerald)', border: '1px solid var(--emerald)', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', zIndex: 100 },
  navBtn:    (a) => ({ flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderTop: a ? '2px solid var(--gold)' : '2px solid transparent' }),
  navLabel:  (a) => ({ fontSize: 10, fontWeight: 600, color: a ? 'var(--gold)' : 'var(--muted)' }),
  tooltipBox:{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 13px', fontSize: 12 },
  toggle:    (on) => ({ width: 40, height: 22, borderRadius: 11, background: on ? 'var(--gold)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }),
  toggleDot: (on) => ({ position: 'absolute', top: 4, left: on ? 20 : 4, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s' }),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const Logo = () => (
  <div style={S.logoRow}>
    <div style={S.logoIcon}>₹</div>
    <span style={S.logoText}>WealthWise</span>
  </div>
);

const NAV_ITEMS = [
  { key: 'home',       icon: '🏠', label: 'Planner'   },
  { key: 'tracker',    icon: '💳', label: 'Tracker'   },
  { key: 'goals',      icon: '🎯', label: 'Goals'     },
  { key: 'scenarios',  icon: '🔮', label: 'Scenarios' },
  { key: 'itsections', icon: '📋', label: 'IT Guide'  },
];

const BottomNav = ({ page, setPage }) => (
  <div style={S.bottomNav}>
    {NAV_ITEMS.map(n => (
      <button key={n.key} style={S.navBtn(page === n.key)} onClick={() => setPage(n.key)}>
        <span style={{ fontSize: 17 }}>{n.icon}</span>
        <span style={S.navLabel(page === n.key)}>{n.label}</span>
      </button>
    ))}
  </div>
);

const UserBar = ({ user, onSignIn }) => (
  <div style={S.userBar}>
    {user ? (
      <>
        <div style={S.avatar}>{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
        <button style={S.logoutBtn} onClick={logout}>Sign out</button>
      </>
    ) : (
      <button style={S.signInBtn} onClick={onSignIn}>Sign in</button>
    )}
  </div>
);

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={S.tooltipBox}>
      <div style={{ color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
      {payload.map(p => <div key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>{p.name}: ₹{p.value}L</div>)}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading, saveUserProfile, profile } = useAuth();
  const [showLogin,   setShowLogin]   = useState(false);
  const [page,        setPage]        = useState('home');
  const [step,        setStep]        = useState(1);
  const [activeTab,   setActiveTab]   = useState(0);
  const [projYears,   setProjYears]   = useState(10); // ← default 10yr
  const [results,     setResults]     = useState(null);
  const [aiText,      setAiText]      = useState('');
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState('');

  // Form state
  const [incomes,      setIncomes]     = useState({ salary: '' });
  const [loanDeductions, setLoanDeductions] = useState({});
  const [entityType,   setEntityType]  = useState('individual');
  const [savingsMode,  setSavingsMode] = useState('manual'); // 'manual' | 'auto'
  const [savingsInput, setSavingsInput]= useState('');
  const [age,          setAge]         = useState('');
  const [gender,       setGender]      = useState('male');
  const [occupation,   setOccupation]  = useState('Salaried (MNC/Private)');

  // Auto-savings from tracker
  const [autoSavingsData, setAutoSavingsData] = useState(null);

  // Goals for portfolio adjustment
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    // Load goals from localStorage for portfolio adjustment
    try {
      const g = JSON.parse(localStorage.getItem('wealthwise_goals') || '[]');
      setGoals(g);
    } catch {}
    // Load auto savings data
    const data = computeSavingsFromTracker();
    setAutoSavingsData(data);
  }, []);

  useEffect(() => {
    if (profile?.lastAnalysis) {
      const p = profile.lastAnalysis;
      if (p.incomes)     setIncomes(p.incomes);
      if (p.savings)     setSavingsInput(String(p.savings));
      if (p.age)         setAge(String(p.age));
      if (p.gender)      setGender(p.gender);
      if (p.occupation)  setOccupation(p.occupation);
      if (p.entityType)  setEntityType(p.entityType);
    }
  }, [profile]);

  const focusGold = e => e.target.style.borderColor = 'var(--gold)';
  const blurReset = e => e.target.style.borderColor = 'var(--border)';

  const effectiveSavings = savingsMode === 'auto' && autoSavingsData
    ? autoSavingsData.annualSavings
    : (+savingsInput || 0);

  const totalIncome = Object.values(incomes).reduce((s, v) => s + (+v || 0), 0);
  const isFormValid = totalIncome > 0 && effectiveSavings > 0 && age;
  const userAge     = +age || 30;

  const handleAnalyze = async () => {
    const incomesNum = Object.fromEntries(Object.entries(incomes).map(([k, v]) => [k, +v || 0]));
    const trackerDed = extractTrackerDeductions();
    const taxResult  = computeMultiIncomeTax(incomesNum, userAge, entityType, loanDeductions, trackerDed);

    const riskProfile = getRiskProfile(userAge, occupation, totalIncome, effectiveSavings);

    // ← KEY FIX: generate portfolios with BOTH regime slab rates
    const portfolios  = generatePortfolios(
      riskProfile.label,
      effectiveSavings,
      taxResult.newSlabRate,    // new regime slab rate
      taxResult.oldSlabRate,    // old regime slab rate
      goals                     // goals for adjustment
    );

    // ← Generate projections for BOTH regimes per portfolio
    const projections = portfolios.map(p => ({
      preTax:     projectNetWorth(p.blendedCagr,       effectiveSavings, projYears),
      postTaxNew: projectNetWorth(p.blendedPostTaxNew,  effectiveSavings, projYears),
      postTaxOld: projectNetWorth(p.blendedPostTaxOld,  effectiveSavings, projYears),
    }));

    const r = {
      incomes: incomesNum, savings: effectiveSavings, age: userAge,
      gender, occupation, entityType,
      riskProfile, portfolios, projections, taxResult,
      newSlabRate: taxResult.newSlabRate,
      oldSlabRate: taxResult.oldSlabRate,
    };
    setResults(r); setStep(3); setAiText(''); setAiError('');

    if (user) await saveUserProfile({ lastAnalysis: { incomes: incomesNum, savings: effectiveSavings, age: userAge, gender, occupation, entityType } });
  };

  const handleAiExplain = async () => {
    if (!results) return;
    setAiLoading(true); setAiText(''); setAiError('');
    try {
      const portfolio = results.portfolios[activeTab];
      const data = await aiExplainPortfolio({
        profile: { incomes: results.incomes, annual_savings: results.savings, age: results.age, gender: results.gender, occupation: results.occupation, is_senior: results.age >= 60 },
        portfolioName:      portfolio.name,
        portfolioAssets:    portfolio.alloc.slice(0, 4).map(a => ({ label: a.label, pct: a.pct, cagr: a.cagr, post_tax_cagr: a.postTaxCagrNew, tax_rule_label: a.taxRuleLabel })),
        riskLabel:          portfolio.riskLabel,
        marginalSlabRate:   results.newSlabRate,
      });
      setAiText(data.explanation);
    } catch (e) {
      setAiError(`⚠️ ${e.message || 'Backend unreachable.'}`);
    }
    setAiLoading(false);
  };

  if (loading) return (
    <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🪔</div>Loading WealthWise…
      </div>
    </div>
  );

  if (showLogin && !user) return <Login onSkip={() => setShowLogin(false)} />;

  const PageHero = ({ title, sub }) => (
    <div style={{ ...S.hero, padding: '22px 24px 18px' }}>
      <div style={S.heroGlow} />
      <UserBar user={user} onSignIn={() => setShowLogin(true)} />
      <Logo />
      <h1 style={{ ...S.heroTitle, fontSize: 20 }}>{title}</h1>
      {sub && <p style={{ ...S.heroSub, fontSize: 13 }}>{sub}</p>}
    </div>
  );

  if (page === 'tracker')    return <div style={{ ...S.app, paddingBottom: 72 }}><PageHero title="💳 Expense Tracker" /><Tracker /><BottomNav page={page} setPage={setPage} /></div>;
  if (page === 'goals')      return <div style={{ ...S.app, paddingBottom: 72 }}><PageHero title="🎯 Financial Goals" /><Goals /><BottomNav page={page} setPage={setPage} /></div>;
  if (page === 'scenarios')  return <div style={{ ...S.app, paddingBottom: 72 }}><PageHero title="🔮 What-If Planner" /><Scenarios /><BottomNav page={page} setPage={setPage} /></div>;
  if (page === 'itsections') return <div style={{ ...S.app, paddingBottom: 72 }}><PageHero title="📋 IT Deductions Guide" /><ITSections userProfile={results ? { income: results.taxResult?.totalGrossIncome || totalIncome, savings: results.savings, age, occupation, marginal_slab_rate: results.newSlabRate } : null} /><BottomNav page={page} setPage={setPage} /></div>;

  // ── Step 1: Income form ────────────────────────────────────────────────────

  if (step === 1) return (
    <div style={{ ...S.app, paddingBottom: 72 }}>
      <div style={S.hero}>
        <div style={S.heroGlow} />
        <UserBar user={user} onSignIn={() => setShowLogin(true)} />
        <Logo />
        <h1 style={S.heroTitle}>Smart Savings.<br />Maximum Growth.</h1>
        <p style={S.heroSub}>Add all income sources for accurate tax calculation and personalised portfolio.</p>
      </div>
      <div style={S.container}>
        {profile?.lastAnalysis && (
          <div style={{ background: 'rgba(29,184,115,.08)', border: '1px solid rgba(29,184,115,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--emerald)' }}>
            ✅ Last profile restored. Update values and re-analyse.
          </div>
        )}

        <div style={S.card}>
          <div style={S.cardTitle}>💰 Income Sources</div>
          <IncomeForm
            value={incomes}
            onChange={setIncomes}
            age={userAge}
            entityType={entityType}
            onEntityChange={setEntityType}
            loanDeductions={loanDeductions}
            onLoanChange={setLoanDeductions}
          />
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>👤 Profile & Savings</div>
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Age</label>
              <input style={S.input} type="number" placeholder="e.g. 28" value={age} onChange={e => setAge(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Gender</label>
              <select style={S.select} value={gender} onChange={e => setGender(e.target.value)}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Occupation</label>
              <select style={S.select} value={occupation} onChange={e => setOccupation(e.target.value)}>
                {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Savings toggle: manual vs auto */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <label style={S.label}>Annual Savings</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <span style={{ fontSize: 12, color: savingsMode === 'manual' ? 'var(--gold)' : 'var(--muted)' }}>Manual</span>
                <div style={S.toggle(savingsMode === 'auto')} onClick={() => setSavingsMode(m => m === 'auto' ? 'manual' : 'auto')}>
                  <div style={S.toggleDot(savingsMode === 'auto')} />
                </div>
                <span style={{ fontSize: 12, color: savingsMode === 'auto' ? 'var(--gold)' : 'var(--muted)' }}>Auto from Tracker</span>
              </div>
            </div>

            {savingsMode === 'manual' ? (
              <input style={S.input} type="number" placeholder="Amount you can invest per year (₹)" value={savingsInput} onChange={e => setSavingsInput(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
            ) : (
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px' }}>
                {autoSavingsData ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--gold)', marginBottom: 4 }}>
                      {fmtINR(autoSavingsData.annualSavings)}/yr
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                      Based on {autoSavingsData.monthsCovered} month{autoSavingsData.monthsCovered !== 1 ? 's' : ''} of tracker data
                      {autoSavingsData.isPartialYear && ' (partial year — extrapolated to 12 months)'}.
                      Monthly avg: {fmtINR(autoSavingsData.monthlySavings)}/mo.
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    No tracker data yet. Add income and expense transactions in the Tracker tab first, then switch back here.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Goals loaded notice */}
          {goals.length > 0 && (
            <div style={{ background: 'rgba(29,184,115,.07)', border: '1px solid rgba(29,184,115,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--emerald)', marginBottom: 14 }}>
              🎯 {goals.length} goal{goals.length !== 1 ? 's' : ''} loaded — portfolio will be adjusted to align with your timelines.
            </div>
          )}

          <button style={{ ...S.btn, opacity: isFormValid ? 1 : 0.45 }} disabled={!isFormValid} onClick={() => setStep(2)}>
            Analyse My Savings →
          </button>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, paddingBottom: 8 }}>
          🔒 {user ? 'Profile saved to your account.' : 'Calculations run in browser.'} · FY 2026-27
        </div>
      </div>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );

  // ── Step 2: Tax regime ─────────────────────────────────────────────────────

  if (step === 2) {
    const incomesNum  = Object.fromEntries(Object.entries(incomes).map(([k, v]) => [k, +v || 0]));
    const trackerDed  = extractTrackerDeductions();
    const taxPreview  = computeMultiIncomeTax(incomesNum, userAge, entityType, loanDeductions, trackerDed);
    const better      = taxPreview.newRegime.totalTax <= taxPreview.oldRegime.totalTax ? 'new' : 'old';

    return (
      <div style={{ ...S.app, paddingBottom: 72 }}>
        <div style={{ ...S.hero, padding: '24px 24px 20px' }}>
          <div style={S.heroGlow} /><Logo />
          <h1 style={{ ...S.heroTitle, fontSize: 26 }}>Confirm Tax Regime</h1>
        </div>
        <div style={S.container}>
          <div style={S.card}>
            <div style={S.cardTitle}>🧾 FY 2026-27 — Full Tax Summary</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              {[
                { key: 'new', label: 'New Regime', sub: `₹75K std deduction. Slab: ${(taxPreview.newSlabRate*100).toFixed(0)}%`, tax: taxPreview.newRegime.totalTax },
                { key: 'old', label: 'Old Regime', sub: `80C+80D+NPS+Loans applied. Slab: ${(taxPreview.oldSlabRate*100).toFixed(0)}%`, tax: taxPreview.oldRegime.totalTax },
              ].map(r => (
                <div key={r.key} style={S.regimeBox(better === r.key)}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.4 }}>{r.sub}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: r.tax === 0 ? 'var(--emerald)' : 'var(--text)' }}>
                    {r.tax === 0 ? '₹0' : fmtINR(r.tax)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>total tax</div>
                  {better === r.key && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--emerald)', fontWeight: 700 }}>✓ BETTER — Saves {fmtINR(taxPreview.taxSaving)}</div>}
                </div>
              ))}
            </div>

            {/* ← Shows that slab rates DIFFER between regimes → different corpora */}
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              💡 Your <strong style={{ color: 'var(--text)' }}>new regime marginal slab: {(taxPreview.newSlabRate*100).toFixed(0)}%</strong> vs <strong style={{ color: 'var(--text)' }}>old regime marginal slab: {(taxPreview.oldSlabRate*100).toFixed(0)}%</strong>.
              The Results page will show you <strong style={{ color: 'var(--gold)' }}>TWO different post-tax corpora</strong> — one for each regime — so you can see the actual wealth impact of your regime choice.
              {taxPreview.agriIncome > 0 && ` Agricultural income ₹${fmtINR(taxPreview.agriIncome)} is exempt but used for rate computation.`}
            </div>

            {taxPreview.specialTaxTotal > 0 && (
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Special Rate Taxes (both regimes)</div>
                {taxPreview.ltcgEquityTax > 0    && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', padding: '3px 0' }}><span>LTCG Equity 10%</span><span style={{ color: '#4A9EE8', fontWeight: 600 }}>{fmtINR(taxPreview.ltcgEquityTax)}</span></div>}
                {taxPreview.stcgEquityTax > 0    && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', padding: '3px 0' }}><span>STCG Equity 15%</span><span style={{ color: '#E8921A', fontWeight: 600 }}>{fmtINR(taxPreview.stcgEquityTax)}</span></div>}
                {taxPreview.ltcgPropertyTax > 0  && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', padding: '3px 0' }}><span>LTCG Property 20%</span><span style={{ color: '#fb923c', fontWeight: 600 }}>{fmtINR(taxPreview.ltcgPropertyTax)}</span></div>}
                {taxPreview.cryptoTax > 0        && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', padding: '3px 0' }}><span>Crypto 30% flat</span><span style={{ color: '#E84040', fontWeight: 600 }}>{fmtINR(taxPreview.cryptoTax)}</span></div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...S.btnOutline, flex: 1 }} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...S.btn, flex: 2, marginTop: 0 }} onClick={handleAnalyze}>Generate My Plan →</button>
            </div>
          </div>
        </div>
        <BottomNav page={page} setPage={setPage} />
      </div>
    );
  }

  // ── Step 3: Results ────────────────────────────────────────────────────────

  const { riskProfile, portfolios, projections, taxResult, newSlabRate, oldSlabRate } = results;
  const portfolio = portfolios[activeTab];
  const proj      = projections[activeTab];

  // ← KEY: build chart with THREE lines — pre-tax, post-tax new regime, post-tax old regime
  const maxY = projYears;
  const tripleChart = proj.preTax.slice(0, maxY + 1).map((p, i) => ({
    year:       p.year,
    'Pre-Tax':  p.value,
    'New Regime': proj.postTaxNew[i]?.value,
    'Old Regime': proj.postTaxOld[i]?.value,
  }));

  const worthPre  = proj.preTax[maxY]?.value;
  const worthNew  = proj.postTaxNew[maxY]?.value;
  const worthOld  = proj.postTaxOld[maxY]?.value;
  const taxDragNew = (worthPre - worthNew).toFixed(1);

  return (
    <div style={{ ...S.app, paddingBottom: 72 }}>
      <div style={{ ...S.hero, padding: '22px 24px 18px' }}>
        <div style={S.heroGlow} />
        <UserBar user={user} onSignIn={() => setShowLogin(true)} />
        <Logo />
        <h1 style={{ ...S.heroTitle, fontSize: 22 }}>Your Wealth Blueprint</h1>
      </div>

      <div style={S.container}>
        {/* Projection year toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[10, 20].map(y => (
            <button key={y} style={{ ...S.tab(projYears === y), fontSize: 12 }} onClick={() => setProjYears(y)}>
              {y}-Year View
            </button>
          ))}
        </div>

        {/* KPI bar */}
        <div style={S.statRow}>
          {[
            { label: 'Risk Profile',      value: riskProfile.label,           color: riskProfile.color },
            { label: 'Total Tax',         value: fmtINR(taxResult.bestTax),   color: taxResult.bestTax === 0 ? 'var(--emerald)' : 'var(--gold)' },
            { label: `${projYears}Y (New Regime)`, value: `₹${worthNew}L`,   color: 'var(--emerald)' },
            { label: `${projYears}Y (Old Regime)`, value: `₹${worthOld}L`,   color: '#9B72CF' },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{ ...S.statVal, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Slab rate info — shows WHY corpus differs */}
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>New regime slab: <strong style={{ color: 'var(--gold)' }}>{(newSlabRate*100).toFixed(0)}%</strong></span>
          <span>Old regime slab: <strong style={{ color: '#9B72CF' }}>{(oldSlabRate*100).toFixed(0)}%</strong></span>
          <span>Pre-tax blended CAGR: <strong style={{ color: 'var(--text)' }}>{portfolio.blendedCagr}%</strong></span>
          <span>Post-tax (new): <strong style={{ color: 'var(--emerald)' }}>{portfolio.blendedPostTaxNew}%</strong></span>
          <span>Post-tax (old): <strong style={{ color: '#9B72CF' }}>{portfolio.blendedPostTaxOld}%</strong></span>
        </div>

        {/* Goal alignment notes */}
        {portfolio.goalNotes?.length > 0 && (
          <div style={{ background: 'rgba(29,184,115,.07)', border: '1px solid rgba(29,184,115,.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--emerald)', marginBottom: 8 }}>🎯 Portfolio Adjusted for Your Goals</div>
            {portfolio.goalNotes.map((n, i) => <div key={i} style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{n}</div>)}
          </div>
        )}

        {/* Portfolio tabs */}
        <div style={S.tabBar}>
          {portfolios.map((p, i) => (
            <button key={i} style={S.tab(activeTab === i)} onClick={() => { setActiveTab(i); setAiText(''); setAiError(''); }}>
              {p.name}
            </button>
          ))}
        </div>

        {/* Allocation card */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>📊 Portfolio Allocation</span>
            <span style={S.badge(riskProfile.color)}>{portfolio.riskLabel}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
            <ResponsiveContainer width={190} height={190} style={{ flexShrink: 0 }}>
              <PieChart>
                <Pie data={portfolio.alloc} dataKey="pct" cx="50%" cy="50%" innerRadius={52} outerRadius={86} paddingAngle={2}>
                  {portfolio.alloc.map((a, i) => <Cell key={i} fill={a.color} />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`} contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, minWidth: 200 }}>
              {portfolio.alloc.map((a, i) => (
                <div key={a.key} style={{ ...S.assetRow, borderBottom: i === portfolio.alloc.length - 1 ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {a.cagr}% → <span style={{ color: 'var(--emerald)' }}>{a.postTaxCagrNew}%</span> (new) / <span style={{ color: '#9B72CF' }}>{a.postTaxCagrOld}%</span> (old)
                        {' '}· <span style={{ color: a.taxRuleColor || 'var(--muted)' }}>{a.taxRuleLabel}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg)', marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${a.pct}%`, background: a.color, transition: 'width .6s' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: a.color }}>{a.pct}%</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtINR(a.amount)}/yr</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI explanation */}
          <div style={S.aiBox}>
            <div style={S.aiLabel}>🤖 AI Financial Advisor</div>
            {!aiText && !aiLoading && <button style={S.btnGreen} onClick={handleAiExplain}>✨ Explain This Portfolio</button>}
            {aiLoading && <div style={{ ...S.aiText, color: 'var(--muted)', animation: 'pulse 1.5s infinite' }}>Analysing your income profile…</div>}
            {aiText  && <div style={S.aiText}>{aiText}</div>}
            {aiError && <div style={{ ...S.aiText, color: 'var(--red)', fontSize: 13 }}>{aiError}</div>}
          </div>
        </div>

        {/* Triple corpus chart — THE FIX for "same corpus" complaint */}
        <div style={S.card}>
          <div style={S.cardTitle}>📈 {projYears}-Year Corpus — New vs Old Regime</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
            Pre-tax: ₹{worthPre}L · New Regime post-tax: ₹{worthNew}L · Old Regime post-tax: ₹{worthOld}L
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Tax drag (new regime): ₹{taxDragNew}L over {projYears} years
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={tripleChart}>
              <defs>
                <linearGradient id="gPre"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#888" stopOpacity={0.12}/><stop offset="100%" stopColor="#888" stopOpacity={0}/></linearGradient>
                <linearGradient id="gNew"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.2}/><stop offset="100%" stopColor="var(--emerald)" stopOpacity={0}/></linearGradient>
                <linearGradient id="gOld"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9B72CF" stopOpacity={0.2}/><stop offset="100%" stopColor="#9B72CF" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.floor(projYears / 5)} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}L`} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Pre-Tax"    stroke="#666"          strokeWidth={1} fill="url(#gPre)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="New Regime" stroke="var(--emerald)" strokeWidth={2} fill="url(#gNew)" />
              <Area type="monotone" dataKey="Old Regime" stroke="#9B72CF"        strokeWidth={2} fill="url(#gOld)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tax summary */}
        <div style={S.card}>
          <div style={S.cardTitle}>🧾 Tax Summary — FY 2026-27</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Gross Income',   value: fmtINR(taxResult.totalGrossIncome), hi: false },
              { label: 'Best Regime',    value: taxResult.bestRegime === 'new' ? 'New Regime' : 'Old Regime', hi: false },
              { label: 'Ordinary Tax',   value: fmtINR(taxResult.bestRegime === 'new' ? taxResult.newRegime.tax : taxResult.oldRegime.tax), hi: false },
              { label: 'Total Tax',      value: taxResult.bestTax === 0 ? '₹0 (87A Rebate)' : fmtINR(taxResult.bestTax), hi: true },
            ].map(r => (
              <div key={r.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 15px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: r.hi ? 'var(--emerald)' : 'var(--text)' }}>{r.value}</div>
              </div>
            ))}
          </div>
          {taxResult.specialTaxTotal > 0 && (
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 15px', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Special Rate Taxes</div>
              {taxResult.ltcgEquityTax   > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', padding: '4px 0' }}><span>LTCG Equity 10%</span><span style={{ color: '#4A9EE8', fontWeight: 700 }}>{fmtINR(taxResult.ltcgEquityTax)}</span></div>}
              {taxResult.stcgEquityTax   > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', padding: '4px 0' }}><span>STCG Equity 15%</span><span style={{ color: '#E8921A', fontWeight: 700 }}>{fmtINR(taxResult.stcgEquityTax)}</span></div>}
              {taxResult.ltcgPropertyTax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', padding: '4px 0' }}><span>LTCG Property 20%</span><span style={{ color: '#fb923c', fontWeight: 700 }}>{fmtINR(taxResult.ltcgPropertyTax)}</span></div>}
              {taxResult.cryptoTax       > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', padding: '4px 0' }}><span>Crypto 30%</span><span style={{ color: '#E84040', fontWeight: 700 }}>{fmtINR(taxResult.cryptoTax)}</span></div>}
            </div>
          )}
          {/* ── Section 54 / 54F LTCG Callout ── */}
          {(taxResult.ltcgPropertyTax > 0 || taxResult.ltcgPropertyNewTax > 0) && (
            <div style={{ background: 'linear-gradient(135deg,rgba(29,184,115,.09),rgba(232,146,26,.05))', border: '1px solid rgba(29,184,115,.3)', borderRadius: 12, padding: '16px 18px', marginTop: 14 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--emerald)', marginBottom: 8 }}>
                🏠 Sections 54 / 54F — Save up to {fmtINR((taxResult.ltcgPropertyTax || 0) + (taxResult.ltcgPropertyNewTax || 0))} in Property LTCG Tax
              </div>
              {taxResult.ltcgPropertyTax > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 8 }}>
                  <strong>Pre-Jul 23, 2024 property:</strong> {fmtINR(results.incomes?.ltcg_property || 0)} LTCG → <strong style={{ color: 'var(--red)' }}>{fmtINR(taxResult.ltcgPropertyTax)}</strong> tax at 20% with indexation.
                </div>
              )}
              {taxResult.ltcgPropertyNewTax > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 8 }}>
                  <strong>Post-Jul 23, 2024 property:</strong> {fmtINR(results.incomes?.ltcg_property_new || 0)} LTCG → <strong style={{ color: 'var(--red)' }}>{fmtINR(taxResult.ltcgPropertyNewTax)}</strong> tax at 12.5% without indexation (Budget 2024 rule).
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8 }}>
                📋 <strong style={{ color: 'var(--text)' }}>Section 54 (property → property):</strong> Reinvest LTCG in a new house within 2 years (or construct within 3 years). Own fewer than 2 houses. Park proceeds in CGAS if not immediately available.
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8 }}>
                📋 <strong style={{ color: 'var(--text)' }}>Section 54F (any asset → property):</strong> If you sold stocks, gold, or bonds and want to reinvest the FULL proceeds in a house — Section 54F exempts the full LTCG. You must not own more than 1 existing house.
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                📋 <strong style={{ color: 'var(--text)' }}>Section 54EC alternative:</strong> Invest up to ₹50L in NHAI/REC bonds within 6 months for proportionate exemption — works even if you own 2+ properties.
              </div>
              <button style={{ marginTop: 12, background: 'transparent', color: 'var(--emerald)', border: '1px solid var(--emerald)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setPage('itsections')}>
                View Section 54 in IT Guide →
              </button>
            </div>
          )}

          {taxResult.trackerDeductionsUsed > 0 && (
            <div style={{ fontSize: 12, color: 'var(--emerald)', marginTop: 10 }}>
              💚 ₹{fmtINR(taxResult.trackerDeductionsUsed)} of deductions sourced automatically from your Expense Tracker.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, paddingBottom: 16 }}>
          <button style={{ ...S.btnOutline, flex: 1 }} onClick={() => { setStep(1); setResults(null); setActiveTab(0); }}>← Start Over</button>
          <button style={{ ...S.btn, flex: 2, marginTop: 0 }} onClick={() => window.print()}>🖨️ Export / Print</button>
        </div>
      </div>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}
