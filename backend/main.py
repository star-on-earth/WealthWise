"""
WealthWise Backend — FastAPI
FY 2026-27 India · Secured: API key never leaves this server.

Routes:
  POST /analyze                — Full tax + risk + portfolio analysis
  POST /ai/explain-portfolio   — Claude explains a portfolio allocation
  POST /ai/tax-advisor         — Claude answers free-form tax questions
  GET  /tax/{income}           — Quick tax comparison for an income
  GET  /health                 — Healthcheck
"""

import os
import anthropic
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.responses import JSONResponse

# ─── APP SETUP ────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["200/day"])

app = FastAPI(title="WealthWise API", version="1.0.0", docs_url="/docs")

# Rate limit error handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests. Please slow down."})

app.add_middleware(SlowAPIMiddleware)
app.state.limiter = limiter

# CORS — replace with your actual Vercel URL in production
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"           # dev defaults
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ─── PYDANTIC MODELS ──────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    annual_income:   float = Field(..., gt=0)
    annual_savings:  float = Field(..., gt=0)
    age:             int   = Field(..., ge=18, le=100)
    gender:          str
    occupation:      str
    risk_preference: Optional[str] = None

class PortfolioAsset(BaseModel):
    label: str
    pct:   float
    cagr:  float

class AIPortfolioRequest(BaseModel):
    profile:          UserProfile
    portfolio_name:   str
    portfolio_assets: list[PortfolioAsset]
    risk_label:       str

class AIAdvisorRequest(BaseModel):
    question:    str = Field(..., min_length=5, max_length=1000)
    user_profile: Optional[dict] = None

# ─── ASSET DATA ───────────────────────────────────────────────────────────────

ASSETS = {
    "PPF":        {"cagr": 7.1,  "label": "PPF",                "color": "#4fa3f7", "lock": "15yr",   "tax_free": True },
    "FD":         {"cagr": 7.0,  "label": "Fixed Deposit",       "color": "#7c8cf8", "lock": "1-5yr",  "tax_free": False},
    "NPS":        {"cagr": 11.0, "label": "NPS",                 "color": "#a78bfa", "lock": "Till 60","tax_free": True },
    "DebtMF":     {"cagr": 7.5,  "label": "Debt Mutual Fund",    "color": "#60a5fa", "lock": "None",   "tax_free": False},
    "Gold":       {"cagr": 11.0, "label": "Digital Gold / SGB",  "color": "#f0b429", "lock": "8yr",    "tax_free": False},
    "ELSS":       {"cagr": 14.0, "label": "ELSS (Tax Saver)",    "color": "#34d399", "lock": "3yr",    "tax_free": True },
    "IndexMF":    {"cagr": 13.0, "label": "Index MF (Nifty 50)", "color": "#10d97e", "lock": "None",   "tax_free": False},
    "LargeCapMF": {"cagr": 14.5, "label": "Large Cap MF",        "color": "#6ee7b7", "lock": "None",   "tax_free": False},
    "MidSmallMF": {"cagr": 17.0, "label": "Mid / Small Cap MF",  "color": "#fbbf24", "lock": "None",   "tax_free": False},
    "Stocks":     {"cagr": 15.0, "label": "Direct Stocks",       "color": "#fb923c", "lock": "None",   "tax_free": False},
    "RealEstate": {"cagr": 9.5,  "label": "Real Estate",         "color": "#f472b6", "lock": "5yr+",   "tax_free": False},
    "Bitcoin":    {"cagr": 35.0, "label": "Bitcoin / Crypto",    "color": "#ff5757", "lock": "None",   "tax_free": False},
}

# ─── TAX ENGINE (FY 2026-27) ─────────────────────────────────────────────────

def calc_new_regime(gross: float) -> dict:
    """New Regime — ₹75K standard deduction + 87A rebate up to ₹12L taxable."""
    taxable = max(0.0, gross - 75_000)
    if taxable <= 1_200_000:
        return {"tax": 0, "taxable": round(taxable), "regime": "new", "rebate": True}

    slabs = [(400_000,0.00),(400_000,0.05),(400_000,0.10),
             (400_000,0.15),(400_000,0.20),(400_000,0.25),(float("inf"),0.30)]
    tax, rem = 0.0, taxable
    for slab, rate in slabs:
        if rem <= 0: break
        tax += min(rem, slab) * rate
        rem -= slab
    return {"tax": round(tax * 1.04), "taxable": round(taxable), "regime": "new", "rebate": False}


def calc_old_regime(gross: float, deductions: dict | None = None) -> dict:
    """Old Regime — standard deduction + 80C/80D/NPS."""
    d = deductions or {}
    std  = 50_000
    d80C = min(d.get("d80C", 150_000), 150_000)
    d80D = min(d.get("d80D",  25_000),  50_000)
    nps  = min(d.get("nps",   50_000),  50_000)
    taxable = max(0.0, gross - std - d80C - d80D - nps)

    if taxable <= 500_000:
        return {"tax": 0, "taxable": round(taxable), "regime": "old", "rebate": True}

    slabs = [(250_000,0.00),(250_000,0.05),(500_000,0.20),(float("inf"),0.30)]
    tax, rem = 0.0, taxable
    for slab, rate in slabs:
        if rem <= 0: break
        tax += min(rem, slab) * rate
        rem -= slab
    return {"tax": round(tax * 1.04), "taxable": round(taxable), "regime": "old", "rebate": False}


def best_regime(income: float) -> dict:
    n = calc_new_regime(income)
    o = calc_old_regime(income)
    best = n if n["tax"] <= o["tax"] else o
    return {**best, "saving_vs_other": abs(n["tax"] - o["tax"])}

# ─── RISK PROFILER ────────────────────────────────────────────────────────────

def get_risk_profile(age: int, occupation: str, income: float, savings: float) -> dict:
    score = 0
    if   age < 25: score += 30
    elif age < 35: score += 25
    elif age < 45: score += 18
    elif age < 55: score += 10
    else:          score += 4

    low  = {"Government Employee","PSU Employee","Retired"}
    mid  = {"Salaried (MNC/Private)","Doctor / Lawyer (Professional)"}
    high = {"Self-Employed / Freelancer","Business Owner","Startup Founder"}
    if   occupation in low:  score += 10
    elif occupation in mid:  score += 18
    elif occupation in high: score += 25
    else:                    score += 12

    ratio = savings / income if income else 0
    if   ratio >= 0.4:  score += 20
    elif ratio >= 0.25: score += 14
    else:               score += 7

    if   score <= 35: return {"score": score, "label": "Conservative",    "color": "#4fa3f7"}
    elif score <= 55: return {"score": score, "label": "Moderate",        "color": "#f0b429"}
    elif score <= 70: return {"score": score, "label": "Aggressive",      "color": "#fb923c"}
    else:             return {"score": score, "label": "Very Aggressive",  "color": "#ff5757"}

# ─── PORTFOLIO ALLOCATOR ──────────────────────────────────────────────────────

TEMPLATES = {
    "Conservative":    [("PPF",30),("FD",25),("NPS",20),("DebtMF",15),("Gold",10)],
    "Moderate":        [("ELSS",20),("IndexMF",25),("PPF",15),("NPS",15),("Gold",15),("FD",10)],
    "Aggressive":      [("IndexMF",25),("LargeCapMF",20),("MidSmallMF",20),("ELSS",15),("Gold",10),("Stocks",10)],
    "Very Aggressive": [("MidSmallMF",25),("Stocks",25),("IndexMF",20),("Bitcoin",10),("Gold",10),("ELSS",10)],
}
TAX_OPT = [("ELSS",30),("NPS",20),("PPF",25),("IndexMF",15),("Gold",10)]


def _build(template, savings: float, name: str, risk_label: str) -> dict:
    alloc = [{"key": k, "pct": p, "amount": round(savings * p / 100), **ASSETS[k]} for k, p in template]
    cagr  = round(sum(a["cagr"] * a["pct"] / 100 for a in alloc), 2)
    return {"name": name, "risk_label": risk_label, "alloc": alloc, "blended_cagr": cagr}


def generate_portfolios(risk_label: str, savings: float) -> list:
    keys = list(TEMPLATES)
    idx  = keys.index(risk_label)
    return [
        _build(TEMPLATES[risk_label],         savings, "⭐ Recommended for You", risk_label),
        _build(TEMPLATES[keys[max(0,idx-1)]], savings, "🛡️ Safer Alternative",   keys[max(0,idx-1)]),
        _build(TEMPLATES[keys[min(3,idx+1)]], savings, "🚀 Bolder Alternative",  keys[min(3,idx+1)]),
        _build(TAX_OPT,                       savings, "💰 Tax Optimizer",       "Moderate"),
    ]


def project_net_worth(cagr_pct: float, savings: float, years: int = 20) -> list:
    r = cagr_pct / 100
    return [
        {"year": f"Y{i}", "value_lakhs": round(savings * ((pow(1+r,i)-1)/r) / 100_000, 2) if i > 0 else 0}
        for i in range(years + 1)
    ]

# ─── CLAUDE CLIENT (lazy init) ───────────────────────────────────────────────

def get_claude():
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured on server.")
    return anthropic.Anthropic(api_key=key)

# Shared system prompt for all AI calls
TAX_SYSTEM_PROMPT = """You are an expert Indian Chartered Accountant and SEBI-registered investment advisor 
specialising in FY 2026-27 Income Tax and personal finance.

Your knowledge includes:
- All IT Act sections, deductions, exemptions (80C, 80D, 80CCD, 24b, HRA, LTA, 87A etc.)
- FY 2026-27 new regime slabs and Budget 2025 changes (₹87A rebate up to ₹12L, ₹75K std deduction)
- Mutual funds (ELSS, Index, Debt, Large/Mid Cap), NPS, PPF, SGB, FD, crypto taxation
- Capital gains rules — STCG, LTCG, indexation
- Practical tax planning for salaried, self-employed, and business owners

Rules:
- Always specify whether advice applies to old or new regime
- Give specific section numbers when citing deductions
- Keep responses clear and concise (3-6 lines unless detail requested)
- Always mention eligibility conditions and caveats
- If uncertain on a specific figure, say "verify with your CA"
- India context only. FY 2026-27."""

# ─── API ROUTES ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "fy": "2026-27"}


@app.get("/tax/{income}")
def tax_info(income: float):
    """Quick tax comparison for both regimes."""
    deductions = {"d80C": 150_000, "d80D": 25_000, "nps": 50_000}
    return {
        "income":     income,
        "new_regime": calc_new_regime(income),
        "old_regime": calc_old_regime(income, deductions),
        "best":       best_regime(income),
    }


@app.post("/analyze")
@limiter.limit("60/minute")
async def analyze(request: Request, profile: UserProfile):
    """Full analysis: tax + risk profile + portfolios + projections."""
    income   = profile.annual_income
    savings  = profile.annual_savings

    tax         = best_regime(income)
    risk        = get_risk_profile(profile.age, profile.occupation, income, savings)
    risk_label  = profile.risk_preference if profile.risk_preference in TEMPLATES else risk["label"]
    portfolios  = generate_portfolios(risk_label, savings)
    projections = {p["name"]: project_net_worth(p["blended_cagr"], savings) for p in portfolios}

    return {
        "profile":     {"income": income, "savings": savings, "age": profile.age,
                        "occupation": profile.occupation, "gender": profile.gender},
        "tax":         tax,
        "risk_profile": risk,
        "portfolios":  portfolios,
        "projections": projections,
    }


@app.post("/ai/explain-portfolio")
@limiter.limit("10/minute")          # stricter — Claude calls cost money
async def ai_explain_portfolio(request: Request, req: AIPortfolioRequest):
    """Claude explains why a portfolio suits the user. Key stays on server."""
    p    = req.profile
    top3 = ", ".join(f"{a.label} ({a.pct}%)" for a in req.portfolio_assets[:3])

    prompt = f"""User profile:
- Age: {p.age} | Gender: {p.gender} | Occupation: {p.occupation}
- Annual income: ₹{p.annual_income:,.0f} | Annual savings: ₹{p.annual_savings:,.0f}
- Risk profile: {req.risk_label}

Portfolio: "{req.portfolio_name}"
Top allocations: {top3}

In 3–4 sentences explain:
1. Why this allocation fits their age/occupation/risk profile specifically
2. What tax benefits they get from it (FY 2026-27, India)
3. One key risk to monitor

Be specific. India context. No generic boilerplate."""

    claude = get_claude()
    msg = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=TAX_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"explanation": msg.content[0].text}


@app.post("/ai/tax-advisor")
@limiter.limit("15/minute")          # slightly more generous for quick questions
async def ai_tax_advisor(request: Request, req: AIAdvisorRequest):
    """Free-form IT / tax Q&A. Key stays on server."""
    profile_ctx = ""
    if req.user_profile:
        p = req.user_profile
        profile_ctx = f"\nUser context — Income: ₹{p.get('income','?'):,} | Age: {p.get('age','?')} | Occupation: {p.get('occupation','?')}\n"

    claude = get_claude()
    msg = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=600,
        system=TAX_SYSTEM_PROMPT + profile_ctx,
        messages=[{"role": "user", "content": req.question}],
    )
    return {"answer": msg.content[0].text}
