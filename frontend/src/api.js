/**
 * api.js — WealthWise v3
 * All backend calls. No API key here.
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

/**
 * Full savings analysis with multi-income support.
 * profile: { incomes: {salary, rental, fd_interest, ...}, annual_savings, age, gender, occupation, is_senior }
 */
export async function analyze(profile) {
  return post('/analyze', profile);
}

/**
 * AI portfolio explanation (key stays on server).
 * Includes post-tax CAGR context and marginal slab rate.
 */
export async function aiExplainPortfolio({ profile, portfolioName, portfolioAssets, riskLabel, marginalSlabRate }) {
  return post('/ai/explain-portfolio', {
    profile,
    portfolio_name:   portfolioName,
    portfolio_assets: portfolioAssets,
    risk_label:       riskLabel,
    marginal_slab_rate: marginalSlabRate || 0.30,
  });
}

/** AI free-form tax advisor */
export async function aiTaxAdvisor({ question, userProfile }) {
  return post('/ai/tax-advisor', { question, user_profile: userProfile });
}

/** Health check */
export async function healthCheck() {
  return get('/health');
}
