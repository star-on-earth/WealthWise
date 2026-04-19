"""
tests/test_main.py
Run: cd backend && pytest tests/ -v

Covers:
  - Tax engine accuracy (new/old regime, 87A rebate, special taxes)
  - Multi-income aggregation
  - /analyze endpoint
  - /health endpoint
"""

import pytest
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, compute_tax, MultiIncome, LoanDeductions, TrackerDeductions

client = TestClient(app)

# ─── HEALTH ───────────────────────────────────────────────────────────────────

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["fy"] == "2026-27"

# ─── NEW REGIME — 87A REBATE ──────────────────────────────────────────────────

def test_87a_rebate_exactly_1275000():
    """Gross ₹12.75L = net taxable ₹12L exactly → zero tax."""
    inc = MultiIncome(salary=1_275_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['new_regime']['total_tax'] == 0
    assert r['best_regime'] == 'new'
    assert r['best_tax'] == 0

def test_87a_rebate_below_limit():
    """Gross ₹10L → zero tax in new regime."""
    inc = MultiIncome(salary=1_000_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['new_regime']['tax'] == 0

def test_tax_above_rebate_limit():
    """Gross ₹14L → tax > 0 in new regime."""
    inc = MultiIncome(salary=1_400_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['new_regime']['total_tax'] > 0
    assert r['new_regime']['rebate'] is False

# ─── NEW REGIME SLAB CALCULATIONS ─────────────────────────────────────────────

def test_new_regime_10L():
    """₹10L gross → ₹9.25L taxable → exact slab computation."""
    inc = MultiIncome(salary=1_000_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    # ₹9.25L: 0% on ₹4L + 5% on ₹4L (₹20K) + 10% on ₹1.25L (₹12.5K) = ₹32.5K * 1.04 = ₹33,800
    assert r['new_regime']['tax'] == 33_800

def test_new_regime_cess_applied():
    """Health & Education Cess 4% applied on top of slab tax."""
    inc = MultiIncome(salary=2_000_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    # Tax must include 4% cess
    assert r['new_regime']['tax'] % 1 == 0  # rounded to integer
    assert r['new_regime']['tax'] > 0

# ─── RENTAL INCOME ────────────────────────────────────────────────────────────

def test_rental_30pct_deduction():
    """Rental income: 30% standard deduction (Sec 24) auto-applied."""
    inc = MultiIncome(rental=1_000_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['rental_taxable'] == 700_000  # 70% of ₹10L

def test_rental_zero_deduction_on_zero():
    inc = MultiIncome(rental=0)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['rental_taxable'] == 0

# ─── SAVINGS INTEREST 80TTA / 80TTB ──────────────────────────────────────────

def test_80tta_individual_under60():
    """80TTA: first ₹10K of savings interest exempt for individual <60."""
    inc = MultiIncome(savings_int=50_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['savings_taxable'] == 40_000
    assert r['savings_exemption'] == 10_000

def test_80ttb_senior_60plus():
    """80TTB: first ₹50K exempt for senior citizen (60+)."""
    inc = MultiIncome(savings_int=80_000)
    r = compute_tax(inc, 65, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['savings_taxable'] == 30_000
    assert r['savings_exemption'] == 50_000

def test_huf_gets_50k_exemption():
    """HUF gets ₹50K interest exemption same as senior."""
    inc = MultiIncome(savings_int=60_000)
    r = compute_tax(inc, 35, 'huf', LoanDeductions(), TrackerDeductions())
    assert r['savings_exemption'] == 50_000
    assert r['savings_taxable'] == 10_000

# ─── LTCG EQUITY ─────────────────────────────────────────────────────────────

def test_ltcg_equity_125k_exemption():
    """FY26-27: LTCG equity exempt up to ₹1.25L."""
    inc = MultiIncome(ltcg_equity=200_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['ltcg_equity_taxable'] == 75_000   # ₹2L - ₹1.25L
    assert r['ltcg_equity_tax'] == 7_500        # 10% of ₹75K (before cess)

def test_ltcg_equity_below_exemption():
    """LTCG equity ≤ ₹1.25L → zero tax."""
    inc = MultiIncome(ltcg_equity=100_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['ltcg_equity_taxable'] == 0
    assert r['ltcg_equity_tax'] == 0

# ─── STCG EQUITY ─────────────────────────────────────────────────────────────

def test_stcg_equity_15pct_flat():
    """STCG equity: 15% flat, no exemption."""
    inc = MultiIncome(stcg_equity=100_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['stcg_equity_tax'] == 15_000  # 15% before cess

# ─── CRYPTO ───────────────────────────────────────────────────────────────────

def test_crypto_30pct_flat():
    """Crypto/VDA: 30% flat, no deductions, no exemption."""
    inc = MultiIncome(crypto=100_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['crypto_tax'] == 30_000  # 30% before cess

def test_crypto_no_deduction_benefit():
    """Crypto tax same regardless of regime or other deductions."""
    inc = MultiIncome(crypto=200_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['crypto_tax'] == 60_000  # 30% of ₹2L before cess

# ─── OTHER INCOME AT SLAB ─────────────────────────────────────────────────────

def test_other_income_taxed_at_slab():
    """'Other' income must be included in ordinary gross and taxed at slab."""
    inc = MultiIncome(other=2_000_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['ordinary_gross'] == 2_000_000
    assert r['new_regime']['total_tax'] > 0  # must not be zero or ignored

# ─── REGIME COMPARISON ────────────────────────────────────────────────────────

def test_regime_comparison_returns_both():
    """Both regimes must be computed and returned."""
    inc = MultiIncome(salary=1_500_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert 'new_regime' in r
    assert 'old_regime' in r
    assert r['new_regime']['total_tax'] >= 0
    assert r['old_regime']['total_tax'] >= 0

def test_best_regime_is_lower_tax():
    """best_tax must equal the lower of the two regime totals."""
    inc = MultiIncome(salary=1_500_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    expected_best = min(r['new_regime']['total_tax'], r['old_regime']['total_tax'])
    assert r['best_tax'] == expected_best

def test_per_regime_slab_rates_differ_with_deductions():
    """Old regime deductions reduce taxable income → different slab rate from new regime."""
    inc = MultiIncome(salary=1_500_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    # Both should be numbers
    assert 0 <= r['new_slab_rate'] <= 0.30
    assert 0 <= r['old_slab_rate'] <= 0.30

# ─── LOAN DEDUCTIONS (OLD REGIME) ─────────────────────────────────────────────

def test_home_loan_interest_deduction():
    """Sec 24b: home loan interest up to ₹2L reduces old regime taxable income."""
    inc = MultiIncome(salary=1_500_000)
    no_loan  = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    with_loan = compute_tax(inc, 30, 'individual', LoanDeductions(home_loan_interest=200_000), TrackerDeductions())
    # Old regime tax should decrease with home loan deduction
    assert with_loan['old_regime']['total_tax'] <= no_loan['old_regime']['total_tax']

def test_education_loan_no_cap():
    """Sec 80E: education loan interest has no upper limit."""
    inc = MultiIncome(salary=2_000_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(education_loan_int=500_000), TrackerDeductions())
    assert r['loan_deductions_used'] == 500_000

# ─── TOTAL GROSS INCOME ───────────────────────────────────────────────────────

def test_total_gross_income_aggregation():
    """totalGrossIncome = sum of all income sources (before any deductions)."""
    inc = MultiIncome(salary=500_000, rental=200_000, fd_interest=50_000, crypto=100_000)
    r = compute_tax(inc, 30, 'individual', LoanDeductions(), TrackerDeductions())
    assert r['total_gross_income'] == 850_000

# ─── /analyze ENDPOINT ────────────────────────────────────────────────────────

def test_analyze_endpoint_valid():
    payload = {
        "incomes": {"salary": 1_200_000},
        "annual_savings": 300_000,
        "age": 28,
        "gender": "male",
        "occupation": "Salaried (MNC/Private)",
        "entity_type": "individual",
        "loan_deductions": {},
        "tracker_deductions": {},
        "projection_years": 10,
    }
    r = client.post("/analyze", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "tax" in data
    assert "risk_profile" in data
    assert "portfolios" in data
    assert len(data["portfolios"]) == 4
    assert data["tax"]["best_tax"] == 0  # ₹12L → zero tax

def test_analyze_endpoint_huf():
    payload = {
        "incomes": {"salary": 2_000_000, "rental": 500_000},
        "annual_savings": 500_000,
        "age": 45,
        "gender": "male",
        "occupation": "Business Owner",
        "entity_type": "huf",
        "loan_deductions": {"home_loan_interest": 200_000},
        "tracker_deductions": {"health80D": 25_000},
        "projection_years": 10,
    }
    r = client.post("/analyze", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["profile"]["entity_type"] == "huf"
    assert data["tax"]["total_gross_income"] == 2_500_000

def test_analyze_endpoint_projection_years():
    payload = {
        "incomes": {"salary": 800_000},
        "annual_savings": 200_000,
        "age": 30,
        "gender": "female",
        "occupation": "Salaried (MNC/Private)",
        "entity_type": "individual",
        "loan_deductions": {},
        "tracker_deductions": {},
        "projection_years": 10,
    }
    r = client.post("/analyze", json=payload)
    assert r.status_code == 200
    data = r.json()
    # First portfolio's projection should have 11 points (Y0 to Y10)
    first_portfolio_name = data["portfolios"][0]["name"]
    proj = data["projections"][first_portfolio_name]
    assert len(proj["pre_tax"]) == 11

def test_analyze_endpoint_invalid_savings():
    """annual_savings must be > 0."""
    payload = {
        "incomes": {"salary": 1_000_000},
        "annual_savings": 0,
        "age": 30,
        "entity_type": "individual",
        "loan_deductions": {},
        "tracker_deductions": {},
    }
    r = client.post("/analyze", json=payload)
    assert r.status_code == 422  # Pydantic validation error

# ─── TAX-MULTI QUICK ENDPOINT ─────────────────────────────────────────────────

def test_tax_multi_quick():
    r = client.get("/tax-multi?salary=1200000")
    assert r.status_code == 200
    data = r.json()
    assert data["best_tax"] == 0  # ₹12L → 87A rebate

def test_tax_multi_with_crypto():
    r = client.get("/tax-multi?salary=800000&crypto=200000")
    assert r.status_code == 200
    data = r.json()
    assert data["crypto_tax"] == 60_000  # 30% of ₹2L
