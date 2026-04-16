/**
 * api.js — All backend calls go through here.
 * The Anthropic API key NEVER touches the frontend.
 * This file talks to YOUR backend (Railway/Render), which holds the key.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

/** Full savings analysis — tax + risk + portfolios */
export async function analyze(profile) {
  return post('/analyze', profile);
}

/** AI explanation for a specific portfolio (key stays on server) */
export async function aiExplainPortfolio({ profile, portfolioName, portfolioAssets, riskLabel }) {
  return post('/ai/explain-portfolio', { profile, portfolio_name: portfolioName, portfolio_assets: portfolioAssets, risk_label: riskLabel });
}

/** AI tax advisor — free-form question (key stays on server) */
export async function aiTaxAdvisor({ question, userProfile }) {
  return post('/ai/tax-advisor', { question, user_profile: userProfile });
}

/** Quick tax breakdown for a given income */
export async function getTaxInfo(income) {
  return get(`/tax/${income}`);
}

/** Health check */
export async function healthCheck() {
  return get('/health');
}
