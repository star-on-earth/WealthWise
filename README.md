# 💰 WealthWise v5.3

> **India's most complete personal finance planner** — FY 2026-27 tax engine, 15 income sources, HRA exemption, presumptive taxation (44AD/44ADA), HUF support, per-asset post-tax CAGR, goal-aware portfolios, bank statement import (CSV + PDF for 8 banks), ITR filing guide, and Claude AI. Built with React + FastAPI + Firebase.

![Version](https://img.shields.io/badge/version-5.3-gold)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![CI](https://img.shields.io/badge/CI-GitHub_Actions-green)
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## 🪔 What is WealthWise?

WealthWise is a full-stack Indian personal finance PWA that:

- Computes exact income tax under both regimes (FY 2026-27) with 87A rebate, HUF support, agricultural income, rental deductions, loan deductions, **HRA exemption (Sec 10(13A))**, **children allowances (Sec 10(14))**, **presumptive taxation (44AD/44ADA)**, **EV loan (80EEB)**, **author royalty (80QQB)**, **patent royalty (80RRB)**, and 15 income source types
- Profiles risk using a **7-factor questionnaire** → Conservative / Moderate / Aggressive / Very Aggressive
- Generates 4 personalised portfolio allocations across 14 asset classes with **pre-tax AND post-tax CAGR per regime**
- Shows a **triple-line corpus projection** (pre-tax / new regime / old regime) for 20 years
- Adjusts portfolio suggestions **based on your financial goals**
- Lets you track monthly expenses with **budget alerts**, **recurring transactions**, and **edit any transaction**
- Imports bank statements from **CSV** (SBI Excel export, HDFC, ICICI) or **PDF** (SBI, KVB, HDFC, ICICI, Axis, Kotak, PNB, BOB)
- Auto-categorises 50+ merchant keywords including KIIT Hospitality, personal UPI → Misc
- Provides a **comprehensive ITR filing guide** (AY 2027-28) with form determination, document checklist, schedule mapper, and step-by-step portal walkthrough
- Provides a **20-section IT Act deductions guide** with Section 54 LTCG callout, Sec 44AB audit warnings, and per-section AI advisor
- All AI routed through **secure FastAPI backend** — Anthropic key never in browser
- **Error boundaries** on every major section — one broken component never blanks the full app
- **CI/CD pipeline** — tax engine tests run automatically on every push

---

## 🆕 What's New in v5.3

| Fix / Feature | Detail |
|---|---|
| **Security: Firebase key rotation** | `backend/firebase.txt` scrubbed from git history via BFG; credentials rotated; all keys now in Vercel env vars only |
| **Repo cleanup** | Removed junk files: `tempCodeRunnerFile.python`, `~$althWise_Documentation_v5.2.docx`, `~WRL2477.tmp`, `keep default`, duplicate `gitignore`, and the entire committed `mnt/` folder (Claude computer-use artefacts) |
| **Tax bug: marginal slab rate** | `getMarginalRate` now correctly receives `newOrdinary.taxableIncome` (post-deduction) instead of `ordinaryGross` — fixes post-tax CAGR projections for all users near slab boundaries |
| **Backend: 44AD + loan ordering** | `business_loan_int` deduction is only applied when NOT using presumptive 44AD — previously ran before the 44AD override, making it a misleading no-op |
| **Backend: 80C formula** | `d80C` was `min(150_000, 150_000 + hl_prin)` — always collapsed to ₹1.5L regardless of principal input. Now correctly uses `150_000` with an explanatory comment |
| **Backend: `audit_required` field** | `/analyze` response now includes `audit_required: bool` to mirror the frontend's audit warning logic |
| **Backend: `projection_years` default** | Changed from 10 → 20 to match frontend `projectNetWorth(..., 20)`. No more half-length projection arrays |
| **Backend: Gold tax rule** | Gold CAGR tax rule corrected from `LTCG_PROPERTY` (20%) to `LTCG_PROPERTY_NEW` (12.5%) per Budget 2024 |
| **Backend: Bitcoin cap** | Bitcoin allocation in Very Aggressive portfolio capped at 5% (was 10%) |
| **ErrorBoundary** | `ErrorBoundary.jsx` wraps every major section in `App.jsx` — Tracker, Goals, Scenarios, ITSections, ITRFiling, Income Form, Portfolio Allocation, Chart, Tax Summary each isolated |
| **7-factor Risk Profiler** | `RiskProfiler.jsx` replaces the old 3-variable lookup. New factors: EMI debt burden, number of dependents, investment horizon, crash behaviour. A broke 25-year-old and a wealthy 25-year-old now get meaningfully different risk profiles |
| **CI/CD pipeline** | `.github/workflows/ci.yml` — runs Vitest on every push/PR, Vite build check with dummy env vars, Python syntax check on `main.py`. Broken tax logic can no longer reach Vercel silently |
| **Extended test suite** | 28 new Vitest tests covering: HRA 3-limit formula, 44AD at 8%/6%, 44ADA 50% + eligibility guard, ltcg_debt Sec 112 at 20%, marginal rate regression cases, `requires44AB` audit threshold, and all 7 RiskProfiler factors including the broke-vs-wealthy 25-year-old case |
| **Tracker: z-index fix** | Duplicate `modal`/`modalBox` keys in `S` styles object removed — Edit Transaction modal now renders at correct z-index |

---

## 🗂️ Project Structure

```
wealthwise/
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI: Vitest + Vite build + Python syntax check
│
├── frontend/                        # React 18 + Vite
│   ├── public/
│   │   └── manifest.json            # PWA manifest (Android installable)
│   ├── src/
│   │   ├── App.jsx                  # Main app — 3-step flow, results, Section 54 callout
│   │   │                            #   ErrorBoundary wraps every section (v5.3)
│   │   ├── ErrorBoundary.jsx        # Class component — isolates runtime errors per section (v5.3)
│   │   ├── RiskProfiler.jsx         # 7-factor risk questionnaire UI + scorer (v5.3)
│   │   ├── IncomeForm.jsx           # Multi-source income with live tax preview,
│   │   │                            #   HRA/44AD/44ADA/loan sub-fields
│   │   ├── Tracker.jsx              # Expense tracker — recurring, budget alerts,
│   │   │                            #   edit modal (z-index fixed v5.3), CSV/PDF import
│   │   ├── ITSections.jsx           # 20 IT Act sections + AI advisor per section
│   │   ├── ITRFiling.jsx            # ITR filing guide — form picker, document
│   │   │                            #   checklist, schedule mapper, step-by-step
│   │   ├── Goals.jsx                # Goal setting + auto SIP calculator
│   │   ├── Scenarios.jsx            # What-if scenario planner
│   │   ├── Login.jsx                # Firebase Auth (Google + Email/Password)
│   │   ├── AuthContext.jsx          # Global auth state + Firestore sync
│   │   ├── firebase.js              # Firebase init + Firestore CRUD
│   │   ├── taxEngine.js             # Full tax engine (marginal rate bug fixed v5.3)
│   │   │                            #   HRA, 44AD, 44ADA, 80EEB, 80QQB, 80RRB
│   │   ├── api.js                   # Backend calls (no API key in frontend)
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Kuber/Laxmi theme (saffron gold, temple emerald)
│   ├── src/__tests__/
│   │   └── taxEngine.test.js        # 68+ Vitest unit tests (28 new in v5.3)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── vercel.json                  # SPA routing fix for Vercel
│   └── .env.example
│
├── backend/                         # FastAPI + Python 3.11
│   ├── main.py                      # API routes, Claude proxy, structured logging
│   │                                #   audit_required, projection_years=20, gold fix (v5.3)
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
| Salary / CTC | Std deduction ₹75K (new) / ₹50K (old). HRA + children allowances auto-deducted |
| Business | Slab rate. 44AD presumptive: 8% / 6% digital of gross turnover |
| Freelance / Consulting | Slab rate. 44ADA presumptive: 50% of gross receipts for eligible professions |
| F&O Trading | Business income (slab rate). Audit threshold check on turnover |
| Rental Income | 30% Sec 24 deduction auto-applied |
| FD / RD / Post Office Interest | Slab rate; TDS threshold noted |
| Savings Account Interest | 80TTA ₹10K / 80TTB ₹50K (60+); auto from age |
| Dividend Income | Slab rate above ₹5K |
| LTCG Equity / MF | 10% above ₹1.25L exemption (FY26-27) |
| STCG Equity / MF | 15% flat |
| LTCG Debt MF / Bonds (Sec 112) | 20% with indexation for pre-Apr 2023 purchases |
| LTCG Property / Gold (Pre Jul 23, 2024) | 20% with indexation |
| LTCG Property / Gold (Post Jul 23, 2024) | 12.5% without indexation (Budget 2024) |
| Agricultural Income | Exempt + partial integration for rate computation |
| Crypto / VDA | 30% flat + 1% TDS, no deductions |
| Other Income | Marginal slab rate |

**Deductions available:**
- **New Regime**: Standard deduction ₹75K, Employer NPS 80CCD(2)
- **Old Regime**: 80C ₹1.5L, 80CCD(1B) NPS ₹50K, 80D health ₹25–50K, 80E education loan (no cap), Sec 24(b) home loan interest ₹2L, 80EEB EV loan ₹1.5L, 80QQB royalty ₹3L, 80RRB patent ₹3L
- **HUF**: Same slabs, ₹50K interest exemption regardless of age
- **Section 87A rebate**: Zero tax up to ₹12L net taxable (₹12.75L gross CTC)

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
| Bitcoin / Crypto | 35.0% | 30% Flat | 24.5% ⚠️ |

> ⚠️ **Bitcoin note**: 35% CAGR is a historical average that includes 80%+ drawdown periods. Projections using this figure are illustrative only. Do not use as a planning baseline. Capped at 5% allocation in Very Aggressive portfolios.

### 🛡️ Risk Profiler (v5.3 — 7 Factors)

The old 3-variable lookup (age + occupation + savings) has been replaced with a guided questionnaire:

| Factor | Score Contribution |
|---|---|
| Age | −30 to +4 pts |
| Occupation stability | +10 to +25 pts |
| Savings rate | +7 to +20 pts |
| EMI / debt burden | 0 to −15 pts |
| Number of dependents | 0 to −10 pts |
| Investment horizon | 0 to +15 pts |
| Self-assessed crash behaviour | 0 to +10 pts |

A broke 25-year-old with 3 dependents and 2-year horizon scores Conservative. A debt-free 25-year-old with 10-year horizon and no dependents scores Very Aggressive.

### 🧱 Error Boundaries (v5.3)

Every major section is wrapped in an individual `<ErrorBoundary>`. A runtime error in one section (e.g., chart receiving null data) shows a section-level error card instead of blanking the entire app. Sections isolated: Tax Summary, Portfolio Allocation, Chart, Tracker, Goals, Scenarios, ITSections, ITRFiling, Income Form.

### 💳 Expense Tracker

- **12 expense categories**: Rent/EMI, Food, Family, Transport, Utilities, Health, Education, Shopping, Investments, Insurance, Misc/Personal, Other
- **Recurring transactions**: set frequency (daily/weekly/monthly/yearly), auto-post on due date on app load
- **Edit any transaction**: ✏️ button opens inline modal; saves to Firestore (z-index bug fixed v5.3)
- **Budget alerts**: set monthly limit per category, yellow at 90%, red at exceeded
- **Pagination + filtering**: search, type, category, date range; load more in batches of 20
- **CSV export**: exports current filtered view with category labels
- **CSV import**: SBI Excel export, HDFC, ICICI with auto-detect + auto-categorise
- **PDF import**: 8 banks — SBI, KVB, HDFC, ICICI, Axis, Kotak, PNB, Bank of Baroda
- **Auto-categorisation**: 50+ merchant keywords
- **AI Savings Coach**: sends spending summary to Claude for personalised tips

### 🗂️ ITR Filing Guide

- **Auto ITR form determination**: picks ITR-1 / ITR-2 / ITR-3 / ITR-4 based on income sources
- **Dynamic document checklist**: shows only documents relevant to your income
- **Schedule mapper**: maps each income type to the correct ITR schedule
- **8-step portal walkthrough**: end-to-end AY 2027-28 e-filing guide
- **Deadlines + penalties**: due dates, interest under Sec 234A/234B/234C
- **AI assistant**: per-section Claude-powered Q&A

---

## 🔒 Security Model

| Layer | What's stored | Where |
|---|---|---|
| Firebase keys | `VITE_FIREBASE_*` | Vercel env vars (build-time injection only) |
| Anthropic key | `ANTHROPIC_API_KEY` | Railway env vars (never in frontend) |
| Local dev | `frontend/.env` (gitignored) | Your machine only |
| Git repo | Nothing secret | Confirmed via BFG scrub |

The `backend/firebase.txt` exposure has been remediated: file deleted, git history scrubbed with BFG Repo Cleaner, Firebase web app credentials rotated, new keys added only to Vercel dashboard.

---

## 🚦 CI/CD Pipeline

On every push and pull request, GitHub Actions runs three jobs:

```
test-frontend   → npm run test (Vitest — 68+ tax engine unit tests)
build-frontend  → vite build (catches broken imports before Vercel)
lint-backend    → python -m py_compile main.py (catches syntax errors)
```

A broken tax computation or import error will fail the build before reaching Vercel or Railway.

---

## 🧪 Tax Engine Test Coverage

| Test Suite | What's Tested |
|---|---|
| New Regime 87A Rebate | Zero tax at ₹12L, ₹12.75L gross; tax above ₹13L |
| New Regime Slabs | 5%, 10%, 20%, 30% slab boundary conditions |
| Old Regime | ₹5L zero tax, ₹8L payable, slab comparison |
| `computeMultiIncomeTax` | Salary, rental, savings 80TTA/TTB, LTCG exemption, STCG, crypto, agri, HUF |
| HRA Exemption | 3-limit formula: actual HRA, 50%/40% of basic, rent−10% basic (v5.3) |
| 44AD Presumptive | 8% standard, 6% digital turnover (v5.3) |
| 44ADA Presumptive | 50% of receipts, >₹75L eligibility guard (v5.3) |
| LTCG Debt MF | Sec 112 at 20% with indexation (v5.3) |
| Marginal Rate Regression | ₹11.75L (should be 0% effective, rebate), ₹12.1L (should be 5%) — v5.3 bug regression |
| Audit Threshold | `requires44AB` at ₹1Cr / ₹10Cr digital (v5.3) |
| Risk Profiler | All 7 factors, broke-vs-wealthy 25-year-old case (v5.3) |
| `postTaxCAGR` | PPF, Bitcoin, ELSS, FD, SGB |
| Portfolio Generator | 4 portfolios, 100% alloc sum, regime-specific CAGR, no Bitcoin in Conservative |
| `fmtINR` | Crores, lakhs, thousands, small amounts, zero |

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- Firebase project (free Spark plan)
- Anthropic API key

### Setup

```bash
# Clone
git clone https://github.com/star-on-earth/WealthWise
cd WealthWise

# Frontend
cd frontend
npm install
cp .env.example .env          # fill in your VITE_* keys
npm run dev                   # http://localhost:5173

# Backend (separate terminal)
cd backend
pip install -r requirements.txt
cp .env.example .env          # fill in ANTHROPIC_API_KEY
uvicorn main:app --reload     # http://localhost:8000
```

### Run Tests

```bash
# Frontend (Vitest)
cd frontend
npm run test

# Backend (Pytest)
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
2. Add all `VITE_*` env vars (never commit these to git)
3. Deploy → Vercel auto-handles SPA routing via `vercel.json`

**Post-deploy:**
- Update Railway `ALLOWED_ORIGINS` with your Vercel URL
- Firebase → Authentication → Authorized Domains → add Vercel URL

---

### Option B — Render (Free, No Credit Card)

1. [render.com](https://render.com) → New → Web Service → connect GitHub repo
2. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
3. Add env vars: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`
4. Update `VITE_API_URL` in Vercel to your Render URL

> **Tip**: Use [UptimeRobot](https://uptimerobot.com) (free) to ping your Render URL every 14 minutes to prevent Render's 15-minute spin-down.

---

## 🔄 Update Workflow

```bash
git add .
git commit -m "describe change"
git push
# CI runs tests → Vercel + Railway/Render auto-deploy in ~2 minutes
# Build fails if any tax engine test breaks
```

### Updating Tax Rules (next Budget)
Edit `frontend/src/taxEngine.js` and `backend/main.py` → update slabs → run tests → push.

### Adding a New Page
1. Create `frontend/src/NewPage.jsx`
2. Import in `App.jsx`
3. Add to `NAV_ITEMS` array in `App.jsx`
4. Add route condition in the secondary routes section
5. Wrap render with `<ErrorBoundary section="NewPage">`
6. Push

---

## 🐛 Bug Fixes Log

| Version | Bug | Fix |
|---|---|---|
| v4 | Cursor lost after 1 digit in income form | `SafeInput` + `SrcGroup` hoisted to module scope in `IncomeForm.jsx` |
| v5 | SBI Excel CSV showed 0 transactions | Added fixed-column parser for merged-cell SBI export format |
| v5 | Same corpus for new/old regime | Each regime now gets its own marginal slab rate |
| v5.1 | Crash on load: `businessLoanInt is not defined` | Declared before `businessTaxable` — fixes temporal dead zone (TDZ) |
| v5.1 | `₹undefinedL` on 20-year projection view | `projectNetWorth` defaults to 20yr; `handleAnalyze` always projects 20yr |
| v5.1 | HRA not reducing taxable income | `applyExtraAdjustments` applied consistently in both preview and `handleAnalyze` |
| v5.1 | Focus lost mid-typing in 44AD/HRA sub-fields | `SafeInput` local state + `onBlur` sync pattern extended to new sub-fields |
| v5.3 | Marginal slab rate computed on pre-deduction gross | `getMarginalRate` now receives `newOrdinary.taxableIncome` — fixes post-tax CAGR for boundary incomes |
| v5.3 | `business_loan_int` applied before 44AD override | Loan deduction now only runs when 44AD is NOT active |
| v5.3 | `d80C + hl_prin` formula always collapsed to ₹1.5L | Replaced misleading expression with plain `150_000` and explanatory comment |
| v5.3 | `/analyze` missing `audit_required` field | `_audit_required()` helper added; result wired into response dict |
| v5.3 | `projection_years` default 10 vs frontend's 20 | Backend default changed to 20 |
| v5.3 | Gold taxed at 20% (pre-Budget 2024 rule) | Changed to `LTCG_PROPERTY_NEW` (12.5%) in `ASSET_TAX` map |
| v5.3 | Bitcoin at 10% in Very Aggressive portfolio | Capped at 5% |
| v5.3 | Edit Transaction modal rendered behind other elements | Duplicate `modal`/`modalBox` keys in `S` object removed |
| v5.3 | Runtime error in one component blanks entire app | `ErrorBoundary` wraps every major section individually |
| v5.3 | Risk profile identical for any 25-year-old | 7-factor profiler adds debt burden, dependents, horizon, crash behaviour |
| v5.3 | Firebase credentials committed to git | File deleted, history scrubbed with BFG, credentials rotated |

---

## 🛣️ Roadmap

| Feature | Priority |
|---|---|
| Live Nifty / Gold / Crypto prices (yfinance + CoinGecko) | High |
| Markets watchlist tab | High |
| Form 16 / AIS PDF upload with Claude document API | High |
| SIP step-up calculator in Goals (linked to Scenarios) | Medium |
| TypeScript migration (type-safe tax computations) | Medium |
| Input validation — clamp ranges, flag impossible values | Medium |
| Guest mode warning on localStorage-only sessions | Medium |
| Scenario Planner pre-fill from user's actual data | Medium |
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

WealthWise provides general financial information and tax estimates for educational purposes only. It is not a SEBI-registered advisor. Tax calculations are based on publicly available FY 2026-27 rules and may not account for all individual circumstances. Bitcoin and high-volatility asset projections are illustrative — past returns do not guarantee future performance. Consult a qualified CA or financial advisor before making investment or tax decisions.

---

<div align="center">

Built by Avrrodeep Banerjee · WealthWise v5.3 · FY 2026-27

</div>
