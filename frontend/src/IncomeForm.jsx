/**
 * IncomeForm.jsx — v5 (focus / scroll-to-top fix)
 *
 * Root cause of both bugs:
 *   SafeInput and SrcGroup were defined INSIDE IncomeForm.
 *   On every keystroke → parent re-renders → new function references →
 *   React sees a brand-new component type → unmounts the old input and
 *   mounts a fresh one → focus lost after 1 digit, layout recalculates
 *   → page scrolls to top.
 *
 * Fix: hoist both components to module scope so their identity is stable
 *   across renders, then pass the required state/callbacks as props.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  INCOME_SOURCES, LOAN_TYPES, ENTITY_TYPES,
  computeMultiIncomeTax, fmtINR, extractTrackerDeductions,
} from './taxEngine.js';

const S = {
  section:  { marginBottom: 20 },
  secTitle: { fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'var(--text)',
              marginBottom:12, display:'flex', alignItems:'center', gap:8 },
  secBadge: c => ({ fontSize:11, fontWeight:700, background:`${c}22`, color:c,
              border:`1px solid ${c}44`, borderRadius:20, padding:'2px 8px' }),
  grid:     { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:10 },
  srcCard:  on => ({
    background: on ? 'rgba(232,146,26,.10)' : 'var(--bg3)',
    border: on ? '1px solid var(--gold)' : '1px solid var(--border)',
    borderRadius:10, padding:'12px 14px', cursor:'pointer', transition:'all .15s',
  }),
  srcIcon:  { fontSize:18, marginBottom:4, pointerEvents:'none' },
  srcLabel: { fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2, pointerEvents:'none' },
  srcNote:  { fontSize:11, color:'var(--muted)', lineHeight:1.4, pointerEvents:'none' },
  input:    { width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
              borderRadius:8, padding:'9px 11px', color:'var(--text)', fontSize:14,
              fontFamily:'var(--font-body)', marginTop:8, transition:'border-color .2s',
              position:'relative', zIndex:2 },
  entityRow:{ display:'flex', gap:10, marginBottom:16 },
  entityBtn: on => ({
    flex:1, padding:'10px 14px', borderRadius:10, cursor:'pointer',
    border: on ? '1px solid var(--gold)' : '1px solid var(--border)',
    background: on ? 'rgba(232,146,26,.10)' : 'var(--bg3)',
    color: on ? 'var(--gold)' : 'var(--muted)', fontSize:13, fontWeight:600,
    fontFamily:'var(--font-body)', display:'flex', alignItems:'center', gap:8,
  }),
  kpiRow:   { display:'flex', gap:10, flexWrap:'wrap', marginTop:18 },
  kpi:      c => ({ flex:'1 1 120px', background:`${c}12`, border:`1px solid ${c}30`, borderRadius:10, padding:'10px 14px' }),
  kpiL:     { fontSize:11, color:'var(--muted)', marginBottom:3 },
  kpiV:     c => ({ fontFamily:'var(--font-display)', fontSize:17, fontWeight:800, color:c }),
  taxRow:   { display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:13 },
  regCard:  on => ({ flex:1, background:'var(--bg3)', borderRadius:10, padding:'12px 14px',
              border: on ? '1px solid var(--gold)' : '1px solid var(--border)' }),
  infoBox:  { background:'rgba(232,146,26,.07)', border:'1px solid rgba(232,146,26,.2)',
              borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--muted)', marginTop:10, lineHeight:1.6 },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL COMPONENTS — stable identity across renders; no focus loss
// ─────────────────────────────────────────────────────────────────────────────

/** Stops ALL event propagation so the parent card never intercepts input events. */
function SafeInput({ inputValue, onUpdate, placeholder }) {
  return (
    <input
      style={S.input}
      type="number"
      inputMode="numeric"
      placeholder={placeholder}
      value={inputValue || ''}
      onChange={e  => { e.stopPropagation(); onUpdate(e.target.value); }}
      onClick={e   => e.stopPropagation()}
      onFocus={e   => { e.stopPropagation(); e.target.style.borderColor = 'var(--gold)'; }}
      onBlur={e    => { e.stopPropagation(); e.target.style.borderColor = 'var(--border)'; }}
      onKeyDown={e => e.stopPropagation()}
      onKeyUp={e   => e.stopPropagation()}
      onMouseDown={e   => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onTouchStart={e  => e.stopPropagation()}
    />
  );
}

/**
 * Renders one group of income-source cards.
 * Receives state/callbacks as explicit props instead of closing over them,
 * so React can reuse the same component instance across parent re-renders.
 */
function SrcGroup({ title, badge, badgeColor, sources, expanded, onToggle, value, onChange }) {
  return (
    <div style={S.section}>
      <div style={S.secTitle}>
        {title}
        <span style={S.secBadge(badgeColor)}>{badge}</span>
      </div>
      <div style={S.grid}>
        {sources.map(src => {
          const isOn = !!expanded[src.key];
          return (
            <div key={src.key}>
              <div style={S.srcCard(isOn)} onClick={e => onToggle(e, src.key)}>
                <div style={S.srcIcon}>{src.icon}</div>
                <div style={S.srcLabel}>{src.label}</div>
                <div style={S.srcNote}>{src.note}</div>
                {isOn && (
                  <SafeInput
                    inputValue={value[src.key]}
                    onUpdate={v => onChange({ ...value, [src.key]: +v || 0 })}
                    placeholder="Annual amount (₹)"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function IncomeForm({
  value = {}, onChange,
  age = 30,
  entityType, onEntityChange,
  loanDeductions = {}, onLoanChange,
}) {
  const [expanded,     setExpanded]     = useState({ salary: true });
  const [loanExpanded, setLoanExpanded] = useState({});
  const isSenior          = age >= 60;
  const trackerDeductions = useMemo(() => extractTrackerDeductions(), []);

  // Debounce tax recalculation so layout doesn't thrash on every keypress
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 400);
    return () => clearTimeout(t);
  }, [value]);

  // Card toggle — bail out if the click came from an INPUT element
  const toggleSrc = (e, key) => {
    if (e.target.tagName === 'INPUT') return;
    const next = { ...expanded, [key]: !expanded[key] };
    setExpanded(next);
    if (!next[key]) { const { [key]: _, ...rest } = value; onChange(rest); }
  };

  const toggleLoan = (e, key) => {
    if (e.target.tagName === 'INPUT') return;
    const next = { ...loanExpanded, [key]: !loanExpanded[key] };
    setLoanExpanded(next);
    if (!next[key]) { const { [key]: _, ...rest } = loanDeductions; onLoanChange(rest); }
  };

  // Tax preview (uses debounced value to avoid scroll-on-keypress)
  const taxResult = useMemo(() => {
    const hasIncome = Object.values(debounced).some(v => v > 0);
    if (!hasIncome) return null;
    return computeMultiIncomeTax(debounced, age, entityType, loanDeductions, trackerDeductions);
  }, [debounced, age, entityType, loanDeductions, trackerDeductions]);

  // Income source groups
  const ordinaryGroup = INCOME_SOURCES.filter(s =>
    ['salary','business','freelance','rental','fd_interest','savings_int','dividends','other'].includes(s.key));
  const capitalGroup  = INCOME_SOURCES.filter(s =>
    ['ltcg_equity','stcg_equity','ltcg_property','ltcg_property_new'].includes(s.key));
  const specialGroup  = INCOME_SOURCES.filter(s =>
    ['agricultural','crypto'].includes(s.key));

  return (
    <div>
      {/* Entity type selector */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', marginBottom:8,
                      textTransform:'uppercase', letterSpacing:'0.5px' }}>Filing As</div>
        <div style={S.entityRow}>
          {ENTITY_TYPES.map(et => (
            <button key={et.key} style={S.entityBtn(entityType === et.key)}
              onClick={() => onEntityChange(et.key)}>
              <span style={{ fontSize:18 }}>{et.icon}</span> {et.label}
            </button>
          ))}
        </div>
        {entityType === 'huf' && (
          <div style={S.infoBox}>
            🏛️ HUF has the same basic exemption (₹2.5L) as an individual. No senior citizen benefit.
            HUF can invest and claim deductions in its own name. Interest exemption: ₹50K.
          </div>
        )}
        {isSenior && entityType === 'individual' && (
          <div style={{ ...S.infoBox, background:'rgba(29,184,115,.07)', borderColor:'rgba(29,184,115,.2)' }}>
            ✅ Senior citizen (60+) detected — 80TTB ₹50K interest exemption auto-applied.
            Basic exemption ₹3L in old regime.
          </div>
        )}
      </div>

      {/* Income source cards */}
      <SrcGroup
        title="Ordinary Income" badge="Slab Rate" badgeColor="#9B72CF"
        sources={ordinaryGroup}
        expanded={expanded} onToggle={toggleSrc}
        value={value} onChange={onChange}
      />
      <SrcGroup
        title="Capital Gains" badge="Special Rates" badgeColor="#4A9EE8"
        sources={capitalGroup}
        expanded={expanded} onToggle={toggleSrc}
        value={value} onChange={onChange}
      />
      <SrcGroup
        title="Special Income" badge="Exempt / 30%" badgeColor="#E84040"
        sources={specialGroup}
        expanded={expanded} onToggle={toggleSrc}
        value={value} onChange={onChange}
      />

      {/* Loans / deduction sources */}
      <div style={S.section}>
        <div style={S.secTitle}>
          Loans &amp; Deductions
          <span style={S.secBadge('#1DB873')}>Old Regime Only</span>
        </div>
        <div style={S.grid}>
          {LOAN_TYPES.map(loan => {
            const isOn = !!loanExpanded[loan.key];
            return (
              <div key={loan.key}>
                <div style={S.srcCard(isOn)} onClick={e => toggleLoan(e, loan.key)}>
                  <div style={S.srcIcon}>{loan.icon}</div>
                  <div style={S.srcLabel}>{loan.label}</div>
                  <div style={S.srcNote}>
                    {loan.section && <span style={{ color:'var(--gold)', fontWeight:600 }}>§ {loan.section} </span>}
                    {loan.note}
                  </div>
                  {isOn && (
                    <SafeInput
                      inputValue={loanDeductions[loan.key]}
                      onUpdate={v => onLoanChange({ ...loanDeductions, [loan.key]: +v || 0 })}
                      placeholder={loan.limit ? `Max ₹${fmtINR(loan.limit)}/yr` : 'Annual amount (₹)'}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracker deduction notice */}
      {(trackerDeductions.health80D > 0 || trackerDeductions.potential80C > 0) && (
        <div style={S.infoBox}>
          💡 <strong style={{ color:'var(--text)' }}>From your Expense Tracker: </strong>
          {trackerDeductions.health80D > 0 &&
            `₹${fmtINR(trackerDeductions.health80D)} health spending → auto-applied as 80D. `}
          {trackerDeductions.potential80C > 0 &&
            `₹${fmtINR(trackerDeductions.potential80C)} investment spending → verify against 80C.`}
        </div>
      )}

      {/* Live tax preview — updates 400ms after typing stops */}
      {taxResult && (
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase',
                        letterSpacing:'0.5px', marginBottom:12 }}>
            Live Tax Preview
          </div>

          <div style={S.kpiRow}>
            {[
              { label:'Gross Income',  value:fmtINR(taxResult.totalGrossIncome),  color:'#4A9EE8' },
              { label:'Best Regime',   value:taxResult.bestRegime==='new'?'New Regime':'Old Regime', color:'var(--gold)' },
              { label:'Total Tax',     value:taxResult.bestTax===0?'₹0 (Rebate)':fmtINR(taxResult.bestTax), color:taxResult.bestTax===0?'var(--emerald)':'#E84040' },
              { label:'Marginal Slab', value:`${(taxResult.marginalSlabRate*100).toFixed(0)}%`, color:'#9B72CF' },
            ].map(k => (
              <div key={k.label} style={S.kpi(k.color)}>
                <div style={S.kpiL}>{k.label}</div>
                <div style={S.kpiV(k.color)}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Special taxes breakdown */}
          {taxResult.specialTaxTotal > 0 && (
            <div style={{ background:'var(--bg3)', borderRadius:10, padding:'14px 16px', marginTop:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', marginBottom:10,
                            textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Special Rate Taxes
              </div>
              {taxResult.ltcgEquityTax   > 0 && <div style={S.taxRow}><span>LTCG Equity 10% (on {fmtINR(taxResult.ltcgEquityTaxable)} above ₹1.25L)</span><span style={{ color:'#4A9EE8', fontWeight:700 }}>{fmtINR(taxResult.ltcgEquityTax)}</span></div>}
              {taxResult.stcgEquityTax   > 0 && <div style={S.taxRow}><span>STCG Equity 15% flat</span><span style={{ color:'#E8921A', fontWeight:700 }}>{fmtINR(taxResult.stcgEquityTax)}</span></div>}
              {taxResult.ltcgPropertyTax > 0 && <div style={S.taxRow}><span>LTCG Property 20%</span><span style={{ color:'#fb923c', fontWeight:700 }}>{fmtINR(taxResult.ltcgPropertyTax)}</span></div>}
              {taxResult.ltcgPropertyNewTax > 0 && <div style={S.taxRow}><span>LTCG Property 12.5% without indexation (post Jul 23, 2024)</span><span style={{ color:'#ffa726', fontWeight:700 }}>{fmtINR(taxResult.ltcgPropertyNewTax)}</span></div>}
              {taxResult.cryptoTax       > 0 && <div style={{ ...S.taxRow, borderBottom:'none' }}><span>Crypto / VDA 30% flat</span><span style={{ color:'#E84040', fontWeight:700 }}>{fmtINR(taxResult.cryptoTax)}</span></div>}
            </div>
          )}

          {/* Regime comparison */}
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            {[
              { label:'New Regime', tax:taxResult.newRegime.totalTax, slab:taxResult.newSlabRate, key:'new' },
              { label:'Old Regime', tax:taxResult.oldRegime.totalTax, slab:taxResult.oldSlabRate, key:'old' },
            ].map(r => (
              <div key={r.key} style={S.regCard(taxResult.bestRegime===r.key)}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{r.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800,
                  color: r.tax===0?'var(--emerald)':'var(--text)' }}>
                  {r.tax===0 ? '₹0' : fmtINR(r.tax)}
                </div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                  Slab: <strong style={{ color:'var(--text)' }}>{(r.slab*100).toFixed(0)}%</strong>
                </div>
                {taxResult.bestRegime===r.key && (
                  <div style={{ fontSize:11, color:'var(--emerald)', fontWeight:700, marginTop:4 }}>
                    ✓ Saves {fmtINR(taxResult.taxSaving)} more
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contextual notes */}
          {taxResult.rentalTaxable > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:10 }}>
              💡 Rental {fmtINR(value.rental)} → taxable {fmtINR(taxResult.rentalTaxable)} after 30% Sec 24 deduction.
            </div>
          )}
          {taxResult.agriIncome > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>
              🌾 Agricultural income {fmtINR(taxResult.agriIncome)} is exempt but used for rate computation.
            </div>
          )}
          {taxResult.loanDeductionsUsed > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>
              🏠 {fmtINR(taxResult.loanDeductionsUsed)} loan deductions applied in old regime.
            </div>
          )}
          {taxResult.ltcgPropertyNewTax > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>
              🏠 Property LTCG (post Jul 23, 2024) {fmtINR(debounced.ltcg_property_new)} → {fmtINR(taxResult.ltcgPropertyNewTax)} tax at 12.5% without indexation (Budget 2024 rule).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
