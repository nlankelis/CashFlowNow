from __future__ import annotations

import hashlib
from collections import Counter, deque
from datetime import date
from typing import Literal

from fastapi import HTTPException

from config import (
    MANUAL_REVIEW_AMOUNT_THRESHOLD,
    MAX_LAYOUT_SIGNATURES,
    MAX_PDF_SIZE_BYTES,
    REJECT_AMOUNT_THRESHOLD,
)
from schemas import (
    ExtractedInvoiceFields,
    FraudSignals,
    InvoiceDecisionResponse,
    SupplementalInvoiceFields,
    ValidationChecks,
)
from services.risk_service import calculate_offer, mock_debtor_risk_profile
from utils.extractors import (
    build_layout_signature,
    debtor_email_matches_company,
    parse_amount,
    parse_debtor_name,
    parse_due_date,
    parse_email,
    parse_invoice_number,
    parse_phone,
)
from utils.pdf_parser import parse_pdf_text

seen_file_hashes: set[str] = set()
seen_invoice_numbers: set[str] = set()
invoice_key_counter: Counter[str] = Counter()
layout_signatures: deque[str] = deque(maxlen=MAX_LAYOUT_SIGNATURES)


def analyze_invoice(
    file_name: str,
    file_content: bytes,
    supplemental: SupplementalInvoiceFields | None = None,
) -> InvoiceDecisionResponse:
    if len(file_content) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="PDF too large. Max size is 10MB.")

    raw_text = parse_pdf_text(file_content)
    if not raw_text:
        raise HTTPException(
            status_code=422,
            detail="No readable text found in PDF. Please upload a searchable PDF for MVP processing.",
        )

    file_hash = hashlib.sha256(file_content).hexdigest()
    invoice_number = parse_invoice_number(raw_text)
    amount = parse_amount(raw_text)
    due_dt = parse_due_date(raw_text)
    debtor_name = parse_debtor_name(raw_text)
    debtor_email = parse_email(raw_text)
    debtor_phone = parse_phone(raw_text)

    if supplemental:
        invoice_number = invoice_number or supplemental.invoice_number
        amount = amount if amount is not None else supplemental.amount
        due_dt = due_dt or supplemental.due_date
        debtor_name = debtor_name or supplemental.debtor_name
        debtor_email = debtor_email or supplemental.debtor_email
        debtor_phone = debtor_phone or supplemental.debtor_phone

    missing_fields = []
    if not invoice_number:
        missing_fields.append("invoice_number")
    if amount is None:
        missing_fields.append("amount")
    if not due_dt:
        missing_fields.append("due_date")
    if not debtor_name:
        missing_fields.append("debtor_name")

    duplicate_file = file_hash in seen_file_hashes
    duplicate_invoice_number = bool(invoice_number and invoice_number in seen_invoice_numbers)
    invoice_profile_key = f"{invoice_number}|{amount}|{due_dt}|{debtor_name}"
    duplicate_invoice_profile = invoice_key_counter[invoice_profile_key] > 0

    is_overdue = bool(due_dt and due_dt < date.today())
    amount_outlier = bool(amount and amount > MANUAL_REVIEW_AMOUNT_THRESHOLD)

    layout_signature = build_layout_signature(raw_text)
    format_consistent = None if not layout_signatures else layout_signature in set(layout_signatures)

    debtor_domain_ok = debtor_email_matches_company(debtor_email, debtor_name)
    suspicious_pattern = duplicate_file or duplicate_invoice_profile

    fraud_flags = []
    if debtor_domain_ok is False:
        fraud_flags.append("Debtor email domain does not match debtor company name.")
    if format_consistent is False:
        fraud_flags.append("Invoice format differs from prior uploads.")
    if suspicious_pattern:
        fraud_flags.append("Invoice submission pattern appears duplicated.")

    risk = mock_debtor_risk_profile(debtor_name)

    reasons = []
    decision: Literal["approved", "manual_review", "rejected"] = "approved"

    if duplicate_file or duplicate_invoice_number:
        decision = "rejected"
        reasons.append("Duplicate invoice detected.")
    elif missing_fields:
        decision = "manual_review"
        reasons.append(f"Missing fields: {', '.join(missing_fields)}.")
    elif is_overdue:
        decision = "rejected"
        reasons.append("Invoice is already overdue.")
    elif risk.risk_level == "high":
        decision = "rejected"
        reasons.append("Debtor risk level is high.")
    elif amount and amount > REJECT_AMOUNT_THRESHOLD:
        decision = "rejected"
        reasons.append("Invoice value exceeds automatic processing limit.")
    elif amount_outlier or suspicious_pattern:
        decision = "manual_review"
        if amount_outlier:
            reasons.append("Invoice amount exceeds auto-approval threshold.")
        if suspicious_pattern:
            reasons.append("Potential fraud pattern requires manual review.")
    else:
        reasons.append("Invoice passed MVP validation and risk checks.")

    offer = None
    if amount and decision in {"approved", "manual_review"}:
        offer = calculate_offer(amount=amount, due_dt=due_dt, risk=risk, suspicious=suspicious_pattern)

    # Update in-memory history after evaluation.
    seen_file_hashes.add(file_hash)
    if invoice_number:
        seen_invoice_numbers.add(invoice_number)
    invoice_key_counter[invoice_profile_key] += 1
    layout_signatures.append(layout_signature)

    return InvoiceDecisionResponse(
        filename=file_name,
        extracted_fields=ExtractedInvoiceFields(
            invoice_number=invoice_number,
            amount=round(amount, 2) if amount is not None else None,
            due_date=due_dt.isoformat() if due_dt else None,
            debtor_name=debtor_name,
            debtor_email=debtor_email,
            debtor_phone=debtor_phone,
        ),
        validation_checks=ValidationChecks(
            missing_fields=missing_fields,
            is_overdue=is_overdue,
            duplicate_file=duplicate_file,
            duplicate_invoice_number=duplicate_invoice_number,
            duplicate_invoice_profile=duplicate_invoice_profile,
            amount_outlier=amount_outlier,
        ),
        risk=risk,
        fraud_signals=FraudSignals(
            debtor_email_domain_matches_company=debtor_domain_ok,
            format_consistent_with_history=format_consistent,
            suspicious_submitter_pattern=suspicious_pattern,
            flags=fraud_flags,
        ),
        decision=decision,
        decision_reasons=reasons,
        offer=offer,
    )

