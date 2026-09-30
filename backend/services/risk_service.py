from __future__ import annotations

import hashlib
from datetime import date
from typing import Literal

from schemas import OfferDetails, RiskSignals


def mock_debtor_risk_profile(debtor_name: str | None) -> RiskSignals:
    if not debtor_name:
        return RiskSignals(
            company_size="small",
            filing_history="minor_issues",
            credit_rating="average",
            risk_score=55,
            risk_level="medium",
        )

    seed_source = debtor_name
    seed = int(hashlib.sha256(seed_source.encode("utf-8")).hexdigest()[:8], 16)

    size_options: list[Literal["micro", "small", "medium", "large"]] = ["micro", "small", "medium", "large"]
    filing_options: list[Literal["clean", "minor_issues", "concerning"]] = ["clean", "minor_issues", "concerning"]
    credit_options: list[Literal["weak", "average", "strong"]] = ["weak", "average", "strong"]

    company_size = size_options[seed % len(size_options)]
    filing_history = filing_options[(seed // 10) % len(filing_options)]
    credit_rating = credit_options[(seed // 100) % len(credit_options)]

    score = 60
    score += {"micro": 12, "small": 6, "medium": -3, "large": -10}[company_size]
    score += {"clean": -10, "minor_issues": 5, "concerning": 18}[filing_history]
    score += {"strong": -12, "average": 3, "weak": 15}[credit_rating]

    score = max(0, min(100, score))
    if score >= 70:
        level: Literal["low", "medium", "high"] = "high"
    elif score >= 45:
        level = "medium"
    else:
        level = "low"

    return RiskSignals(
        company_size=company_size,
        filing_history=filing_history,
        credit_rating=credit_rating,
        risk_score=score,
        risk_level=level,
    )


def calculate_offer(
    amount: float,
    due_dt: date | None,
    risk: RiskSignals,
    suspicious: bool,
) -> OfferDetails:
    base_advance = {"low": 0.90, "medium": 0.80, "high": 0.70}[risk.risk_level]
    fee = {"low": 0.02, "medium": 0.035, "high": 0.05}[risk.risk_level]

    if due_dt:
        days_until_due = (due_dt - date.today()).days
        if days_until_due < 7:
            base_advance -= 0.03
            fee += 0.005
        elif days_until_due > 45:
            base_advance += 0.01

    if suspicious:
        base_advance -= 0.03
        fee += 0.005

    advance_rate = max(0.70, min(0.90, base_advance))
    fee_rate = max(0.02, min(0.06, fee))
    advance_amount = round(amount * advance_rate, 2)
    fee_amount = round(amount * fee_rate, 2)
    payout_timeline = "Same day" if risk.risk_level == "low" else "Within 24 hours"

    return OfferDetails(
        advance_rate=round(advance_rate, 3),
        advance_amount=advance_amount,
        fee_rate=round(fee_rate, 3),
        fee_amount=fee_amount,
        payout_timeline=payout_timeline,
    )

