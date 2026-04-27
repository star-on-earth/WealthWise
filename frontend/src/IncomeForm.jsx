/**
 * IncomeForm.jsx — WealthWise v5.1
 *
 * CHANGES FROM v4:
 *  • FOCUS FIX: SafeInput uses local state + onBlur (no more focus-loss on keystroke)
 *  • NEW PROPS:  cityType/onCityChange, extraInputs/onExtraChange
 *  • SALARY:    HRA sub-fields (hraReceived, rentPaid, cityType, childrenInSchool, arrears)
 *  • BUSINESS:  44AD presumptive toggle + digital receipts toggle
 *  • FREELANCE: 44ADA presumptive toggle
 *  • F&O:       gross turnover field + live 44AB audit warning
 *  • adjustedIncomes memo — pre-applies HRA/44AD/44ADA before tax preview
 *
 * BUG PREVENTION (v4 lesson preserved):
 *  ALL sub-components defined at MODULE SCOPE — no JSX-returning functions
 *  inside IncomeForm. SafeInput and SrcGroup have stable identity.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  INCOME_SOURCES, LOAN_TYPES, ENTITY_TYPES,
  computeMultiIncomeTax, fmtINR, extractTrackerDeductions,
} from './taxEngine.js';

// ─── STYLES ───────────────────────────────────────────────────────────────────

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
              position:'relative', zIndex:2, boxSizing:'border-box' },
  select:   { width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
              borderRadius:8, padding:'9px 11px', color:'var(--text)', fontSize:13,
              fontFamily:'var(--font-body)', marginTop:4, cursor:'pointer', boxSizing:'border-box' },
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
  infoGreen:{ background:'rgba(29,184,115,.07)', border:'1px solid rgba(29,184,115,.2)',
              borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--muted)', marginTop:10, lineHeight:1.6 },
  subLabel: { fontSize:11, color:'var(--muted)', marginTop:10, marginBottom:3, lineHeight:1.5 },
  subLabelGold: { fontSize:11, color:'var(--gold)', fontWeight:700, marginTop:10, marginBottom:3 },
  toggle:   on => ({ width:32, height:18, borderRadius:9, background: on ? 'var(--gold)' : 'var(--border)',
              position:'relative', flexShrink:0, cursor:'pointer' }),
  toggleDot:on => ({ position:'absolute', top:2, left: on ? 15:2, width:14, height:14,
              borderRadius:'50%', background:'#fff', transition:'left .2s' }),
  toggleRow:{ display:'flex', alignItems:'center', gap:8, marginTop:10, cursor:'pointer' },
  auditOk:  { fontSize:11, marginTop:6, lineHeight:1.5, color:'var(--emerald)' },
  auditWarn:{ fontSize:11, marginTop:6, lineHeight:1.5, color:'var(--gold)' },
  auditErr: { fontSize:11, marginTop:6, lineHeight:1.5, color:'var(--red)' },
};

// ─── SAFE INPUT — module scope, local state, focus-safe ──────────────────────
// KEY FIX: uses internal localValue state + syncs to parent only on onBlur.
// This prevents parent re-renders from yanking focus mid-keystroke.
// stopPropagation on ALL events prevents card-toggle from collapsing the input.

function SafeInput({ inputValue, onUpdate, placeholder, type = 'number' }) {
  const [localValue, setLocalValue] = useState(inputValue ?? '');
  const ref = useRef(null);

  // Sync only when parent changes externally (not from our own onBlur)
  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setLocalValue(inputValue ?? '');
    }
  }, [inputValue]);

  const stop = e => e.stopPropagation();

  return (
    <input
      ref={ref}
      style={S.input}
      type={type}
      inputMode={type === 'number' ? 'numeric' : undefined}
      placeholder={placeholder}
      value={localValue}
      onChange={e  => { stop(e); setLocalValue(e.target.value); }}
      onBlur={e    => { stop(e); onUpdate(localValue); }}
      onClick={stop}
      onFocus={e   => { stop(e); e.target.style.borderColor = 'var(--gold)'; }}
      onKeyDown={stop}
      onKeyUp={stop}
      onMouseDown={stop}
      onPointerDown={stop}
      onTouchStart={stop}
    />
  );
}

// ─── SAFE SELECT — same propagation guard ────────────────────────────────────

function SafeSelect({ value, onChange, children, style }) {
  const stop = e => e.stopPropagation();
  return (
    <select
      style={{ ...S.select, ...(style || {}) }}
      value={value}
      onChange={e => { stop(e); onChange(e.target.value); }}
      onClick={stop}
      onFocus={stop}
      onMouseDown={stop}
      onPointerDown={stop}
    >
      {children}
    </select>
  );
}

// ─── MINI TOGGLE — stable component ──────────────────────────────────────────

function Toggle({ on, onToggle, label, color = 'var(--gold)' }) {
  return (
    <div
      style={S.toggleRow}
      onClick={e => { e.stopPropagation(); onToggle(); }}
    >
      <div style={{ ...S.toggle(on), background: on ? color : 'var(--border)' }}>
        <div style={S.toggleDot(on)} />
      </div>
      <span style={{ fontSize:11, color:'var(--muted)' }}>{label}</span>
    </div>
  );
}

// ─── ORDINARY INCOME CARD — module scope ─────────────────────────────────────

function OrdinaryCard({ src, isOn, onToggle, value, onChange, extraInputs, onExtraChange, cityType, onCityChange }) {
  const isSpecial = ['salary','business','freelance','fno'].includes(src.key);

  return (
    <div>
      <div
        style={S.srcCard(isOn)}
        onClick={e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; onToggle(e, src.key); }}
      >
        <div style={S.srcIcon}>{src.icon}</div>
        <div style={S.srcLabel}>{src.label}</div>
        <div style={S.srcNote}>{src.note}</div>

        {isOn && (
          <>
            {/* ── SALARY ─────────────────────────────────────────────── */}
            {src.key === 'salary' && (
              <>
                <div style={S.subLabelGold}>💼 Total CTC (includes HRA + all components)</div>
                <SafeInput
                  inputValue={value.salary}
                  onUpdate={v => onChange({ ...value, salary: +v || 0 })}
                  placeholder="Annual CTC ₹ — include every component"
                />

                <div style={S.subLabel}>🏠 HRA received (separate sub-component of CTC above)</div>
                <SafeInput
                  inputValue={extraInputs.hra_received}
                  onUpdate={v => onExtraChange({ ...extraInputs, hra_received: +v || 0 })}
                  placeholder="Annual HRA ₹ (from salary slip, part of CTC)"
                />

                <div style={S.subLabel}>🏘️ Rent actually paid this year</div>
                <SafeInput
                  inputValue={extraInputs.rent_paid}
                  onUpdate={v => onExtraChange({ ...extraInputs, rent_paid: +v || 0 })}
                  placeholder="Annual rent paid ₹ (0 if not renting)"
                />

                <div style={S.subLabel}>🏙️ City type — affects HRA % (50% metro / 40% non-metro)</div>
                <SafeSelect
                  value={cityType}
                  onChange={onCityChange}
                >
                  <option value="metro">Metro (Delhi/Mumbai/Chennai/Kolkata) — 50% of basic</option>
                  <option value="non-metro">Non-Metro — 40% of basic</option>
                </SafeSelect>

                <div style={S.subLabel}>🎒 School-going children (Sec 10(14) — max 2)</div>
                <SafeInput
                  inputValue={extraInputs.children_in_school}
                  onUpdate={v => onExtraChange({ ...extraInputs, children_in_school: Math.min(2, Math.max(0, +v || 0)) })}
                  placeholder="0, 1, or 2"
                />
                {(extraInputs.children_in_school > 0) && (
                  <div style={{ fontSize:11, color:'var(--emerald)', marginTop:4 }}>
                    ↳ ₹{(Math.min(2, +extraInputs.children_in_school) * 4800).toLocaleString('en-IN')}/yr exempt (₹100+₹300/mo per child)
                  </div>
                )}

                <div style={S.subLabel}>📦 Salary arrears received this year (Sec 89(1))</div>
                <SafeInput
                  inputValue={extraInputs.arrear_amount}
                  onUpdate={v => onExtraChange({ ...extraInputs, arrear_amount: +v || 0 })}
                  placeholder="Arrear ₹ (0 if none)"
                />
                {(extraInputs.arrear_amount > 0) && (
                  <>
                    <div style={S.subLabel}>📅 FY the arrears belong to</div>
                    <SafeSelect
                      value={extraInputs.arrear_fy || '2024-25'}
                      onChange={v => onExtraChange({ ...extraInputs, arrear_fy: v })}
                    >
                      {['2022-23','2023-24','2024-25','2025-26'].map(y => <option key={y} value={y}>{y}</option>)}
                    </SafeSelect>
                    <div style={{ fontSize:11, color:'var(--gold)', marginTop:4 }}>
                      ⚠️ File Form 10E at incometax.gov.in BEFORE your ITR to claim Sec 89(1) relief.
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── BUSINESS ───────────────────────────────────────────── */}
            {src.key === 'business' && (
              <>
                <div style={S.subLabelGold}>
                  💰 {extraInputs.opt_44ad ? 'Gross turnover ₹ (44AD: no net profit needed)' : 'Net business profit ₹'}
                </div>
                <SafeInput
                  inputValue={value.business}
                  onUpdate={v => onChange({ ...value, business: +v || 0 })}
                  placeholder={extraInputs.opt_44ad ? 'Gross turnover ₹' : 'Net profit after all expenses ₹'}
                />
                <Toggle
                  on={!!extraInputs.opt_44ad}
                  onToggle={() => onExtraChange({ ...extraInputs, opt_44ad: !extraInputs.opt_44ad })}
                  label="Opt for Sec 44AD presumptive (turnover ≤ ₹2Cr)"
                />
                {extraInputs.opt_44ad && (
                  <>
                    <div style={S.auditOk}>
                      ✅ Deemed income = {extraInputs.digital_receipts ? '6%' : '8%'} of turnover. No books of accounts needed.
                    </div>
                    <Toggle
                      on={!!extraInputs.digital_receipts}
                      onToggle={() => onExtraChange({ ...extraInputs, digital_receipts: !extraInputs.digital_receipts })}
                      label="95%+ receipts are digital → 6% deemed rate"
                      color="var(--emerald)"
                    />
                  </>
                )}
              </>
            )}

            {/* ── FREELANCE ──────────────────────────────────────────── */}
            {src.key === 'freelance' && (
              <>
                <div style={S.subLabelGold}>
                  💰 {extraInputs.opt_44ada ? 'Gross receipts ₹ (44ADA: 50% auto-deemed income)' : 'Net income after expenses ₹'}
                </div>
                <SafeInput
                  inputValue={value.freelance}
                  onUpdate={v => onChange({ ...value, freelance: +v || 0 })}
                  placeholder={extraInputs.opt_44ada ? 'Gross receipts ₹' : 'Net income ₹'}
                />
                <Toggle
                  on={!!extraInputs.opt_44ada}
                  onToggle={() => onExtraChange({ ...extraInputs, opt_44ada: !extraInputs.opt_44ada })}
                  label="Opt for Sec 44ADA presumptive (receipts ≤ ₹75L)"
                />
                {extraInputs.opt_44ada && (
                  <div style={S.auditOk}>
                    ✅ Deemed income = 50% of gross receipts. Eligible: doctors, CAs, lawyers, engineers, architects, consultants.
                  </div>
                )}
                {extraInputs.opt_44ada && value.freelance > 7_500_000 && (
                  <div style={S.auditErr}>
                    ⚠️ Gross receipts exceed ₹75L limit — 44ADA not applicable. Enter net income instead.
                  </div>
                )}
              </>
            )}

            {/* ── F&O ────────────────────────────────────────────────── */}
            {src.key === 'fno' && (
              <>
                <div style={S.subLabelGold}>📉 Net F&O profit / loss ₹</div>
                <SafeInput
                  inputValue={value.fno}
                  onUpdate={v => onChange({ ...value, fno: +v || 0 })}
                  placeholder="Net P&L after all trading expenses ₹"
                />
                <div style={S.subLabel}>📊 Gross F&O turnover (for Sec 44AB audit check)</div>
                <SafeInput
                  inputValue={extraInputs.fno_turnover}
                  onUpdate={v => onExtraChange({ ...extraInputs, fno_turnover: +v || 0 })}
                  placeholder="Sum of absolute value of all trade P&Ls ₹"
                />
                {(extraInputs.fno_turnover > 0) && (
                  <div style={
                    extraInputs.fno_turnover > 10_000_000 ? S.auditErr :
                    extraInputs.fno_turnover > 1_000_000  ? S.auditWarn : S.auditOk
                  }>
                    {extraInputs.fno_turnover > 10_000_000
                      ? '🚨 Turnover > ₹10Cr — Tax audit mandatory (Sec 44AB). Deadline Sep 30.'
                      : extraInputs.fno_turnover > 1_000_000
                      ? '⚠️ Turnover > ₹1Cr — Audit required unless 95%+ digital receipts. Consult a CA.'
                      : '✅ Below ₹1Cr — No tax audit required.'}
                  </div>
                )}
              </>
            )}

            {/* ── DEFAULT (all other ordinary income cards) ─────────── */}
            {!isSpecial && (
              <SafeInput
                inputValue={value[src.key]}
                onUpdate={v => onChange({ ...value, [src.key]: +v || 0 })}
                placeholder="Annual amount (₹)"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── STANDARD SRC GROUP (capital gains + special income) ─────────────────────
// These cards have no sub-fields so the simpler SrcGroup still works fine.

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
              <div
                style={S.srcCard(isOn)}
                onClick={e => { if (e.target.tagName === 'INPUT') return; onToggle(e, src.key); }}
              >
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function IncomeForm({
  value = {},
  onChange,
  age = 30,
  // v5: new props — all optional for backward compat
  cityType = 'non-metro',
  onCityChange,
  extraInputs = {},
  onExtraChange,
  entityType,
  onEntityChange,
  loanDeductions = {},
  onLoanChange,
}) {
  const [expanded,     setExpanded]     = useState({ salary: true });
  const [loanExpanded, setLoanExpanded] = useState({});
  const isSenior          = age >= 60;
  const trackerDeductions = useMemo(() => extractTrackerDeductions(), []);

  // Debounce value changes to avoid layout-thrash on every keystroke
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 400);
    return () => clearTimeout(t);
  }, [value]);

  // ── Pre-apply HRA, 44AD, 44ADA, children before tax preview ───────────────
  const adjustedIncomes = useMemo(() => {
    const adj = { ...debounced };

    // 44AD: replace business with deemed income
    if (extraInputs.opt_44ad && (adj.business || 0) > 0) {
      adj.business = Math.round((adj.business || 0) * (extraInputs.digital_receipts ? 0.06 : 0.08));
    }

    // 44ADA: replace freelance with 50% of gross receipts (if eligible)
    if (extraInputs.opt_44ada && (adj.freelance || 0) > 0 && (adj.freelance || 0) <= 7_500_000) {
      adj.freelance = Math.round((adj.freelance || 0) * 0.50);
    }

    // HRA exemption (Sec 10(13A))
    if ((adj.salary || 0) > 0 && (extraInputs.hra_received || 0) > 0 && (extraInputs.rent_paid || 0) > 0) {
      const basic   = (adj.salary || 0) * 0.40; // approximate if basicSalary not provided
      const limit1  = extraInputs.hra_received;
      const limit2  = Math.max(0, extraInputs.rent_paid - basic * 0.10);
      const limit3  = basic * (cityType === 'metro' ? 0.50 : 0.40);
      const exempt  = Math.max(0, Math.min(limit1, limit2, limit3));
      adj.salary    = Math.max(0, (adj.salary || 0) - exempt);
    }

    // Sec 10(14): children's education + hostel allowance
    if ((extraInputs.children_in_school || 0) > 0) {
      const n = Math.min(2, extraInputs.children_in_school);
      adj.salary = Math.max(0, (adj.salary || 0) - n * 4_800);
    }

    return adj;
  }, [debounced, extraInputs, cityType]);

  // Tax preview
  const taxResult = useMemo(() => {
    const hasIncome = Object.values(adjustedIncomes).some(v => v > 0);
    if (!hasIncome) return null;
    return computeMultiIncomeTax(adjustedIncomes, age, entityType, loanDeductions, trackerDeductions);
  }, [adjustedIncomes, age, entityType, loanDeductions, trackerDeductions]);

  // Card toggle — bail if click came from INPUT or SELECT
  const toggleSrc = (e, key) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const next = { ...expanded, [key]: !expanded[key] };
    setExpanded(next);
    if (!next[key]) { const { [key]: _, ...rest } = value; onChange(rest); }
  };

  const toggleLoan = (e, key) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const next = { ...loanExpanded, [key]: !loanExpanded[key] };
    setLoanExpanded(next);
    if (!next[key]) { const { [key]: _, ...rest } = loanDeductions; onLoanChange(rest); }
  };

  // Computed HRA exemption for display
  const hraExemptDisplay = useMemo(() => {
    if (!(value.salary > 0) || !(extraInputs.hra_received > 0) || !(extraInputs.rent_paid > 0)) return 0;
    const basic  = value.salary * 0.40;
    const l1     = extraInputs.hra_received;
    const l2     = Math.max(0, extraInputs.rent_paid - basic * 0.10);
    const l3     = basic * (cityType === 'metro' ? 0.50 : 0.40);
    return Math.max(0, Math.min(l1, l2, l3));
  }, [value.salary, extraInputs.hra_received, extraInputs.rent_paid, cityType]);

  // Income source groups
  const ordinaryGroup = INCOME_SOURCES.filter(s =>
    ['salary','business','fno','freelance','rental','fd_interest','savings_int','dividends','other'].includes(s.key));
  const capitalGroup  = INCOME_SOURCES.filter(s =>
    ['ltcg_equity','stcg_equity','ltcg_debt','ltcg_property','ltcg_property_new'].includes(s.key));
  const specialGroup  = INCOME_SOURCES.filter(s =>
    ['agricultural','crypto'].includes(s.key));

  const _handleExtraChange = onExtraChange || (() => {});
  const _handleCityChange  = onCityChange  || (() => {});

  return (
    <div>
      {/* Entity type */}
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
            🏛️ HUF: same basic exemption (₹2.5L) as individual. No senior citizen benefit.
            HUF gets ₹50K savings interest exemption regardless of age.
          </div>
        )}
        {isSenior && entityType === 'individual' && (
          <div style={S.infoGreen}>
            ✅ Senior citizen (60+) — 80TTB ₹50K interest exemption auto-applied. Basic exemption ₹3L in old regime.
          </div>
        )}
      </div>

      {/* ── ORDINARY INCOME — custom per-card rendering ─────────────── */}
      <div style={S.section}>
        <div style={S.secTitle}>
          Ordinary Income
          <span style={S.secBadge('#9B72CF')}>Slab Rate</span>
        </div>
        <div style={S.grid}>
          {ordinaryGroup.map(src => (
            <OrdinaryCard
              key={src.key}
              src={src}
              isOn={!!expanded[src.key]}
              onToggle={toggleSrc}
              value={value}
              onChange={onChange}
              extraInputs={extraInputs}
              onExtraChange={_handleExtraChange}
              cityType={cityType}
              onCityChange={_handleCityChange}
            />
          ))}
        </div>
      </div>

      {/* ── CAPITAL GAINS ────────────────────────────────────────────── */}
      <SrcGroup
        title="Capital Gains" badge="Special Rates" badgeColor="#4A9EE8"
        sources={capitalGroup}
        expanded={expanded} onToggle={toggleSrc}
        value={value} onChange={onChange}
      />

      {/* ── SPECIAL INCOME ───────────────────────────────────────────── */}
      <SrcGroup
        title="Special Income" badge="Exempt / 30%" badgeColor="#E84040"
        sources={specialGroup}
        expanded={expanded} onToggle={toggleSrc}
        value={value} onChange={onChange}
      />

      {/* ── LOANS & DEDUCTIONS ───────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.secTitle}>
          Loans &amp; Deductions
          <span style={S.secBadge('#1DB873')}>Old Regime (except Business Loan)</span>
        </div>
        <div style={S.grid}>
          {LOAN_TYPES.map(loan => {
            const isOn = !!loanExpanded[loan.key];
            return (
              <div key={loan.key}>
                <div
                  style={S.srcCard(isOn)}
                  onClick={e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; toggleLoan(e, loan.key); }}
                >
                  <div style={S.srcIcon}>{loan.icon}</div>
                  <div style={S.srcLabel}>{loan.label}</div>
                  <div style={S.srcNote}>
                    {loan.section && <span style={{ color:'var(--gold)', fontWeight:600 }}>§ {loan.section} </span>}
                    {loan.note}
                  </div>
                  {isOn && (
                    <>
                      <SafeInput
                        inputValue={loanDeductions[loan.key]}
                        onUpdate={v => onLoanChange({ ...loanDeductions, [loan.key]: +v || 0 })}
                        placeholder={loan.limit ? `Max ${fmtINR(loan.limit)}/yr` : 'Annual amount (₹)'}
                      />
                      {/* EV loan eligibility checkbox */}
                      {loan.key === 'ev_loan_int' && (
                        <Toggle
                          on={!!extraInputs.ev_loan_eligible}
                          onToggle={() => _handleExtraChange({ ...extraInputs, ev_loan_eligible: !extraInputs.ev_loan_eligible })}
                          label="Loan sanctioned between Apr 2019 – Mar 2023 ✓"
                          color="var(--emerald)"
                        />
                      )}
                      {/* Patent registered checkbox */}
                      {loan.key === 'patent_royalty' && (
                        <Toggle
                          on={!!extraInputs.patent_registered}
                          onToggle={() => _handleExtraChange({ ...extraInputs, patent_registered: !extraInputs.patent_registered })}
                          label="I have a registered Indian patent ✓"
                          color="var(--emerald)"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CONTEXTUAL INFO BOXES ────────────────────────────────────── */}

      {(trackerDeductions.health80D > 0 || trackerDeductions.potential80C > 0) && (
        <div style={S.infoBox}>
          💡 <strong style={{ color:'var(--text)' }}>From your Expense Tracker: </strong>
          {trackerDeductions.health80D > 0 &&
            `${fmtINR(trackerDeductions.health80D)} health spending → auto-applied as 80D. `}
          {trackerDeductions.potential80C > 0 &&
            `${fmtINR(trackerDeductions.potential80C)} investment spending → verify against 80C.`}
        </div>
      )}

      {(loanDeductions.business_loan_int > 0) && (
        <div style={S.infoBox}>
          💼 Business loan interest {fmtINR(loanDeductions.business_loan_int)} deducted from business income — both regimes.
        </div>
      )}

      {extraInputs.opt_44ad && (
        <div style={S.infoGreen}>
          ✅ Sec 44AD active — Business income = {extraInputs.digital_receipts ? '6%' : '8%'} of gross turnover {fmtINR(value.business || 0)}.
          No books of accounts required.
        </div>
      )}

      {extraInputs.opt_44ada && (
        <div style={S.infoGreen}>
          ✅ Sec 44ADA active — Freelance income = 50% of gross receipts {fmtINR(value.freelance || 0)}.
          Eligible professions only (doctors, CAs, lawyers, engineers).
        </div>
      )}

      {hraExemptDisplay > 0 && (
        <div style={S.infoGreen}>
          🏠 HRA exemption (Sec 10(13A)): <strong style={{ color:'var(--text)' }}>{fmtINR(hraExemptDisplay)}</strong> exempt.
          Computed as least of: actual HRA ({fmtINR(extraInputs.hra_received)}),
          {cityType === 'metro' ? ' 50%' : ' 40%'} of basic, rent − 10% of basic.
        </div>
      )}

      {(loanDeductions.ev_loan_int > 0 && extraInputs.ev_loan_eligible) && (
        <div style={S.infoBox}>
          🚗 EV loan interest {fmtINR(Math.min(loanDeductions.ev_loan_int, 150_000))} → Sec 80EEB deduction (old regime, max ₹1.5L).
        </div>
      )}

      {(extraInputs.arrear_amount > 0) && (
        <div style={{ ...S.infoBox, background:'rgba(232,146,26,.1)' }}>
          📦 Arrear {fmtINR(extraInputs.arrear_amount)} from FY {extraInputs.arrear_fy || '2024-25'} detected.
          File <strong style={{ color:'var(--gold)' }}>Form 10E</strong> at incometax.gov.in BEFORE your ITR to claim Sec 89(1) relief.
        </div>
      )}

      {/* ── LIVE TAX PREVIEW ─────────────────────────────────────────── */}
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

          {/* Salary exemptions applied */}
          {(taxResult.hraExemption > 0 || taxResult.sec1014Exemption > 0) && (
            <div style={{ background:'rgba(29,184,115,.06)', border:'1px solid rgba(29,184,115,.2)', borderRadius:10, padding:'10px 14px', marginTop:10, fontSize:12, color:'var(--muted)' }}>
              ✅ Salary exemptions applied:
              {taxResult.hraExemption > 0 && ` HRA ${fmtINR(taxResult.hraExemption)}`}
              {taxResult.sec1014Exemption > 0 && ` · Children allowance ${fmtINR(taxResult.sec1014Exemption)}`}
            </div>
          )}

          {/* Special taxes breakdown */}
          {taxResult.specialTaxTotal > 0 && (
            <div style={{ background:'var(--bg3)', borderRadius:10, padding:'14px 16px', marginTop:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', marginBottom:10,
                            textTransform:'uppercase', letterSpacing:'0.5px' }}>Special Rate Taxes</div>
              {taxResult.ltcgEquityTax   > 0 && <div style={S.taxRow}><span>LTCG Equity 10% (above ₹1.25L)</span><span style={{ color:'#4A9EE8', fontWeight:700 }}>{fmtINR(taxResult.ltcgEquityTax)}</span></div>}
              {taxResult.stcgEquityTax   > 0 && <div style={S.taxRow}><span>STCG Equity 15% flat</span><span style={{ color:'#E8921A', fontWeight:700 }}>{fmtINR(taxResult.stcgEquityTax)}</span></div>}
              {taxResult.ltcgDebtTax     > 0 && <div style={S.taxRow}><span>LTCG Debt MF 20% (Sec 112)</span><span style={{ color:'#7c8cf8', fontWeight:700 }}>{fmtINR(taxResult.ltcgDebtTax)}</span></div>}
              {taxResult.ltcgPropertyTax > 0 && <div style={S.taxRow}><span>LTCG Property 20% (indexed)</span><span style={{ color:'#fb923c', fontWeight:700 }}>{fmtINR(taxResult.ltcgPropertyTax)}</span></div>}
              {taxResult.ltcgPropertyNewTax > 0 && <div style={S.taxRow}><span>LTCG Property 12.5% (post Jul 24)</span><span style={{ color:'#ffa726', fontWeight:700 }}>{fmtINR(taxResult.ltcgPropertyNewTax)}</span></div>}
              {taxResult.cryptoTax       > 0 && <div style={{ ...S.taxRow, borderBottom:'none' }}><span>Crypto 30% flat</span><span style={{ color:'#E84040', fontWeight:700 }}>{fmtINR(taxResult.cryptoTax)}</span></div>}
            </div>
          )}

          {/* Audit warning from F&O turnover */}
          {taxResult.auditRequired && (
            <div style={{ background:'rgba(232,64,64,.08)', border:'1px solid rgba(232,64,64,.3)', borderRadius:10, padding:'10px 14px', marginTop:10, fontSize:12, color:'var(--red)' }}>
              🚨 Tax audit required (Sec 44AB) based on your turnover. File by Sep 30. Consult a CA.
            </div>
          )}

          {/* Presumptive income note */}
          {taxResult.presumptive44ADIncome !== null && (
            <div style={S.infoGreen}>
              ✅ 44AD deemed income = {fmtINR(taxResult.presumptive44ADIncome)} ({extraInputs.digital_receipts ? '6%' : '8%'} of {fmtINR(value.business || 0)})
            </div>
          )}
          {taxResult.presumptive44ADAIncome !== null && (
            <div style={S.infoGreen}>
              ✅ 44ADA deemed income = {fmtINR(taxResult.presumptive44ADAIncome)} (50% of {fmtINR(value.freelance || 0)})
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

          {taxResult.rentalTaxable > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:10 }}>
              💡 Rental {fmtINR(value.rental)} → taxable {fmtINR(taxResult.rentalTaxable)} after 30% Sec 24 deduction.
            </div>
          )}
          {taxResult.agriIncome > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>
              🌾 Agricultural {fmtINR(taxResult.agriIncome)} is exempt but used for rate computation.
            </div>
          )}
          {taxResult.loanDeductionsUsed > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>
              🏠 {fmtINR(taxResult.loanDeductionsUsed)} loan deductions applied in old regime.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
