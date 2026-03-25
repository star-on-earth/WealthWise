/**
 * App.jsx — WealthWise v2
 *
 * Pages:
 *  🏠 Planner    — 3-step savings analysis (tax + risk + portfolio)
 *  💳 Tracker    — Monthly expense & income tracker
 *  🎯 Goals      — Financial goal setting with SIP calculator
 *  🔮 Scenarios  — What-if scenario planner
 *  📋 IT Sections — Deductions guide + AI tax advisor
 *
 * Auth: Firebase (Google + Email). Guests can use without signing in.
 * Security: NO Anthropic API key here. All AI calls go to /ai/* backend.
 */

import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import { useAuth } from './AuthContext.jsx';
import { logout } from './firebase.js';
import Login      from './Login.jsx';
import Tracker    from './Tracker.jsx';
import Goals      from './Goals.jsx';
import Scenarios  from './Scenarios.jsx';
import ITSections from './ITSections.jsx';
import {
  calcNewRegime, calcOldRegime, bestRegime,
  getRiskProfile, generatePortfolios, projectNetWorth,
  fmtINR, OCCUPATIONS,
} from './taxEngine.js';
import { aiExplainPortfolio } from './api.js';

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const S = {
  app:    { minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' },

  hero: {
    background: 'linear-gradient(135deg,#0a0a0f 0%,#111118 50%,#0f0f1a 100%)',
    borderBottom: '1px solid var(--border)', padding: '36px 24px 30px',
    textAlign: 'center', position: 'relative', overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
    width: 600, height: 300,
    background: 'radial-gradient(ellipse,rgba(240,180,41,.12) 0%,transparent 70%)',
    pointerEvents: 'none',
  },
  logoRow: { display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 18 },
  logoIcon: {
    width: 40, height: 40,
    background: 'linear-gradient(135deg,var(--gold),var(--emerald))',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
  },
  logoText: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px',
    background: 'linear-gradient(90deg,var(--gold),var(--gold2))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(24px,5vw,44px)', fontWeight: 800,
    lineHeight: 1.15, letterSpacing: '-1px', color: 'var(--text)', marginBottom: 10,
  },
  heroSub: { color: 'var(--muted)', fontSize: 15, maxWidth: 460, margin: '0 auto', lineHeight: 1.6 },

  userBar: {
    position: 'absolute', top: 16, right: 20,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  avatar: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'linear-gradient(135deg,var(--gold),var(--emerald))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, color: '#000',
  },
  userName: { fontSize: 12, color: 'var(--muted)' },
  logoutBtn: {
    fontSize: 11, color: 'var(--muted)', background: 'var(--bg3)',
    border: '1px solid var(--border)', borderRadius: 6,
    padding: '4px 9px', cursor: 'pointer', fontFamily: 'var(--font-body)',
  },

  container: { maxWidth: 800, margin: '0 auto', padding: '28px 20px' },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '24px 22px', marginBottom: 18,
    animation: 'fadeUp .35s ease both',
  },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 18 },

  row:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '11px 13px', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-body)',
    width: '100%', transition: 'border-color .2s',
  },
  select: {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '11px 13px', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-body)',
    width: '100%', cursor: 'pointer',
  },
  btn: {
    background: 'linear-gradient(135deg,var(--gold),#e09b0a)', color: '#000', border: 'none',
    borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 700,
    fontFamily: 'var(--font-display)', cursor: 'pointer', width: '100%', letterSpacing: '.3px',
  },
  btnOutline: {
    background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold)',
    borderRadius: 12, padding: '12px 22px', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  },
  regimeBox: (active) => ({
    flex: 1, padding: 16, borderRadius: 12, cursor: 'pointer', transition: 'all .2s',
    border: active ? '2px solid var(--gold)' : '1px solid var(--border)',
    background: active ? 'rgba(240,180,41,.08)' : 'var(--bg3)',
  }),
  statRow: { display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' },
  statCard: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 110 },
  statLabel: { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 },
  statVal:   { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--gold)' },
  tabBar:    { display: 'flex', gap: 7, marginBottom: 18, overflowX: 'auto', paddingBottom: 4 },
  tab:       (a) => ({ padding: '7px 15px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', border: a ? '1px solid var(--gold)' : '1px solid var(--border)', background: a ? 'rgba(240,180,41,.12)' : 'var(--bg3)', color: a ? 'var(--gold)' : 'var(--muted)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }),
  badge:     (c) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}44` }),
  assetRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' },
  barFill:   (color, pct) => ({ height: 4, borderRadius: 2, width: `${pct}%`, background: color, transition: 'width .6s ease' }),
  aiBox:     { background: 'linear-gradient(135deg,rgba(16,217,126,.07),rgba(240,180,41,.04))', border: '1px solid rgba(16,217,126,.22)', borderRadius: 12, padding: 18, marginTop: 16 },
  aiLabel:   { fontSize: 11, fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 },
  aiText:    { fontSize: 14, color: 'var(--text)', lineHeight: 1.75 },
  btnGreen:  { background: 'transparent', color: 'var(--emerald)', border: '1px solid var(--emerald)', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' },

  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', zIndex: 100,
  },
  navBtn: (active) => ({
    flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
    background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    borderTop: active ? '2px solid var(--gold)' : '2px solid transparent',
  }),
  navLabel: (active) => ({ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)', color: active ? 'var(--gold)' : 'var(--muted)' }),
  tooltipBox: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 13px', fontSize: 13 },
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={S.tooltipBox}>
      <div style={{ color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ color: 'var(--gold)', fontWeight: 700 }}>₹{payload[0].value}L</div>
    </div>
  );
};

const Logo = () => (
  <div style={S.logoRow}>
    <div style={S.logoIcon}>₹</div>
    <span style={S.logoText}>WealthWise</span>
  </div>
);

const NAV_ITEMS = [
  { key: 'home',       icon: '🏠', label: 'Planner'    },
  { key: 'tracker',    icon: '💳', label: 'Tracker'    },
  { key: 'goals',      icon: '🎯', label: 'Goals'      },
  { key: 'scenarios',  icon: '🔮', label: 'Scenarios'  },
  { key: 'itsections', icon: '📋', label: 'IT Guide'   },
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

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading, saveUserProfile, profile } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [page,      setPage]      = useState('home');
  const [step,      setStep]      = useState(1);
  const [regime,    setRegime]    = useState('new');
  const [activeTab, setActiveTab] = useState(0);
  const [results,   setResults]   = useState(null);
  const [aiText,    setAiText]    = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState('');

  const [form, setForm] = useState({
    income: '', savings: '', age: '', gender: 'male',
    occupation: 'Salaried (MNC/Private)',
  });

  // Restore saved profile from Firestore when user logs in
  useEffect(() => {
    if (profile?.lastAnalysis) {
      const p = profile.lastAnalysis;
      setForm({ income: String(p.income), savings: String(p.savings), age: String(p.age), gender: p.gender || 'male', occupation: p.occupation || 'Salaried (MNC/Private)' });
    }
  }, [profile]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const focusGold = e => e.target.style.borderColor = 'var(--gold)';
  const blurReset = e => e.target.style.borderColor = 'var(--border)';
  const isFormValid = form.income && form.savings && form.age;

  const handleAnalyze = async () => {
    const income  = +form.income;
    const savings = +form.savings;
    const age     = +form.age;
    const taxResult   = bestRegime(income);
    const riskProfile = getRiskProfile(age, form.occupation, income, savings);
    const portfolios  = generatePortfolios(riskProfile.label, savings);
    const projections = portfolios.map(p => projectNetWorth(p.blendedCagr, savings, 20));
    const r = { income, savings, age, riskProfile, portfolios, projections, taxResult };
    setResults(r); setStep(3); setAiText(''); setAiError('');
    // Save to Firestore if logged in
    if (user) await saveUserProfile({ lastAnalysis: { income, savings, age, gender: form.gender, occupation: form.occupation } });
  };

  const handleAiExplain = async () => {
    if (!results) return;
    setAiLoading(true); setAiText(''); setAiError('');
    try {
      const portfolio = results.portfolios[activeTab];
      const data = await aiExplainPortfolio({
        profile: { annual_income: results.income, annual_savings: results.savings, age: results.age, gender: form.gender, occupation: form.occupation },
        portfolioName: portfolio.name,
        portfolioAssets: portfolio.alloc.slice(0, 4).map(a => ({ label: a.label, pct: a.pct, cagr: a.cagr })),
        riskLabel: portfolio.riskLabel,
      });
      setAiText(data.explanation);
    } catch (e) {
      setAiError(`⚠️ ${e.message || 'Backend unreachable.'}`);
    }
    setAiLoading(false);
  };

  // ── Loading splash ─────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ ...S.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>₹</div>Loading…
      </div>
    </div>
  );

  // ── Login screen ───────────────────────────────────────────────────────────

  if (showLogin && !user) return <Login onSkip={() => setShowLogin(false)} />;

  // ── Shared hero header ────────────────────────────────────────────────────

  const PageHero = ({ title, sub }) => (
    <div style={{ ...S.hero, padding: '24px 24px 20px' }}>
      <div style={S.heroGlow} />
      {user && (
        <div style={S.userBar}>
          <div style={S.avatar}>{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
          <span style={S.userName}>{user.displayName || user.email}</span>
          <button style={S.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      )}
      {!user && (
        <div style={S.userBar}>
          <button style={{ ...S.logoutBtn, color: 'var(--gold)', borderColor: 'var(--gold)' }} onClick={() => setShowLogin(true)}>Sign in</button>
        </div>
      )}
      <Logo />
      <h1 style={{ ...S.heroTitle, fontSize: 22 }}>{title}</h1>
      {sub && <p style={{ ...S.heroSub, fontSize: 13 }}>{sub}</p>}
    </div>
  );

  // ── Non-planner pages ─────────────────────────────────────────────────────

  if (page === 'tracker')    return <div style={{ ...S.app, paddingBottom: 72 }}><PageHero title="💳 Expense Tracker" sub="Track income & expenses. Discover your real savings rate." /><Tracker /><BottomNav page={page} setPage={setPage} /></div>;
  if (page === 'goals')      return <div style={{ ...S.app, paddingBottom: 72 }}><PageHero title="🎯 Financial Goals" sub="Set goals. Get SIP targets. Know exactly where to invest." /><Goals /><BottomNav page={page} setPage={setPage} /></div>;
  if (page === 'scenarios')  return <div style={{ ...S.app, paddingBottom: 72 }}><PageHero title="🔮 What-If Planner" sub="Compare scenarios. See the long-term impact of every decision." /><Scenarios /><BottomNav page={page} setPage={setPage} /></div>;
  if (page === 'itsections') return <div style={{ ...S.app, paddingBottom: 72 }}><PageHero title="📋 IT Deductions Guide" sub="All claimable sections · FY 2026-27 · AI tax advisor." /><ITSections userProfile={results ? { income: results.income, savings: results.savings, age: form.age, occupation: form.occupation } : null} /><BottomNav page={page} setPage={setPage} /></div>;

  // ── Planner: Step 1 — Input form ──────────────────────────────────────────

  if (step === 1) return (
    <div style={{ ...S.app, paddingBottom: 72 }}>
      <div style={S.hero}>
        <div style={S.heroGlow} />
        {user ? (
          <div style={S.userBar}>
            <div style={S.avatar}>{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
            <span style={S.userName}>{user.displayName || user.email}</span>
            <button style={S.logoutBtn} onClick={logout}>Sign out</button>
          </div>
        ) : (
          <div style={S.userBar}>
            <button style={{ ...S.logoutBtn, color: 'var(--gold)', borderColor: 'var(--gold)' }} onClick={() => setShowLogin(true)}>Sign in to save</button>
          </div>
        )}
        <Logo />
        <h1 style={S.heroTitle}>Smart Savings.<br />Maximum Growth.</h1>
        <p style={S.heroSub}>Personalised investment strategies with tax optimisation for FY 2026-27.</p>
      </div>

      <div style={S.container}>
        {profile?.lastAnalysis && (
          <div style={{ background: 'rgba(16,217,126,.08)', border: '1px solid rgba(16,217,126,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--emerald)' }}>
            ✅ Your last profile has been restored. Update any values and re-analyse.
          </div>
        )}
        <div style={S.card}>
          <div style={S.cardTitle}>👤 Your Financial Profile</div>
          <div style={S.row}>
            <div style={S.field}><label style={S.label}>Annual Income (₹)</label><input style={S.input} type="number" placeholder="e.g. 1200000" value={form.income} onChange={set('income')} onFocus={focusGold} onBlur={blurReset} /></div>
            <div style={S.field}><label style={S.label}>Annual Savings (₹)</label><input style={S.input} type="number" placeholder="e.g. 300000" value={form.savings} onChange={set('savings')} onFocus={focusGold} onBlur={blurReset} /></div>
          </div>
          <div style={S.row}>
            <div style={S.field}><label style={S.label}>Age</label><input style={S.input} type="number" placeholder="e.g. 28" value={form.age} onChange={set('age')} onFocus={focusGold} onBlur={blurReset} /></div>
            <div style={S.field}><label style={S.label}>Gender</label><select style={S.select} value={form.gender} onChange={set('gender')}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
          </div>
          <div style={S.field}>
            <label style={S.label}>Occupation</label>
            <select style={S.select} value={form.occupation} onChange={set('occupation')}>{OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
          </div>
          <button style={{ ...S.btn, marginTop: 22, opacity: isFormValid ? 1 : 0.45 }} disabled={!isFormValid} onClick={() => setStep(2)}>
            Analyse My Savings →
          </button>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, paddingBottom: 8 }}>
          🔒 {user ? 'Your profile is saved to your account.' : 'No data stored. Calculations run in your browser.'} · FY 2026-27
        </div>
      </div>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );

  // ── Planner: Step 2 — Tax regime ──────────────────────────────────────────

  if (step === 2) {
    const income = +form.income;
    const deductions = { d80C: 150_000, d80D: 25_000, nps: 50_000 };
    const newTax = calcNewRegime(income);
    const oldTax = calcOldRegime(income, deductions);
    const better = newTax.tax <= oldTax.tax ? 'new' : 'old';

    return (
      <div style={{ ...S.app, paddingBottom: 72 }}>
        <div style={{ ...S.hero, padding: '26px 24px 22px' }}>
          <div style={S.heroGlow} /><Logo />
          <h1 style={{ ...S.heroTitle, fontSize: 26 }}>Choose Tax Regime</h1>
        </div>
        <div style={S.container}>
          <div style={S.card}>
            <div style={S.cardTitle}>🧾 FY 2026-27 Tax Comparison</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              {[
                { key: 'new', label: 'New Regime', sub: 'Default. ₹75K std deduction. No 80C/80D.', tax: newTax },
                { key: 'old', label: 'Old Regime', sub: 'With 80C ₹1.5L + 80D ₹25K + NPS ₹50K',   tax: oldTax },
              ].map(r => (
                <div key={r.key} style={S.regimeBox(regime === r.key)} onClick={() => setRegime(r.key)}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.4 }}>{r.sub}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: r.tax.tax === 0 ? 'var(--emerald)' : 'var(--text)' }}>
                    {r.tax.tax === 0 ? '₹0' : fmtINR(r.tax.tax)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>annual tax</div>
                  {better === r.key && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--emerald)', fontWeight: 700 }}>✓ BETTER FOR YOU</div>}
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 15px', marginBottom: 18, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              💡 <strong style={{ color: 'var(--text)' }}>Recommendation:</strong> The{' '}
              <strong style={{ color: 'var(--gold)' }}>{better === 'new' ? 'New Regime' : 'Old Regime'}</strong>{' '}
              saves you {fmtINR(Math.abs(newTax.tax - oldTax.tax))} more annually.
              {+form.income <= 1_275_000 && ' Under the new regime, your gross income qualifies for the full Section 87A rebate — zero tax.'}
            </div>
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

  // ── Planner: Step 3 — Results ─────────────────────────────────────────────

  const { riskProfile, portfolios, projections, taxResult } = results;
  const portfolio   = portfolios[activeTab];
  const projection  = projections[activeTab];
  const blendedCAGR = portfolio.blendedCagr;
  const worth20     = projection[20]?.value;

  return (
    <div style={{ ...S.app, paddingBottom: 72 }}>
      <div style={{ ...S.hero, padding: '24px 24px 20px' }}>
        <div style={S.heroGlow} />
        {user && (
          <div style={S.userBar}>
            <div style={S.avatar}>{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
            <button style={S.logoutBtn} onClick={logout}>Sign out</button>
          </div>
        )}
        <Logo />
        <h1 style={{ ...S.heroTitle, fontSize: 22 }}>Your Wealth Blueprint</h1>
      </div>

      <div style={S.container}>
        <div style={S.statRow}>
          {[
            { label: 'Risk Profile',  value: riskProfile.label,         color: riskProfile.color },
            { label: 'Annual Tax',    value: fmtINR(taxResult.tax),      color: taxResult.tax === 0 ? 'var(--emerald)' : 'var(--gold)' },
            { label: 'Est. CAGR',     value: `${blendedCAGR}%`,          color: 'var(--emerald)' },
            { label: '20Y Net Worth', value: `₹${worth20}L`,             color: 'var(--gold2)'  },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{ ...S.statVal, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={S.tabBar}>
          {portfolios.map((p, i) => (
            <button key={i} style={S.tab(activeTab === i)} onClick={() => { setActiveTab(i); setAiText(''); setAiError(''); }}>
              {p.name}
            </button>
          ))}
        </div>

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
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.cagr}% CAGR · {a.taxFree ? '✓ Tax-free' : 'Taxable'} · {a.lock}</div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg)', marginTop: 4, overflow: 'hidden' }}>
                        <div style={S.barFill(a.color, a.pct)} />
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
          <div style={S.aiBox}>
            <div style={S.aiLabel}>🤖 AI Financial Advisor</div>
            {!aiText && !aiLoading && <button style={S.btnGreen} onClick={handleAiExplain}>✨ Explain This Portfolio</button>}
            {aiLoading && <div style={{ ...S.aiText, color: 'var(--muted)', animation: 'pulse 1.5s infinite' }}>Analysing your profile…</div>}
            {aiText   && <div style={S.aiText}>{aiText}</div>}
            {aiError  && <div style={{ ...S.aiText, color: 'var(--red)', fontSize: 13 }}>{aiError}</div>}
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>📈 20-Year Net Worth Projection</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Investing {fmtINR(results.savings)}/yr at {blendedCAGR}% blended CAGR
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--gold)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}L`} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="value" stroke="var(--gold)" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>🧾 Tax Summary — FY 2026-27</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Gross Income',   value: fmtINR(results.income),   hi: false },
              { label: 'Tax Regime',     value: taxResult.regime === 'new' ? 'New Regime' : 'Old Regime', hi: false },
              { label: 'Taxable Income', value: fmtINR(taxResult.taxable), hi: false },
              { label: 'Tax Payable',    value: taxResult.tax === 0 ? '₹0 (Sec 87A Rebate)' : fmtINR(taxResult.tax), hi: true },
            ].map(r => (
              <div key={r.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 15px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: r.hi ? 'var(--emerald)' : 'var(--text)' }}>{r.value}</div>
              </div>
            ))}
          </div>
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
