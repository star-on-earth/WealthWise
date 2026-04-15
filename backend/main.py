"""
WealthWise Backend — FastAPI v4  |  FY 2026-27 India

NEW in v4:
  • HUF entity type with correct tax treatment
  • Agricultural income — partial integration method
  • Loans as deduction inputs (home loan principal/interest, education loan)
  • "other" income correctly taxed at slab rate (was missing in v3)
  • Two separate slab rates (new/old regime) → two different post-tax corpora
  • Goals-aware portfolio adjustment
"""

import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import anthropic
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.responses import JSONResponse

# ─── APP SETUP ────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["200/day"])
app     = FastAPI(title="WealthWise API v4", version="4.0.0", docs_url="/docs")

@app.exception_handler(RateLimitExceeded)
async def _rate_limit(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests."})

app.add_middleware(SlowAPIMiddleware)
app.state.limiter = limiter

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware, allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True, allow_methods=["GET","POST"], allow_headers=["Content-Type"],
)

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
    agricultural:  float = 0
    crypto:        float = 0
    other:         float = 0   # ← Now correctly taxed at slab

class LoanDeductions(BaseModel):
    home_loan_principal: float = 0
    home_loan_interest:  float = 0
    education_loan_int:  float = 0
    personal_loan:       float = 0  # No deduction — for planning only

class TrackerDeductions(BaseModel):
    health80D:   float = 0
    parents80D:  float = 0
    potential80C: float = 0

class UserProfile(BaseModel):
    incomes:           MultiIncome
    annual_savings:    float   = Field(..., gt=0)
    age:               int     = Field(..., ge=1, le=120)
    gender:            str     = 'male'
    occupation:        str     = 'Salaried (MNC/Private)'
    entity_type:       str     = 'individual'   # 'individual' | 'huf'
    loan_deductions:   LoanDeductions     = LoanDeductions()
    tracker_deductions:TrackerDeductions  = TrackerDeductions()
    risk_preference:   Optional[str]      = None
    projection_years:  int     = 10

class PortfolioAsset(BaseModel):
    label:           str
    pct:             float
    cagr:            float
    post_tax_cagr:   Optional[float] = None
    tax_rule_label:  Optional[str]   = None

class AIPortfolioRequest(BaseModel):
    profile:             UserProfile
    portfolio_name:      str
    portfolio_assets:    list[PortfolioAsset]
    risk_label:          str
    marginal_slab_rate:  float = 0.30

class AIAdvisorRequest(BaseModel):
    question:     str   = Field(..., min_length=5, max_length=1000)
    user_profile: Optional[dict] = None

# ─── ASSET REGISTRY ───────────────────────────────────────────────────────────

ASSET_TAX = {
    'TAX_FREE':      lambda r: 1.00,
    'LTCG_EQUITY':   lambda r: 0.90,
    'STCG_EQUITY':   lambda r: 0.85,
    'SLAB_RATE':     lambda r: 1 - r,
    'LTCG_PROPERTY': lambda r: 0.80,
    'CRYPTO':        lambda r: 0.70,
    'SGB':           lambda r: 1.00,
    'NPS':           lambda r: 0.88,
}

ASSET_TAX_LABEL = {
    'TAX_FREE':'Tax-Free','LTCG_EQUITY':'LTCG 10%','STCG_EQUITY':'STCG 15%',
    'SLAB_RATE':'Slab Rate','LTCG_PROPERTY':'LTCG 20%','CRYPTO':'30% Flat','SGB':'Tax-Free (SGB)','NPS':'Partly Tax-Free',
}

ASSETS = {
    'PPF':         {'cagr':7.1,  'color':'#4A9EE8','lock':'15yr',    'tax':'TAX_FREE'      },
    'SavingsAcc':  {'cagr':3.5,  'color':'#818cf8','lock':'None',    'tax':'SLAB_RATE'     },
    'FD':          {'cagr':7.2,  'color':'#7c8cf8','lock':'1-5yr',   'tax':'SLAB_RATE'     },
    'NPS':         {'cagr':11.0, 'color':'#9B72CF','lock':'Till 60', 'tax':'NPS'           },
    'DebtMF':      {'cagr':7.5,  'color':'#60a5fa','lock':'None',    'tax':'SLAB_RATE'     },
    'Gold':        {'cagr':11.0, 'color':'#E8921A','lock':'None',    'tax':'LTCG_PROPERTY' },
    'SGB':         {'cagr':11.0, 'color':'#FFB84D','lock':'8yr',     'tax':'SGB'           },
    'ELSS':        {'cagr':14.0, 'color':'#1DB873','lock':'3yr',     'tax':'LTCG_EQUITY'   },
    'IndexMF':     {'cagr':13.0, 'color':'#34d399','lock':'None',    'tax':'LTCG_EQUITY'   },
    'LargeCapMF':  {'cagr':14.5, 'color':'#6ee7b7','lock':'None',    'tax':'LTCG_EQUITY'   },
    'MidSmallMF':  {'cagr':17.0, 'color':'#FFB84D','lock':'None',    'tax':'LTCG_EQUITY'   },
    'Stocks':      {'cagr':15.0, 'color':'#fb923c','lock':'None',    'tax':'LTCG_EQUITY'   },
    'RealEstate':  {'cagr':9.5,  'color':'#f472b6','lock':'5yr+',    'tax':'LTCG_PROPERTY' },
    'Bitcoin':     {'cagr':35.0, 'color':'#E84040','lock':'None',    'tax':'CRYPTO'        },
}

TEMPLATES = {
    'Conservative':    [('PPF',25),('FD',20),('NPS',20),('DebtMF',15),('SGB',10),('SavingsAcc',10)],
    'Moderate':        [('ELSS',20),('IndexMF',20),('PPF',15),('NPS',15),('SGB',15),('FD',15)],
    'Aggressive':      [('IndexMF',25),('LargeCapMF',20),('MidSmallMF',15),('ELSS',15),('SGB',10),('Stocks',10),('RealEstate',5)],
    'Very Aggressive': [('MidSmallMF',20),('Stocks',20),('IndexMF',20),('Bitcoin',10),('SGB',10),('ELSS',10),('RealEstate',10)],
}
TAX_OPT = [('ELSS',25),('NPS',20),('PPF',25),('IndexMF',15),('SGB',15)]

# ─── TAX ENGINE v4 ────────────────────────────────────────────────────────────

def compute_tax(inc: MultiIncome, age: int, entity: str, loans: LoanDeductions, tracker: TrackerDeductions) -> dict:
    is_senior = age >= 60
    is_huf    = entity == 'huf'

    agri         = inc.agricultural
    rental_tx    = inc.rental * 0.70
    sav_exempt   = 50_000 if (is_senior or is_huf) else 10_000
    sav_tx       = max(0, inc.savings_int - sav_exempt)
    ltcg_exempt  = 125_000
    ltcg_eq_tx   = max(0, inc.ltcg_equity - ltcg_exempt)

    # Ordinary income (slab) — includes "other" at slab ← FIX
    ordinary = (inc.salary + inc.business + inc.freelance + rental_tx +
                inc.fd_interest + sav_tx + inc.dividends + inc.other)

    total_gross = (inc.salary + inc.business + inc.freelance + inc.rental +
                   inc.fd_interest + inc.savings_int + inc.dividends +
                   inc.ltcg_equity + inc.stcg_equity + inc.ltcg_property +
                   inc.agricultural + inc.crypto + inc.other)

    # Loan deductions (old regime)
    hl_int   = min(loans.home_loan_interest,  200_000)
    edu_int  = loans.education_loan_int
    hl_prin  = min(loans.home_loan_principal, 150_000)  # part of 80C

    # Tracker-derived 80D
    tracker_80d = min(
        (tracker.health80D + tracker.parents80D),
        100_000 if is_senior else 75_000
    )

    # ── New regime ───────────────────────────────────────────────────────────
    new_ord = _new_regime(ordinary, agri)

    # ── Old regime ───────────────────────────────────────────────────────────
    old_deductions = {
        'd80C': min(150_000, 150_000 + hl_prin),  # home loan principal in 80C
        'd80D': tracker_80d or (50_000 if is_senior else 25_000),
        'nps':  50_000,
        's24b': hl_int,
        's80E': edu_int,
    }
    old_ord = _old_regime(ordinary, agri, old_deductions, is_senior, is_huf)

    # ── Special taxes (same both regimes) ────────────────────────────────────
    ltcg_tax   = ltcg_eq_tx   * 0.10
    stcg_tax   = inc.stcg_equity * 0.15
    prop_tax   = inc.ltcg_property * 0.20
    crypto_tax = inc.crypto    * 0.30
    special    = (ltcg_tax + stcg_tax + prop_tax + crypto_tax) * 1.04

    new_total = new_ord['tax'] + special
    old_total = old_ord['tax'] + special
    best_new  = new_total <= old_total
    best_tax  = min(new_total, old_total)

    # ← KEY: separate slab rates for each regime
    new_slab  = _marginal(new_ord['taxable'], 'new')
    old_slab  = _marginal(old_ord['taxable'], 'old')

    return {
        'total_gross_income':   round(total_gross),
        'ordinary_gross':       round(ordinary),
        'agri_income':          round(agri),
        'rental_taxable':       round(rental_tx),
        'savings_taxable':      round(sav_tx),
        'savings_exemption':    sav_exempt,
        'ltcg_equity_taxable':  round(ltcg_eq_tx),
        'ltcg_equity_tax':      round(ltcg_tax),
        'stcg_equity_tax':      round(stcg_tax),
        'ltcg_property_tax':    round(prop_tax),
        'crypto_tax':           round(crypto_tax),
        'special_tax_total':    round(special),
        'new_regime':           {**new_ord, 'total_tax': round(new_total)},
        'old_regime':           {**old_ord, 'total_tax': round(old_total)},
        'best_regime':          'new' if best_new else 'old',
        'best_tax':             round(best_tax),
        'tax_saving':           round(abs(new_total - old_total)),
        'new_slab_rate':        new_slab,
        'old_slab_rate':        old_slab,
        'marginal_slab_rate':   new_slab if best_new else old_slab,
        'tracker_deductions_used': round(tracker_80d) if tracker_80d else 0,
        'loan_deductions_used': round(hl_int + edu_int),
    }


def _new_regime(gross: float, agri: float = 0) -> dict:
    taxable = max(0.0, gross - 75_000)
    if agri > 0 and taxable > 0:
        tax = max(0, _ns(taxable + agri) - _ns(250_000 + agri))
    elif taxable <= 1_200_000:
        return {'tax':0,'taxable':round(taxable),'regime':'new','rebate':True}
    else:
        tax = _ns(taxable)
    return {'tax':round(tax*1.04),'taxable':round(taxable),'regime':'new','rebate':False}

def _ns(income: float) -> float:
    s=[(400_000,.0),(400_000,.05),(400_000,.10),(400_000,.15),(400_000,.20),(400_000,.25),(float('inf'),.30)]
    t,r=0.0,income
    for sl,rt in s:
        if r<=0: break
        t+=min(r,sl)*rt; r-=sl
    return t

def _old_regime(gross:float, agri:float, d:dict, senior:bool, huf:bool) -> dict:
    std  = 0 if huf else 50_000
    d80C = min(d.get('d80C',150_000), 150_000)
    d80D = min(d.get('d80D',25_000),  75_000)
    nps  = min(d.get('nps',50_000),   50_000)
    s24b = min(d.get('s24b',0),       200_000)
    s80E = d.get('s80E',0)
    txbl = max(0.0, gross - std - d80C - d80D - nps - s24b - s80E)
    basic = 300_000 if senior else 250_000
    if agri > 0 and txbl > 0:
        tax = max(0, _os(txbl+agri,senior) - _os(basic+agri,senior))
    elif txbl <= 500_000:
        return {'tax':0,'taxable':round(txbl),'regime':'old','rebate':True}
    else:
        tax = _os(txbl, senior)
    return {'tax':round(tax*1.04),'taxable':round(txbl),'regime':'old','rebate':False}

def _os(income:float, senior:bool=False) -> float:
    basic = 300_000 if senior else 250_000
    s=[(basic,.0),(250_000,.05),(500_000,.20),(float('inf'),.30)]
    t,r=0.0,income
    for sl,rt in s:
        if r<=0: break
        t+=min(r,sl)*rt; r-=sl
    return t

def _marginal(taxable:float, regime:str) -> float:
    if regime=='new':
        if taxable<=400_000: return 0.00
        if taxable<=800_000: return 0.05
        if taxable<=1_200_000: return 0.10
        if taxable<=1_600_000: return 0.15
        if taxable<=2_000_000: return 0.20
        if taxable<=2_400_000: return 0.25
        return 0.30
    else:
        if taxable<=250_000: return 0.00
        if taxable<=500_000: return 0.05
        if taxable<=1_000_000: return 0.20
        return 0.30

# ─── RISK + PORTFOLIO ─────────────────────────────────────────────────────────

def risk_profile(age, occ, income, savings) -> dict:
    s=0
    if age<25: s+=30
    elif age<35: s+=25
    elif age<45: s+=18
    elif age<55: s+=10
    else: s+=4
    low={'Government Employee','PSU Employee','Retired'}
    mid={'Salaried (MNC/Private)','Doctor / Lawyer (Professional)'}
    high={'Self-Employed / Freelancer','Business Owner','Startup Founder'}
    if occ in low: s+=10
    elif occ in mid: s+=18
    elif occ in high: s+=25
    else: s+=12
    r=savings/income if income else 0
    if r>=0.4: s+=20
    elif r>=0.25: s+=14
    else: s+=7
    if s<=35: return {'score':s,'label':'Conservative','color':'#4A9EE8'}
    if s<=55: return {'score':s,'label':'Moderate',    'color':'#E8921A'}
    if s<=70: return {'score':s,'label':'Aggressive',  'color':'#fb923c'}
    return           {'score':s,'label':'Very Aggressive','color':'#E84040'}

def build_portfolio(tmpl, savings, name, rl, slab_new, slab_old) -> dict:
    alloc=[]
    for key,pct in tmpl:
        a=ASSETS.get(key)
        if not a: continue
        fn=ASSET_TAX.get(a['tax'], lambda r:1.0)
        alloc.append({
            'key':key,'pct':pct,'amount':round(savings*pct/100),
            'cagr':a['cagr'],'color':a['color'],'lock':a['lock'],
            'tax_rule':a['tax'],
            'tax_rule_label': ASSET_TAX_LABEL.get(a['tax'],''),
            'post_tax_cagr_new': round(a['cagr']*fn(slab_new),2),
            'post_tax_cagr_old': round(a['cagr']*fn(slab_old),2),
        })
    pre      = round(sum(x['cagr']*x['pct']/100 for x in alloc),2)
    post_new = round(sum(x['post_tax_cagr_new']*x['pct']/100 for x in alloc),2)
    post_old = round(sum(x['post_tax_cagr_old']*x['pct']/100 for x in alloc),2)
    return {'name':name,'risk_label':rl,'alloc':alloc,
            'blended_cagr':pre,'blended_post_new':post_new,'blended_post_old':post_old}

def generate_portfolios(rl, savings, slab_new, slab_old, goals=None) -> list:
    keys=list(TEMPLATES); idx=keys.index(rl)
    safer = keys[max(0,idx-1)]; bolder=keys[min(3,idx+1)]
    return [
        build_portfolio(TEMPLATES[rl],     savings,'⭐ Recommended for You',rl,    slab_new,slab_old),
        build_portfolio(TEMPLATES[safer],  savings,'🛡️ Safer Alternative',  safer,  slab_new,slab_old),
        build_portfolio(TEMPLATES[bolder], savings,'🚀 Bolder Alternative', bolder, slab_new,slab_old),
        build_portfolio(TAX_OPT,           savings,'💰 Tax Optimizer',     'Moderate',slab_new,slab_old),
    ]

def project(cagr, savings, years=10):
    r=cagr/100
    return [{'year':f'Y{i}','value_lakhs':round(savings*((pow(1+r,i)-1)/r)/100_000,2) if i>0 else 0}
            for i in range(years+1)]

# ─── CLAUDE ───────────────────────────────────────────────────────────────────

SYS = """You are an expert Indian CA and SEBI-registered advisor. FY 2026-27 India.
Key rules: 87A rebate ≤ ₹12L taxable. LTCG equity 10% above ₹1.25L. Debt MF at slab.
Crypto 30% flat, 1% TDS, no deductions. Rental 30% std deduction. SGB maturity tax-free.
Agricultural income exempt but used for rate computation. HUF: same slabs, no senior benefit.
Be specific. Cite sections. Mention regime. 3-6 lines max."""

def claude():
    k=os.getenv("ANTHROPIC_API_KEY")
    if not k: raise HTTPException(500,"ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(api_key=k)

# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health(): return {"status":"ok","version":"4.0.0","fy":"2026-27"}

@app.post("/analyze")
@limiter.limit("60/minute")
async def analyze(request: Request, p: UserProfile):
    inc      = p.incomes
    tax      = compute_tax(inc, p.age, p.entity_type, p.loan_deductions, p.tracker_deductions)
    total_inc= tax['total_gross_income']
    rp       = risk_profile(p.age, p.occupation, total_inc, p.annual_savings)
    rl       = p.risk_preference if p.risk_preference in TEMPLATES else rp['label']
    portfolios = generate_portfolios(rl, p.annual_savings, tax['new_slab_rate'], tax['old_slab_rate'])
    projs    = {
        port['name']: {
            'pre_tax':   project(port['blended_cagr'],    p.annual_savings, p.projection_years),
            'post_new':  project(port['blended_post_new'], p.annual_savings, p.projection_years),
            'post_old':  project(port['blended_post_old'], p.annual_savings, p.projection_years),
        }
        for port in portfolios
    }
    return {
        'profile':     {'total_income':total_inc,'savings':p.annual_savings,'age':p.age,
                        'occupation':p.occupation,'entity_type':p.entity_type},
        'tax':         tax,
        'risk_profile':rp,
        'portfolios':  portfolios,
        'projections': projs,
    }

@app.post("/ai/explain-portfolio")
@limiter.limit("10/minute")
async def explain(request: Request, req: AIPortfolioRequest):
    p    = req.profile
    top3 = ", ".join(f"{a.label} ({a.pct}%, post-tax ~{a.post_tax_cagr}%)" for a in req.portfolio_assets[:3])
    slab = int(req.marginal_slab_rate*100)
    incomes_with_values = {k:v for k,v in p.incomes.model_dump().items() if v>0}
    prompt = f"""Profile: Age {p.age}, {p.occupation}, {p.entity_type.upper()}, slab {slab}%
Income sources: {list(incomes_with_values.keys())}
Savings: ₹{p.annual_savings:,.0f}/yr, Risk: {req.risk_label}
Portfolio "{req.portfolio_name}": {top3}

3-4 sentences: why this allocation suits their multi-source income profile,
best post-tax instruments at {slab}% slab, one tax optimisation tip for their income mix. India FY 2026-27."""
    c   = claude()
    msg = c.messages.create(model="claude-sonnet-4-20250514",max_tokens=600,
                             system=SYS,messages=[{"role":"user","content":prompt}])
    return {"explanation":msg.content[0].text}

@app.post("/ai/tax-advisor")
@limiter.limit("15/minute")
async def tax_advisor(request: Request, req: AIAdvisorRequest):
    ctx=""
    if req.user_profile:
        p=req.user_profile
        ctx=f"\nUser: income ₹{p.get('total_income',0):,}, age {p.get('age','?')}, slab {int(p.get('marginal_slab_rate',0.30)*100)}%, {p.get('occupation','?')}\n"
    c   = claude()
    msg = c.messages.create(model="claude-sonnet-4-20250514",max_tokens=600,
                             system=SYS+ctx,messages=[{"role":"user","content":req.question}])
    return {"answer":msg.content[0].text}
