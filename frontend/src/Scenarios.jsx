/**
 * Scenarios.jsx
 * "What If" scenario planner.
 * Two side-by-side scenarios with live projection charts.
 * Compare: different savings amounts, CAGR assumptions, start ages, yearly step-ups.
 */

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmtINR } from './taxEngine.js';

// ─── PROJECTION ENGINE ────────────────────────────────────────────────────────

function project({ annualSavings, cagrPct, years, stepUpPct = 0 }) {
  const r = cagrPct / 100;
  const g = stepUpPct / 100; // annual savings step-up
  let corpus = 0;
  let saving  = annualSavings;
  const data = [{ year: 0, value: 0, savings: 0 }];
  for (let i = 1; i <= years; i++) {
    corpus = corpus * (1 + r) + saving;
    data.push({
      year: i,
      value:   Math.round(corpus / 100_000),  // in lakhs
      savings: Math.round((annualSavings * i * (1 + g * (i-1)/2)) / 100_000),
    });
    saving *= (1 + g);
  }
  return data;
}

// ─── PRESET COMPARISONS ──────────────────────────────────────────────────────

const PRESETS = [
  {
    label: 'Early vs Late Start',
    a: { label: 'Start at 25', annualSavings: 120000, cagrPct: 13, years: 35, stepUpPct: 0 },
    b: { label: 'Start at 35', annualSavings: 120000, cagrPct: 13, years: 25, stepUpPct: 0 },
  },
  {
    label: 'SIP Step-up Effect',
    a: { label: 'Flat ₹1L/yr',         annualSavings: 100000, cagrPct: 13, years: 20, stepUpPct: 0  },
    b: { label: '₹1L/yr + 10% step-up', annualSavings: 100000, cagrPct: 13, years: 20, stepUpPct: 10 },
  },
  {
    label: 'Conservative vs Aggressive',
    a: { label: 'FD / PPF (7%)',    annualSavings: 150000, cagrPct: 7,  years: 20, stepUpPct: 0 },
    b: { label: 'Index MF (13%)',   annualSavings: 150000, cagrPct: 13, years: 20, stepUpPct: 0 },
  },
  {
    label: 'Save More vs Invest Smarter',
    a: { label: '₹2L/yr at 7%',  annualSavings: 200000, cagrPct: 7,  years: 20, stepUpPct: 0 },
    b: { label: '₹1L/yr at 15%', annualSavings: 100000, cagrPct: 15, years: 20, stepUpPct: 0 },
  },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  wrap:   { maxWidth: 800, margin: '0 auto', padding: '24px 20px 32px' },
  h2:     { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
  sub:    { color: 'var(--muted)', fontSize: 14, marginBottom: 22, lineHeight: 1.5 },
  card:   { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 20px', marginBottom: 16 },
  title:  { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 },
  grid2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
  label:  { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' },
  input:  { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', transition: 'border-color .2s' },
  kpiRow: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  kpi:    c => ({ flex: 1, minWidth: 100, background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 10, padding: '10px 14px' }),
  kpiL:   { fontSize: 11, color: 'var(--muted)', marginBottom: 3 },
  kpiV:   c => ({ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: c }),
  presetRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  preset:    a => ({ padding: '7px 14px', borderRadius: 20, border: a ? '1px solid var(--gold)' : '1px solid var(--border)', background: a ? 'rgba(240,180,41,.12)' : 'var(--bg3)', color: a ? 'var(--gold)' : 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }),
  scenarioHeader: c => ({ background: `${c}18`, border: `1px solid ${c}33`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }),
  vs: { textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--muted)', padding: '8px 0' },
  winBadge: c => ({ display: 'inline-block', fontSize: 11, fontWeight: 700, color: c, background: `${c}20`, border: `1px solid ${c}44`, borderRadius: 20, padding: '2px 8px', marginLeft: 8 }),
  tooltipBox: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 13px', fontSize: 12 },
};

const COLORS = { a: '#f0b429', b: '#10d97e' };

const ScenarioInput = ({ label, color, vals, onChange }) => {
  const focusGold = e => e.target.style.borderColor = color;
  const blurReset = e => e.target.style.borderColor = 'var(--border)';
  const set = k => e => onChange({ ...vals, [k]: +e.target.value || 0 });

  return (
    <div>
      <div style={S.scenarioHeader(color)}>
        <input
          style={{ ...S.input, background: 'transparent', border: 'none', padding: '0', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color }}
          value={vals.label}
          onChange={e => onChange({ ...vals, label: e.target.value })}
        />
      </div>
      {[
        { key: 'annualSavings', label: 'Annual Savings (₹)', placeholder: '120000' },
        { key: 'cagrPct',       label: 'Expected CAGR (%)',   placeholder: '13'     },
        { key: 'years',         label: 'Years to invest',     placeholder: '20'     },
        { key: 'stepUpPct',     label: 'Annual Step-up (%)',  placeholder: '0'      },
      ].map(f => (
        <div key={f.key} style={{ marginBottom: 10 }}>
          <label style={S.label}>{f.label}</label>
          <input style={S.input} type="number" placeholder={f.placeholder}
            value={vals[f.key] || ''} onChange={set(f.key)}
            onFocus={focusGold} onBlur={blurReset} />
        </div>
      ))}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={S.tooltipBox}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Year {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: ₹{p.value}L
        </div>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Scenarios() {
  const [activePreset, setActivePreset] = useState(null);
  const [scenA, setSceA] = useState({ label: 'Scenario A', annualSavings: 120000, cagrPct: 7,  years: 20, stepUpPct: 0 });
  const [scenB, setSceB] = useState({ label: 'Scenario B', annualSavings: 120000, cagrPct: 13, years: 20, stepUpPct: 0 });

  const applyPreset = (p) => {
    setActivePreset(p.label);
    setSceA(p.a); setSceB(p.b);
  };

  const yearsA = Math.max(1, Math.min(40, scenA.years || 20));
  const yearsB = Math.max(1, Math.min(40, scenB.years || 20));
  const projA  = useMemo(() => project({ ...scenA, years: yearsA }), [scenA, yearsA]);
  const projB  = useMemo(() => project({ ...scenB, years: yearsB }), [scenB, yearsB]);

  const finalA = projA[projA.length - 1]?.value || 0;
  const finalB = projB[projB.length - 1]?.value || 0;
  const winner = finalA >= finalB ? 'a' : 'b';

  // Merge both projections for combined chart (up to max years)
  const maxYears = Math.max(yearsA, yearsB);
  const combined = Array.from({ length: maxYears + 1 }, (_, i) => ({
    year: i,
    [scenA.label]: projA[i]?.value ?? null,
    [scenB.label]: projB[i]?.value ?? null,
  }));

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>🔮 What-If Scenario Planner</h2>
      <p style={S.sub}>
        Compare two investment paths side by side. Adjust savings, returns, and timeline to see the long-term impact of every decision.
      </p>

      {/* Presets */}
      <div style={S.card}>
        <div style={S.title}>Quick Comparisons</div>
        <div style={S.presetRow}>
          {PRESETS.map(p => (
            <button key={p.label} style={S.preset(activePreset === p.label)} onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
          <button style={S.preset(false)} onClick={() => { setActivePreset(null); setSceA({ label: 'Scenario A', annualSavings: 120000, cagrPct: 7, years: 20, stepUpPct: 0 }); setSceB({ label: 'Scenario B', annualSavings: 120000, cagrPct: 13, years: 20, stepUpPct: 0 }); }}>
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Input panels */}
      <div style={S.card}>
        <div style={S.title}>Configure Scenarios</div>
        <div style={S.grid2}>
          <ScenarioInput label="A" color={COLORS.a} vals={scenA} onChange={setSceA} />
          <ScenarioInput label="B" color={COLORS.b} vals={scenB} onChange={setSceB} />
        </div>

        {/* KPI comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <div style={S.kpi(COLORS.a)}>
            <div style={S.kpiL}>Final Corpus ({scenA.label})</div>
            <div style={S.kpiV(COLORS.a)}>₹{finalA}L
              {winner === 'a' && <span style={S.winBadge(COLORS.a)}>BETTER</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Total invested: ₹{projA[projA.length-1]?.savings || 0}L
            </div>
          </div>

          <div style={S.vs}>VS</div>

          <div style={S.kpi(COLORS.b)}>
            <div style={S.kpiL}>Final Corpus ({scenB.label})</div>
            <div style={S.kpiV(COLORS.b)}>₹{finalB}L
              {winner === 'b' && <span style={S.winBadge(COLORS.b)}>BETTER</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Total invested: ₹{projB[projB.length-1]?.savings || 0}L
            </div>
          </div>
        </div>

        {/* Difference callout */}
        <div style={{ marginTop: 14, background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          {winner === 'a' ? scenA.label : scenB.label} generates{' '}
          <strong style={{ color: winner === 'a' ? COLORS.a : COLORS.b }}>
            ₹{Math.abs(finalA - finalB)}L more
          </strong>{' '}
          by the end of the period.{' '}
          {finalA !== finalB && (
            <span>
              That's a <strong style={{ color: 'var(--text)' }}>
                {((Math.abs(finalA - finalB) / Math.min(finalA, finalB)) * 100).toFixed(0)}%
              </strong> difference in final wealth.
            </span>
          )}
        </div>
      </div>

      {/* Combined chart */}
      <div style={S.card}>
        <div style={S.title}>📈 Wealth Growth Comparison</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={combined}>
            <defs>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.a} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLORS.a} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.b} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLORS.b} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Years', position: 'insideBottom', offset: -2, fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}L`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey={scenA.label} stroke={COLORS.a} strokeWidth={2} fill="url(#gA)" connectNulls />
            <Area type="monotone" dataKey={scenB.label} stroke={COLORS.b} strokeWidth={2} fill="url(#gB)" connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Year milestones table */}
      <div style={S.card}>
        <div style={S.title}>📅 Milestone Snapshots</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Year', `${scenA.label} (₹L)`, `${scenB.label} (₹L)`, 'Difference'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, textAlign: 'left', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[5, 10, 15, 20, 25, 30].filter(y => y <= maxYears).map(y => {
                const a = projA[y]?.value ?? '—';
                const b = projB[y]?.value ?? '—';
                const diff = (typeof a === 'number' && typeof b === 'number') ? b - a : null;
                return (
                  <tr key={y} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 12px', color: 'var(--muted)' }}>Yr {y}</td>
                    <td style={{ padding: '9px 12px', color: COLORS.a, fontWeight: 700 }}>{typeof a === 'number' ? `₹${a}L` : a}</td>
                    <td style={{ padding: '9px 12px', color: COLORS.b, fontWeight: 700 }}>{typeof b === 'number' ? `₹${b}L` : b}</td>
                    <td style={{ padding: '9px 12px', color: diff > 0 ? COLORS.b : diff < 0 ? COLORS.a : 'var(--muted)', fontWeight: 700 }}>
                      {diff !== null ? `${diff > 0 ? '+' : ''}₹${diff}L` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, paddingTop: 8 }}>
        ⚠️ Projections are illustrative. Actual returns vary. Past performance is not indicative of future results.
      </div>
    </div>
  );
}
