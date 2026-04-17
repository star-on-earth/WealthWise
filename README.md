# 💰 WealthWise

> **India's most complete personal finance planner** — FY 2026-27 tax engine, multi-source income, per-asset post-tax CAGR, goal-aware portfolios, and Claude AI explanations. Built with React + FastAPI + Firebase.

![Version](https://img.shields.io/badge/version-4.0-gold)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🪔 What is WealthWise?

WealthWise is a full-stack Indian personal finance web app that:

- Computes your exact income tax under both **New and Old Regime (FY 2026-27)** with 87A rebate, HUF support, agricultural income, rental deductions, and loan deductions
- Profiles your risk tolerance from age, occupation, and savings ratio
- Generates **3–5 personalised portfolio allocations** across 12 Indian asset classes, each with **pre-tax and post-tax CAGR** per regime
- Shows a **triple-line corpus projection** (pre-tax / new regime / old regime) for 10 or 20 years
- Adjusts portfolio suggestions **based on your financial goals**
- Lets you track monthly expenses and auto-calculate annual savings
- Provides a **20-section IT Act deductions guide** with an AI tax advisor
- All AI explanations are routed through a **secure FastAPI backend proxy** — your Anthropic API key is never exposed to the browser

---

## 🗂️ Project Structure

```
wealthwise/
├── frontend/                   # React + Vite
│   ├── public/
│   │   └── manifest.json       # PWA manifest
│   ├── src/
│   │   ├── App.jsx             # Main app — 3-step flow, bottom nav, results
│   │   ├── IncomeForm.jsx      # Multi-source income input with live tax preview
│   │   ├── ITSections.jsx      # 20 IT Act deduction sections + AI advisor
│   │   ├── Tracker.jsx         # Monthly expense/income tracker with Firestore sync
│   │   ├── Goals.jsx           # Goal setting with auto SIP calculator
│   │   ├── Scenarios.jsx       # What-if scenario planner
│   │   ├── Login.jsx           # Firebase Auth (Google + Email/Password)
│   │   ├── AuthContext.jsx     # Global auth state + Firestore profile sync
│   │   ├── firebase.js         # Firebase init + Firestore helpers
│   │   ├── taxEngine.js        # Full tax engine (runs in browser — instant)
│   │   ├── api.js              # All backend calls (no API key in frontend)
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Kuber/Laxmi theme — saffron gold, temple emerald
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json             # SPA routing fix for Vercel
│   └── .env.example
│
├── backend/                    # FastAPI + Python 3.11
│   ├── main.py                 # API routes, Claude proxy, rate limiting
│   ├── requirements.txt
│   ├── Procfile                # Railway startup command
│   ├── runtime.txt             # Pins Python 3.11 on Railway
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## ✨ Features

### 🧾 Tax Engine — FY 2026-27
- **New Regime slabs**: 0% → 5% → 10% → 15% → 20% → 25% → 30%
- **87A rebate**: zero tax up to ₹12L net income
- **Old Regime** with 80C (₹1.5L), 80D (₹25K/50K), 80CCD(1B) (₹50K NPS), 24(b) home loan, HRA, LTA
- **Senior citizen** auto-detected from age → 80TTB ₹50K exemption, ₹3L basic exemption in old regime
- **HUF** entity type with separate computation
- **Agricultural income**: exempt but included in rate computation (partial integration method)
- **Loan deductions** panel for home loan, education loan, EV loan, etc.
- **Two regime slab rates** computed separately → different post-tax corpora

### 💼 Multi-Source Income (13 Types)
| Source | Tax Treatment |
|--------|--------------|
| Salary / CTC | Standard deduction ₹75K (new) / ₹50K (old) |
| Business Profit | Slab rate |
| Freelance / Consulting | Slab rate |
| Rental Income | 30% Sec 24 deduction auto-applied |
| FD / RD / Post Office Interest | Slab rate; TDS threshold noted |
| Savings Account Interest | 80TTA ₹10K / 80TTB ₹50K (senior) |
| Dividend Income | Slab rate above ₹5K |
| LTCG Equity | 10% above ₹1.25L exemption |
| STCG Equity | 15% flat |
| LTCG Property | 20% |
| Agricultural Income | Exempt (rate computation only) |
| Crypto / VDA | 30% flat, no deductions |
| Other Income | Marginal slab rate |

### 📊 Asset Allocation (12 Asset Classes)
Each asset shows pre-tax CAGR → post-tax CAGR (new regime) / post-tax CAGR (old regime):

| Asset | CAGR | Tax Rule | Post-Tax @ 30% |
|-------|------|----------|----------------|
| PPF | 7.1% | Tax-Free | 7.1% |
| FD | 7.0% | Slab Rate | 4.9% |
| NPS | 11.0% | Partially Tax-Free | ~9.7% |
| ELSS | 14.0% | LTCG 10% | 12.6% |
| Index MF (Nifty 50) | 13.0% | LTCG 10% | 11.7% |
| SGB | 11.0% | Tax-Free on maturity | 11.0% |
| Savings Account | 3.5% | Slab Rate | 2.45% |
| Mid/Small Cap MF | 17.0% | LTCG 10% | 15.3% |
| Real Estate | 9.0% | LTCG 20% | 7.2% |
| Bitcoin / Crypto | 40.0% | 30% flat | 28.0% |
| Direct Stocks | 15.0% | LTCG 10% | 13.5% |
| Debt MF | 7.5% | Slab Rate | 5.25% |

### 🎯 Other Features
- **Risk Profiler**: scoring heuristic (age + occupation + savings ratio → Conservative / Moderate / Aggressive / Very Aggressive)
- **Goal-Aware Portfolio**: goals from the Goals tab shift allocations toward safer/liquid instruments for near-term targets
- **Savings Toggle**: manual input or auto-calculated from Expense Tracker (partial year extrapolated to 12 months)
- **Scenario Planner**: 4 presets + custom inputs, side-by-side 20-year projection
- **Expense Tracker**: categories including Family, with §80D and §80C badges on qualifying spending. Syncs to Firestore.
- **IT Sections Guide**: 20 sections (80C through 54EC) with limits, conditions, regime applicability, pro tips, and per-section AI advisor
- **Kuber/Laxmi Theme**: saffron gold (#E8921A), midnight maroon background, temple emerald (#1DB873)

---

## 🔐 Security Model

```
Browser → POST /ai/explain-portfolio → FastAPI (Railway)
                                              ↓
                                    ANTHROPIC_API_KEY (env var only)
                                              ↓
                                       Anthropic API
```

- API key **only in Railway environment variables** — never in frontend code or GitHub
- **Rate limiting**: 10 AI requests/minute per IP via slowapi
- **CORS**: only your Vercel domain is whitelisted
- **Firestore rules**: users can only read/write their own data (`request.auth.uid == userId`)
- `.env` files are gitignored — only `.env.example` is committed

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- Python 3.11
- Git

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in ANTHROPIC_API_KEY
uvicorn main:app --reload       # runs on :8000
```

Health check: `http://localhost:8000/health` → `{"status":"ok"}`

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env            # fill in VITE_API_URL + Firebase vars
npm run dev                     # runs on :3000
```

### Environment Variables

**`frontend/.env`**
```
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**`backend/.env`**
```
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_ORIGINS=http://localhost:3000
```

---

## ☁️ Deployment

### Infrastructure
| Service | Provider | Cost |
|---------|----------|------|
| Frontend | Vercel | Free |
| Backend | Railway | ~$5 credit/month |
| Database + Auth | Firebase | Free tier |
| **Total** | | **₹0/month** at low traffic |

### Deploy Backend (Railway)
1. Push repo to GitHub (private)
2. Railway → New Project → Deploy from GitHub → set Root Directory to `backend`
3. Add environment variables: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`
4. Railway auto-detects Python from `Procfile` and `runtime.txt` (pinned to 3.11)
5. Generate domain → test `/health`

### Deploy Frontend (Vercel)
1. Vercel → New Project → import repo → Root Directory: `frontend`
2. Add all `VITE_*` environment variables
3. Deploy → get your `*.vercel.app` URL

### Post-Deploy Steps
- Update Railway `ALLOWED_ORIGINS` to include your Vercel URL
- Firebase → Authentication → Authorized Domains → add your Vercel domain
- Set an Anthropic spend limit at `console.anthropic.com` (recommended: $5/month)

---

## 🔄 Update Workflow

```bash
# 1. Edit files in VS Code
# 2. Test locally
# 3. Push
git add .
git commit -m "describe what changed"
git push
# Vercel and Railway auto-deploy in ~2 minutes
```

### Updating Tax Rules (e.g. next Budget)
Edit `frontend/src/taxEngine.js` and `backend/main.py` → update slabs/limits → push.

### Adding a New Page
1. Create `frontend/src/NewPage.jsx`
2. Import it in `App.jsx`
3. Add entry to `NAV_ITEMS` array in `App.jsx`
4. Push → auto-deployed

---

## 🐛 Known Bug Fixes (v4)

**IncomeForm cursor loss + scroll-to-top**: `SafeInput` and `SrcGroup` were defined *inside* the `IncomeForm` component function. Every keystroke caused the parent to re-render, React saw new function references, treated them as brand-new component types, unmounted the old input, and mounted a fresh one — destroying focus and triggering a layout recalculation that scrolled the page to the top. **Fix**: both components hoisted to module scope (outside the function).

---

## 🛣️ Roadmap

| Feature | Priority | Effort |
|---------|----------|--------|
| Live Nifty/Gold/Crypto prices via yfinance + CoinGecko | High | 1 day |
| Markets watchlist tab | High | 2 days |
| n8n automation for daily rate updates | Medium | 1 day |
| Form 16 / AIS PDF upload with Claude document API | Medium | 3 days |
| Groq/Gemini API as free Claude alternative | Low | 4 hours |
| Markowitz MPT portfolio optimisation (PyPortfolioOpt) | Low | 1 week |
| DigitalOcean migration for open-source LLM | Low | 2 days |
| Play Store release via Bubblewrap TWA | Low | 1 day |

---

## 📚 References

- [Income Tax India — FY 2026-27 slabs](https://incometaxindia.gov.in)
- [AMFI India — Mutual Fund NAV API](https://www.amfiindia.com)
- [RBI — PPF/SGB/FD rates](https://rbi.org.in)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Railway Deployment](https://railway.app)
- [Vercel Documentation](https://vercel.com/docs)

---

## ⚖️ Disclaimer

WealthWise provides general financial information and tax estimates for educational purposes only. It is not a SEBI-registered advisor. Tax calculations are based on publicly available FY 2026-27 rules and may not account for every individual circumstance. Consult a qualified CA or financial advisor before making investment decisions.

---

<div align="center">Built by Avrrodeep Banerjee · KIIT University · 2025</div>
