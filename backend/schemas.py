from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel


class ExtractedInvoiceFields(BaseModel):
    invoice_number: str | None
    amount: float | None
    due_date: str | None
    debtor_name: str | None
    debtor_email: str | None
    debtor_phone: str | None


class ValidationChecks(BaseModel):
    missing_fields: list[str]
    is_overdue: bool
    duplicate_file: bool
    duplicate_invoice_number: bool
    duplicate_invoice_profile: bool
    amount_outlier: bool


class RiskSignals(BaseModel):
    company_size: Literal["micro", "small", "medium", "large"]
    filing_history: Literal["clean", "minor_issues", "concerning"]
    credit_rating: Literal["weak", "average", "strong"]
    risk_score: int
    risk_level: Literal["low", "medium", "high"]


class FraudSignals(BaseModel):
    debtor_email_domain_matches_company: bool | None
    format_consistent_with_history: bool | None
    suspicious_submitter_pattern: bool
    flags: list[str]


class OfferDetails(BaseModel):
    advance_rate: float
    advance_amount: float
    fee_rate: float
    fee_amount: float
    payout_timeline: str


class InvoiceDecisionResponse(BaseModel):
    filename: str
    extracted_fields: ExtractedInvoiceFields
    validation_checks: ValidationChecks
    risk: RiskSignals
    fraud_signals: FraudSignals
    decision: Literal["approved", "manual_review", "rejected"]
    decision_reasons: list[str]
    offer: OfferDetails | None


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUserResponse(BaseModel):
    id: int
    full_name: str
    email: str


class AuthResponse(BaseModel):
    user: AuthUserResponse


class SupplementalInvoiceFields(BaseModel):
    invoice_number: str | None = None
    amount: float | None = None
    due_date: date | None = None
    debtor_name: str | None = None
    debtor_email: str | None = None
    debtor_phone: str | None = None

