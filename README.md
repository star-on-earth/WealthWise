# WealthWise v2 — Smart Savings & Tax Planner
### India · FY 2026-27

---

## What's New in v2

| Feature           | Description                                          |
|-------------------|------------------------------------------------------|
| 🔐 Auth           | Firebase Google + Email login. Guest mode supported. |
| 💾 Saved Profiles | Last analysis auto-saved to Firestore per user.      |
| 💳 Expense Tracker| Log income/expenses, category charts, AI coach tip.  |
| 🎯 Goal Planner   | Set goals, get SIP targets, track progress.          |
| 🔮 Scenario Planner| What-if comparisons with side-by-side projections.  |

---

## Project Structure

```
wealthwise/
├── frontend/src/
│   ├── App.jsx           ← Main app, all pages, bottom nav
│   ├── Login.jsx         ← Google + Email auth UI
│   ├── AuthContext.jsx   ← Global auth state (Firebase)
│   ├── firebase.js       ← Firebase init + all Firestore helpers
│   ├── Tracker.jsx       ← Monthly expense & income tracker
│   ├── Goals.jsx         ← Financial goal setting + SIP calculator
│   ├── Scenarios.jsx     ← What-if scenario planner
│   ├── ITSections.jsx    ← IT deductions guide + AI advisor
│   ├── taxEngine.js      ← Tax calc, risk profiler (runs in browser)
│   ├── api.js            ← All backend calls (NO API key here)
│   ├── main.jsx          ← Entry point (wraps in AuthProvider)
│   └── index.css
├── frontend/public/
│   └── manifest.json     ← PWA support
├── frontend/
│   ├── .env.example      ← Copy to .env, fill Firebase + API URL
│   ├── package.json      ← Dependencies inc. firebase
│   ├── vite.config.js
│   └── vercel.json
├── backend/
│   ├── main.py           ← FastAPI — tax API + Claude AI routes (key here only)
│   ├── requirements.txt
│   ├── Procfile
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Security Model

```
Browser                         Your Server (Railway)          Anthropic
  │  POST /ai/tax-advisor           │                              │
  │  { question, profile }  ───────►│  ANTHROPIC_API_KEY  ────────►│
  │ ◄──────────────────────────────  │ ◄────────────────────────────│

Firebase keys in .env → SAFE (identify project, access via Security Rules)
Anthropic key in backend .env → NEVER in frontend
```

---

## Local Setup

### 1. Firebase (one-time)
1. Go to https://console.firebase.google.com → New project
2. Add Web App → copy config
3. Enable Authentication → Email/Password + Google
4. Enable Firestore → Start in production mode
5. Set Firestore Security Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add ANTHROPIC_API_KEY + ALLOWED_ORIGINS
uvicorn main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env        # fill VITE_API_URL + VITE_FIREBASE_* vars
npm run dev
```

---

## Deployment

### Backend → Railway
1. Push to GitHub
2. railway.app → New Project → deploy `backend/` folder
3. Add env vars: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS=https://your-app.vercel.app`

### Frontend → Vercel
1. vercel.com → import repo → root = `frontend`
2. Add ALL env vars: `VITE_API_URL` + all `VITE_FIREBASE_*` vars
3. Deploy → done

---

## Monthly Cost

| Service         | Cost                    |
|-----------------|-------------------------|
| Vercel (Hobby)  | Free                    |
| Railway (Hobby) | Free up to $5/mo        |
| Firebase (Spark)| Free (generous limits)  |
| Anthropic API   | ~₹0.50 per 100 AI calls |
| Domain (.in)    | ~₹67/mo                 |
| **Total**       | **₹0–₹67/mo**          |
