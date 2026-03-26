/**
 * App.jsx — WealthWise v3
 *
 * Changes from v2:
 *  - Step 1 now uses IncomeForm (multi-source income)
 *  - Portfolio cards show pre-tax AND post-tax CAGR
 *  - Tax summary shows per-source breakdown
 *  - AI explanation receives marginal slab rate context
 *  - Projection chart shows both pre-tax and post-tax corpus
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
} from './taxEngine.js';
import { aiExplainPortfolio } from './api.js';

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  app:       { minHeight:'100vh', background:'var(--bg)', fontFamily:'var(--font-body)' },
  hero:      { background:'linear-gradient(135deg,#0a0a0f 0%,#111118 50%,#0f0f1a 100%)',
               borderBottom:'1px solid var(--border)', padding:'36px 24px 30px',
               textAlign:'center', position:'relative', overflow:'hidden' },
  heroGlow:  { position:'absolute', top:-80, left:'50%', transform:'translateX(-50%)',
               width:600, height:300,
               background:'radial-gradient(ellipse,rgba(240,180,41,.12) 0%,transparent 70%)',
               pointerEvents:'none' },
  logoRow:   { display:'inline-flex', alignItems:'center', gap:10, marginBottom:18 },
  logoIcon:  { width:40, height:40, background:'linear-gradient(135deg,var(--gold),var(--emerald))',
               borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 },
  logoText:  { fontFamily:'var(--font-display)', fontSize:22, fontWeight:800,
               background:'linear-gradient(90deg,var(--gold),var(--gold2))',
               WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  heroTitle: { fontFamily:'var(--font-display)', fontSize:'clamp(22px,5vw,42px)',
               fontWeight:800, lineHeight:1.15, color:'var(--text)', marginBottom:10 },
  heroSub:   { color:'var(--muted)', fontSize:15, maxWidth:460, margin:'0 auto', lineHeight:1.6 },
  userBar:   { position:'absolute', top:16, right:20, display:'flex', alignItems:'center', gap:8 },
  avatar:    { width:30, height:30, borderRadius:'50%',
               background:'linear-gradient(135deg,var(--gold),var(--emerald))',
               display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#000' },
  logoutBtn: { fontSize:11, color:'var(--muted)', background:'var(--bg3)',
               border:'1px solid var(--border)', borderRadius:6, padding:'4px 9px', cursor:'pointer' },
  signInBtn: { fontSize:11, color:'var(--gold)', background:'transparent',
               border:'1px solid var(--gold)', borderRadius:6, padding:'4px 9px', cursor:'pointer' },
  container: { maxWidth:800, margin:'0 auto', padding:'28px 20px' },
  card:      { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16,
               padding:'24px 22px', marginBottom:18, animation:'fadeUp .35s ease both' },
  cardTitle: { fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:18 },
  row:       { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14, marginBottom:14 },
  field:     { display:'flex', flexDirection:'column', gap:5 },
  label:     { fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px' },
  input:     { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10,
               padding:'11px 13px', color:'var(--text)', fontSize:15, fontFamily:'var(--font-body)',
               width:'100%', transition:'border-color .2s' },
  select:    { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10,
               padding:'11px 13px', color:'var(--text)', fontSize:15, fontFamily:'var(--font-body)',
               width:'100%', cursor:'pointer' },
  btn:       { background:'linear-gradient(135deg,var(--gold),#e09b0a)', color:'#000', border:'none',
               borderRadius:12, padding:'14px 28px', fontSize:16, fontWeight:700,
               fontFamily:'var(--font-display)', cursor:'pointer', width:'100%' },
  btnOutline:{ background:'transparent', color:'var(--gold)', border:'1px solid var(--gold)',
               borderRadius:12, padding:'12px 22px', fontSize:14, fontWeight:600, cursor:'pointer' },
  regimeBox: (a) => ({ flex:1, padding:16, borderRadius:12, cursor:'pointer', transition:'all .2s',
               border: a ? '2px solid var(--gold)':'1px solid var(--border)',
               background: a ? 'rgba(240,180,41,.08)':'var(--bg3)' }),
  statRow:   { display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' },
  statCard:  { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12,
               padding:'14px 18px', flex:1, minWidth:110 },
  statLabel: { fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 },
  statVal:   { fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--gold)' },
  tabBar:    { display:'flex', gap:7, marginBottom:18, overflowX:'auto', paddingBottom:4 },
  tab:       (a) => ({ padding:'7px 15px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap',
               border: a ? '1px solid var(--gold)':'1px solid var(--border)',
               background: a ? 'rgba(240,180,41,.12)':'var(--bg3)',
               color: a ? 'var(--gold)':'var(--muted)', fontSize:13, fontWeight:600 }),
  badge:     (c) => ({ display:'inline-block', padding:'3px 10px', borderRadius:20,
               fontSize:11, fontWeight:700, background:`${c}22`, color:c, border:`1px solid ${c}44` }),
  assetRow:  { display:'flex', alignItems:'center', justifyContent:'space-between',
               padding:'10px 0', borderBottom:'1px solid var(--border)' },
  aiBox:     { background:'linear-gradient(135deg,rgba(16,217,126,.07),rgba(240,180,41,.04))',
               border:'1px solid rgba(16,217,126,.22)', borderRadius:12, padding:18, marginTop:16 },
  aiLabel:   { fontSize:11, fontWeight:700, color:'var(--emerald)', textTransform:'uppercase',
               letterSpacing:'1px', marginBottom:10 },
  aiText:    { fontSize:14, color:'var(--text)', lineHeight:1.75 },
  btnGreen:  { background:'transparent', color:'var(--emerald)', border:'1px solid var(--emerald)',
               borderRadius:10, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer' },
  bottomNav: { position:'fixed', bottom:0, left:0, right:0,
               background:'var(--bg2)', borderTop:'1px solid var(--border)', display:'flex', zIndex:100 },
  navBtn:    (a) => ({ flex:1, padding:'8px 4px', border:'none', cursor:'pointer',
               background:'transparent', display:'flex', flexDirection:'column', alignItems:'center', gap:2,
               borderTop: a ? '2px solid var(--gold)':'2px solid transparent' }),
  navLabel:  (a) => ({ fontSize:10, fontWeight:600, color: a ? 'var(--gold)':'var(--muted)' }),
  tooltipBox:{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 13px', fontSize:12 },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={S.tooltipBox}>
      <div style={{ color:'var(--muted)', marginBottom:3 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.color, fontWeight:700 }}>{p.name}: ₹{p.value}L</div>
      ))}
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
  { key:'home',       icon:'🏠', label:'Planner'   },
  { key:'tracker',    icon:'💳', label:'Tracker'   },
  { key:'goals',      icon:'🎯', label:'Goals'     },
  { key:'scenarios',  icon:'🔮', label:'Scenarios' },
  { key:'itsections', icon:'📋', label:'IT Guide'  },
];

const BottomNav = ({ page, setPage }) => (
  <div style={S.bottomNav}>
    {NAV_ITEMS.map(n => (
      <button key={n.key} style={S.navBtn(page===n.key)} onClick={() => setPage(n.key)}>
        <span style={{ fontSize:17 }}>{n.icon}</span>
        <span style={S.navLabel(page===n.key)}>{n.label}</span>
      </button>
    ))}
  </div>
);

const UserBar = ({ user, onSignIn }) => (
  <div style={S.userBar}>
    {user ? (
      <>
        <div style={S.avatar}>{(user.displayName||user.email||'?')[0].toUpperCase()}</div>
        <span style={{ fontSize:12, color:'var(--muted)' }}>{user.displayName||user.email}</span>
        <button style={S.logoutBtn} onClick={logout}>Sign out</button>
      </>
    ) : (
      <button style={S.signInBtn} onClick={onSignIn}>Sign in to save</button>
    )}
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

  // Multi-income form state
  const [incomes,   setIncomes]   = useState({ salary: '' });
  const [isSenior,  setIsSenior]  = useState(false);
  const [savings,   setSavings]   = useState('');
  const [age,       setAge]       = useState('');
  const [gender,    setGender]    = useState('male');
  const [occupation,setOccupation]= useState('Salaried (MNC/Private)');

  const focusGold = e => e.target.style.borderColor = 'var(--gold)';
  const blurReset = e => e.target.style.borderColor = 'var(--border)';

  // Restore saved profile
  useEffect(() => {
    if (profile?.lastAnalysis) {
      const p = profile.lastAnalysis;
      if (p.incomes) setIncomes(p.incomes);
      if (p.savings) setSavings(String(p.savings));
      if (p.age)     setAge(String(p.age));
      if (p.gender)  setGender(p.gender);
      if (p.occupation) setOccupation(p.occupation);
    }
  }, [profile]);

  const totalIncome = Object.values(incomes).reduce((s, v) => s + (+v || 0), 0);
  const isFormValid = totalIncome > 0 && savings && age;

  const handleAnalyze = async () => {
    const incomesNum = Object.fromEntries(Object.entries(incomes).map(([k,v])=>[k, +v||0]));
    const annualSavings = +savings;
    const userAge = +age;

    const taxResult   = computeMultiIncomeTax(incomesNum, isSenior);
    const slabRate    = taxResult.marginalSlabRate;
    const riskProfile = getRiskProfile(userAge, occupation, totalIncome, annualSavings);
    const portfolios  = generatePortfolios(riskProfile.label, annualSavings, slabRate);

    const projections = portfolios.map(p => ({
      preTax:  projectNetWorth(p.blendedCagr, annualSavings, 20),
      postTax: projectNetWorth(p.blendedPostTaxCagr, annualSavings, 20),
    }));

    const r = { incomes: incomesNum, savings: annualSavings, age: userAge,
                gender, occupation, isSenior, riskProfile, portfolios,
                projections, taxResult, slabRate };
    setResults(r); setStep(3); setAiText(''); setAiError('');

    if (user) await saveUserProfile({ lastAnalysis: {
      incomes: incomesNum, savings: annualSavings, age: userAge, gender, occupation
    }});
  };

  const handleAiExplain = async () => {
    if (!results) return;
    setAiLoading(true); setAiText(''); setAiError('');
    try {
      const portfolio = results.portfolios[activeTab];
      const data = await aiExplainPortfolio({
        profile: {
          incomes:         { salary: results.incomes.salary||0, ...results.incomes },
          annual_savings:  results.savings,
          age:             results.age,
          gender:          results.gender,
          occupation:      results.occupation,
          is_senior:       results.isSenior,
        },
        portfolioName:   portfolio.name,
        portfolioAssets: portfolio.alloc.slice(0,4).map(a => ({
          label: a.label, pct: a.pct, cagr: a.cagr,
          post_tax_cagr: a.postTaxCagr,
          tax_rule_label: a.taxRuleLabel,
        })),
        riskLabel:       portfolio.riskLabel,
        marginalSlabRate: results.slabRate,
      });
      setAiText(data.explanation);
    } catch (e) {
      setAiError(`⚠️ ${e.message || 'Backend unreachable.'}`);
    }
    setAiLoading(false);
  };

  if (loading) return (
    <div style={{ ...S.app, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color:'var(--muted)', fontSize:15 }}>
        <div style={{ fontSize:36, marginBottom:12 }}>₹</div>Loading…
      </div>
    </div>
  );

  if (showLogin && !user) return <Login onSkip={() => setShowLogin(false)} />;

  const PageHero = ({ title, sub }) => (
    <div style={{ ...S.hero, padding:'24px 24px 20px' }}>
      <div style={S.heroGlow} />
      <UserBar user={user} onSignIn={() => setShowLogin(true)} />
      <Logo />
      <h1 style={{ ...S.heroTitle, fontSize:22 }}>{title}</h1>
      {sub && <p style={{ ...S.heroSub, fontSize:13 }}>{sub}</p>}
    </div>
  );

  if (page==='tracker')    return <div style={{ ...S.app, paddingBottom:72 }}><PageHero title="💳 Expense Tracker" /><Tracker /><BottomNav page={page} setPage={setPage} /></div>;
  if (page==='goals')      return <div style={{ ...S.app, paddingBottom:72 }}><PageHero title="🎯 Financial Goals" /><Goals /><BottomNav page={page} setPage={setPage} /></div>;
  if (page==='scenarios')  return <div style={{ ...S.app, paddingBottom:72 }}><PageHero title="🔮 What-If Planner" /><Scenarios /><BottomNav page={page} setPage={setPage} /></div>;
  if (page==='itsections') return <div style={{ ...S.app, paddingBottom:72 }}><PageHero title="📋 IT Deductions Guide" /><ITSections userProfile={results ? { income: results.taxResult?.total_gross_income||totalIncome, savings: results.savings, age, occupation, marginal_slab_rate: results.slabRate } : null} /><BottomNav page={page} setPage={setPage} /></div>;

  // ── Step 1: Multi-income form ──────────────────────────────────────────────

  if (step === 1) return (
    <div style={{ ...S.app, paddingBottom:72 }}>
      <div style={S.hero}>
        <div style={S.heroGlow} />
        <UserBar user={user} onSignIn={() => setShowLogin(true)} />
        <Logo />
        <h1 style={S.heroTitle}>Smart Savings.<br />Maximum Growth.</h1>
        <p style={S.heroSub}>Add all your income sources for an accurate tax calculation and personalised portfolio.</p>
      </div>
      <div style={S.container}>
        {profile?.lastAnalysis && (
          <div style={{ background:'rgba(16,217,126,.08)', border:'1px solid rgba(16,217,126,.2)',
            borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'var(--emerald)' }}>
            ✅ Your last profile has been restored. Update any values and re-analyse.
          </div>
        )}
        <div style={S.card}>
          <div style={S.cardTitle}>💰 Income Sources</div>
          <IncomeForm
            value={incomes}
            onChange={setIncomes}
            isSenior={isSenior}
            onSeniorChange={setIsSenior}
          />
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>👤 Profile</div>
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Annual Savings (₹)</label>
              <input style={S.input} type="number" placeholder="Amount you can invest/yr"
                value={savings} onChange={e => setSavings(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Age</label>
              <input style={S.input} type="number" placeholder="e.g. 28"
                value={age} onChange={e => setAge(e.target.value)} onFocus={focusGold} onBlur={blurReset} />
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
          <button style={{ ...S.btn, marginTop:8, opacity: isFormValid ? 1 : 0.45 }}
            disabled={!isFormValid} onClick={() => setStep(2)}>
            Analyse My Savings →
          </button>
        </div>
        <div style={{ textAlign:'center', color:'var(--muted)', fontSize:12, paddingBottom:8 }}>
          🔒 {user ? 'Profile saved to your account.' : 'Calculations run in browser. No data stored.'} · FY 2026-27
        </div>
      </div>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );

  // ── Step 2: Tax regime ─────────────────────────────────────────────────────

  if (step === 2) {
    const incomesNum = Object.fromEntries(Object.entries(incomes).map(([k,v])=>[k,+v||0]));
    const taxPreview = computeMultiIncomeTax(incomesNum, isSenior);
    const better = taxPreview.newRegime.totalTax <= taxPreview.oldRegime.totalTax ? 'new' : 'old';

    return (
      <div style={{ ...S.app, paddingBottom:72 }}>
        <div style={{ ...S.hero, padding:'26px 24px 22px' }}>
          <div style={S.heroGlow} /><Logo />
          <h1 style={{ ...S.heroTitle, fontSize:26 }}>Confirm Tax Regime</h1>
        </div>
        <div style={S.container}>
          <div style={S.card}>
            <div style={S.cardTitle}>🧾 FY 2026-27 — Full Income Tax Summary</div>
            <div style={{ display:'flex', gap:12, marginBottom:18 }}>
              {[
                { key:'new', label:'New Regime', sub:'₹75K std deduction. No 80C/80D deductions.', tax:taxPreview.newRegime.totalTax },
                { key:'old', label:'Old Regime', sub:'With 80C ₹1.5L + 80D ₹25K + NPS ₹50K applied.', tax:taxPreview.oldRegime.totalTax },
              ].map(r => (
                <div key={r.key} style={S.regimeBox(regime===r.key)} onClick={() => setRegime(r.key)}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:4 }}>{r.label}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginBottom:10, lineHeight:1.4 }}>{r.sub}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800,
                    color: r.tax===0 ? 'var(--emerald)':'var(--text)' }}>
                    {r.tax===0 ? '₹0' : fmtINR(r.tax)}
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>total tax (incl. special rates)</div>
                  {better===r.key && <div style={{ marginTop:8, fontSize:11, color:'var(--emerald)', fontWeight:700 }}>✓ BETTER FOR YOU</div>}
                </div>
              ))}
            </div>

            {/* Special taxes breakdown */}
            {taxPreview.specialTaxTotal > 0 && (
              <div style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13 }}>
                <div style={{ fontWeight:700, color:'var(--text)', marginBottom:8 }}>Special Rate Taxes (both regimes)</div>
                {taxPreview.ltcgEquityTax>0 && <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'3px 0' }}><span>LTCG Equity 10%</span><span style={{ color:'#4fa3f7', fontWeight:600 }}>{fmtINR(taxPreview.ltcgEquityTax)}</span></div>}
                {taxPreview.stcgEquityTax>0 && <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'3px 0' }}><span>STCG Equity 15%</span><span style={{ color:'#f0b429', fontWeight:600 }}>{fmtINR(taxPreview.stcgEquityTax)}</span></div>}
                {taxPreview.ltcgPropertyTax>0 && <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'3px 0' }}><span>LTCG Property 20%</span><span style={{ color:'#fb923c', fontWeight:600 }}>{fmtINR(taxPreview.ltcgPropertyTax)}</span></div>}
                {taxPreview.cryptoTax>0 && <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'3px 0' }}><span>Crypto 30% flat</span><span style={{ color:'var(--red)', fontWeight:600 }}>{fmtINR(taxPreview.cryptoTax)}</span></div>}
              </div>
            )}

            <div style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 15px', marginBottom:18, fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>
              💡 <strong style={{ color:'var(--text)' }}>Recommendation:</strong> The <strong style={{ color:'var(--gold)' }}>{better==='new'?'New Regime':'Old Regime'}</strong> saves you {fmtINR(taxPreview.taxSaving)} annually.
              Your marginal slab rate is <strong style={{ color:'var(--text)' }}>{(taxPreview.marginalSlabRate*100).toFixed(0)}%</strong> — this is used to calculate your post-tax investment returns.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button style={{ ...S.btnOutline, flex:1 }} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...S.btn, flex:2, marginTop:0 }} onClick={handleAnalyze}>Generate My Plan →</button>
            </div>
          </div>
        </div>
        <BottomNav page={page} setPage={setPage} />
      </div>
    );
  }

  // ── Step 3: Results ────────────────────────────────────────────────────────

  const { riskProfile, portfolios, projections, taxResult, slabRate } = results;
  const portfolio  = portfolios[activeTab];
  const proj       = projections[activeTab];
  const worth20Pre  = proj.preTax[20]?.value;
  const worth20Post = proj.postTax[20]?.value;

  // Merge pre/post for dual chart
  const dualChart = proj.preTax.map((p, i) => ({
    year: p.year,
    'Pre-Tax':  p.value,
    'Post-Tax': proj.postTax[i]?.value,
  }));

  return (
    <div style={{ ...S.app, paddingBottom:72 }}>
      <div style={{ ...S.hero, padding:'24px 24px 20px' }}>
        <div style={S.heroGlow} />
        <UserBar user={user} onSignIn={() => setShowLogin(true)} />
        <Logo />
        <h1 style={{ ...S.heroTitle, fontSize:22 }}>Your Wealth Blueprint</h1>
      </div>

      <div style={S.container}>

        {/* KPI bar */}
        <div style={S.statRow}>
          {[
            { label:'Risk Profile',      value:riskProfile.label,   color:riskProfile.color },
            { label:'Total Tax',         value:fmtINR(taxResult.bestTax), color:taxResult.bestTax===0?'var(--emerald)':'var(--gold)' },
            { label:'Post-Tax CAGR',     value:`${portfolio.blendedPostTaxCagr}%`, color:'var(--emerald)' },
            { label:'20Y Corpus (Post-Tax)', value:`₹${worth20Post}L`, color:'var(--gold2)' },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{ ...S.statVal, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Slab rate info */}
        <div style={{ background:'var(--bg3)', borderRadius:10, padding:'10px 16px', marginBottom:16,
          fontSize:13, color:'var(--muted)', display:'flex', gap:16, flexWrap:'wrap' }}>
          <span>💼 Marginal Slab Rate: <strong style={{ color:'var(--text)' }}>{(slabRate*100).toFixed(0)}%</strong></span>
          <span>📊 Pre-Tax Blended CAGR: <strong style={{ color:'var(--gold)' }}>{portfolio.blendedCagr}%</strong></span>
          <span>✅ Post-Tax Blended CAGR: <strong style={{ color:'var(--emerald)' }}>{portfolio.blendedPostTaxCagr}%</strong></span>
        </div>

        {/* Portfolio tabs */}
        <div style={S.tabBar}>
          {portfolios.map((p, i) => (
            <button key={i} style={S.tab(activeTab===i)} onClick={() => { setActiveTab(i); setAiText(''); setAiError(''); }}>
              {p.name}
            </button>
          ))}
        </div>

        {/* Allocation card */}
        <div style={S.card}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700 }}>📊 Portfolio Allocation</span>
            <span style={S.badge(riskProfile.color)}>{portfolio.riskLabel}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:24, alignItems:'center' }}>
            <ResponsiveContainer width={190} height={190} style={{ flexShrink:0 }}>
              <PieChart>
                <Pie data={portfolio.alloc} dataKey="pct" cx="50%" cy="50%" innerRadius={52} outerRadius={86} paddingAngle={2}>
                  {portfolio.alloc.map((a,i) => <Cell key={i} fill={a.color} />)}
                </Pie>
                <Tooltip formatter={v=>`${v}%`} contentStyle={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1, minWidth:200 }}>
              {portfolio.alloc.map((a,i) => (
                <div key={a.key} style={{ ...S.assetRow, borderBottom: i===portfolio.alloc.length-1?'none':'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, flex:1 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:a.color, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{a.label}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>
                        {a.cagr}% CAGR → <span style={{ color:'var(--emerald)', fontWeight:600 }}>{a.postTaxCagr}% post-tax</span>
                        {' '}· <span style={{ color: ASSET_TAX_RULES[a.taxRule]?.color || '#888' }}>{a.taxRuleLabel}</span>
                        {' '}· {a.lock}
                      </div>
                      <div style={{ height:4, borderRadius:2, background:'var(--bg)', marginTop:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${a.pct}%`, background:a.color, transition:'width .6s' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:10 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:a.color }}>{a.pct}%</div>
                    <div style={{ fontSize:12, color:'var(--muted)' }}>{fmtINR(a.amount)}/yr</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI explanation */}
          <div style={S.aiBox}>
            <div style={S.aiLabel}>🤖 AI Financial Advisor</div>
            {!aiText && !aiLoading && <button style={S.btnGreen} onClick={handleAiExplain}>✨ Explain This Portfolio</button>}
            {aiLoading && <div style={{ ...S.aiText, color:'var(--muted)', animation:'pulse 1.5s infinite' }}>Analysing your income profile…</div>}
            {aiText  && <div style={S.aiText}>{aiText}</div>}
            {aiError && <div style={{ ...S.aiText, color:'var(--red)', fontSize:13 }}>{aiError}</div>}
          </div>
        </div>

        {/* Dual projection chart */}
        <div style={S.card}>
          <div style={S.cardTitle}>📈 20-Year Corpus Projection</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginBottom:4 }}>
            Pre-tax: ₹{worth20Pre}L vs Post-tax (actual take-home): ₹{worth20Post}L
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>
            Tax drag: ₹{(worth20Pre - worth20Post).toFixed(1)}L over 20 years at {(slabRate*100).toFixed(0)}% slab
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={dualChart}>
              <defs>
                <linearGradient id="gradPre"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)"    stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--gold)"  stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fill:'var(--muted)', fontSize:11 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill:'var(--muted)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}L`} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Area type="monotone" dataKey="Pre-Tax"  stroke="var(--gold)"    strokeWidth={2} fill="url(#gradPre)"  strokeDasharray="4 2" />
              <Area type="monotone" dataKey="Post-Tax" stroke="var(--emerald)" strokeWidth={2} fill="url(#gradPost)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tax summary */}
        <div style={S.card}>
          <div style={S.cardTitle}>🧾 Complete Tax Summary — FY 2026-27</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            {[
              { label:'Total Gross Income',  value:fmtINR(taxResult.totalGrossIncome), hi:false },
              { label:'Best Tax Regime',     value:taxResult.bestRegime==='new'?'New Regime':'Old Regime', hi:false },
              { label:'Ordinary Tax',        value:fmtINR(taxResult.bestRegime==='new'?taxResult.newRegime.tax:taxResult.oldRegime.tax), hi:false },
              { label:'Total Tax Payable',   value:taxResult.bestTax===0?'₹0 (87A Rebate)':fmtINR(taxResult.bestTax), hi:true },
            ].map(r => (
              <div key={r.label} style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 15px' }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{r.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15,
                  color: r.hi ? 'var(--emerald)':'var(--text)' }}>{r.value}</div>
              </div>
            ))}
          </div>
          {taxResult.specialTaxTotal > 0 && (
            <div style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 16px', fontSize:13 }}>
              <div style={{ fontWeight:700, color:'var(--text)', marginBottom:8 }}>Special Rate Taxes Breakdown</div>
              {taxResult.ltcgEquityTax>0 && <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'4px 0', borderBottom:'1px solid var(--border)' }}><span>LTCG Equity (10% on {fmtINR(taxResult.ltcgEquityTaxable)} above ₹1.25L)</span><span style={{ color:'#4fa3f7', fontWeight:700 }}>{fmtINR(taxResult.ltcgEquityTax)}</span></div>}
              {taxResult.stcgEquityTax>0 && <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'4px 0', borderBottom:'1px solid var(--border)' }}><span>STCG Equity (15% flat)</span><span style={{ color:'#f0b429', fontWeight:700 }}>{fmtINR(taxResult.stcgEquityTax)}</span></div>}
              {taxResult.ltcgPropertyTax>0 && <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'4px 0', borderBottom:'1px solid var(--border)' }}><span>LTCG Property (20% with indexation)</span><span style={{ color:'#fb923c', fontWeight:700 }}>{fmtINR(taxResult.ltcgPropertyTax)}</span></div>}
              {taxResult.cryptoTax>0 && <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'4px 0' }}><span>Crypto/VDA (30% flat — no deductions)</span><span style={{ color:'var(--red)', fontWeight:700 }}>{fmtINR(taxResult.cryptoTax)}</span></div>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10, paddingBottom:16 }}>
          <button style={{ ...S.btnOutline, flex:1 }} onClick={() => { setStep(1); setResults(null); setActiveTab(0); }}>← Start Over</button>
          <button style={{ ...S.btn, flex:2, marginTop:0 }} onClick={() => window.print()}>🖨️ Export / Print</button>
        </div>
      </div>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}
