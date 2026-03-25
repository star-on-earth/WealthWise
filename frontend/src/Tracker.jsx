/**
 * Tracker.jsx
 * Monthly income & expense tracker.
 * - Logs transactions by category
 * - Shows monthly summary + pie chart
 * - Calculates real savings rate
 * - Syncs to Firestore if user is logged in, localStorage if guest
 * - AI tip: asks Claude for personalised suggestion based on spending
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useAuth } from './AuthContext.jsx';
import { addTransaction, loadTransactions, deleteTransaction } from './firebase.js';
import { aiTaxAdvisor } from './api.js';
import { fmtINR } from './taxEngine.js';

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

const EXPENSE_CATS = [
  { key: 'rent',       label: 'Rent / EMI',        color: '#f0b429', icon: '🏠' },
  { key: 'food',       label: 'Food & Groceries',  color: '#10d97e', icon: '🍔' },
  { key: 'transport',  label: 'Transport',          color: '#4fa3f7', icon: '🚗' },
  { key: 'utilities',  label: 'Utilities & Bills',  color: '#a78bfa', icon: '💡' },
  { key: 'health',     label: 'Health',             color: '#fb923c', icon: '🏥' },
  { key: 'education',  label: 'Education',          color: '#60a5fa', icon: '📚' },
  { key: 'shopping',   label: 'Shopping',           color: '#f472b6', icon: '🛍️' },
  { key: 'investment', label: 'Investments',        color: '#34d399', icon: '📈' },
  { key: 'insurance',  label: 'Insurance',          color: '#fbbf24', icon: '🛡️' },
  { key: 'other',      label: 'Other',              color: '#6ee7b7', icon: '📦' },
];

const INCOME_CATS = [
  { key: 'salary',    label: 'Salary',          color: '#10d97e', icon: '💼' },
  { key: 'freelance', label: 'Freelance',        color: '#4fa3f7', icon: '💻' },
  { key: 'business',  label: 'Business',         color: '#f0b429', icon: '🏢' },
  { key: 'rental',    label: 'Rental Income',    color: '#a78bfa', icon: '🏠' },
  { key: 'returns',   label: 'Investment Returns',color: '#34d399', icon: '📈' },
  { key: 'other_inc', label: 'Other',            color: '#fb923c', icon: '💰' },
];

const ALL_CATS = [...INCOME_CATS, ...EXPENSE_CATS];
const catMeta  = Object.fromEntries(ALL_CATS.map(c => [c.key, c]));

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

// ─── LOCAL STORAGE FALLBACK ───────────────────────────────────────────────────

const LS_KEY = 'wealthwise_transactions';
function lsLoad()       { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function lsSave(txs)    { localStorage.setItem(LS_KEY, JSON.stringify(txs)); }

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  wrap:   { maxWidth: 800, margin: '0 auto', padding: '24px 20px 32px' },
  h2:     { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  sub:    { color: 'var(--muted)', fontSize: 14, marginBottom: 22, lineHeight: 1.5 },
  card:   { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 20px', marginBottom: 16 },
  title:  { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 },
  row:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 12 },
  label:  { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' },
  input:  { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', transition: 'border-color .2s' },
  select: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer' },
  btn:    { background: 'linear-gradient(135deg,var(--gold),#e09b0a)', color: '#000', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)' },
  btnRed: { background: 'rgba(255,87,87,.15)', color: 'var(--red)', border: '1px solid rgba(255,87,87,.3)', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  tabRow: { display: 'flex', gap: 8, marginBottom: 16 },
  tab:    a => ({ padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', border: a ? '1px solid var(--gold)' : '1px solid var(--border)', background: a ? 'rgba(240,180,41,.12)' : 'var(--bg3)', color: a ? 'var(--gold)' : 'var(--muted)' }),
  kpi:    c => ({ flex: 1, minWidth: 110, background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 12, padding: '12px 16px' }),
  kpiL:   { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  kpiV:   c => ({ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: c }),
  txRow:  { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  aiBox:  { background: 'linear-gradient(135deg,rgba(16,217,126,.07),rgba(79,163,247,.05))', border: '1px solid rgba(16,217,126,.2)', borderRadius: 12, padding: 18 },
  aiBtn:  { background: 'transparent', color: 'var(--emerald)', border: '1px solid var(--emerald)', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  tip:    { background: '#0a0a0f', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginTop: 12, fontSize: 14, color: 'var(--text)', lineHeight: 1.75 },
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function Tracker() {
  const { user } = useAuth();

  const [txs,      setTxs]      = useState([]);
  const [view,     setView]     = useState('month');   // 'month' | 'all'
  const [type,     setType]     = useState('expense'); // 'expense' | 'income'
  const [month,    setMonth]    = useState(now.getMonth());
  const [year,     setYear]     = useState(now.getFullYear());
  const [form,     setForm]     = useState({ amount: '', category: 'food', note: '', date: new Date().toISOString().slice(0,10) });
  const [aiTip,    setAiTip]    = useState('');
  const [aiLoading,setAiLoading]= useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Load transactions
  useEffect(() => {
    (async () => {
      if (user) {
        const data = await loadTransactions(user.uid);
        setTxs(data);
      } else {
        setTxs(lsLoad());
      }
    })();
  }, [user]);

  // Add transaction
  const addTx = async () => {
    if (!form.amount || isNaN(+form.amount)) return;
    const tx = {
      amount:   +form.amount,
      category: form.category,
      note:     form.note,
      date:     form.date,
      type,
      id:       Date.now().toString(),
    };
    if (user) {
      const ref = await addTransaction(user.uid, tx);
      setTxs(prev => [{ ...tx, id: ref.id }, ...prev]);
    } else {
      const updated = [tx, ...txs];
      setTxs(updated); lsSave(updated);
    }
    setForm(f => ({ ...f, amount: '', note: '' }));
  };

  // Delete transaction
  const delTx = async (id) => {
    if (user) await deleteTransaction(user.uid, id);
    const updated = txs.filter(t => t.id !== id);
    setTxs(updated);
    if (!user) lsSave(updated);
  };

  // Filter by selected month
  const filtered = useMemo(() => {
    if (view === 'all') return txs;
    return txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [txs, view, month, year]);

  const income   = filtered.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const expenses = filtered.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const savings  = income - expenses;
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;

  // Category breakdown for pie
  const expBreakdown = useMemo(() => {
    const map = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([k, v]) => ({
      name: catMeta[k]?.label || k,
      value: v,
      color: catMeta[k]?.color || '#888',
    })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  // Monthly bar data (last 6 months)
  const barData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(year, month - 5 + i, 1);
      const m   = d.getMonth(), y = d.getFullYear();
      const mTxs = txs.filter(t => { const td = new Date(t.date); return td.getMonth()===m && td.getFullYear()===y; });
      return {
        label: MONTHS[m],
        income:   mTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)/1000,
        expenses: mTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)/1000,
      };
    });
  }, [txs, month, year]);

  const getAiTip = async () => {
    setAiLoading(true); setAiTip('');
    const top = expBreakdown.slice(0, 3).map(e => `${e.name}: ${fmtINR(e.value)}`).join(', ');
    const q = `My top expenses this month: ${top}. Monthly income: ${fmtINR(income)}, Savings: ${fmtINR(savings)} (${savingsRate}%). Give me 2-3 specific actionable tips to improve my savings rate and suggest which Indian investment instruments I should redirect my savings to. Be brief and practical.`;
    try {
      const data = await aiTaxAdvisor({ question: q });
      setAiTip(data.answer);
    } catch { setAiTip('Could not reach server.'); }
    setAiLoading(false);
  };

  const focusGold = e => e.target.style.borderColor = 'var(--gold)';
  const blurReset = e => e.target.style.borderColor = 'var(--border)';

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>💳 Expense Tracker</h2>
      <p style={S.sub}>
        Log your income and expenses to discover your real savings capacity.
        {!user && <span style={{ color: 'var(--gold)' }}> Sign in to sync across devices.</span>}
      </p>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={S.tabRow}>
          <button style={S.tab(view === 'month')} onClick={() => setView('month')}>This Month</button>
          <button style={S.tab(view === 'all')}   onClick={() => setView('all')}>All Time</button>
        </div>
        {view === 'month' && (
          <>
            <select style={{ ...S.select, width: 110 }} value={month} onChange={e => setMonth(+e.target.value)}>
              {MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select style={{ ...S.select, width: 90 }} value={year} onChange={e => setYear(+e.target.value)}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {[
          { label: 'Income',      value: fmtINR(income),   color: '#10d97e' },
          { label: 'Expenses',    value: fmtINR(expenses), color: '#ff5757' },
          { label: 'Savings',     value: fmtINR(savings),  color: savings >= 0 ? 'var(--gold)' : 'var(--red)' },
          { label: 'Savings Rate',value: `${savingsRate}%`,color: +savingsRate >= 30 ? '#10d97e' : +savingsRate >= 15 ? 'var(--gold)' : 'var(--red)' },
        ].map(k => (
          <div key={k.label} style={S.kpi(k.color)}>
            <div style={S.kpiL}>{k.label}</div>
            <div style={S.kpiV(k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {expBreakdown.length > 0 && (
        <div style={{ ...S.card, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: '0 0 180px' }}>
            <div style={S.title}>Spending Breakdown</div>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={expBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {expBreakdown.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => fmtINR(v)} contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={S.title}>Category Breakdown</div>
            {expBreakdown.map(e => (
              <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, display: 'inline-block' }} />
                  {e.name}
                </span>
                <span style={{ fontWeight: 700, color: e.color }}>{fmtINR(e.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6-month bar chart */}
      {txs.length > 0 && (
        <div style={S.card}>
          <div style={S.title}>6-Month Overview (₹ thousands)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={14}>
              <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => `₹${v}K`} />
              <Bar dataKey="income"   fill="#10d97e" radius={[4,4,0,0]} name="Income"   />
              <Bar dataKey="expenses" fill="#ff5757" radius={[4,4,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add transaction */}
      <div style={S.card}>
        <div style={S.title}>➕ Add Transaction</div>
        <div style={S.tabRow}>
          <button style={S.tab(type === 'expense')} onClick={() => { setType('expense'); setForm(f => ({ ...f, category: 'food' })); }}>Expense</button>
          <button style={S.tab(type === 'income')}  onClick={() => { setType('income');  setForm(f => ({ ...f, category: 'salary' })); }}>Income</button>
        </div>
        <div style={S.row}>
          <div>
            <label style={S.label}>Amount (₹)</label>
            <input style={S.input} type="number" placeholder="e.g. 5000" value={form.amount} onChange={set('amount')} onFocus={focusGold} onBlur={blurReset} />
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select style={S.select} value={form.category} onChange={set('category')}>
              {(type === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => (
                <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label}>Date</label>
            <input style={S.input} type="date" value={form.date} onChange={set('date')} onFocus={focusGold} onBlur={blurReset} />
          </div>
          <div>
            <label style={S.label}>Note (optional)</label>
            <input style={S.input} type="text" placeholder="e.g. Swiggy order" value={form.note} onChange={set('note')} onFocus={focusGold} onBlur={blurReset} />
          </div>
        </div>
        <button style={S.btn} onClick={addTx}>Add {type === 'expense' ? 'Expense' : 'Income'}</button>
      </div>

      {/* AI Tip */}
      {expBreakdown.length > 0 && (
        <div style={S.aiBox}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>🤖 AI Savings Coach</div>
          <button style={aiLoading ? { ...S.aiBtn, opacity: 0.5, cursor: 'not-allowed' } : S.aiBtn} onClick={getAiTip} disabled={aiLoading}>
            {aiLoading ? '⏳ Analysing your spending...' : '✨ Get Personalised Tip'}
          </button>
          {aiTip && <div style={S.tip}>{aiTip}</div>}
        </div>
      )}

      {/* Transaction list */}
      {filtered.length > 0 && (
        <div style={S.card}>
          <div style={S.title}>Recent Transactions ({filtered.length})</div>
          {filtered.slice(0, 30).map(t => {
            const meta = catMeta[t.category] || { label: t.category, color: '#888', icon: '📦' };
            return (
              <div key={t.id} style={{ ...S.txRow, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 20 }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.note || '—'} · {t.date}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: t.type === 'income' ? 'var(--emerald)' : 'var(--red)', marginRight: 10 }}>
                  {t.type === 'income' ? '+' : '-'}{fmtINR(t.amount)}
                </div>
                <button style={S.btnRed} onClick={() => delTx(t.id)}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: 14 }}>
          No transactions yet. Add your first income or expense above.
        </div>
      )}
    </div>
  );
}
