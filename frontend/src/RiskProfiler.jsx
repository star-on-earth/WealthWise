/**
 * RiskProfiler.jsx — v2
 * Replaces the 3-variable lookup with a proper 7-factor risk questionnaire.
 * Factors: age, occupation, savings rate, debt burden, dependents,
 *          investment horizon, and self-assessed risk tolerance.
 *
 * Scoring: 0–100. Thresholds unchanged so existing portfolio templates apply.
 * Export:
 *   default  — React questionnaire UI component
 *   named    — getRiskProfileFromAnswers() pure function (used in tests + App.jsx)
 *
 * IMPORTANT: onProfileDetermined receives { score, label, color, _answers }
 * so App.jsx can read back the raw answer values.
 */

import React, { useState } from 'react';

// ─── SCORING ENGINE ───────────────────────────────────────────────────────────

/**
 * Full 7-factor risk score.
 * All params except age and occupation now come from questionnaire answers.
 */
export function getRiskProfileFromAnswers({
  age,
  occupation,
  annualIncome,
  annualSavings,
  hasHighDebt,        // bool: EMI > 40% of monthly income
  dependents,         // number: 0 | 1 | 2 | 3+
  horizonYears,       // number: years before funds are needed
  selfRating,         // 1–5: self-assessed risk comfort
}) {
  let score = 0;

  // ── Factor 1: Age (0–30 pts) ────────────────────────────────────────────────
  if      (age < 25) score += 30;
  else if (age < 35) score += 25;
  else if (age < 45) score += 18;
  else if (age < 55) score += 10;
  else               score += 4;

  // ── Factor 2: Occupation stability (0–25 pts) ────────────────────────────────
  const LOW  = new Set(['Government Employee', 'PSU Employee', 'Retired']);
  const MID  = new Set(['Salaried (MNC/Private)', 'Doctor / Lawyer (Professional)']);
  const HIGH = new Set(['Self-Employed / Freelancer', 'Business Owner', 'Startup Founder']);
  if      (LOW.has(occupation))  score += 10;
  else if (MID.has(occupation))  score += 18;
  else if (HIGH.has(occupation)) score += 25;
  else                           score += 12;

  // ── Factor 3: Savings rate (0–20 pts) ────────────────────────────────────────
  const rate = annualIncome > 0 ? annualSavings / annualIncome : 0;
  if      (rate >= 0.40) score += 20;
  else if (rate >= 0.25) score += 14;
  else if (rate >= 0.10) score += 8;
  else                   score += 3;

  // ── Factor 4: Debt burden — REDUCES score (0 to -15 pts) ─────────────────────
  // High EMI load means less capacity to absorb portfolio losses.
  if (hasHighDebt) score -= 15;

  // ── Factor 5: Dependents — REDUCES score (0 to -10 pts) ──────────────────────
  if      (dependents >= 3) score -= 10;
  else if (dependents === 2) score -= 6;
  else if (dependents === 1) score -= 3;
  // 0 dependents: no penalty

  // ── Factor 6: Investment horizon (0–15 pts) ───────────────────────────────────
  if      (horizonYears >= 15) score += 15;
  else if (horizonYears >= 10) score += 12;
  else if (horizonYears >= 7)  score += 8;
  else if (horizonYears >= 3)  score += 4;
  else                         score += 0;

  // ── Factor 7: Self-assessed risk tolerance (0–10 pts) ────────────────────────
  // 1 = "I hate any loss", 5 = "Happy with high volatility for high returns"
  score += Math.round((selfRating - 1) * 2.5); // maps 1–5 → 0–10

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  if (score <= 30) return { score, label: 'Conservative',    color: '#4A9EE8' };
  if (score <= 52) return { score, label: 'Moderate',        color: '#E8921A' };
  if (score <= 70) return { score, label: 'Aggressive',      color: '#fb923c' };
  return               { score, label: 'Very Aggressive', color: '#E84040' };
}

// ─── QUESTIONNAIRE UI ────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'hasHighDebt',
    question: 'Are your total monthly EMIs more than 40% of your take-home pay?',
    options: [
      { label: 'No — debt is manageable',  value: false },
      { label: 'Yes — EMIs are a big chunk', value: true  },
    ],
  },
  {
    id: 'dependents',
    question: 'How many financial dependents do you have? (spouse, children, parents)',
    options: [
      { label: 'None',    value: 0 },
      { label: '1',       value: 1 },
      { label: '2',       value: 2 },
      { label: '3 or more', value: 3 },
    ],
  },
  {
    id: 'horizonYears',
    question: 'When do you expect to need this money?',
    options: [
      { label: 'Within 3 years',  value: 2  },
      { label: '3–7 years',       value: 5  },
      { label: '7–15 years',      value: 10 },
      { label: '15+ years',       value: 20 },
    ],
  },
  {
    id: 'selfRating',
    question: 'If your ₹10L portfolio dropped to ₹7L in a crash, you would:',
    options: [
      { label: 'Panic and sell everything',         value: 1 },
      { label: 'Feel anxious but probably hold',    value: 2 },
      { label: 'Stay calm and wait for recovery',   value: 3 },
      { label: 'Buy more at the lower price',       value: 4 },
      { label: 'Excited — buy aggressively',        value: 5 },
    ],
  },
];

const S = {
  wrap:     { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 20px', marginBottom: 16 },
  title:    { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  sub:      { fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 },
  q:        { marginBottom: 22 },
  qLabel:   { fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 },
  qNum:     { fontSize: 11, color: 'var(--gold)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  optRow:   { display: 'flex', gap: 8, flexWrap: 'wrap' },
  opt:      (sel) => ({
    padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13,
    border: sel ? '1px solid var(--gold)' : '1px solid var(--border)',
    background: sel ? 'rgba(232,146,26,.12)' : 'var(--bg3)',
    color: sel ? 'var(--gold)' : 'var(--muted)',
    fontFamily: 'var(--font-body)', transition: 'all .15s',
    flex: '1 1 auto', textAlign: 'center',
  }),
  progress: { height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' },
  progFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'var(--gold)', transition: 'width .4s' }),
  result:   (c) => ({ background: `${c}12`, border: `1px solid ${c}33`, borderRadius: 12, padding: '16px 18px', marginTop: 4 }),
  resLabel: { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  resVal:   (c) => ({ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: c }),
  resSub:   { fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 },
  scoreBar: { height: 6, borderRadius: 3, background: 'var(--border)', marginTop: 10, overflow: 'hidden' },
  scoreBarFill: (pct, c) => ({ height: '100%', width: `${pct}%`, background: c, transition: 'width .6s', borderRadius: 3 }),
  btn:      { background: 'linear-gradient(135deg,var(--gold),var(--goldDim))', color: '#000', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', marginTop: 8 },
  editBtn:  { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer', marginTop: 10, fontFamily: 'var(--font-body)' },
};

const PROFILE_DESCRIPTIONS = {
  'Conservative':    'Capital preservation first. Minimal equity exposure. Best for short horizons or high debt obligations.',
  'Moderate':        'Balanced growth with downside protection. Mix of equity and debt. Suitable for 5–10 year horizons.',
  'Aggressive':      'Growth-focused with equity majority. Comfortable holding through market corrections.',
  'Very Aggressive': 'Maximum growth potential with significant volatility. Long horizon and strong stomach required.',
};

export default function RiskProfiler({ age, occupation, annualIncome, annualSavings, onProfileDetermined }) {
  const [answers, setAnswers]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [profile, setProfile]   = useState(null);

  const answeredCount = Object.keys(answers).length;
  const allAnswered   = answeredCount === QUESTIONS.length;

  const setAnswer = (id, value) => setAnswers(prev => ({ ...prev, [id]: value }));

  const handleSubmit = () => {
    const result = getRiskProfileFromAnswers({
      age,
      occupation,
      annualIncome,
      annualSavings,
      hasHighDebt:  answers.hasHighDebt,
      dependents:   answers.dependents,
      horizonYears: answers.horizonYears,
      selfRating:   answers.selfRating,
    });
    setProfile(result);
    setSubmitted(true);
    if (onProfileDetermined) onProfileDetermined(result);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setProfile(null);
  };

  return (
    <div style={S.wrap}>
      <div style={S.title}>🎯 Risk Profile Assessment</div>
      <div style={S.sub}>
        4 quick questions to tailor your portfolio accurately.
        Age, occupation, and savings rate are already factored in from your profile.
      </div>

      {/* Progress bar */}
      <div style={S.progress}>
        <div style={S.progFill(submitted ? 100 : (answeredCount / QUESTIONS.length) * 100)} />
      </div>

      {!submitted ? (
        <>
          {QUESTIONS.map((q, qi) => (
            <div key={q.id} style={S.q}>
              <div style={S.qNum}>Question {qi + 1} of {QUESTIONS.length}</div>
              <div style={S.qLabel}>{q.question}</div>
              <div style={S.optRow}>
                {q.options.map(opt => (
                  <button
                    key={String(opt.value)}
                    style={S.opt(answers[q.id] === opt.value)}
                    onClick={() => setAnswer(q.id, opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            style={{ ...S.btn, opacity: allAnswered ? 1 : 0.4 }}
            disabled={!allAnswered}
            onClick={handleSubmit}
          >
            Calculate My Risk Profile →
          </button>
        </>
      ) : profile && (
        <div>
          <div style={S.result(profile.color)}>
            <div style={S.resLabel}>Your Risk Profile</div>
            <div style={S.resVal(profile.color)}>{profile.label}</div>
            <div style={S.resSub}>{PROFILE_DESCRIPTIONS[profile.label]}</div>
            <div style={S.scoreBar}>
              <div style={S.scoreBarFill(profile.score, profile.color)} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Score: {profile.score}/100 · Based on 7 factors including debt, dependents, and time horizon
            </div>
          </div>
          <button style={S.editBtn} onClick={handleReset}>← Retake questionnaire</button>
        </div>
      )}
    </div>
  );
}
