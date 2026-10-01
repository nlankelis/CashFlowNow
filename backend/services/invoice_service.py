from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from typing import Literal

from fastapi import HTTPException

from config import (
    MANUAL_REVIEW_AMOUNT_THRESHOLD,
    MAX_PDF_SIZE_BYTES,
    REJECT_AMOUNT_THRESHOLD,
)
from database import get_db_connection
from schemas import (
    ExtractedInvoiceFields,
    FraudSignals,
    InvoiceDecisionResponse,
    InvoiceHistoryItemResponse,
    InvoiceHistoryRecordResponse,
    OfferDetails,
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


def analyze_invoice(
    file_name: str,
    file_content: bytes,
    user_id: int,
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

    # Persistent duplicate & fraud checks via SQLite database
    with get_db_connection() as conn:
        dup_file = conn.execute(
            "SELECT id FROM invoices WHERE file_hash = ? LIMIT 1",
            (file_hash,),
        ).fetchone()
        duplicate_file = dup_file is not None

        duplicate_invoice_number = False
        if invoice_number:
            dup_num = conn.execute(
                "SELECT id FROM invoices WHERE user_id = ? AND invoice_number = ? LIMIT 1",
                (user_id, invoice_number),
            ).fetchone()
            duplicate_invoice_number = dup_num is not None

        dup_profile = conn.execute(
            """
            SELECT id FROM invoices
            WHERE user_id = ? AND invoice_number = ? AND amount = ? AND due_date = ? AND debtor_name = ?
            LIMIT 1
            """,
            (user_id, invoice_number, amount, due_dt.isoformat() if due_dt else None, debtor_name),
        ).fetchone()
        duplicate_invoice_profile = dup_profile is not None

        past_sig_rows = conn.execute(
            "SELECT layout_signature FROM invoices WHERE user_id = ? AND layout_signature IS NOT NULL ORDER BY id DESC LIMIT 50",
            (user_id,),
        ).fetchall()
        past_signatures = {r["layout_signature"] for r in past_sig_rows}

    is_overdue = bool(due_dt and due_dt < date.today())
    amount_outlier = bool(amount and amount > MANUAL_REVIEW_AMOUNT_THRESHOLD)

    layout_signature = build_layout_signature(raw_text)
    format_consistent = None if not past_signatures else layout_signature in past_signatures

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

    decision_response = InvoiceDecisionResponse(
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

    # Persist the processed invoice into SQLite
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO invoices (
                user_id, file_hash, invoice_number, amount, due_date, debtor_name,
                decision, raw_ocr_text, layout_signature, offer_json, decision_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                file_hash,
                invoice_number,
                amount,
                due_dt.isoformat() if due_dt else None,
                debtor_name,
                decision,
                raw_text[:2000],
                layout_signature,
                offer.model_dump_json() if offer else None,
                decision_response.model_dump_json(),
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()

    return decision_response


def get_user_invoices(user_id: int) -> list[InvoiceHistoryRecordResponse]:
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, user_id, file_hash, invoice_number, amount, due_date, debtor_name,
                   decision, offer_json, decision_json, created_at
            FROM invoices
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user_id,),
        ).fetchall()

    items: list[InvoiceHistoryRecordResponse] = []
    for row in rows:
        created_at_str = str(row["created_at"])
        if row["decision_json"]:
            try:
                dec_data = json.loads(row["decision_json"])
                items.append(
                    InvoiceHistoryRecordResponse(
                        history_id=str(row["id"]),
                        processed_at=created_at_str,
                        filename=dec_data.get("filename", "invoice.pdf"),
                        extracted_fields=ExtractedInvoiceFields(**dec_data.get("extracted_fields", {})),
                        validation_checks=ValidationChecks(**dec_data.get("validation_checks", {})),
                        risk=dec_data.get("risk", mock_debtor_risk_profile(row["debtor_name"])),
                        fraud_signals=dec_data.get("fraud_signals", {
                            "debtor_email_domain_matches_company": None,
                            "format_consistent_with_history": None,
                            "suspicious_submitter_pattern": False,
                            "flags": [],
                        }),
                        decision=dec_data.get("decision", row["decision"]),
                        decision_reasons=dec_data.get("decision_reasons", []),
                        offer=OfferDetails(**dec_data["offer"]) if dec_data.get("offer") else None,
                        processing_time_ms=0,
                    )
                )
                continue
            except Exception:
                pass

        offer_data = None
        if row["offer_json"]:
            try:
                offer_data = OfferDetails(**json.loads(row["offer_json"]))
            except Exception:
                offer_data = None

        items.append(
            InvoiceHistoryRecordResponse(
                history_id=str(row["id"]),
                processed_at=created_at_str,
                filename="invoice.pdf",
                extracted_fields=ExtractedInvoiceFields(
                    invoice_number=row["invoice_number"],
                    amount=float(row["amount"]) if row["amount"] is not None else None,
                    due_date=row["due_date"],
                    debtor_name=row["debtor_name"],
                    debtor_email=None,
                    debtor_phone=None,
                ),
                validation_checks=ValidationChecks(
                    missing_fields=[],
                    is_overdue=False,
                    duplicate_file=False,
                    duplicate_invoice_number=False,
                    duplicate_invoice_profile=False,
                    amount_outlier=False,
                ),
                risk=mock_debtor_risk_profile(row["debtor_name"]),
                fraud_signals=FraudSignals(
                    debtor_email_domain_matches_company=None,
                    format_consistent_with_history=None,
                    suspicious_submitter_pattern=False,
                    flags=[],
                ),
                decision=str(row["decision"]),
                decision_reasons=[],
                offer=offer_data,
                processing_time_ms=0,
            )
        )
    return items
