# 💰 WealthWise v5.2

> **India's most complete personal finance planner** — FY 2026-27 tax engine, 15 income sources, HRA exemption, presumptive taxation (44AD/44ADA), HUF support, per-asset post-tax CAGR, goal-aware portfolios, bank statement import (CSV + PDF for 8 banks), ITR filing guide, and Claude AI. Built with React + FastAPI + Firebase.

![Version](https://img.shields.io/badge/version-5.1-gold)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## 🪔 What is WealthWise?

WealthWise is a full-stack Indian personal finance PWA that:

- Computes exact income tax under both regimes (FY 2026-27) with 87A rebate, HUF support, agricultural income, rental deductions, loan deductions, **HRA exemption (Sec 10(13A))**, **children allowances (Sec 10(14))**, **presumptive taxation (44AD/44ADA)**, **EV loan (80EEB)**, **author royalty (80QQB)**, **patent royalty (80RRB)**, and 15 income source types
- Profiles risk from age, occupation, savings ratio → Conservative / Moderate / Aggressive / Very Aggressive
- Generates 4 personalised portfolio allocations across 14 asset classes with **pre-tax AND post-tax CAGR per regime**
- Shows a **triple-line corpus projection** (pre-tax / new regime / old regime) for 10 or 20 years
- Adjusts portfolio suggestions **based on your financial goals**
- Lets you track monthly expenses with **budget alerts**, **recurring transactions**, and **edit any transaction**
- Imports bank statements from **CSV** (SBI Excel export, HDFC, ICICI) or **PDF** (SBI, KVB, HDFC, ICICI, Axis, Kotak, PNB, BOB)
- Auto-categorises 50+ merchant keywords including KIIT Hospitality, personal UPI → Misc
- Provides a **comprehensive ITR filing guide** (AY 2027-28) with form determination, document checklist, schedule mapper, and step-by-step portal walkthrough
- Provides a **20-section IT Act deductions guide** with Section 54 LTCG callout, Sec 44AB audit warnings, and per-section AI advisor
- All AI routed through **secure FastAPI backend** — Anthropic key never in browser

---

## 🆕 What's New in v5.2

| Feature | Detail |
|---|---|
| **HRA Exemption (Sec 10(13A))** | 3-limit formula auto-computed — actual HRA, 50%/40% of basic (metro/non-metro), rent minus 10% of basic |
| **Children Allowances (Sec 10(14))** | ₹100/mo education + ₹300/mo hostel per child (max 2) — reduces taxable salary |
| **44AD Presumptive Business** | Toggle gross turnover → 8% (or 6% digital) auto-deemed as income; no books needed |
| **44ADA Presumptive Professionals** | Toggle gross receipts → 50% auto-deemed income for doctors, CAs, lawyers, engineers |
| **44AB Audit Warning** | Live F&O turnover field with audit threshold check (₹1Cr / ₹10Cr digital) |
| **Salary Arrears Relief (Sec 89(1))** | Arrear amount + FY field; Form 10E filing reminder |
| **EV Loan Deduction (80EEB)** | ₹1.5L limit on eligible EV loans (sanctioned Apr 2019–Mar 2023) |
| **Author Royalty (80QQB)** | ₹3L deduction for literary/artistic/scientific royalties |
| **Patent Royalty (80RRB)** | ₹3L deduction for registered Indian patent holders |
| **ITR Filing Guide** | Complete AY 2027-28 guide — form determination, document checklist, schedule mapper, 8-step portal walkthrough, deadlines + penalties, AI assistant |
| **Crash Fix (TDZ)** | `businessLoanInt` declared before `businessTaxable` — fixes temporal dead zone error |
| **Projection Fix** | Always projects 20yr — eliminates `₹undefinedL` on 20-year view |
| **LTCG Debt MF (Sec 112)** | New income type — 20% with indexation for pre-Apr 2023 debt MF/bonds |
| **LTCG Property Post Jul 2024** | 12.5% without indexation (Budget 2024 rule) handled as separate income type |

---

## 🗂️ Project Structure

```
wealthwise/
├── frontend/                        # React 18 + Vite
│   ├── public/
│   │   └── manifest.json            # PWA manifest (Android installable)
│   ├── src/
│   │   ├── App.jsx                  # Main app — 3-step flow, results, Section 54 callout
│   │   ├── IncomeForm.jsx           # Multi-source income with live tax preview,
│   │   │                            #   HRA/44AD/44ADA/loan sub-fields (v5.1)
│   │   ├── Tracker.jsx              # Expense tracker — recurring, budget alerts,
│   │   │                            #   edit modal, CSV import, PDF import (8 banks)
│   │   ├── ITSections.jsx           # 20 IT Act sections + AI advisor per section
│   │   ├── ITRFiling.jsx            # ITR filing guide — form picker, document
│   │   │                            #   checklist, schedule mapper, step-by-step (v5.1)
│   │   ├── Goals.jsx                # Goal setting + auto SIP calculator
│   │   ├── Scenarios.jsx            # What-if scenario planner
│   │   ├── Login.jsx                # Firebase Auth (Google + Email/Password)
│   │   ├── AuthContext.jsx          # Global auth state + Firestore sync
│   │   ├── firebase.js              # Firebase init + Firestore CRUD
│   │   │                            #   (transactions, recurring, budgets, goals)
│   │   ├── taxEngine.js             # Full tax engine (runs in browser — instant)
│   │   │                            #   HRA, 44AD, 44ADA, 80EEB, 80QQB, 80RRB (v5.1)
│   │   ├── api.js                   # Backend calls (no API key in frontend)
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Kuber/Laxmi theme (saffron gold, temple emerald)
│   ├── src/__tests__/
│   │   └── taxEngine.test.js        # 40+ Vitest unit tests for tax engine
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vitest.config.js
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
| Salary / CTC | Std deduction ₹75K (new) / ₹50K (old). HRA + children allowances auto-deducted (v5.1) |
| Business | Slab rate. 44AD presumptive: 8% / 6% digital of gross turnover (v5.1) |
| Freelance / Consulting | Slab rate. 44ADA presumptive: 50% of gross receipts for eligible professions (v5.1) |
| F&O Trading | Business income (slab rate). Audit threshold check on turnover (v5.1) |
| Rental Income | 30% Sec 24 deduction auto-applied |
| FD / RD / Post Office Interest | Slab rate; TDS threshold noted |
| Savings Account Interest | 80TTA ₹10K / 80TTB ₹50K (60+); auto from age |
| Dividend Income | Slab rate above ₹5K |
| LTCG Equity / MF | 10% above ₹1.25L exemption (FY26-27) |
| STCG Equity / MF | 15% flat |
| LTCG Debt MF / Bonds (Sec 112) | 20% with indexation for pre-Apr 2023 purchases (v5.1) |
| LTCG Property / Gold (Pre Jul 23, 2024) | 20% with indexation |
| LTCG Property / Gold (Post Jul 23, 2024) | 12.5% without indexation (Budget 2024) (v5.1) |
| Agricultural Income | Exempt + partial integration for rate computation |
| Crypto / VDA | 30% flat + 1% TDS, no deductions |
| Other Income | Marginal slab rate |

**Deductions available:**
- **New Regime**: Standard deduction ₹75K, Employer NPS 80CCD(2)
- **Old Regime**: 80C ₹1.5L, 80CCD(1B) NPS ₹50K, 80D health ₹25–50K, 80E education loan (no cap), Sec 24(b) home loan interest ₹2L, 80EEB EV loan ₹1.5L, 80QQB royalty ₹3L, 80RRB patent ₹3L (v5.1)
- **HUF**: Same slabs, ₹50K interest exemption regardless of age
- **Section 87A rebate**: Zero tax up to ₹12L net taxable (₹12.75L gross CTC)
- **Two regime slab rates** computed separately → genuinely different post-tax corpora

### 📊 Asset Classes — Pre-Tax and Post-Tax CAGR

| Asset | Pre-Tax CAGR | Tax Rule | Post-Tax @ 30% Slab |
|---|---|---|---|
| PPF | 7.1% | Tax-Free (EEE) | 7.1% |
| Savings Account | 3.5% | Slab Rate | 2.45% |
| Fixed Deposit | 7.2% | Slab Rate | 5.04% |
| NPS | 11.0% | Partly Tax-Free | ~9.7% |
| Debt MF | 7.5% | Slab Rate | 5.25% |
| Digital Gold / ETF | 11.0% | LTCG 12.5% (post Jul 24) | 9.63% |
| SGB | 11.0% | Tax-Free (maturity) | 11.0% |
| ELSS | 14.0% | LTCG 10% | 12.6% |
| Index MF | 13.0% | LTCG 10% | 11.7% |
| Large Cap MF | 14.5% | LTCG 10% | 13.05% |
| Mid/Small Cap MF | 17.0% | LTCG 10% | 15.3% |
| Direct Stocks | 15.0% | LTCG 10% | 13.5% |
| Real Estate | 9.5% | LTCG 20% (indexed) | 7.6% |
| Bitcoin / Crypto | 35.0% | 30% Flat | 24.5% |

### 💳 Expense Tracker

- **12 expense categories**: Rent/EMI, Food, Family, Transport, Utilities, Health, Education, Shopping, Investments, Insurance, Misc/Personal, Other
- **Recurring transactions**: set frequency (daily/weekly/monthly/yearly), auto-post on due date on app load
- **Edit any transaction**: ✏️ button opens inline modal; saves to Firestore
- **Budget alerts**: set monthly limit per category, yellow at 90%, red at exceeded
- **Pagination + filtering**: search, type, category, date range; load more in batches of 20
- **CSV export**: exports current filtered view with category labels
- **CSV import**: SBI Excel export, HDFC, ICICI with auto-detect + auto-categorise
- **PDF import**: 8 banks — SBI, KVB, HDFC, ICICI, Axis, Kotak, PNB, Bank of Baroda
- **Auto-categorisation**: 50+ merchant keywords (Zomato→Food, IRCTC→Transport, KIIT Hospitality→Food, personal UPI→Misc, etc.)
- **AI Savings Coach**: sends spending summary to Claude for personalised tips

### 🗂️ ITR Filing Guide (v5.1)

- **Auto ITR form determination**: picks ITR-1 / ITR-2 / ITR-3 / ITR-4 based on your income sources (F&O → ITR-3, capital gains → ITR-2, salary-only → ITR-1, 44ADA → ITR-4)
- **Dynamic document checklist**: shows only documents relevant to your income — salary Form 16, broker cap gain statements, crypto exchange history, audit reports, etc.
- **Schedule mapper**: maps each income source to the exact portal schedule (Schedule S, CG, HP, BP, OS, VDA, VI-A)
- **8-step portal walkthrough**: pre-filing verification → login → regime selection → schedule filling → deductions → tax payment → e-verification
- **Deadlines + penalty calculator**: July 31 primary, Sep 30 audit, Dec 31 belated, Sec 234F penalties, advance tax installment dates
- **AI filing assistant**: personalized to your income profile, answers filing-specific questions

### 🏠 Section 54 LTCG Callout

When a user enters property LTCG income, the Results page shows a highlighted callout explaining:
- Exact tax they'd save by reinvesting
- Sec 54: property → property (2yr purchase / 3yr construction)
- Sec 54F: any long-term asset → residential property (full proceeds)
- Sec 54EC: NHAI/REC bonds within 6 months (up to ₹50L)
- Note on Budget 2024 rule: post-Jul 23, 2024 properties taxed at 12.5% (no indexation)

---

## 🔐 Security Model

```
Browser  →  POST /ai/*  →  FastAPI (Railway/Render)  →  Anthropic Claude API
                ↕                      ↕
          Firebase Auth         ANTHROPIC_API_KEY
          Firestore DB          (env var only — never in frontend or GitHub)
```

- API key only in backend environment variables
- Rate limiting: 10/min portfolio explanations, 15/min tax advisor, 60/min /analyze (slowapi)
- CORS: only whitelisted origins (set via `ALLOWED_ORIGINS` env var)
- Firestore rules: `request.auth.uid == userId` per-user data isolation
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
# add your ANTHROPIC_API_KEY in .env file
uvicorn main:app --reload       # http://localhost:8000
# Health check: curl http://localhost:8000/health
```

### Frontend

```bash
cd frontend
npm install
# fill VITE_API_URL + Firebase vars in .env
npm run dev                     # http://localhost:5173
```

### Run Tests

```bash
# Frontend (Vitest — 40+ tax engine tests)
cd frontend
npm install vitest @vitest/coverage-v8 jsdom --save-dev
npm run test

# Backend (Pytest — 30+ API + tax engine tests)
cd backend
pip install pytest httpx
pytest tests/ -v
```

### Environment Variables

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**`backend/.env`**
```env
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_ORIGINS=http://localhost:5173
```

---

## ☁️ Deployment

### Option A — Railway + Vercel (Recommended)

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
3. Deploy → Vercel auto-handles SPA routing via `vercel.json`

**Post-deploy:**
- Update Railway `ALLOWED_ORIGINS` with your Vercel URL
- Firebase → Authentication → Authorized Domains → add Vercel URL

---

### Option B — Render (Free, No Credit Card)

Render's free tier works permanently. Trade-off: service spins down after 15 minutes idle (30-second cold start on first request).

1. [render.com](https://render.com) → New → Web Service → connect GitHub repo
2. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
3. Add env vars: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`
4. Update `VITE_API_URL` in Vercel to your Render URL

> **Tip**: Use [UptimeRobot](https://uptimerobot.com) (free) to ping your Render URL every 14 minutes to prevent spin-down.

---

## 🔄 Update Workflow

```bash
git add .
git commit -m "describe change"
git push
# Vercel + Railway/Render auto-deploy in ~2 minutes
```

### Updating Tax Rules (next Budget)
Edit `frontend/src/taxEngine.js` and `backend/main.py` → update slabs → run tests → push.

### Adding a New Page
1. Create `frontend/src/NewPage.jsx`
2. Import in `App.jsx`
3. Add to `NAV_ITEMS` array in `App.jsx`
4. Add route condition in the secondary routes section
5. Push

---

## 🧪 Tax Engine Test Coverage

The frontend tax engine (`taxEngine.js`) has 40+ unit tests covering:

| Test Suite | What's Tested |
|---|---|
| New Regime 87A Rebate | Zero tax at ₹12L, ₹12.75L gross; tax above ₹13L |
| New Regime Slabs | 5%, 10%, 20%, 30% slab boundary conditions |
| Old Regime | ₹5L zero tax, ₹8L payable, slab comparison |
| `computeMultiIncomeTax` | Salary, rental 30% deduction, savings 80TTA/TTB, LTCG ₹1.25L exemption, STCG 15%, crypto 30%, agri integration, HUF entity |
| Marginal Rate | All slab boundaries for both regimes |
| `postTaxCAGR` | PPF (tax-free), Bitcoin (30%), ELSS (10%), FD (slab), SGB (tax-free) |
| Risk Profiler | Young aggressive, senior conservative, mid-career moderate |
| Portfolio Generator | 4 portfolios, 100% alloc sum, regime-specific CAGR, no Bitcoin in Conservative |
| `fmtINR` | Crores, lakhs, thousands, small amounts, zero |

---

## 🐛 Bug Fixes Log

| Version | Bug | Fix |
|---|---|---|
| v4 | Cursor lost after 1 digit in income form | `SafeInput` + `SrcGroup` hoisted to module scope in `IncomeForm.jsx` |
| v5 | SBI Excel CSV showed 0 transactions | Added fixed-column parser for merged-cell SBI export format |
| v5 | Same corpus for new/old regime | Each regime now gets its own marginal slab rate |
| v5.1 | Crash on load: `businessLoanInt is not defined` | Declared before `businessTaxable` — fixes temporal dead zone (TDZ) |
| v5.1 | `₹undefinedL` on 20-year projection view | `projectNetWorth` defaults to 20yr; `handleAnalyze` always projects 20yr |
| v5.1 | HRA not reducing taxable income | `applyExtraAdjustments` applied consistently in both `IncomeForm` preview and `handleAnalyze` |
| v5.1 | Focus lost mid-typing in 44AD/HRA sub-fields | `SafeInput` local state + `onBlur` sync pattern extended to all new sub-fields |

---

## 🛣️ Roadmap

| Feature | Priority |
|---|---|
| Live Nifty / Gold / Crypto prices (yfinance + CoinGecko) | High |
| Markets watchlist tab | High |
| Form 16 / AIS PDF upload with Claude document API | High |
| SIP step-up calculator in Goals (linked to Scenarios) | Medium |
| n8n automation for daily rate updates | Medium |
| Groq / Gemini API as free Claude alternative | Medium |
| Advance tax challan auto-reminder (Firebase Cloud Messaging) | Medium |
| Markowitz MPT portfolio optimisation (PyPortfolioOpt) | Low |
| Play Store release via Bubblewrap TWA | Low |

---

## 📚 References

- [Income Tax India — FY 2026-27](https://incometaxindia.gov.in)
- [CBDT — Tax Slabs & Notifications](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1)
- [AMFI India — Mutual Fund NAV](https://www.amfiindia.com)
- [RBI — PPF / SGB / FD rates](https://rbi.org.in)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [PDF.js](https://mozilla.github.io/pdf.js/)

---

## ⚖️ Disclaimer

WealthWise provides general financial information and tax estimates for educational purposes only. It is not a SEBI-registered advisor. Tax calculations are based on publicly available FY 2026-27 rules and may not account for all individual circumstances. Consult a qualified CA or financial advisor before making investment or tax decisions.

---

<div align="center">

Built by Avrrodeep Banerjee · WealthWise v5.2 · FY 2026-27

</div>
