# 💰 WealthWise v5

> **India's most complete personal finance planner** — FY 2026-27 tax engine, 13 income sources, HUF support, per-asset post-tax CAGR, goal-aware portfolios, bank statement import (CSV + PDF for 8 banks), and Claude AI. Built with React + FastAPI + Firebase.

![Version](https://img.shields.io/badge/version-5.0-gold)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🪔 What is WealthWise?

WealthWise is a full-stack Indian personal finance PWA that:

- Computes exact income tax under both regimes (FY 2026-27) with 87A rebate, HUF support, agricultural income, rental deductions, loan deductions, and 13 income source types
- Profiles risk from age, occupation, savings ratio → Conservative / Moderate / Aggressive / Very Aggressive
- Generates 4 personalised portfolio allocations across 14 asset classes with **pre-tax AND post-tax CAGR per regime**
- Shows a **triple-line corpus projection** (pre-tax / new regime / old regime) for 10 or 20 years
- Adjusts portfolio suggestions **based on your financial goals**
- Lets you track monthly expenses with **budget alerts**, **recurring transactions**, and **edit any transaction**
- Imports bank statements from **CSV** (SBI Excel export, HDFC, ICICI) or **PDF** (SBI, KVB, HDFC, ICICI, Axis, Kotak, PNB, BOB)
- Auto-categorises 50+ merchant keywords including KIIT Hospitality, personal UPI → Misc
- Provides a **20-section IT Act deductions guide** with Section 54 LTCG callout
- All AI routed through **secure FastAPI backend** — Anthropic key never in browser

---

## 🗂️ Project Structure

```
wealthwise/
├── frontend/                        # React 18 + Vite
│   ├── public/
│   │   └── manifest.json            # PWA manifest (Android installable)
│   ├── src/
│   │   ├── App.jsx                  # Main app — 3-step flow, results, Section 54 callout
│   │   ├── IncomeForm.jsx           # Multi-source income with live tax preview
│   │   ├── Tracker.jsx              # Expense tracker — recurring, budget alerts,
│   │   │                            #   edit modal, CSV import, PDF import (8 banks)
│   │   ├── ITSections.jsx           # 20 IT Act sections + AI advisor per section
│   │   ├── Goals.jsx                # Goal setting + auto SIP calculator
│   │   ├── Scenarios.jsx            # What-if scenario planner
│   │   ├── Login.jsx                # Firebase Auth (Google + Email/Password)
│   │   ├── AuthContext.jsx          # Global auth state + Firestore sync
│   │   ├── firebase.js              # Firebase init + Firestore CRUD (incl. recurring, budgets)
│   │   ├── taxEngine.js             # Full tax engine (runs in browser — instant)
│   │   ├── api.js                   # Backend calls (no API key in frontend)
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Kuber/Laxmi theme (saffron gold, temple emerald)
│   ├── src/__tests__/
│   │   └── taxEngine.test.js        # 40+ Vitest unit tests for tax engine
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vitest.config.js             # Test runner config
│   ├── vercel.json                  # SPA routing fix for Vercel
│   └── .env.example
│
├── backend/                         # FastAPI + Python 3.11
│   ├── main.py                      # API routes, Claude proxy, structured logging
│   ├── tests/
│   │   └── test_main.py             # 30+ Pytest tests for all routes + tax engine
│   ├── requirements.txt
│   ├── Procfile                     # Railway startup
│   ├── runtime.txt                  # Pins Python 3.11
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## ✨ Features

### 🧾 Tax Engine — FY 2026-27

| Income Source | Tax Treatment |
|---|---|
| Salary / CTC | Std deduction ₹75K (new) / ₹50K (old) |
| Business / Freelance | Slab rate |
| Rental Income | 30% Sec 24 deduction auto-applied |
| FD / RD / Post Office Interest | Slab rate; TDS threshold noted |
| Savings Account Interest | 80TTA ₹10K / 80TTB ₹50K (60+); auto from age |
| Dividend Income | Slab rate above ₹5K |
| LTCG Equity / MF | 10% above ₹1.25L exemption (FY26-27) |
| STCG Equity / MF | 15% flat |
| LTCG Property / Gold | 20% with indexation |
| Agricultural Income | Exempt + partial integration for rate computation |
| Crypto / VDA | 30% flat + 1% TDS, no deductions |
| Other Income | Marginal slab rate |

- **HUF** entity type with ₹50K interest exemption
- **Loan deductions** panel: home loan (Sec 24b ₹2L), education loan (80E no cap), home loan principal (80C)
- **Tracker deductions**: health spending → 80D, investment spending → 80C hint (auto-applied)
- **Two regime slab rates** computed separately → genuinely different post-tax corpora
- **Section 87A rebate**: zero tax up to ₹12L net taxable income

### 📊 Asset Classes — Pre-Tax and Post-Tax CAGR

| Asset | Pre-Tax CAGR | Tax Rule | Post-Tax @ 30% Slab |
|---|---|---|---|
| PPF | 7.1% | Tax-Free (EEE) | 7.1% |
| Savings Account | 3.5% | Slab Rate | 2.45% |
| Fixed Deposit | 7.2% | Slab Rate | 5.04% |
| NPS | 11.0% | Partly Tax-Free | ~9.7% |
| Debt MF | 7.5% | Slab Rate | 5.25% |
| Digital Gold / ETF | 11.0% | LTCG 20% | 8.8% |
| SGB | 11.0% | Tax-Free (maturity) | 11.0% |
| ELSS | 14.0% | LTCG 10% | 12.6% |
| Index MF | 13.0% | LTCG 10% | 11.7% |
| Large Cap MF | 14.5% | LTCG 10% | 13.05% |
| Mid/Small Cap MF | 17.0% | LTCG 10% | 15.3% |
| Direct Stocks | 15.0% | LTCG 10% | 13.5% |
| Real Estate | 9.5% | LTCG 20% | 7.6% |
| Bitcoin / Crypto | 35.0% | 30% Flat | 24.5% |

### 💳 Expense Tracker (v5)

- **12 categories**: Rent/EMI, Food, Family, Transport, Utilities, Health, Education, Shopping, Investments, Insurance, Misc/Personal, Other
- **Recurring transactions**: set frequency (daily/weekly/monthly/yearly), auto-post on due date on app load
- **Edit any transaction**: ✏️ button opens inline modal; saves to Firestore
- **Budget alerts**: set monthly limit per category, yellow at 90%, red at exceeded
- **Pagination + filtering**: search, type, category, date range; load more in batches of 20
- **CSV export**: exports current filtered view with category labels
- **CSV import**: SBI Excel export, HDFC, ICICI with auto-detect + auto-categorise
- **PDF import**: 8 banks — SBI, KVB, HDFC, ICICI, Axis, Kotak, PNB, Bank of Baroda
- **Auto-categorisation**: 50+ merchant keywords (Zomato→Food, IRCTC→Transport, KIIT Hospitality→Food, personal UPI→Misc, etc.)
- **AI Savings Coach**: sends spending summary to Claude for personalised tips

### 🏠 Section 54 LTCG Callout

When a user enters property LTCG income, the Results page shows a highlighted callout explaining:
- Exact tax they'd save by reinvesting (Section 54 full exemption)
- Timeline: buy 1yr before / 2yr after sale, or construct within 3yr
- Capital Gains Account Scheme (CGAS) as interim parking
- Section 54EC bonds (NHAI/REC, up to ₹50L) as alternative

---

## 🔐 Security Model

```
Browser  →  POST /ai/*  →  FastAPI (Railway)  →  Anthropic Claude API
                ↕                    ↕
          Firebase Auth        ANTHROPIC_API_KEY
          Firestore DB         (env var only — never in frontend or GitHub)
```

- API key only in Railway environment variables
- Rate limiting: 10/min portfolio, 15/min tax advisor, 60/min /analyze (slowapi)
- CORS: only Vercel domain whitelisted
- Firestore rules: `request.auth.uid == userId` per user isolation
- Structured logging on backend: every request logged with method, path, status, response time

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- Python 3.11
- Git

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # add your ANTHROPIC_API_KEY
uvicorn main:app --reload       # http://localhost:8000
# Health check: curl http://localhost:8000/health
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env            # fill VITE_API_URL + Firebase vars
npm run dev                     # http://localhost:3000
```

### Run Tests
```bash
# Frontend (Vitest — 40+ tax engine tests)
cd frontend
npm install vitest @vitest/coverage-v8 jsdom --save-dev
npm run test

# Backend (Pytest — 30+ API + tax engine tests)
cd backend
pip install pytest httpx --break-system-packages
pytest tests/ -v
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

### Option A — Railway + Vercel (Current)

| Service | Provider | Cost |
|---|---|---|
| Frontend | Vercel Hobby | Free |
| Backend | Railway Hobby | $5 credit/month |
| Database + Auth | Firebase Spark | Free |
| AI API | Anthropic | ~₹0.50/100 calls |
| **Total** | | **₹0–₹67/month** |

**Deploy Backend (Railway):**
1. Push repo to GitHub
2. Railway → New Project → Deploy from GitHub → Root Directory: `backend`
3. Add env vars: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`
4. Auto-detects Python from `Procfile` + `runtime.txt`

**Deploy Frontend (Vercel):**
1. Vercel → New Project → import repo → Root Directory: `frontend`
2. Add all `VITE_*` env vars
3. Deploy

**Post-deploy:**
- Update Railway `ALLOWED_ORIGINS` with your Vercel URL
- Firebase → Authentication → Authorized Domains → add Vercel domain
- Set Anthropic spend cap at `console.anthropic.com`

---

### Option B — Render (Free Alternative to Railway)

Render's free tier works permanently with no credit card. Trade-off: service spins down after 15 minutes of inactivity (30-second cold start on first request).

**Step-by-step:**

1. Go to [render.com](https://render.com) → Sign Up with GitHub

2. Click **New → Web Service**

3. Connect your GitHub repository

4. Configure:
   - **Name**: `wealthwise-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

5. Add Environment Variables:
   ```
   ANTHROPIC_API_KEY = sk-ant-your-key-here
   ALLOWED_ORIGINS   = https://your-app.vercel.app
   ```

6. Click **Create Web Service** — Render builds and deploys automatically (~3 min)

7. Your backend URL will be `https://wealthwise-backend.onrender.com`

8. Update `VITE_API_URL` in Vercel to this URL

9. Update Firebase Authorized Domains with your Vercel URL

**Is it free permanently?** Yes — Render's free tier web services are permanently free. The only limitation is the spin-down after 15 minutes of no traffic. For a personal finance tool used occasionally this is acceptable. The first request after idle takes ~30 seconds; all subsequent requests are instant.

**To avoid spin-down** (optional): use [UptimeRobot](https://uptimerobot.com) (free) to ping your Render URL every 14 minutes — this keeps it warm at no cost.

---

## 🔄 Update Workflow

```bash
# Edit files → test locally → push
git add .
git commit -m "describe change"
git push
# Vercel + Railway/Render auto-deploy in ~2 minutes
```

### Updating Tax Rules (next Budget)
Edit `frontend/src/taxEngine.js` and `backend/main.py` → update slabs → push.

### Adding a New Page
1. Create `frontend/src/NewPage.jsx`
2. Import in `App.jsx`
3. Add to `NAV_ITEMS` array
4. Push

---

## 🐛 Bug Fixes Log

| Version | Bug | Fix |
|---|---|---|
| v4 | Cursor lost after 1 digit in income form | SafeInput + SrcGroup hoisted to module scope |
| v5 | SBI Excel CSV showed 0 transactions | Added fixed-column parser for merged-cell SBI export format |
| v5 | Same corpus for new/old regime | Each regime now gets its own marginal slab rate |

---

## 🛣️ Roadmap

| Feature | Priority |
|---|---|
| Live Nifty/Gold/Crypto prices (yfinance + CoinGecko) | High |
| Markets watchlist tab | High |
| Form 16 / AIS PDF upload with Claude document API | High |
| n8n automation for daily rate updates | Medium |
| Groq/Gemini API as free Claude alternative | Medium |
| Markowitz MPT portfolio optimisation (PyPortfolioOpt) | Low |
| Play Store release via Bubblewrap TWA | Low |

---

## 📚 References

- [Income Tax India — FY 2026-27](https://incometaxindia.gov.in)
- [AMFI India — Mutual Fund NAV](https://www.amfiindia.com)
- [RBI — PPF/SGB/FD rates](https://rbi.org.in)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [PDF.js](https://mozilla.github.io/pdf.js/)

---

## ⚖️ Disclaimer

WealthWise provides general financial information and tax estimates for educational purposes only. It is not a SEBI-registered advisor. Tax calculations are based on publicly available FY 2026-27 rules. Consult a qualified CA or financial advisor before making investment decisions.

---

<div align="center">Built by Avrrodeep Banerjee · WealthWise v5.0 · FY 2026-27</div>
