/**
 * Goals.jsx
 * Financial Goal Setting & Tracking.
 * - Define goals with target amount + deadline
 * - Auto-calculates required monthly SIP
 * - Recommends best instrument for each goal
 * - Progress bars for funded goals
 * - Syncs to Firestore (or localStorage for guests)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { saveGoal, loadGoals, deleteGoal } from './firebase.js';
import { fmtINR } from './taxEngine.js';

// ─── GOAL TEMPLATES ───────────────────────────────────────────────────────────

const TEMPLATES = [
  { icon: '🏠', label: 'Buy a House',        targetAmount: 5000000, years: 10, category: 'housing'    },
  { icon: '🚗', label: 'Buy a Car',           targetAmount: 800000,  years: 3,  category: 'lifestyle'  },
  { icon: '🎓', label: "Child's Education",   targetAmount: 2500000, years: 12, category: 'education'  },
  { icon: '💍', label: 'Wedding Fund',        targetAmount: 1500000, years: 3,  category: 'lifestyle'  },
  { icon: '🌍', label: 'International Trip',  targetAmount: 300000,  years: 2,  category: 'lifestyle'  },
  { icon: '🏖️', label: 'Early Retirement',   targetAmount: 30000000,years: 25, category: 'retirement' },
  { icon: '🏦', label: 'Emergency Fund (6mo)',targetAmount: 300000,  years: 1,  category: 'safety'     },
  { icon: '💼', label: 'Start a Business',    targetAmount: 1000000, years: 5,  category: 'business'   },
];

// ─── INSTRUMENT RECOMMENDER ───────────────────────────────────────────────────

function recommendInstrument(years, category) {
  if (category === 'safety' || years <= 1) return { name: 'Liquid MF / FD',    cagr: 7,   color: '#4fa3f7', why: 'Short horizon — capital safety first.' };
  if (years <= 3)  return { name: 'Debt MF + Short FD',  cagr: 7.5, color: '#7c8cf8', why: '1-3 year horizon — moderate, low-risk.' };
  if (years <= 5)  return { name: 'Hybrid MF / ELSS',    cagr: 11,  color: '#a78bfa', why: '3-5 years — balanced growth with tax benefit.' };
  if (years <= 10) return { name: 'Large Cap / Index MF', cagr: 13, color: '#10d97e', why: '5-10 years — equity gives best inflation-adjusted returns.' };
  return              { name: 'Mid Cap + Index MF',  cagr: 15,  color: '#f0b429', why: '10+ years — time smoothens volatility. Go aggressive.' };
}

// SIP required to hit target corpus
function calcSIP(target, cagr, years) {
  const n = years * 12;
  const r = cagr / 100 / 12;
  if (r === 0) return target / n;
  return target * r / (Math.pow(1 + r, n) - 1);
}

// Projected corpus from monthly SIP
function projectedCorpus(monthlySIP, cagr, years) {
  const n = years * 12;
  const r = cagr / 100 / 12;
  if (r === 0) return monthlySIP * n;
  return monthlySIP * (Math.pow(1 + r, n) - 1) / r;
}

const LS_KEY = 'wealthwise_goals';
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function lsSave(g) { localStorage.setItem(LS_KEY, JSON.stringify(g)); }

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  wrap:   { maxWidth: 800, margin: '0 auto', padding: '24px 20px 32px' },
  h2:     { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  sub:    { color: 'var(--muted)', fontSize: 14, marginBottom: 22, lineHeight: 1.5 },
  card:   { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 20px', marginBottom: 16, animation: 'fadeUp .3s ease both' },
  title:  { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 },
  label:  { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' },
  input:  { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', transition: 'border-color .2s' },
  select: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer' },
  row:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 14 },
  btn:    { background: 'linear-gradient(135deg,var(--gold),#e09b0a)', color: '#000', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)' },
  btnDel: { background: 'rgba(255,87,87,.15)', color: 'var(--red)', border: '1px solid rgba(255,87,87,.3)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  tmplGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 20 },
  tmplCard: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .15s', textAlign: 'center' },
  goalCard: c => ({ background: 'var(--bg2)', border: `1px solid ${c}33`, borderRadius: 14, padding: '20px', marginBottom: 14, position: 'relative' }),
  progress: (pct, color) => ({
    height: 6, borderRadius: 3, background: 'var(--bg3)',
    overflow: 'hidden', marginTop: 8,
  }),
  progressFill: (pct, color) => ({
    height: '100%', width: `${Math.min(100, pct)}%`,
    background: `linear-gradient(90deg, ${color}, ${color}99)`,
    borderRadius: 3, transition: 'width .6s ease',
  }),
  instBadge: c => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${c}18`, color: c, border: `1px solid ${c}33` }),
  sipBox: { background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', marginTop: 10 },
  sipNum: c => ({ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: c }),
};

// ─── GOAL CARD ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onDelete, onUpdate }) {
  const { years, targetAmount, amountSaved = 0, icon = '🎯' } = goal;
  const yrsLeft = Math.max(0.1, years);
  const inst    = recommendInstrument(yrsLeft, goal.category);
  const sip     = calcSIP(targetAmount - amountSaved, inst.cagr, yrsLeft);
  const pct     = targetAmount > 0 ? (amountSaved / targetAmount) * 100 : 0;
  const onTrack = sip > 0;

  const [editing, setEditing]   = useState(false);
  const [saved,   setSaved]     = useState(amountSaved);
  const focusGold = e => e.target.style.borderColor = inst.color;
  const blurReset = e => e.target.style.borderColor = 'var(--border)';

  const handleSave = () => { onUpdate({ ...goal, amountSaved: +saved }); setEditing(false); };

  return (
    <div style={S.goalCard(inst.color)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{goal.label}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Target: <strong style={{ color: 'var(--text)' }}>{fmtINR(targetAmount)}</strong></span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>·</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>In <strong style={{ color: 'var(--text)' }}>{yrsLeft} yr{yrsLeft !== 1 ? 's' : ''}</strong></span>
            {amountSaved > 0 && <>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>·</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Saved: <strong style={{ color: inst.color }}>{fmtINR(amountSaved)}</strong></span>
            </>}
          </div>

          {/* Progress bar */}
          {amountSaved > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                <span>{pct.toFixed(1)}% funded</span>
                <span>{fmtINR(targetAmount - amountSaved)} remaining</span>
              </div>
              <div style={S.progress(pct, inst.color)}>
                <div style={S.progressFill(pct, inst.color)} />
              </div>
            </div>
          )}

          {/* Instrument badge */}
          <div style={{ marginTop: 10 }}>
            <span style={S.instBadge(inst.color)}>{inst.name} · {inst.cagr}% CAGR</span>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{inst.why}</div>
          </div>
        </div>

        {/* SIP box */}
        <div style={S.sipBox}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Required Monthly SIP</div>
          <div style={S.sipNum(inst.color)}>{fmtINR(Math.ceil(sip))}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>/month for {yrsLeft}yr</div>
        </div>
      </div>

      {/* Amount saved input */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <input
              style={{ ...S.input, width: 160, padding: '7px 10px', fontSize: 13 }}
              type="number" value={saved} onChange={e => setSaved(e.target.value)}
              onFocus={focusGold} onBlur={blurReset}
              placeholder="Amount saved so far"
            />
            <button style={{ ...S.btn, padding: '7px 14px', fontSize: 13 }} onClick={handleSave}>Save</button>
            <button style={{ ...S.btnOutline, padding: '7px 14px', fontSize: 12 }} onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <button style={S.btnOutline} onClick={() => setEditing(true)}>✏️ Update Progress</button>
        )}
        <button style={S.btnDel} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Goals() {
  const { user } = useAuth();
  const [goals,  setGoals]  = useState([]);
  const [form,   setForm]   = useState({ icon: '🎯', label: '', targetAmount: '', years: '', category: 'lifestyle', amountSaved: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    (async () => {
      if (user) { setGoals(await loadGoals(user.uid)); }
      else      { setGoals(lsLoad()); }
    })();
  }, [user]);

  const addGoal = async () => {
    if (!form.label || !form.targetAmount || !form.years) return;
    const g = { ...form, targetAmount: +form.targetAmount, years: +form.years, amountSaved: +form.amountSaved || 0, id: Date.now().toString() };
    let updated;
    if (user) {
      const id = await saveGoal(user.uid, g);
      updated = [...goals, { ...g, id }];
    } else {
      updated = [...goals, g];
      lsSave(updated);
    }
    setGoals(updated);
    setForm({ icon: '🎯', label: '', targetAmount: '', years: '', category: 'lifestyle', amountSaved: '' });
  };

  const removeGoal = async (id) => {
    if (user) await deleteGoal(user.uid, id);
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    if (!user) lsSave(updated);
  };

  const updateGoal = async (g) => {
    if (user) await saveGoal(user.uid, g);
    const updated = goals.map(x => x.id === g.id ? g : x);
    setGoals(updated);
    if (!user) lsSave(updated);
  };

  const useTemplate = (t) => {
    setForm({ icon: t.icon, label: t.label, targetAmount: String(t.targetAmount), years: String(t.years), category: t.category, amountSaved: '' });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved  = goals.reduce((s, g) => s + (g.amountSaved || 0), 0);
  const focusGold   = e => e.target.style.borderColor = 'var(--gold)';
  const blurReset   = e => e.target.style.borderColor = 'var(--border)';

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>🎯 Financial Goals</h2>
      <p style={S.sub}>
        Set a goal → get a precise monthly SIP target → know exactly which instrument to use.
        {!user && <span style={{ color: 'var(--gold)' }}> Sign in to save your goals.</span>}
      </p>

      {/* Summary */}
      {goals.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { label: 'Active Goals',  value: goals.length,       color: '#4fa3f7' },
            { label: 'Total Target',  value: fmtINR(totalTarget),color: '#f0b429' },
            { label: 'Total Saved',   value: fmtINR(totalSaved), color: '#10d97e' },
            { label: 'Overall Progress', value: `${totalTarget > 0 ? ((totalSaved/totalTarget)*100).toFixed(1) : 0}%`, color: '#a78bfa' },
          ].map(k => (
            <div key={k.label} style={{ flex: 1, minWidth: 110, background: `${k.color}12`, border: `1px solid ${k.color}30`, borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Goals list */}
      {goals.length > 0 && goals.map(g => (
        <GoalCard key={g.id} goal={g} onDelete={() => removeGoal(g.id)} onUpdate={updateGoal} />
      ))}

      {goals.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0 8px', fontSize: 14 }}>
          No goals yet. Use a template below or create your own.
        </div>
      )}

      {/* Templates */}
      <div style={S.card}>
        <div style={S.title}>⚡ Quick Templates</div>
        <div style={S.tmplGrid}>
          {TEMPLATES.map(t => (
            <div key={t.label} style={S.tmplCard}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onClick={() => useTemplate(t)}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtINR(t.targetAmount)} · {t.years}yr</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add custom goal */}
      <div style={S.card}>
        <div style={S.title}>✏️ Create Custom Goal</div>
        <div style={S.row}>
          <div>
            <label style={S.label}>Goal Name</label>
            <input style={S.input} type="text" placeholder="e.g. Buy a laptop" value={form.label} onChange={set('label')} onFocus={focusGold} onBlur={blurReset} />
          </div>
          <div>
            <label style={S.label}>Emoji Icon</label>
            <input style={S.input} type="text" placeholder="🎯" value={form.icon} onChange={set('icon')} onFocus={focusGold} onBlur={blurReset} />
          </div>
        </div>
        <div style={S.row}>
          <div>
            <label style={S.label}>Target Amount (₹)</label>
            <input style={S.input} type="number" placeholder="e.g. 500000" value={form.targetAmount} onChange={set('targetAmount')} onFocus={focusGold} onBlur={blurReset} />
          </div>
          <div>
            <label style={S.label}>Years to Achieve</label>
            <input style={S.input} type="number" placeholder="e.g. 5" value={form.years} onChange={set('years')} onFocus={focusGold} onBlur={blurReset} />
          </div>
          <div>
            <label style={S.label}>Already Saved (₹)</label>
            <input style={S.input} type="number" placeholder="0" value={form.amountSaved} onChange={set('amountSaved')} onFocus={focusGold} onBlur={blurReset} />
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select style={S.select} value={form.category} onChange={set('category')}>
              {['housing','education','lifestyle','retirement','safety','business'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Live SIP preview */}
        {form.targetAmount && form.years && +form.years > 0 && (
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            {(() => {
              const inst = recommendInstrument(+form.years, form.category);
              const sip  = calcSIP(+form.targetAmount - (+form.amountSaved || 0), inst.cagr, +form.years);
              return (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Monthly SIP Needed</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: inst.color }}>{fmtINR(Math.ceil(sip))}/mo</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Recommended Instrument</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: inst.color }}>{inst.name} ({inst.cagr}% CAGR)</span>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{inst.why}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <button style={S.btn} onClick={addGoal}>Add Goal</button>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, paddingTop: 8 }}>
        SIP calculations use assumed CAGR for indicative purposes. Consult a financial advisor before investing.
      </div>
    </div>
  );
}
