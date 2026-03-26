/**
 * IncomeForm.jsx
 * Multi-source income entry with live tax preview.
 * Used in Step 1 of the planner instead of a single income field.
 */

import React, { useState, useMemo } from 'react';
import { INCOME_SOURCES, computeMultiIncomeTax, fmtINR } from './taxEngine.js';

const S = {
  card:    { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'22px 20px', marginBottom:16 },
  title:   { fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:16 },
  grid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12, marginBottom:8 },
  srcCard: (active) => ({
    background: active ? 'rgba(240,180,41,.08)' : 'var(--bg3)',
    border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
    borderRadius:10, padding:'12px 14px', cursor:'pointer', transition:'all .15s',
  }),
  srcIcon:  { fontSize:20, marginBottom:4 },
  srcLabel: { fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 },
  srcNote:  { fontSize:11, color:'var(--muted)', lineHeight:1.4 },
  input:    { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8,
              padding:'9px 12px', color:'var(--text)', fontSize:14, fontFamily:'var(--font-body)',
              marginTop:8, transition:'border-color .2s' },
  kpiRow:   { display:'flex', gap:10, flexWrap:'wrap', marginTop:16 },
  kpi:      (c) => ({ flex:'1 1 120px', background:`${c}12`, border:`1px solid ${c}30`, borderRadius:10, padding:'10px 14px' }),
  kpiL:     { fontSize:11, color:'var(--muted)', marginBottom:3 },
  kpiV:     (c) => ({ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:c }),
  taxRow:   { display:'flex', justifyContent:'space-between', padding:'7px 0',
              borderBottom:'1px solid var(--border)', fontSize:13 },
  badge:    (c) => ({ display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11,
              fontWeight:700, background:`${c}22`, color:c, border:`1px solid ${c}44` }),
  seniorRow:{ display:'flex', alignItems:'center', gap:10, marginBottom:16, fontSize:13, color:'var(--muted)' },
  toggle:   (on) => ({
    width:38, height:20, borderRadius:10, background: on ? 'var(--gold)' : 'var(--border)',
    position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0,
  }),
  toggleDot:(on) => ({
    position:'absolute', top:3, left: on ? 19 : 3, width:14, height:14,
    borderRadius:'50%', background:'#fff', transition:'left .2s',
  }),
};

export default function IncomeForm({ value = {}, onChange, isSenior, onSeniorChange }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (key) => {
    const next = { ...expanded, [key]: !expanded[key] };
    setExpanded(next);
    if (!next[key]) {
      // Remove the source if collapsed
      const { [key]: _, ...rest } = value;
      onChange(rest);
    }
  };

  const setVal = (key, v) => onChange({ ...value, [key]: +v || 0 });
  const focusGold = e => e.target.style.borderColor = 'var(--gold)';
  const blurReset = e => e.target.style.borderColor = 'var(--border)';

  const taxResult = useMemo(() => {
    const hasIncome = Object.values(value).some(v => v > 0);
    if (!hasIncome) return null;
    return computeMultiIncomeTax(value, isSenior);
  }, [value, isSenior]);

  const totalIncome = Object.values(value).reduce((s, v) => s + (v || 0), 0);

  return (
    <div>
      {/* Senior citizen toggle */}
      <div style={S.seniorRow}>
        <div style={S.toggle(isSenior)} onClick={() => onSeniorChange(!isSenior)}>
          <div style={S.toggleDot(isSenior)} />
        </div>
        <span>Senior Citizen (60+)  — enables 80TTB (₹50K interest exemption) and higher FD TDS threshold</span>
      </div>

      {/* Income source cards */}
      <div style={S.grid}>
        {INCOME_SOURCES.map(src => {
          const isOn = !!expanded[src.key];
          return (
            <div key={src.key}>
              <div style={S.srcCard(isOn)} onClick={() => toggle(src.key)}>
                <div style={S.srcIcon}>{src.icon}</div>
                <div style={S.srcLabel}>{src.label}</div>
                <div style={S.srcNote}>{src.note}</div>
                {isOn && (
                  <input
                    style={S.input}
                    type="number"
                    placeholder="Annual amount (₹)"
                    value={value[src.key] || ''}
                    onChange={e => setVal(src.key, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onFocus={e => { e.stopPropagation(); focusGold(e); }}
                    onBlur={blurReset}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live tax preview */}
      {taxResult && (
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--muted)', textTransform:'uppercase',
                        letterSpacing:'0.5px', marginBottom:10 }}>
            Live Tax Preview
          </div>

          <div style={S.kpiRow}>
            {[
              { label:'Total Gross Income', value:fmtINR(taxResult.totalGrossIncome), color:'#4fa3f7' },
              { label:'Best Tax Regime',    value:taxResult.bestRegime==='new'?'New Regime':'Old Regime', color:'var(--gold)' },
              { label:'Total Tax Payable',  value:taxResult.bestTax===0?'₹0 (Rebate)':fmtINR(taxResult.bestTax), color:taxResult.bestTax===0?'var(--emerald)':'var(--red)' },
              { label:'Marginal Slab Rate', value:`${(taxResult.marginalSlabRate*100).toFixed(0)}%`, color:'#a78bfa' },
            ].map(k => (
              <div key={k.label} style={S.kpi(k.color)}>
                <div style={S.kpiL}>{k.label}</div>
                <div style={S.kpiV(k.color)}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Tax breakdown by source */}
          {(taxResult.ltcgEquityTax > 0 || taxResult.stcgEquityTax > 0 ||
            taxResult.cryptoTax > 0 || taxResult.ltcgPropertyTax > 0) && (
            <div style={{ background:'var(--bg3)', borderRadius:10, padding:'14px 16px', marginTop:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', marginBottom:10,
                            textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Special Rate Taxes (same in both regimes)
              </div>
              {taxResult.ltcgEquityTax > 0 && (
                <div style={S.taxRow}>
                  <span>LTCG — Equity/MF (10% on ₹{fmtINR(taxResult.ltcgEquityTaxable)} above ₹1.25L exemption)</span>
                  <span style={{ fontWeight:700, color:'#4fa3f7' }}>{fmtINR(taxResult.ltcgEquityTax)}</span>
                </div>
              )}
              {taxResult.stcgEquityTax > 0 && (
                <div style={S.taxRow}>
                  <span>STCG — Equity/MF (15% flat)</span>
                  <span style={{ fontWeight:700, color:'#f0b429' }}>{fmtINR(taxResult.stcgEquityTax)}</span>
                </div>
              )}
              {taxResult.ltcgPropertyTax > 0 && (
                <div style={S.taxRow}>
                  <span>LTCG — Property (20% with indexation)</span>
                  <span style={{ fontWeight:700, color:'#fb923c' }}>{fmtINR(taxResult.ltcgPropertyTax)}</span>
                </div>
              )}
              {taxResult.cryptoTax > 0 && (
                <div style={{ ...S.taxRow, borderBottom:'none' }}>
                  <span>Crypto / VDA (30% flat — no deductions)</span>
                  <span style={{ fontWeight:700, color:'var(--red)' }}>{fmtINR(taxResult.cryptoTax)}</span>
                </div>
              )}
            </div>
          )}

          {/* Regime comparison */}
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            {[
              { label:'New Regime Tax', tax:taxResult.newRegime.totalTax, regime:'new' },
              { label:'Old Regime Tax', tax:taxResult.oldRegime.totalTax, regime:'old' },
            ].map(r => (
              <div key={r.regime} style={{ flex:1, background:'var(--bg3)', borderRadius:10,
                padding:'12px 14px', border: taxResult.bestRegime===r.regime ? '1px solid var(--gold)':'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{r.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800,
                  color: r.tax===0 ? 'var(--emerald)':'var(--text)' }}>{r.tax===0?'₹0':fmtINR(r.tax)}</div>
                {taxResult.bestRegime===r.regime &&
                  <div style={{ fontSize:11, color:'var(--emerald)', fontWeight:700, marginTop:4 }}>
                    ✓ Saves {fmtINR(taxResult.taxSaving)} more
                  </div>}
              </div>
            ))}
          </div>

          {taxResult.rentalTaxable > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:10, lineHeight:1.5 }}>
              💡 Rental income of {fmtINR(value.rental || 0)} reduced to {fmtINR(taxResult.rentalTaxable)} after 30% standard deduction (Sec 24).
            </div>
          )}
          {taxResult.savingsIntTaxable < (value.savings_int || 0) && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:6, lineHeight:1.5 }}>
              💡 Savings interest of {fmtINR(value.savings_int || 0)} reduced to {fmtINR(taxResult.savingsIntTaxable)} after {isSenior ? '80TTB ₹50K':'80TTA ₹10K'} exemption.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
