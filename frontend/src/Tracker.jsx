/**
 * Tracker.jsx — v5
 *
 * Updates in this version:
 *  1. Recurring Transactions — add with frequency, auto-create when due on load
 *  2. Pagination + Filtering — search, category filter, date range, "Load more"
 *  3. CSV Export — download all filtered transactions as .csv
 *  4. Budget Alerts — per-category monthly limits with alert banners
 *  5. CSV Import — upload bank CSV (generic + HDFC/SBI/ICICI auto-detect)
 *  6. Empty States — helpful UI when no data exists
 *
 * BUG PREVENTION (v4 lesson):
 *  ALL sub-components are defined at MODULE SCOPE.
 *  No JSX-returning functions inside the main Tracker function.
 *  This prevents React from unmounting/remounting on every render.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import { useAuth } from './AuthContext.jsx';
import {
  addTransaction, loadTransactions, deleteTransaction,
  saveRecurring, loadRecurring, deleteRecurring, bumpNextDue,
  saveBudgetLimits, loadBudgetLimits, calcNextDue,
} from './firebase.js';
import { aiTaxAdvisor } from './api.js';
import { fmtINR } from './taxEngine.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EXPENSE_CATS = [
  { key:'rent',       label:'Rent / EMI',         color:'#E8921A', icon:'🏠' },
  { key:'food',       label:'Food & Groceries',   color:'#1DB873', icon:'🍔' },
  { key:'family',     label:'Family',             color:'#f472b6', icon:'👨‍👩‍👧‍👦' },
  { key:'transport',  label:'Transport',           color:'#4A9EE8', icon:'🚗' },
  { key:'utilities',  label:'Utilities & Bills',  color:'#9B72CF', icon:'💡' },
  { key:'health',     label:'Health / Insurance', color:'#fb923c', icon:'🏥' },
  { key:'education',  label:'Education',          color:'#60a5fa', icon:'📚' },
  { key:'shopping',   label:'Shopping',           color:'#ff7f7f', icon:'🛍️' },
  { key:'investment', label:'Investments',        color:'#1DB873', icon:'📈' },
  { key:'insurance',  label:'Insurance Premiums', color:'#FFB84D', icon:'🛡️' },
  { key:'misc',       label:'Misc / Personal',    color:'#94a3b8', icon:'🔀' },
  { key:'other',      label:'Other',              color:'#6ee7b7', icon:'📦' },
];
const INCOME_CATS = [
  { key:'salary',    label:'Salary',           color:'#1DB873', icon:'💼' },
  { key:'freelance', label:'Freelance',        color:'#4A9EE8', icon:'💻' },
  { key:'business',  label:'Business',         color:'#E8921A', icon:'🏢' },
  { key:'rental',    label:'Rental Income',    color:'#9B72CF', icon:'🏠' },
  { key:'returns',   label:'Investment Returns',color:'#1DB873', icon:'📈' },
  { key:'agri',      label:'Agricultural',     color:'#6ee7b7', icon:'🌾' },
  { key:'other_inc', label:'Other',            color:'#fb923c', icon:'💰' },
];
const ALL_CATS    = [...INCOME_CATS, ...EXPENSE_CATS];
const CAT_MAP     = Object.fromEntries(ALL_CATS.map(c => [c.key, c]));
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FREQUENCIES = ['monthly','weekly','yearly','daily'];
const PAGE_SIZE   = 20;
const now         = new Date();

const DEDUCTION_MAP = {
  health:    { section:'80D', pct:1.0 },
  insurance: { section:'80D', pct:0.5 },
  investment:{ section:'80C', pct:1.0 },
};

const LS_TX_KEY  = 'wealthwise_transactions';
const LS_REC_KEY = 'wealthwise_recurring';
const LS_BUD_KEY = 'wealthwise_budgets';
const lsLoad  = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const lsLoadO = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
const lsSave  = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  wrap:     { maxWidth:800, margin:'0 auto', padding:'24px 20px 32px' },
  h2:       { fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:6 },
  sub:      { color:'var(--muted)', fontSize:14, marginBottom:22, lineHeight:1.5 },
  card:     { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'20px', marginBottom:16 },
  title:    { fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:14 },
  row:      { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10, marginBottom:10 },
  label:    { fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4, display:'block' },
  input:    { width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, padding:'10px 12px', color:'var(--text)', fontSize:14, fontFamily:'var(--font-body)', transition:'border-color .2s' },
  select:   { width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, padding:'10px 12px', color:'var(--text)', fontSize:14, fontFamily:'var(--font-body)', cursor:'pointer' },
  btn:      { background:'linear-gradient(135deg,var(--gold),var(--goldDim))', color:'#000', border:'none', borderRadius:9, padding:'10px 20px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)' },
  btnSm:    { background:'var(--bg3)', color:'var(--muted)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 13px', fontSize:12, cursor:'pointer', fontFamily:'var(--font-body)' },
  btnGreen: { background:'transparent', color:'var(--emerald)', border:'1px solid var(--emerald)', borderRadius:9, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' },
  btnRed:   { background:'rgba(232,64,64,.15)', color:'var(--red)', border:'1px solid rgba(232,64,64,.3)', borderRadius:7, padding:'4px 9px', fontSize:12, cursor:'pointer' },
  btnBlue:  { background:'rgba(74,158,232,.15)', color:'#4A9EE8', border:'1px solid rgba(74,158,232,.3)', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' },
  btnEdit:  { background:'rgba(155,114,207,.15)', color:'#9B72CF', border:'1px solid rgba(155,114,207,.3)', borderRadius:7, padding:'4px 9px', fontSize:12, cursor:'pointer' },
  modal:    { position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modalBox: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:24, width:'100%', maxWidth:440, maxHeight:'85vh', overflowY:'auto' },
  tabRow:   { display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' },
  tab:      a => ({ padding:'7px 15px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font-body)', border: a ? '1px solid var(--gold)':'1px solid var(--border)', background: a ? 'rgba(232,146,26,.12)':'var(--bg3)', color: a ? 'var(--gold)':'var(--muted)' }),
  kpi:      c => ({ flex:1, minWidth:100, background:`${c}12`, border:`1px solid ${c}30`, borderRadius:11, padding:'11px 14px' }),
  kpiL:     { fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 },
  kpiV:     c => ({ fontFamily:'var(--font-display)', fontSize:19, fontWeight:800, color:c }),
  txRow:    { display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' },
  alertBox: c => ({ background:`${c}12`, border:`1px solid ${c}44`, borderRadius:10, padding:'12px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:10, fontSize:13 }),
  emptyBox: { textAlign:'center', padding:'48px 20px', color:'var(--muted)' },
  emptyIcon:{ fontSize:48, marginBottom:12, display:'block' },
  emptyTxt: { fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:6 },
  emptySub: { fontSize:13, color:'var(--muted)', lineHeight:1.6, marginBottom:16 },
  progress: pct => ({ height:5, borderRadius:3, background:'var(--border)', overflow:'hidden', marginTop:5 }),
  progFill: (pct, color) => ({ height:'100%', width:`${Math.min(100,pct)}%`, background: pct>=90 ? 'var(--red)' : pct>=70 ? 'var(--gold)' : color, transition:'width .5s' }),
  modal:    { position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  modalBox: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:24, width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' },
  pill:     c => ({ display:'inline-block', fontSize:10, fontWeight:700, color:c, background:`${c}18`, border:`1px solid ${c}33`, borderRadius:20, padding:'2px 7px', marginLeft:6 }),
};

// ─── MODULE-SCOPE SUB-COMPONENTS (stable identity = no focus loss) ────────────

/** Empty state shown when a list has no data */
function EmptyState({ icon, title, sub, action, onAction }) {
  return (
    <div style={S.emptyBox}>
      <span style={S.emptyIcon}>{icon}</span>
      <div style={S.emptyTxt}>{title}</div>
      <div style={S.emptySub}>{sub}</div>
      {action && <button style={S.btn} onClick={onAction}>{action}</button>}
    </div>
  );
}

/** Single transaction row */
function TxRow({ tx, onDelete, onEdit }) {
  const meta = CAT_MAP[tx.category] || { label:tx.category, color:'#888', icon:'📦' };
  const ded  = DEDUCTION_MAP[tx.category];
  return (
    <div style={S.txRow}>
      <span style={{ fontSize:19 }}>{meta.icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>
          {meta.label}
          {tx.recurring && <span style={S.pill('#4A9EE8')}>🔁 {tx.frequency || 'recurring'}</span>}
          {ded && <span style={S.pill('#1DB873')}>§{ded.section}</span>}
        </div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>{tx.note || '—'} · {tx.date}</div>
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
        color: tx.type==='income' ? 'var(--emerald)':'var(--red)', marginRight:6 }}>
        {tx.type==='income' ? '+' : '-'}{fmtINR(tx.amount)}
      </div>
      <button style={S.btnEdit} onClick={() => onEdit(tx)} title="Edit">✏️</button>
      <button style={{ ...S.btnRed, marginLeft:4 }} onClick={() => onDelete(tx.id)}>✕</button>
    </div>
  );
}

/** Budget bar row for a single category */
function BudgetBar({ catKey, spent, limit, onChange }) {
  const meta = CAT_MAP[catKey] || { label:catKey, color:'#888' };
  const pct  = limit > 0 ? (spent / limit) * 100 : 0;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
        <span style={{ fontWeight:600 }}>{meta.label}</span>
        <span style={{ color:'var(--muted)' }}>{fmtINR(spent)} / </span>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <div style={{ flex:1 }}>
          <div style={S.progress(pct)}><div style={S.progFill(pct, meta.color)} /></div>
        </div>
        <input
          type="number"
          placeholder="Limit ₹"
          value={limit || ''}
          style={{ ...S.input, width:100, padding:'5px 8px', fontSize:12 }}
          onChange={e => onChange(catKey, +e.target.value || 0)}
        />
      </div>
      {pct >= 90 && limit > 0 && (
        <div style={{ fontSize:11, color:'var(--red)', marginTop:3 }}>
          ⚠️ {pct >= 100 ? 'Budget exceeded!' : `${pct.toFixed(0)}% used`}
        </div>
      )}
    </div>
  );
}

/** Recurring template row */
function RecurringRow({ rec, onDelete }) {
  const meta = CAT_MAP[rec.category] || { label:rec.category, color:'#888', icon:'📦' };
  return (
    <div style={{ ...S.txRow, borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:18 }}>{meta.icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>{meta.label} — {fmtINR(rec.amount)}</div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>
          {rec.frequency} · Next: {rec.nextDue} · {rec.note || ''}
        </div>
      </div>
      <span style={S.pill(rec.type==='income'?'#1DB873':'#E8921A')}>{rec.type}</span>
      <button style={{ ...S.btnRed, marginLeft:8 }} onClick={() => onDelete(rec.id)}>✕</button>
    </div>
  );
}

/** Alert banner */
function AlertBanner({ color, icon, text }) {
  return (
    <div style={S.alertBox(color)}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// ─── CSV HELPERS (pure functions, not components) ─────────────────────────────

function exportCSV(txs) {
  const header = 'Date,Type,Category,Amount,Note,Recurring';
  const rows   = txs.map(t =>
    `${t.date},${t.type},${CAT_MAP[t.category]?.label||t.category},${t.amount},"${(t.note||'').replace(/"/g,'""')}",${t.recurring?'Yes':'No'}`
  );
  const csv  = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href:url, download:`wealthwise_transactions_${new Date().toISOString().slice(0,10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse a CSV string into transaction objects.
 * Supports:
 *  - WealthWise export format
 *  - HDFC Bank CSV (Date, Narration, Value Dat, Debit, Credit, Chq, Closing)
 *  - SBI CSV (Txn Date, Description, Ref No, Debit, Credit, Balance)
 *  - ICICI CSV (Transaction Date, Transaction Remarks, Withdrawal Amt, Deposit Amt, Balance)
 *  - Generic: any CSV with columns containing 'date', 'amount'/'debit'/'credit'
 */
/** Normalise DD/MM/YYYY or DD-MM-YY → YYYY-MM-DD */
function normDate(raw) {
  if (!raw) return new Date().toISOString().slice(0, 10);
  raw = raw.trim();
  const m1 = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m2) { const yr = +m2[3] <= 50 ? `20${m2[3]}` : `19${m2[3]}`; return `${yr}-${m2[2]}-${m2[1]}`; }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

/**
 * Parse a CSV row that may contain quoted multi-line fields.
 * Returns an array of string values.
 */
function splitCSVRow(row) {
  const vals = [];
  let cur = '', inQ = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  vals.push(cur.trim());
  return vals;
}

function parseImportedCSV(text) {
  // Normalise line endings and collapse quoted multi-line fields into single lines
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Re-assemble any quoted fields that span multiple lines
  const rawLines = [];
  let buf = '', inQ = false;
  for (const ch of normalized) {
    if (ch === '"') inQ = !inQ;
    if (ch === '\n' && !inQ) { rawLines.push(buf); buf = ''; }
    else buf += (ch === '\n' ? ' ' : ch); // replace embedded newline with space
  }
  if (buf.trim()) rawLines.push(buf);

  const lines = rawLines.map(l => l.replace(/\r/g, '').trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // ── Detect SBI Excel-export format ─────────────────────────────────────────
  // Signature: first row is "state bank" OR header row has "Date,,,Transaction Reference"
  // Data layout (fixed col positions due to merged cells):
  //   col 0 = Date, col 3 = Description, col 14 = Credit, col 17 = Debit, col 20 = Balance
  const fullText = lines.slice(0, 5).join('\n').toLowerCase();
  const isSBIExcel = fullText.includes('state bank') ||
    lines.some(l => /^date,,,transaction reference/i.test(l));

  if (isSBIExcel) {
    const parsed = [];
    for (const line of lines) {
      const vals = splitCSVRow(line);
      const rawDate = vals[0]?.trim() || '';
      // Must start with a date in DD/MM/YYYY format
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) continue;
      const note   = (vals[3] || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      const credit = parseFloat((vals[14] || '').replace(/,/g, '')) || 0;
      const debit  = parseFloat((vals[17] || '').replace(/,/g, '')) || 0;
      if (!credit && !debit) continue;
      const date = normDate(rawDate);
      if (credit > 0) parsed.push({ date, type:'income',  category:autoCategory(note,'income'),  amount:credit, note, id:Date.now()+Math.random()+'c' });
      if (debit  > 0) parsed.push({ date, type:'expense', category:autoCategory(note,'expense'), amount:debit,  note, id:Date.now()+Math.random()+'d' });
    }
    return parsed;
  }

  // ── Standard CSV formats (HDFC, ICICI, WealthWise own export) ───────────────
  const header = lines[0].toLowerCase();
  const cols   = splitCSVRow(header).map(c => c.replace(/"/g,'').trim());

  const isHDFC  = cols.some(c => c.includes('narration')) && cols.some(c => c.includes('debit'));
  const isICICI = cols.some(c => c.includes('withdrawal'));
  const isOwn   = cols.includes('type') && cols.includes('category');

  const get = (names, vals) => {
    for (const n of names) {
      const idx = cols.findIndex(c => c.includes(n));
      if (idx >= 0 && vals[idx]) return vals[idx];
    }
    return '';
  };

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVRow(lines[i]);
    try {
      if (isOwn) {
        const amount = parseFloat(get(['amount'], vals));
        if (!amount) continue;
        parsed.push({
          date:     get(['date'], vals).slice(0,10) || new Date().toISOString().slice(0,10),
          type:     get(['type'], vals) || 'expense',
          category: 'other',
          amount,
          note:     get(['note','narration','description','remarks'], vals) || '',
          id:       Date.now().toString() + i,
        });
      } else if (isHDFC || isICICI) {
        const rawDate = get(['date','txn date','transaction date','value dat'], vals);
        const debit   = parseFloat(get(['debit','withdrawal','withdrawal amt'], vals).replace(/,/g,'')) || 0;
        const credit  = parseFloat(get(['credit','deposit','deposit amt'], vals).replace(/,/g,'')) || 0;
        const note    = get(['narration','description','transaction remarks','ref no'], vals).slice(0,60);
        if (!debit && !credit) continue;
        const date = normDate(rawDate);
        if (credit > 0) parsed.push({ date, type:'income',  category:autoCategory(note,'income'),  amount:credit, note, id:Date.now()+i+'c' });
        if (debit  > 0) parsed.push({ date, type:'expense', category:autoCategory(note,'expense'), amount:debit,  note, id:Date.now()+i+'d' });
      } else {
        // Generic: any CSV with date and amount columns
        const amount = parseFloat(get(['amount','amt','value'], vals).replace(/,/g,''));
        if (!amount) continue;
        const note = get(['description','narration','note','remarks'], vals).slice(0,60);
        const date = normDate(get(['date'], vals));
        const type = amount < 0 ? 'expense' : 'income';
        parsed.push({ date, type, category:autoCategory(note,type), amount:Math.abs(amount), note, id:Date.now()+i });
      }
    } catch { /* skip malformed row */ }
  }
  return parsed;
}

/** Auto-categorise from merchant name in transaction description */
/** Edit transaction modal — module scope for stable identity */
function EditModal({ tx, onSave, onClose }) {
  const [form, setForm] = React.useState({
    amount:   tx.amount,
    type:     tx.type,
    category: tx.category,
    note:     tx.note || '',
    date:     tx.date,
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:18 }}>
          ✏️ Edit Transaction
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <label style={S.label}>Type</label>
            <select style={S.select} value={form.type} onChange={e => {
              setForm(f => ({ ...f, type:e.target.value, category: e.target.value==='income'?'salary':'food' }));
            }}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Amount (₹)</label>
            <input style={S.input} type="number" inputMode="numeric" value={form.amount} onChange={set('amount')} />
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select style={S.select} value={form.category} onChange={set('category')}>
              {cats.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Date</label>
            <input style={S.input} type="date" value={form.date} onChange={set('date')} />
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={S.label}>Note</label>
          <input style={S.input} type="text" placeholder="Add a note..." value={form.note} onChange={set('note')} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button style={S.btn} onClick={() => onSave({ ...tx, ...form, amount:+form.amount })}>
            Save Changes
          </button>
          <button style={S.btnSm} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function autoCategory(desc, type) {
  const d = (desc || '').toLowerCase();

  if (type === 'income') {
    if (/neft|rtgs|imps|salary|sal\b|kvbl|payroll/.test(d))          return 'salary';
    if (/int payout|interest|dividend|cashback|bhim|reward/.test(d)) return 'returns';
    if (/cdm|cash deposit/.test(d))                                   return 'other_inc';
    return 'other_inc';
  }

  // ── Food — includes KIIT Hospitality and all food/dining ──────────────────
  if (/zomato|swiggy|eternal|mio amore|yara cafe|khabar|blinkit|zepto|bigbasket|grofer|dunzo|dominos|mcdonalds|kfc|subway|pizza|burger|restaurant|cafe|dhaba|canteen|kiit hospitality|hotel sw|hotel\b|food|eat|snack/i.test(d.replace(/\n/g,''))) return 'food';

  // ── Transport ─────────────────────────────────────────────────────────────
  if (/irctc|rapido|roppen|ola\b|uber|redbus|makemytrip|goibibo|metro|train|flight|bus\b|indigo|air india|spicejet|akasa|cleartrip|abhibus|paytm travel/i.test(d.replace(/\n/g,''))) return 'transport';

  // ── Health ────────────────────────────────────────────────────────────────
  if (/hospital|clinic|pharmacy|medical|apollo|fortis|max hosp|manipal|narayana|netmeds|pharmeasy|1mg|doctor|diagnostic|pathology|kiit hos|lab\b/i.test(d.replace(/\n/g,''))) return 'health';

  // ── Utilities (bills, subscriptions, telecom) ─────────────────────────────
  if (/claude|subscription|netflix|amazon prime|hotstar|disney|spotify|youtube|jio\b|airtel|vi\b|bsnl|tata sky|dish tv|electricity|water board|bescom|cesc|tata power|loylty|loyltyrewardz/i.test(d.replace(/\n/g,''))) return 'utilities';

  // ── Shopping ──────────────────────────────────────────────────────────────
  if (/amazon|flipkart|myntra|ajio|nykaa|meesho|snapdeal|reliance digital|croma|jiomart|tata cliq/i.test(d.replace(/\n/g,''))) return 'shopping';

  // ── Insurance ─────────────────────────────────────────────────────────────
  if (/lic\b|insurance|premium|policy|bajaj allianz|hdfc life|icici pru|star health|niva bupa|term plan|sbi life|kotak life/i.test(d.replace(/\n/g,''))) return 'insurance';

  // ── Investments ───────────────────────────────────────────────────────────
  if (/sip\b|mutual fund|mf\b|zerodha|groww|upstox|nse|bse|demat|smallcase|coin\b|paytm money/i.test(d.replace(/\n/g,''))) return 'investment';

  // ── Rent / EMI ────────────────────────────────────────────────────────────
  if (/emi\b|housing|rent\b|society|flat|property|home loan/i.test(d)) return 'rent';

  // ── Education ─────────────────────────────────────────────────────────────
  if (/school|college|university|coaching|udemy|coursera|byju|unacademy|vedantu|tuition|fee\b/i.test(d.replace(/\n/g,''))) return 'education';

  // ── Misc / Personal — all P2P UPI transfers between individuals ──────────
  // UPI/DR or UPI/CR to a person name (contains /Mr |/Ms |common names pattern)
  // or no recognisable merchant → misc
  if (/upi\/(dr|cr)\/\d+\/[a-z]/i.test(desc)) {
    // Check if it matches any known merchant already handled above
    // If we're here, it's a personal transfer → misc
    return 'misc';
  }

  // ── Bank charges ──────────────────────────────────────────────────────────
  if (/sms charge|bank charge|penalty|fine\b|othpg/i.test(d)) return 'utilities';

  return 'other';
}

// ─── PDF TEXT PARSERS — 8 MAJOR INDIAN BANKS ─────────────────────────────────
// Each parser handles that bank's specific column layout from PDF text extraction.

function parsePDFText(fullText) {
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
  const j = fullText.toLowerCase();
  if (j.includes('state bank of india') || j.includes('your opening balance') || j.includes('sbin'))
    return parseSBILines(lines);
  if (j.includes('karur vysya') || j.includes('kvb') || j.includes('brn code'))
    return parseKVBLines(lines);
  if (j.includes('hdfc bank'))    return parseHDFCLines(lines);
  if (j.includes('icici bank'))   return parseICICILines(lines);
  if (j.includes('axis bank'))    return parseAxisLines(lines);
  if (j.includes('kotak mahindra') || j.includes('kotak bank')) return parseKotakLines(lines);
  if (j.includes('punjab national') || j.includes('pnb'))       return parsePNBLines(lines);
  if (j.includes('bank of baroda') || j.includes('bob'))        return parseBOBLines(lines);
  return parseGenericPDFLines(lines);
}

function mkTx(date, desc, amount, type) {
  return {
    date: normDate(date), amount, type,
    category: autoCategory(desc, type),
    note: (desc || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    id: Date.now().toString() + Math.random(),
  };
}

// SBI: "01-02-26 UPI/CR/603225217066/SHITHAN /SBIN/... - 100.00 0 3464.32"
function parseSBILines(lines) {
  const res = [];
  const re = /^(\d{2}-\d{2}-\d{2})\s+(.+?)\s+-\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/;
  for (const line of lines) {
    const m = line.match(re); if (!m) continue;
    const cr = parseFloat(m[3]), dr = parseFloat(m[4]);
    if (!cr && !dr) continue;
    const type = cr > 0 && dr === 0 ? 'income' : 'expense';
    res.push(mkTx(m[1], m[2].trim(), type === 'income' ? cr : dr, type));
  }
  return res;
}

// KVB: "17/03/2026 17/03/2026 2101 NEFT DR-... [debit] [credit] balance"
function parseKVBLines(lines) {
  const res = [];
  const re  = /^(\d{2}\/\d{2}\/\d{4})\s+\d{2}\/\d{2}\/\d{4}\s+\d+\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/;
  const re2 = /^(\d{2}\/\d{2}\/\d{4})\s+\d{2}\/\d{2}\/\d{4}\s+\d+\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/;
  for (const line of lines) {
    let m = line.match(re);
    if (m) {
      const desc = m[2].trim();
      const a = parseFloat(m[3].replace(/,/g, '')), b = parseFloat(m[4].replace(/,/g, ''));
      const type = /credit interest|int payout|neft dr/.test(desc.toLowerCase()) ? 'income' : 'expense';
      const amount = type === 'income' ? (b || a) : a;
      if (amount) res.push(mkTx(m[1], desc, amount, type));
      continue;
    }
    m = line.match(re2);
    if (m) {
      const desc = m[2].trim(), a = parseFloat(m[3].replace(/,/g, ''));
      if (!a) continue;
      const type = /credit interest|int payout|neft dr/.test(desc.toLowerCase()) ? 'income' : 'expense';
      res.push(mkTx(m[1], desc, a, type));
    }
  }
  return res;
}

// HDFC: Date | Narration | Value Dat | Debit | Credit | Chq | Closing
function parseHDFCLines(lines) {
  const res = [];
  const re = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+\d{2}\/\d{2}\/\d{4}\s+([\d,.]*)\s+([\d,.]*)/;
  for (const line of lines) {
    const m = line.match(re); if (!m) continue;
    const dr = parseFloat((m[3] || '').replace(/,/g, '')) || 0;
    const cr = parseFloat((m[4] || '').replace(/,/g, '')) || 0;
    if (!dr && !cr) continue;
    const type = cr > 0 && dr === 0 ? 'income' : 'expense';
    res.push(mkTx(m[1], m[2].trim(), type === 'income' ? cr : dr, type));
  }
  return res;
}

// ICICI: Transaction Date | Remarks | Withdrawal Amt | Deposit Amt | Balance
function parseICICILines(lines) {
  const res = [];
  const re = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,.]*)\s+([\d,.]*)\s+([\d,.]+)$/;
  for (const line of lines) {
    const m = line.match(re); if (!m) continue;
    const wd = parseFloat((m[3] || '').replace(/,/g, '')) || 0;
    const dp = parseFloat((m[4] || '').replace(/,/g, '')) || 0;
    if (!wd && !dp) continue;
    const type = dp > 0 && wd === 0 ? 'income' : 'expense';
    res.push(mkTx(m[1], m[2].trim(), type === 'income' ? dp : wd, type));
  }
  return res;
}

// Axis Bank: Chq Date | Transaction Details | Chq No | Debit | Credit | Balance
// Format: "01-04-2026  UPI-ZOMATO-ZOMATO@AXISB-HDFC0000123  -  87.00  -  2500.00"
function parseAxisLines(lines) {
  const res = [];
  const re = /^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+[-\d]*\s+([\d,.]*)\s+([\d,.]*)\s+([\d,.]+)$/;
  for (const line of lines) {
    const m = line.match(re); if (!m) continue;
    const dr = parseFloat((m[3] || '').replace(/,/g, '')) || 0;
    const cr = parseFloat((m[4] || '').replace(/,/g, '')) || 0;
    if (!dr && !cr) continue;
    const type = cr > 0 && dr === 0 ? 'income' : 'expense';
    res.push(mkTx(m[1], m[2].trim(), type === 'income' ? cr : dr, type));
  }
  return res;
}

// Kotak Mahindra: Date | Description | Debit | Credit | Balance
// Format: "01/04/2026  UPI-ZOMATO  500.00    28000.00"
function parseKotakLines(lines) {
  const res = [];
  const re = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,.]+)\s+([\d,.]*)\s*([\d,.]+)$/;
  const re2 = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,.]*)\s+([\d,.]+)\s*([\d,.]+)$/;
  for (const line of lines) {
    let m = line.match(re);
    if (!m) m = line.match(re2);
    if (!m) continue;
    const a = parseFloat((m[3] || '').replace(/,/g, '')) || 0;
    const b = parseFloat((m[4] || '').replace(/,/g, '')) || 0;
    if (!a && !b) continue;
    // Kotak: if only one amount, check context for dr/cr
    const isCredit = /cr\b|credit|received/.test(line.toLowerCase());
    const type = (b > 0 && !a) || isCredit ? 'income' : 'expense';
    const amount = type === 'income' ? (b || a) : (a || b);
    res.push(mkTx(m[1], m[2].trim(), amount, type));
  }
  return res;
}

// Punjab National Bank (PNB): Date | Narration | Withdrawal | Deposit | Balance
// Format: "01/04/2026  UPI/CR/...  -  2000.00  25000.00"
function parsePNBLines(lines) {
  const res = [];
  const re = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,.]*)\s+([\d,.]*)\s+([\d,.]+)$/;
  for (const line of lines) {
    const m = line.match(re); if (!m) continue;
    const wd = parseFloat((m[3] || '').replace(/,/g, '')) || 0;
    const dp = parseFloat((m[4] || '').replace(/,/g, '')) || 0;
    if (!wd && !dp) continue;
    const type = dp > 0 && wd === 0 ? 'income' : 'expense';
    res.push(mkTx(m[1], m[2].trim(), type === 'income' ? dp : wd, type));
  }
  return res;
}

// Bank of Baroda (BOB): Date | Particulars | Debit | Credit | Balance
// Format: "01-04-2026  UPI/DR/ZOMATO  87.00  -  15000.00"
function parseBOBLines(lines) {
  const res = [];
  const re = /^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,.]*)\s+([\d,.]*)\s+([\d,.]+)$/;
  for (const line of lines) {
    const m = line.match(re); if (!m) continue;
    const dr = parseFloat((m[3] || '').replace(/,/g, '')) || 0;
    const cr = parseFloat((m[4] || '').replace(/,/g, '')) || 0;
    if (!dr && !cr) continue;
    const type = cr > 0 && dr === 0 ? 'income' : 'expense';
    res.push(mkTx(m[1], m[2].trim(), type === 'income' ? cr : dr, type));
  }
  return res;
}

// Generic fallback: looks for a date at the start of any line + numeric amounts
function parseGenericPDFLines(lines) {
  const res = [];
  const dateRe = /^(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;
  const amtRe  = /([\d,]+\.\d{2})/g;
  for (const line of lines) {
    const dm = line.match(dateRe); if (!dm) continue;
    const amounts = [...line.matchAll(amtRe)].map(m => parseFloat(m[1].replace(/,/g, '')));
    if (amounts.length < 2) continue;
    const desc = line.replace(dateRe, '').replace(/([\d,]+\.\d{2})/g, '').trim().slice(0, 80);
    const type = /cr\b|credit|deposit|received/.test(line.toLowerCase()) ? 'income' : 'expense';
    res.push(mkTx(dm[1], desc, amounts[0], type));
  }
  return res;
}
export default function Tracker() {
  const { user } = useAuth();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [txs,          setTxs]          = useState([]);
  const [recurring,    setRecurring]    = useState([]);
  const [budgets,      setBudgets]      = useState({});

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editingTx,    setEditingTx]    = useState(null); // tx object being edited

  // ── View state ──────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('dashboard'); // dashboard|add|recurring|budgets|import
  const [viewMode,      setViewMode]      = useState('month');     // month|all
  const [txType,        setTxType]        = useState('expense');
  const [month,         setMonth]         = useState(now.getMonth());
  const [year,          setYear]          = useState(now.getFullYear());
  const [page,          setPage]          = useState(1);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('all');
  const [filterType,  setFilterType]  = useState('all');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');

  // ── Add transaction form ─────────────────────────────────────────────────────
  const [form, setForm] = useState({
    amount:'', category:'food', note:'',
    date: now.toISOString().slice(0,10), isRecurring:false, frequency:'monthly',
  });

  // ── Recurring form ──────────────────────────────────────────────────────────
  const [recForm, setRecForm] = useState({
    amount:'', category:'food', note:'', type:'expense',
    frequency:'monthly', nextDue: now.toISOString().slice(0,10),
  });

  // ── Import state ────────────────────────────────────────────────────────────
  const [importing,    setImporting]    = useState(false);
  const [importRows,   setImportRows]   = useState([]);
  const [importStatus, setImportStatus] = useState('');
  const [importMode,   setImportMode]   = useState('csv'); // 'csv' | 'pdf'
  const [pdfReady,     setPdfReady]     = useState(false);

  // ── AI ───────────────────────────────────────────────────────────────────────
  const [aiTip,     setAiTip]     = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fileRef = useRef(null);
  const pdfRef  = useRef(null);

  const focusGold = useCallback(e => e.target.style.borderColor = 'var(--gold)', []);
  const blurReset = useCallback(e => e.target.style.borderColor = 'var(--border)', []);

  // ─────────────────────────────────────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      if (user) {
        const [t, r, b] = await Promise.all([
          loadTransactions(user.uid),
          loadRecurring(user.uid),
          loadBudgetLimits(user.uid),
        ]);
        setTxs(t); setRecurring(r); setBudgets(b);
        await processRecurring(user.uid, r, t);
      } else {
        const t = lsLoad(LS_TX_KEY);
        const r = lsLoad(LS_REC_KEY);
        const b = lsLoadO(LS_BUD_KEY);
        setTxs(t); setRecurring(r); setBudgets(b);
        processRecurringGuest(r, t);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RECURRING — AUTO-CREATE OVERDUE
  // ─────────────────────────────────────────────────────────────────────────────

  async function processRecurring(uid, recs, existingTxs) {
    const today    = now.toISOString().slice(0,10);
    const newTxs   = [...existingTxs];
    const updRecs  = [...recs];

    for (const rec of recs) {
      if (rec.nextDue && rec.nextDue <= today) {
        const tx = {
          amount: rec.amount, category: rec.category, type: rec.type,
          note: rec.note || '', date: rec.nextDue,
          recurring: true, frequency: rec.frequency,
          id: Date.now().toString() + Math.random(),
        };
        const ref = await addTransaction(uid, tx);
        newTxs.unshift({ ...tx, id: ref.id });
        const next = calcNextDue(rec.nextDue, rec.frequency);
        await bumpNextDue(uid, rec.id, next);
        const ri = updRecs.findIndex(r => r.id === rec.id);
        if (ri >= 0) updRecs[ri] = { ...updRecs[ri], nextDue: next };
      }
    }
    setTxs(newTxs);
    setRecurring(updRecs);
  }

  function processRecurringGuest(recs, existingTxs) {
    const today   = now.toISOString().slice(0,10);
    const newTxs  = [...existingTxs];
    const updRecs = [...recs];

    recs.forEach((rec, ri) => {
      if (rec.nextDue && rec.nextDue <= today) {
        const tx = {
          amount:rec.amount, category:rec.category, type:rec.type,
          note:rec.note||'', date:rec.nextDue, recurring:true,
          frequency:rec.frequency, id:Date.now().toString()+ri,
        };
        newTxs.unshift(tx);
        updRecs[ri] = { ...rec, nextDue: calcNextDue(rec.nextDue, rec.frequency) };
      }
    });
    lsSave(LS_TX_KEY, newTxs);
    lsSave(LS_REC_KEY, updRecs);
    setTxs(newTxs);
    setRecurring(updRecs);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRANSACTIONS — ADD / DELETE
  // ─────────────────────────────────────────────────────────────────────────────

  const addTx = async () => {
    if (!form.amount || isNaN(+form.amount)) return;
    const tx = {
      amount:+form.amount, category:form.category, note:form.note,
      date:form.date, type:txType,
      recurring: form.isRecurring, frequency: form.isRecurring ? form.frequency : null,
      id: Date.now().toString(),
    };
    if (user) {
      const ref = await addTransaction(user.uid, tx);
      setTxs(prev => [{ ...tx, id:ref.id }, ...prev]);
      // Also save as recurring template if checked
      if (form.isRecurring) {
        const nextDue = calcNextDue(form.date, form.frequency);
        const recId   = await saveRecurring(user.uid, { ...tx, nextDue });
        setRecurring(prev => [...prev, { ...tx, id:recId, nextDue }]);
      }
    } else {
      const updated = [tx, ...txs];
      setTxs(updated); lsSave(LS_TX_KEY, updated);
      if (form.isRecurring) {
        const rec     = { ...tx, nextDue: calcNextDue(form.date, form.frequency) };
        const updRecs = [...recurring, rec];
        setRecurring(updRecs); lsSave(LS_REC_KEY, updRecs);
      }
    }
    setForm(f => ({ ...f, amount:'', note:'' }));
  };

  const delTx = async (id) => {
    if (user) await deleteTransaction(user.uid, id);
    const u = txs.filter(t => t.id !== id);
    setTxs(u); if (!user) lsSave(LS_TX_KEY, u);
  };

  const delRec = async (id) => {
    if (user) await deleteRecurring(user.uid, id);
    const u = recurring.filter(r => r.id !== id);
    setRecurring(u); if (!user) lsSave(LS_REC_KEY, u);
  };

  const saveTxEdit = async (updated) => {
    if (user) {
      await deleteTransaction(user.uid, updated.id);
      await addTransaction(user.uid, updated);
    }
    const u = txs.map(t => t.id === updated.id ? updated : t);
    setTxs(u);
    if (!user) lsSave(LS_TX_KEY, u);
    setEditingTx(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RECURRING TEMPLATE — ADD
  // ─────────────────────────────────────────────────────────────────────────────

  const addRecurringTemplate = async () => {
    if (!recForm.amount) return;
    const rec = { ...recForm, amount:+recForm.amount, id:Date.now().toString() };
    if (user) {
      const id = await saveRecurring(user.uid, rec);
      setRecurring(prev => [...prev, { ...rec, id }]);
    } else {
      const u = [...recurring, rec];
      setRecurring(u); lsSave(LS_REC_KEY, u);
    }
    setRecForm(f => ({ ...f, amount:'', note:'' }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // BUDGETS
  // ─────────────────────────────────────────────────────────────────────────────

  const updateBudget = useCallback(async (catKey, limit) => {
    const updated = { ...budgets, [catKey]: limit };
    setBudgets(updated);
    if (user) await saveBudgetLimits(user.uid, updated);
    else lsSave(LS_BUD_KEY, updated);
  }, [budgets, user]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF.JS LOADER (CDN, loads once on mount)
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (window.pdfjsLib) { setPdfReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfReady(true);
    };
    s.onerror = () => console.warn('PDF.js failed to load');
    document.head.appendChild(s);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // CSV IMPORT
  // ─────────────────────────────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Parsing CSV...'); setImportRows([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseImportedCSV(ev.target.result);
      setImportRows(rows);
      setImportStatus(rows.length
        ? `Found ${rows.length} transactions. Review and confirm.`
        : 'No transactions found. Check the file format below.');
    };
    reader.onerror = () => setImportStatus('Error reading file.');
    reader.readAsText(file);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF IMPORT
  // ─────────────────────────────────────────────────────────────────────────────

  const handlePDFChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!pdfReady || !window.pdfjsLib) {
      setImportStatus('PDF reader still loading — wait a moment and try again.');
      return;
    }
    setImportStatus('Reading PDF...'); setImportRows([]);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg      = await pdf.getPage(i);
        const content = await pg.getTextContent();
        // Group items by Y coordinate to reconstruct lines
        const byY = {};
        content.items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!byY[y]) byY[y] = [];
          byY[y].push(item.str);
        });
        Object.keys(byY).map(Number).sort((a, b) => b - a)
          .forEach(y => { fullText += byY[y].join(' ') + '\n'; });
      }
      const parsed = parsePDFText(fullText);
      if (parsed.length === 0) {
        setImportStatus('No transactions detected in this PDF. Try exporting as CSV from your bank instead.');
      } else {
        setImportRows(parsed);
        setImportStatus(`Found ${parsed.length} transactions. Auto-categorised from merchant names. Review and confirm.`);
      }
    } catch (err) {
      setImportStatus(`PDF error: ${err.message}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CONFIRM IMPORT (shared for CSV + PDF)
  // ─────────────────────────────────────────────────────────────────────────────

  const confirmImport = async () => {
    if (!importRows.length) return;
    setImportStatus(`Importing ${importRows.length} transactions...`);
    const newTxs = [...txs];
    for (const tx of importRows) {
      if (user) {
        const ref = await addTransaction(user.uid, tx);
        newTxs.unshift({ ...tx, id: ref.id });
      } else {
        newTxs.unshift(tx);
      }
    }
    if (!user) lsSave(LS_TX_KEY, newTxs);
    setTxs(newTxs); setImportRows([]);
    setImportStatus(`✅ Imported ${importRows.length} transactions successfully.`);
    if (fileRef.current) fileRef.current.value = '';
    if (pdfRef.current)  pdfRef.current.value  = '';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────────

  // Transactions filtered by month/all
  const monthFiltered = useMemo(() => {
    if (viewMode === 'all') return txs;
    return txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [txs, viewMode, month, year]);

  // Further filtered by search/category/type/date
  const filtered = useMemo(() => {
    let res = monthFiltered;
    if (filterType !== 'all') res = res.filter(t => t.type === filterType);
    if (filterCat  !== 'all') res = res.filter(t => t.category === filterCat);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(t =>
        (t.note || '').toLowerCase().includes(q) ||
        (CAT_MAP[t.category]?.label || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) res = res.filter(t => t.date >= dateFrom);
    if (dateTo)   res = res.filter(t => t.date <= dateTo);
    return res;
  }, [monthFiltered, filterType, filterCat, search, dateFrom, dateTo]);

  const income   = monthFiltered.filter(t => t.type==='income').reduce((s,t) => s+t.amount, 0);
  const expenses = monthFiltered.filter(t => t.type==='expense').reduce((s,t) => s+t.amount, 0);
  const savings  = income - expenses;
  const savingsRate = income > 0 ? ((savings/income)*100).toFixed(1) : 0;

  // Category spending this month (for budgets + pie)
  const catSpending = useMemo(() => {
    const map = {};
    monthFiltered.filter(t => t.type==='expense').forEach(t => {
      map[t.category] = (map[t.category]||0) + t.amount;
    });
    return map;
  }, [monthFiltered]);

  // Budget alerts
  const budgetAlerts = useMemo(() =>
    EXPENSE_CATS.filter(c => budgets[c.key] > 0 && catSpending[c.key] >= budgets[c.key] * 0.9)
      .map(c => ({
        color: catSpending[c.key] >= budgets[c.key] ? 'var(--red)' : 'var(--gold)',
        icon:  catSpending[c.key] >= budgets[c.key] ? '🚨' : '⚠️',
        text:  catSpending[c.key] >= budgets[c.key]
          ? `${c.label} budget exceeded! Spent ${fmtINR(catSpending[c.key])} of ${fmtINR(budgets[c.key])} limit.`
          : `${c.label} is at ${((catSpending[c.key]/budgets[c.key])*100).toFixed(0)}% of your ${fmtINR(budgets[c.key])} limit.`,
      }))
  , [catSpending, budgets]);

  // Savings rate alert
  const lowSavingsAlert = income > 0 && +savingsRate < 15;

  // Pie data
  const pieData = useMemo(() =>
    Object.entries(catSpending)
      .map(([k,v]) => ({ name:CAT_MAP[k]?.label||k, value:v, color:CAT_MAP[k]?.color||'#888', key:k }))
      .sort((a,b) => b.value-a.value)
  , [catSpending]);

  // 6-month bar
  const barData = useMemo(() => Array.from({length:6}, (_,i) => {
    const d = new Date(year, month-5+i, 1);
    const m = d.getMonth(), y = d.getFullYear();
    const mTxs = txs.filter(t => { const td=new Date(t.date); return td.getMonth()===m&&td.getFullYear()===y; });
    return {
      label: MONTHS[m],
      income:   mTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)/1000,
      expenses: mTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)/1000,
    };
  }), [txs, month, year]);

  // Deduction totals
  const dedTotal = useMemo(() =>
    EXPENSE_CATS.reduce((sum, c) => {
      const ded = DEDUCTION_MAP[c.key];
      return ded ? sum + Math.round((catSpending[c.key]||0) * ded.pct) : sum;
    }, 0)
  , [catSpending]);

  // Paginated list
  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = filtered.length > page * PAGE_SIZE;

  // AI tip
  const getAiTip = async () => {
    setAiLoading(true); setAiTip('');
    const top = pieData.slice(0,3).map(e=>`${e.name}: ${fmtINR(e.value)}`).join(', ');
    const q   = `Top expenses: ${top}. Income: ${fmtINR(income)}, Savings rate: ${savingsRate}%. Give 2-3 specific India-focused tips to improve savings and recommend instruments. FY 2026-27.`;
    try { const d = await aiTaxAdvisor({ question:q }); setAiTip(d.answer); }
    catch { setAiTip('Could not reach server.'); }
    setAiLoading(false);
  };

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setR = k => e => setRecForm(f => ({ ...f, [k]: e.target.value }));

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>💳 Expense Tracker</h2>
      <p style={S.sub}>
        Track income and expenses. Recurring transactions auto-post on due date.
        Health &amp; investment spending feeds directly into your tax deductions.
        {!user && <span style={{ color:'var(--gold)' }}> Sign in to sync across devices.</span>}
      </p>

      {/* ── Section tabs ── */}
      <div style={S.tabRow}>
        {[
          { key:'dashboard', label:'📊 Dashboard' },
          { key:'add',       label:'➕ Add Transaction' },
          { key:'recurring', label:'🔁 Recurring' },
          { key:'budgets',   label:'🎯 Budgets' },
          { key:'import',    label:'📥 Import CSV' },
        ].map(s => (
          <button key={s.key} style={S.tab(activeSection===s.key)}
            onClick={() => setActiveSection(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          DASHBOARD
      ════════════════════════════════════════════════════════ */}
      {activeSection === 'dashboard' && (
        <>
          {/* Budget alerts */}
          {budgetAlerts.map((a,i) => <AlertBanner key={i} {...a} />)}
          {lowSavingsAlert && (
            <AlertBanner color="var(--gold)" icon="💡"
              text={`Your savings rate is ${savingsRate}% this month. Aim for at least 20% to build wealth effectively.`} />
          )}

          {/* Month selector */}
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            <div style={S.tabRow}>
              <button style={S.tab(viewMode==='month')} onClick={() => setViewMode('month')}>This Month</button>
              <button style={S.tab(viewMode==='all')}   onClick={() => setViewMode('all')}>All Time</button>
            </div>
            {viewMode==='month' && (
              <>
                <select style={{ ...S.select, width:100 }} value={month} onChange={e => setMonth(+e.target.value)}>
                  {MONTHS.map((m,i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select style={{ ...S.select, width:86 }} value={year} onChange={e => setYear(+e.target.value)}>
                  {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            <button style={S.btnSm} onClick={() => exportCSV(filtered)}>⬇️ Export CSV</button>
          </div>

          {/* KPIs */}
          <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
            {[
              { label:'Income',       value:fmtINR(income),   color:'#1DB873' },
              { label:'Expenses',     value:fmtINR(expenses), color:'#E84040' },
              { label:'Savings',      value:fmtINR(savings),  color:savings>=0?'var(--gold)':'var(--red)' },
              { label:'Savings Rate', value:`${savingsRate}%`, color:+savingsRate>=20?'#1DB873':+savingsRate>=10?'var(--gold)':'var(--red)' },
            ].map(k => (
              <div key={k.label} style={S.kpi(k.color)}>
                <div style={S.kpiL}>{k.label}</div>
                <div style={S.kpiV(k.color)}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Deduction summary */}
          {dedTotal > 0 && (
            <div style={{ background:'rgba(29,184,115,.06)', border:'1px solid rgba(29,184,115,.2)', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:13, color:'var(--emerald)' }}>
              💚 <strong>{fmtINR(dedTotal)}</strong> of potential tax deductions auto-detected from your spending this {viewMode==='month'?MONTHS[month]:'period'} (80D, 80C). Auto-applied in Tax Planner.
            </div>
          )}

          {/* Pie + breakdown */}
          {pieData.length > 0 ? (
            <div style={{ ...S.card, display:'flex', flexWrap:'wrap', gap:20 }}>
              <div style={{ flex:'0 0 180px' }}>
                <div style={S.title}>Spending Breakdown</div>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={46} outerRadius={80} paddingAngle={2}>
                      {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={v => fmtINR(v)} contentStyle={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex:1, minWidth:180 }}>
                {pieData.map(e => {
                  const ded = DEDUCTION_MAP[e.key];
                  const pct = budgets[e.key] ? (e.value/budgets[e.key]*100).toFixed(0) : null;
                  return (
                    <div key={e.key} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:e.color, display:'inline-block' }}/>
                        {e.name}
                        {ded && <span style={S.pill('#1DB873')}>§{ded.section}</span>}
                        {pct && <span style={S.pill(+pct>=100?'#E84040':+pct>=70?'#E8921A':'#4A9EE8')}>{pct}% of budget</span>}
                      </span>
                      <span style={{ fontWeight:700, color:e.color }}>{fmtINR(e.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            txs.length === 0 &&
            <EmptyState icon="📊" title="No transactions yet"
              sub="Start by adding your first income or expense. Recurring transactions like EMIs and salary will auto-post every month."
              action="Add First Transaction" onAction={() => setActiveSection('add')} />
          )}

          {/* 6-month bar */}
          {txs.length > 0 && (
            <div style={S.card}>
              <div style={S.title}>6-Month Overview (₹ thousands)</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={barData} barSize={12}>
                  <XAxis dataKey="label" tick={{ fill:'var(--muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'var(--muted)', fontSize:11 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={v => `₹${v}K`}/>
                  <Bar dataKey="income"   fill="#1DB873" radius={[4,4,0,0]} name="Income"/>
                  <Bar dataKey="expenses" fill="#E84040" radius={[4,4,0,0]} name="Expenses"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI coach */}
          {pieData.length > 0 && (
            <div style={{ background:'linear-gradient(135deg,rgba(29,184,115,.07),rgba(232,146,26,.04))', border:'1px solid rgba(29,184,115,.2)', borderRadius:12, padding:18, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--emerald)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>🤖 AI Savings Coach</div>
              <button style={aiLoading ? { ...S.btnGreen, opacity:.5, cursor:'not-allowed' } : S.btnGreen} onClick={getAiTip} disabled={aiLoading}>
                {aiLoading ? '⏳ Analysing...' : '✨ Get Personalised Tip'}
              </button>
              {aiTip && <div style={{ marginTop:12, fontSize:14, color:'var(--text)', lineHeight:1.75 }}>{aiTip}</div>}
            </div>
          )}

          {/* ── Filter bar ── */}
          <div style={S.card}>
            <div style={S.title}>🔍 Filter Transactions ({filtered.length} results)</div>
            <div style={S.row}>
              <div>
                <label style={S.label}>Search</label>
                <input style={S.input} placeholder="Note or category..." value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  onFocus={focusGold} onBlur={blurReset}/>
              </div>
              <div>
                <label style={S.label}>Type</label>
                <select style={S.select} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
                  <option value="all">All</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Category</label>
                <select style={S.select} value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
                  <option value="all">All Categories</option>
                  {ALL_CATS.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>From</label>
                <input style={S.input} type="date" value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  onFocus={focusGold} onBlur={blurReset}/>
              </div>
              <div>
                <label style={S.label}>To</label>
                <input style={S.input} type="date" value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  onFocus={focusGold} onBlur={blurReset}/>
              </div>
            </div>
            {(search || filterCat!=='all' || filterType!=='all' || dateFrom || dateTo) && (
              <button style={S.btnSm} onClick={() => { setSearch(''); setFilterCat('all'); setFilterType('all'); setDateFrom(''); setDateTo(''); setPage(1); }}>
                ✕ Clear Filters
              </button>
            )}

            {/* Transaction list */}
            {filtered.length === 0 ? (
              <EmptyState icon="🔎" title="No transactions match your filters"
                sub="Try changing the search term, category, or date range." />
            ) : (
              <>
                {paginated.map(t => <TxRow key={t.id} tx={t} onDelete={delTx} onEdit={setEditingTx}/>)}
                {hasMore && (
                  <div style={{ textAlign:'center', paddingTop:14 }}>
                    <button style={S.btnBlue} onClick={() => setPage(p => p+1)}>
                      Load more ({filtered.length - paginated.length} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          ADD TRANSACTION
      ════════════════════════════════════════════════════════ */}
      {activeSection === 'add' && (
        <div style={S.card}>
          <div style={S.title}>➕ Add Transaction</div>
          <div style={S.tabRow}>
            <button style={S.tab(txType==='expense')} onClick={() => { setTxType('expense'); setForm(f=>({...f,category:'food'})); }}>Expense</button>
            <button style={S.tab(txType==='income')}  onClick={() => { setTxType('income');  setForm(f=>({...f,category:'salary'})); }}>Income</button>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>Amount (₹)</label>
              <input style={S.input} type="number" inputMode="numeric" placeholder="e.g. 5000"
                value={form.amount} onChange={setF('amount')} onFocus={focusGold} onBlur={blurReset}/>
            </div>
            <div>
              <label style={S.label}>Category</label>
              <select style={S.select} value={form.category} onChange={setF('category')}>
                {(txType==='expense' ? EXPENSE_CATS : INCOME_CATS).map(c =>
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                )}
              </select>
            </div>
            <div>
              <label style={S.label}>Date</label>
              <input style={S.input} type="date" value={form.date} onChange={setF('date')} onFocus={focusGold} onBlur={blurReset}/>
            </div>
            <div>
              <label style={S.label}>Note (optional)</label>
              <input style={S.input} type="text" placeholder="e.g. HDFC EMI" value={form.note} onChange={setF('note')} onFocus={focusGold} onBlur={blurReset}/>
            </div>
          </div>

          {/* Recurring toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, padding:'12px 16px', background:'var(--bg3)', borderRadius:10 }}>
            <div style={{ width:38, height:20, borderRadius:10, background: form.isRecurring ? 'var(--gold)':'var(--border)', position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}
              onClick={() => setForm(f => ({ ...f, isRecurring:!f.isRecurring }))}>
              <div style={{ position:'absolute', top:3, left: form.isRecurring ? 19:3, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left .2s' }}/>
            </div>
            <span style={{ fontSize:13, color:'var(--text)' }}>Make this a recurring transaction</span>
            {form.isRecurring && (
              <select style={{ ...S.select, width:130, marginLeft:'auto' }} value={form.frequency} onChange={setF('frequency')}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
              </select>
            )}
          </div>
          {form.isRecurring && (
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14, padding:'0 4px' }}>
              🔁 This transaction will auto-post every {form.frequency}. Next occurrence will be auto-created when you open the app.
            </div>
          )}

          <button style={S.btn} onClick={addTx}>Add {txType==='expense'?'Expense':'Income'}</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          RECURRING TEMPLATES
      ════════════════════════════════════════════════════════ */}
      {activeSection === 'recurring' && (
        <div style={S.card}>
          <div style={S.title}>🔁 Recurring Transactions</div>
          {recurring.length === 0 ? (
            <EmptyState icon="🔁" title="No recurring transactions"
              sub="Set up recurring EMIs, salary credits, subscription fees, and SIPs. They'll auto-post when their due date arrives." />
          ) : (
            recurring.map(r => <RecurringRow key={r.id} rec={r} onDelete={delRec}/>)
          )}

          <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>Add New Recurring Template</div>
            <div style={S.row}>
              <div>
                <label style={S.label}>Amount (₹)</label>
                <input style={S.input} type="number" inputMode="numeric" placeholder="e.g. 25000"
                  value={recForm.amount} onChange={setR('amount')} onFocus={focusGold} onBlur={blurReset}/>
              </div>
              <div>
                <label style={S.label}>Type</label>
                <select style={S.select} value={recForm.type} onChange={setR('type')}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Category</label>
                <select style={S.select} value={recForm.category} onChange={setR('category')}>
                  {(recForm.type==='expense' ? EXPENSE_CATS : INCOME_CATS).map(c =>
                    <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                  )}
                </select>
              </div>
              <div>
                <label style={S.label}>Frequency</label>
                <select style={S.select} value={recForm.frequency} onChange={setR('frequency')}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>First Due Date</label>
                <input style={S.input} type="date" value={recForm.nextDue} onChange={setR('nextDue')} onFocus={focusGold} onBlur={blurReset}/>
              </div>
              <div>
                <label style={S.label}>Note</label>
                <input style={S.input} type="text" placeholder="e.g. Home loan EMI" value={recForm.note} onChange={setR('note')} onFocus={focusGold} onBlur={blurReset}/>
              </div>
            </div>
            <button style={S.btn} onClick={addRecurringTemplate}>Add Recurring</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          BUDGETS
      ════════════════════════════════════════════════════════ */}
      {activeSection === 'budgets' && (
        <div style={S.card}>
          <div style={S.title}>🎯 Monthly Budget Limits</div>
          <p style={{ fontSize:13, color:'var(--muted)', marginBottom:18, lineHeight:1.6 }}>
            Set monthly spending limits per category. You'll get an alert when you reach 90% or exceed the limit.
            Budget limits update automatically in Firestore.
          </p>
          {EXPENSE_CATS.map(c => (
            <BudgetBar
              key={c.key}
              catKey={c.key}
              spent={catSpending[c.key] || 0}
              limit={budgets[c.key] || 0}
              onChange={updateBudget}
            />
          ))}
          {Object.values(budgets).every(v => !v) && (
            <EmptyState icon="🎯" title="No budget limits set"
              sub="Enter a monthly limit in the ₹ field next to each category. Alerts will fire at 90% and 100%." />
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          IMPORT (CSV + PDF)
      ════════════════════════════════════════════════════════ */}
      {activeSection === 'import' && (
        <div style={S.card}>
          <div style={S.title}>📥 Import Bank Statement</div>

          {/* CSV / PDF mode tabs */}
          <div style={S.tabRow}>
            <button style={S.tab(importMode==='csv')} onClick={() => { setImportMode('csv'); setImportRows([]); setImportStatus(''); }}>📄 CSV / Excel</button>
            <button style={S.tab(importMode==='pdf')} onClick={() => { setImportMode('pdf'); setImportRows([]); setImportStatus(''); }}>📑 PDF Statement</button>
          </div>

          {/* ── CSV mode ── */}
          {importMode === 'csv' && (
            <>
              <p style={{ fontSize:13, color:'var(--muted)', marginBottom:14, lineHeight:1.6 }}>
                Upload a CSV exported from your bank. Supports <strong style={{ color:'var(--text)' }}>SBI Excel export, HDFC, ICICI</strong> and generic CSVs.
                <br/>SBI: use YONO → Statement → Export to Excel → Save as CSV.
              </p>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileChange}
                style={{ display:'none' }} id="csv-upload"/>
              <label htmlFor="csv-upload" style={{ ...S.btnBlue, display:'inline-block', cursor:'pointer', marginBottom:14 }}>
                📁 Choose CSV File
              </label>
              <div style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 16px', fontSize:12, color:'var(--muted)', lineHeight:1.8 }}>
                <strong style={{ color:'var(--text)' }}>Supported CSV formats:</strong><br/>
                🏦 <strong>SBI Excel export</strong>: Date in col A, Description col D, Credit col O, Debit col R<br/>
                🏦 <strong>HDFC</strong>: Date, Narration, Value Dat, Debit Amount, Credit Amount<br/>
                🏦 <strong>ICICI</strong>: Transaction Date, Remarks, Withdrawal Amt, Deposit Amt<br/>
                📄 <strong>Generic</strong>: Any CSV with Date and Amount/Debit/Credit columns
              </div>
            </>
          )}

          {/* ── PDF mode ── */}
          {importMode === 'pdf' && (
            <>
              <p style={{ fontSize:13, color:'var(--muted)', marginBottom:14, lineHeight:1.6 }}>
                Upload your bank e-statement PDF directly. Transactions are auto-categorised from merchant names.
                {!pdfReady && <span style={{ color:'var(--gold)' }}> Loading PDF reader…</span>}
              </p>
              <input ref={pdfRef} type="file" accept=".pdf" onChange={handlePDFChange}
                style={{ display:'none' }} id="pdf-upload"/>
              <label htmlFor="pdf-upload" style={{ ...S.btnBlue, display:'inline-block', cursor:'pointer', marginBottom:14, opacity: pdfReady ? 1 : 0.5 }}>
                📑 Choose PDF Statement
              </label>
              <div style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 16px', fontSize:12, color:'var(--muted)', lineHeight:1.8 }}>
                <strong style={{ color:'var(--text)' }}>Supported banks (PDF):</strong><br/>
                🏦 SBI · KVB (Karur Vysya) · HDFC · ICICI · Axis · Kotak · PNB · Bank of Baroda<br/>
                <strong style={{ color:'var(--text)' }}>How to get your PDF:</strong><br/>
                SBI: YONO → Statements → Download PDF &nbsp;|&nbsp;
                HDFC: NetBanking → My Accounts → Download Statement (PDF)<br/>
                ICICI: iMobile → Accounts → Statement → PDF &nbsp;|&nbsp;
                Axis: NetBanking → Accounts → Account Statement → PDF
              </div>
            </>
          )}

          {/* Shared: status */}
          {importStatus && (
            <div style={{ background: importStatus.startsWith('✅') ? 'rgba(29,184,115,.08)' : 'var(--bg3)', border: `1px solid ${importStatus.startsWith('✅') ? 'rgba(29,184,115,.3)' : 'var(--border)'}`, borderRadius:10, padding:'12px 16px', margin:'14px 0', fontSize:13, color: importStatus.startsWith('✅') ? 'var(--emerald)' : 'var(--muted)' }}>
              {importStatus}
            </div>
          )}

          {/* Shared: preview + confirm */}
          {importRows.length > 0 && (
            <>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>
                Preview — {Math.min(10, importRows.length)} of {importRows.length} transactions:
              </div>
              <div style={{ maxHeight:280, overflowY:'auto', border:'1px solid var(--border)', borderRadius:10, marginBottom:14 }}>
                <div style={{ display:'flex', gap:10, padding:'6px 14px', background:'var(--bg3)', fontSize:11, fontWeight:700, color:'var(--muted)', position:'sticky', top:0 }}>
                  <span style={{ width:80, flexShrink:0 }}>DATE</span>
                  <span style={{ width:65, flexShrink:0 }}>AMOUNT</span>
                  <span style={{ width:90, flexShrink:0 }}>CATEGORY</span>
                  <span style={{ flex:1 }}>DESCRIPTION</span>
                </div>
                {importRows.slice(0, 10).map((t, i) => {
                  const meta = CAT_MAP[t.category] || { label: t.category, color:'#888', icon:'📦' };
                  return (
                    <div key={i} style={{ display:'flex', gap:10, padding:'7px 14px', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                      <span style={{ color:'var(--muted)', width:80, flexShrink:0 }}>{t.date}</span>
                      <span style={{ color: t.type==='income' ? 'var(--emerald)':'var(--red)', width:65, flexShrink:0, fontWeight:700 }}>
                        {t.type==='income' ? '+':'-'}{fmtINR(t.amount)}
                      </span>
                      <span style={{ color: meta.color, width:90, flexShrink:0 }}>{meta.icon} {meta.label}</span>
                      <span style={{ color:'var(--muted)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.note}</span>
                    </div>
                  );
                })}
                {importRows.length > 10 && (
                  <div style={{ padding:'8px 14px', fontSize:12, color:'var(--muted)', textAlign:'center' }}>
                    +{importRows.length - 10} more rows will also be imported
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button style={S.btn} onClick={confirmImport}>
                  ✅ Import All {importRows.length} Transactions
                </button>
                <button style={S.btnSm} onClick={() => { setImportRows([]); setImportStatus(''); if(fileRef.current) fileRef.current.value=''; if(pdfRef.current) pdfRef.current.value=''; }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════ EDIT MODAL ════════ */}
      {editingTx && (
        <EditModal
          tx={editingTx}
          onSave={saveTxEdit}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
