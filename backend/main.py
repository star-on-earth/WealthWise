"""
WealthWise Backend — FastAPI v3
FY 2026-27 India

NEW in v3:
  • Multi-source income tax computation
  • Crypto 30% flat tax
  • Rental 30% std deduction
  • Savings interest 80TTA/80TTB exemption
  • LTCG equity ₹1.25L exemption (FY26-27)
  • Post-tax CAGR per asset based on marginal slab
  • Savings account + Real Estate added as assets
"""

import os, math
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
app = FastAPI(title="WealthWise API v3", version="3.0.0", docs_url="/docs")

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests. Please slow down."})

app.add_middleware(SlowAPIMiddleware)
app.state.limiter = limiter

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS,
                   allow_credentials=True, allow_methods=["GET","POST"], allow_headers=["Content-Type"])

# ─── MODELS ───────────────────────────────────────────────────────────────────

class MultiIncome(BaseModel):
    salary:        float = 0
    business:      float = 0
    freelance:     float = 0
    rental:        float = 0
    fd_interest:   float = 0
    savings_int:   float = 0
    dividends:     float = 0
    ltcg_equity:   float = 0
    stcg_equity:   float = 0
    ltcg_property: float = 0
    crypto:        float = 0
    other:         float = 0

class UserProfile(BaseModel):
    incomes:          MultiIncome
    annual_savings:   float = Field(..., gt=0)
    age:              int   = Field(..., ge=18, le=100)
    gender:           str   = 'male'
    occupation:       str   = 'Salaried (MNC/Private)'
    is_senior:        bool  = False
    risk_preference:  Optional[str] = None

class PortfolioAsset(BaseModel):
    label: str; pct: float; cagr: float
    post_tax_cagr: Optional[float] = None
    tax_rule_label: Optional[str] = None

class AIPortfolioRequest(BaseModel):
    profile: UserProfile
    portfolio_name: str
    portfolio_assets: list[PortfolioAsset]
    risk_label: str
    marginal_slab_rate: float = 0.30

class AIAdvisorRequest(BaseModel):
    question:    str = Field(..., min_length=5, max_length=1000)
    user_profile: Optional[dict] = None

# ─── ASSET DATA ───────────────────────────────────────────────────────────────

ASSET_TAX_RULES = {
    'TAX_FREE':      {'label': 'Tax-Free',              'post_tax_factor': lambda r: 1.00},
    'LTCG_EQUITY':   {'label': 'LTCG 10% (equity)',     'post_tax_factor': lambda r: 0.90},
    'STCG_EQUITY':   {'label': 'STCG 15% (equity)',     'post_tax_factor': lambda r: 0.85},
    'SLAB_RATE':     {'label': 'Slab Rate',              'post_tax_factor': lambda r: 1-r},
    'LTCG_PROPERTY': {'label': 'LTCG 20% (property)',   'post_tax_factor': lambda r: 0.80},
    'CRYPTO':        {'label': '30% Flat (Crypto)',      'post_tax_factor': lambda r: 0.70},
    'SGB':           {'label': 'Tax-Free (SGB)',         'post_tax_factor': lambda r: 1.00},
    'NPS':           {'label': 'Partially Tax-Free',     'post_tax_factor': lambda r: 0.88},
}

ASSETS = {
    'PPF':         {'cagr':7.1,  'label':'PPF',                  'color':'#4fa3f7','lock':'15yr',    'tax_rule':'TAX_FREE'},
    'SavingsAcc':  {'cagr':3.5,  'label':'Savings Account',      'color':'#818cf8','lock':'None',    'tax_rule':'SLAB_RATE'},
    'FD':          {'cagr':7.2,  'label':'Fixed Deposit',         'color':'#7c8cf8','lock':'1-5yr',  'tax_rule':'SLAB_RATE'},
    'NPS':         {'cagr':11.0, 'label':'NPS',                   'color':'#a78bfa','lock':'Till 60','tax_rule':'NPS'},
    'DebtMF':      {'cagr':7.5,  'label':'Debt Mutual Fund',      'color':'#60a5fa','lock':'None',   'tax_rule':'SLAB_RATE'},
    'Gold':        {'cagr':11.0, 'label':'Digital Gold / ETF',    'color':'#f0b429','lock':'None',   'tax_rule':'LTCG_PROPERTY'},
    'SGB':         {'cagr':11.0, 'label':'Sovereign Gold Bond',   'color':'#fbbf24','lock':'8yr',    'tax_rule':'SGB'},
    'ELSS':        {'cagr':14.0, 'label':'ELSS (Tax Saver MF)',   'color':'#34d399','lock':'3yr',    'tax_rule':'LTCG_EQUITY'},
    'IndexMF':     {'cagr':13.0, 'label':'Index MF (Nifty 50)',   'color':'#10d97e','lock':'None',   'tax_rule':'LTCG_EQUITY'},
    'LargeCapMF':  {'cagr':14.5, 'label':'Large Cap MF',          'color':'#6ee7b7','lock':'None',   'tax_rule':'LTCG_EQUITY'},
    'MidSmallMF':  {'cagr':17.0, 'label':'Mid / Small Cap MF',    'color':'#fbbf24','lock':'None',   'tax_rule':'LTCG_EQUITY'},
    'Stocks':      {'cagr':15.0, 'label':'Direct Stocks',         'color':'#fb923c','lock':'None',   'tax_rule':'LTCG_EQUITY'},
    'RealEstate':  {'cagr':9.5,  'label':'Real Estate',           'color':'#f472b6','lock':'5yr+',   'tax_rule':'LTCG_PROPERTY'},
    'Bitcoin':     {'cagr':35.0, 'label':'Bitcoin / Crypto',      'color':'#ff5757','lock':'None',   'tax_rule':'CRYPTO'},
}

TEMPLATES = {
    'Conservative':    [('PPF',25),('FD',20),('NPS',20),('DebtMF',15),('SGB',10),('SavingsAcc',10)],
    'Moderate':        [('ELSS',20),('IndexMF',20),('PPF',15),('NPS',15),('SGB',15),('FD',15)],
    'Aggressive':      [('IndexMF',25),('LargeCapMF',20),('MidSmallMF',15),('ELSS',15),('SGB',10),('Stocks',10),('RealEstate',5)],
    'Very Aggressive': [('MidSmallMF',20),('Stocks',20),('IndexMF',20),('Bitcoin',10),('SGB',10),('ELSS',10),('RealEstate',10)],
}
TAX_OPT = [('ELSS',25),('NPS',20),('PPF',25),('IndexMF',15),('SGB',15)]

# ─── MULTI-INCOME TAX ENGINE ──────────────────────────────────────────────────

def compute_multi_income_tax(inc: MultiIncome, is_senior: bool = False) -> dict:
    rental_taxable  = inc.rental * 0.70
    savings_exempt  = 50_000 if is_senior else 10_000
    savings_taxable = max(0, inc.savings_int - savings_exempt)
    ltcg_exempt     = 125_000
    ltcg_taxable    = max(0, inc.ltcg_equity - ltcg_exempt)

    ordinary = (inc.salary + inc.business + inc.freelance + rental_taxable +
                inc.fd_interest + savings_taxable + inc.dividends + inc.other)

    total_gross = (inc.salary + inc.business + inc.freelance + inc.rental +
                   inc.fd_interest + inc.savings_int + inc.dividends +
                   inc.ltcg_equity + inc.stcg_equity + inc.ltcg_property +
                   inc.crypto + inc.other)

    new_ord = _new_regime(ordinary)
    old_ord = _old_regime(ordinary)

    ltcg_eq_tax   = ltcg_taxable * 0.10
    stcg_eq_tax   = inc.stcg_equity * 0.15
    ltcg_prop_tax = inc.ltcg_property * 0.20
    crypto_tax    = inc.crypto * 0.30
    special_tax   = (ltcg_eq_tax + stcg_eq_tax + ltcg_prop_tax + crypto_tax) * 1.04

    new_total = new_ord['tax'] + special_tax
    old_total = old_ord['tax'] + special_tax
    best_new  = new_total <= old_total
    best_regime = 'new' if best_new else 'old'
    best_tax    = min(new_total, old_total)

    marginal = _marginal_rate(ordinary, best_regime)

    return {
        'total_gross_income':  round(total_gross),
        'ordinary_taxable':    round(ordinary),
        'rental_taxable':      round(rental_taxable),
        'savings_taxable':     round(savings_taxable),
        'ltcg_equity_taxable': round(ltcg_taxable),
        'ltcg_equity_tax':     round(ltcg_eq_tax),
        'stcg_equity_tax':     round(stcg_eq_tax),
        'ltcg_property_tax':   round(ltcg_prop_tax),
        'crypto_tax':          round(crypto_tax),
        'special_tax_total':   round(special_tax),
        'new_regime':          {**new_ord, 'total_tax': round(new_total)},
        'old_regime':          {**old_ord, 'total_tax': round(old_total)},
        'best_regime':         best_regime,
        'best_tax':            round(best_tax),
        'tax_saving':          round(abs(new_total - old_total)),
        'marginal_slab_rate':  marginal,
    }

def _new_regime(gross: float) -> dict:
    taxable = max(0, gross - 75_000)
    if taxable <= 1_200_000:
        return {'tax': 0, 'taxable': round(taxable), 'regime': 'new', 'rebate': True}
    slabs = [(400_000,.00),(400_000,.05),(400_000,.10),(400_000,.15),(400_000,.20),(400_000,.25),(float('inf'),.30)]
    tax, rem = 0.0, taxable
    for slab, rate in slabs:
        if rem <= 0: break
        tax += min(rem, slab) * rate; rem -= slab
    return {'tax': round(tax*1.04), 'taxable': round(taxable), 'regime': 'new', 'rebate': False}

def _old_regime(gross: float) -> dict:
    taxable = max(0, gross - 50_000 - 150_000 - 25_000 - 50_000)
    if taxable <= 500_000:
        return {'tax': 0, 'taxable': round(taxable), 'regime': 'old', 'rebate': True}
    slabs = [(250_000,.00),(250_000,.05),(500_000,.20),(float('inf'),.30)]
    tax, rem = 0.0, taxable
    for slab, rate in slabs:
        if rem <= 0: break
        tax += min(rem, slab) * rate; rem -= slab
    return {'tax': round(tax*1.04), 'taxable': round(taxable), 'regime': 'old', 'rebate': False}

def _marginal_rate(ordinary: float, regime: str) -> float:
    if regime == 'new':
        t = max(0, ordinary - 75_000)
        if t <= 400_000: return 0.00
        if t <= 800_000: return 0.05
        if t <= 1_200_000: return 0.10
        if t <= 1_600_000: return 0.15
        if t <= 2_000_000: return 0.20
        if t <= 2_400_000: return 0.25
        return 0.30
    else:
        t = max(0, ordinary - 50_000 - 150_000 - 25_000 - 50_000)
        if t <= 250_000: return 0.00
        if t <= 500_000: return 0.05
        if t <= 1_000_000: return 0.20
        return 0.30

# ─── RISK + PORTFOLIO ─────────────────────────────────────────────────────────

def get_risk_profile(age, occupation, income, savings) -> dict:
    score = 0
    if age < 25: score += 30
    elif age < 35: score += 25
    elif age < 45: score += 18
    elif age < 55: score += 10
    else: score += 4
    low  = {'Government Employee','PSU Employee','Retired'}
    mid  = {'Salaried (MNC/Private)','Doctor / Lawyer (Professional)'}
    high = {'Self-Employed / Freelancer','Business Owner','Startup Founder'}
    if occupation in low: score += 10
    elif occupation in mid: score += 18
    elif occupation in high: score += 25
    else: score += 12
    ratio = savings / income if income else 0
    if ratio >= 0.4: score += 20
    elif ratio >= 0.25: score += 14
    else: score += 7
    if score <= 35: return {'score':score,'label':'Conservative',   'color':'#4fa3f7'}
    if score <= 55: return {'score':score,'label':'Moderate',       'color':'#f0b429'}
    if score <= 70: return {'score':score,'label':'Aggressive',     'color':'#fb923c'}
    return            {'score':score,'label':'Very Aggressive','color':'#ff5757'}

def build_portfolio(template, savings, name, risk_label, slab_rate) -> dict:
    alloc = []
    for key, pct in template:
        a = ASSETS[key]
        rule = ASSET_TAX_RULES[a['tax_rule']]
        post_tax = round(a['cagr'] * rule['post_tax_factor'](slab_rate), 2)
        alloc.append({
            'key': key, 'pct': pct, 'amount': round(savings*pct/100),
            **a, 'post_tax_cagr': post_tax,
            'tax_rule_label': rule['label'],
        })
    pre  = round(sum(a['cagr'] * a['pct']/100 for a in alloc), 2)
    post = round(sum(a['post_tax_cagr'] * a['pct']/100 for a in alloc), 2)
    return {'name':name,'risk_label':risk_label,'alloc':alloc,'blended_cagr':pre,'blended_post_tax_cagr':post}

def generate_portfolios(risk_label, savings, slab_rate=0.30):
    keys = list(TEMPLATES)
    idx  = keys.index(risk_label)
    return [
        build_portfolio(TEMPLATES[risk_label],         savings, '⭐ Recommended for You', risk_label,         slab_rate),
        build_portfolio(TEMPLATES[keys[max(0,idx-1)]], savings, '🛡️ Safer Alternative',   keys[max(0,idx-1)], slab_rate),
        build_portfolio(TEMPLATES[keys[min(3,idx+1)]], savings, '🚀 Bolder Alternative',  keys[min(3,idx+1)], slab_rate),
        build_portfolio(TAX_OPT,                       savings, '💰 Tax Optimizer',       'Moderate',          slab_rate),
    ]

def project_net_worth(cagr_pct, savings, years=20):
    r = cagr_pct / 100
    return [{'year':f'Y{i}', 'value_lakhs': round(savings*((pow(1+r,i)-1)/r)/100_000, 2) if i>0 else 0}
            for i in range(years+1)]

# ─── CLAUDE HELPERS ───────────────────────────────────────────────────────────

TAX_SYSTEM_PROMPT = """You are an expert Indian Chartered Accountant and SEBI-registered investment advisor
specialising in FY 2026-27 Income Tax and personal finance.

Key FY 2026-27 rules you must know:
- New regime: 87A rebate up to ₹12L taxable income (gross ≤ ₹12.75L = zero tax)
- LTCG equity/MF: 10% above ₹1.25L/yr (FY26-27 limit raised from ₹1L)
- STCG equity: 15% flat
- Debt MF: slab rate (no indexation post Apr 2023)
- Crypto/VDA: 30% flat + 1% TDS, no deductions allowed
- Rental income: 30% std deduction under Sec 24 before tax
- SGB maturity after 8yr: fully tax-free
- Savings interest: 80TTA ₹10K exempt (80TTB ₹50K for senior citizens 60+)
- NPS: 60% lump sum tax-free; 40% annuity taxable

Rules: be specific to India, cite section numbers, mention regime applicability,
keep answers concise (3-6 lines), flag conditions and caveats."""

def get_claude():
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured on server.")
    return anthropic.Anthropic(api_key=key)

# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0", "fy": "2026-27"}

@app.post("/analyze")
@limiter.limit("60/minute")
async def analyze(request: Request, profile: UserProfile):
    inc     = profile.incomes
    savings = profile.annual_savings
    tax     = compute_multi_income_tax(inc, profile.is_senior)
    total_income = tax['total_gross_income']

    risk        = get_risk_profile(profile.age, profile.occupation, total_income, savings)
    risk_label  = profile.risk_preference if profile.risk_preference in TEMPLATES else risk['label']
    slab_rate   = tax['marginal_slab_rate']
    portfolios  = generate_portfolios(risk_label, savings, slab_rate)
    projections = {
        p['name']: {
            'pre_tax':  project_net_worth(p['blended_cagr'], savings),
            'post_tax': project_net_worth(p['blended_post_tax_cagr'], savings),
        }
        for p in portfolios
    }

    return {
        'profile':       {'total_income':total_income,'savings':savings,'age':profile.age,
                          'occupation':profile.occupation,'gender':profile.gender,'is_senior':profile.is_senior,
                          'income_breakdown': inc.model_dump()},
        'tax':           tax,
        'risk_profile':  risk,
        'portfolios':    portfolios,
        'projections':   projections,
        'slab_rate':     slab_rate,
    }

@app.post("/ai/explain-portfolio")
@limiter.limit("10/minute")
async def ai_explain_portfolio(request: Request, req: AIPortfolioRequest):
    p    = req.profile
    inc  = p.incomes
    top3 = ", ".join(f"{a.label} ({a.pct}%, post-tax CAGR ~{a.post_tax_cagr}%)" for a in req.portfolio_assets[:3])
    slab_pct = int(req.marginal_slab_rate * 100)

    income_sources = [k for k,v in inc.model_dump().items() if v > 0]
    income_desc = ", ".join(income_sources) if income_sources else "salary"

    prompt = f"""User profile:
- Age: {p.age} | Occupation: {p.occupation} | Risk: {req.risk_label}
- Income sources: {income_desc}
- Annual savings: ₹{p.annual_savings:,.0f}
- Marginal slab rate: {slab_pct}%

Portfolio: "{req.portfolio_name}"
Top allocations (with post-tax CAGR): {top3}

In 3-4 sentences:
1. Why this allocation suits their specific multi-source income profile and risk
2. Which assets give them best post-tax returns at their {slab_pct}% slab rate
3. One key tax optimisation tip specific to their income mix

Be specific to India FY 2026-27. Mention actual post-tax numbers."""

    claude = get_claude()
    msg = claude.messages.create(model="claude-sonnet-4-20250514", max_tokens=600,
                                  system=TAX_SYSTEM_PROMPT, messages=[{"role":"user","content":prompt}])
    return {"explanation": msg.content[0].text}

@app.post("/ai/tax-advisor")
@limiter.limit("15/minute")
async def ai_tax_advisor(request: Request, req: AIAdvisorRequest):
    ctx = ""
    if req.user_profile:
        p = req.user_profile
        ctx = f"\nUser context — Total income: ₹{p.get('total_income','?'):,} | Age: {p.get('age','?')} | Marginal slab: {int(p.get('marginal_slab_rate',0.30)*100)}% | Occupation: {p.get('occupation','?')}\n"
    claude = get_claude()
    msg = claude.messages.create(model="claude-sonnet-4-20250514", max_tokens=600,
                                  system=TAX_SYSTEM_PROMPT+ctx, messages=[{"role":"user","content":req.question}])
    return {"answer": msg.content[0].text}

@app.get("/tax-multi")
def tax_multi_quick(salary:float=0, rental:float=0, fd_interest:float=0,
                    savings_int:float=0, crypto:float=0, ltcg_equity:float=0,
                    is_senior:bool=False):
    """Quick multi-income tax breakdown — useful for testing."""
    inc = MultiIncome(salary=salary, rental=rental, fd_interest=fd_interest,
                      savings_int=savings_int, crypto=crypto, ltcg_equity=ltcg_equity)
    return compute_multi_income_tax(inc, is_senior)
