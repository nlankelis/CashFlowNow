from __future__ import annotations

import hashlib
import os
import re
import sqlite3
import zlib
from collections import Counter, deque
from datetime import date, datetime
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CashFlowNow API")

DEFAULT_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://nlankelis.github.io",
    "https://cash-flow-now-ten.vercel.app",
]
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", ",".join(DEFAULT_ALLOWED_ORIGINS)).split(",")
    if origin.strip()
]
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024
MANUAL_REVIEW_AMOUNT_THRESHOLD = 150_000
REJECT_AMOUNT_THRESHOLD = 1_000_000
MAX_LAYOUT_SIGNATURES = 100
DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "cashflownow.db"))

seen_file_hashes: set[str] = set()
seen_invoice_numbers: set[str] = set()
invoice_key_counter: Counter[str] = Counter()
layout_signatures: deque[str] = deque(maxlen=MAX_LAYOUT_SIGNATURES)


def _get_db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _init_db() -> None:
    with _get_db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.commit()


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


_init_db()


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


def parse_pdf_text(file_content: bytes) -> str:
    chunks = []
    chunks.extend(_extract_pdf_operator_text(file_content))
    chunks.extend(_extract_struct_tag_text(file_content))

    # Extract compressed streams (common in production-generated invoices).
    for stream in re.findall(rb"stream\r?\n(.*?)\r?\nendstream", file_content, flags=re.DOTALL):
        for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS):
            try:
                inflated = zlib.decompress(stream, wbits)
                chunks.extend(_extract_pdf_operator_text(inflated))
                break
            except zlib.error:
                continue

    if not chunks:
        decoded = file_content.decode("latin-1", errors="ignore")
        chunks = re.findall(r"[A-Za-z0-9@#£$€:./_,\-]{3,}", decoded)

    text = "\n".join(_clean_pdf_string(chunk) for chunk in chunks if chunk.strip())
    return text.strip()


def _extract_pdf_operator_text(raw: bytes) -> list[str]:
    decoded = raw.decode("latin-1", errors="ignore")
    chunks = re.findall(r"\(([^()]*)\)\s*Tj", decoded)
    chunks.extend(re.findall(r"\(([^()]*)\)\s*TJ", decoded))
    chunks.extend(re.findall(r"\[(.*?)\]\s*TJ", decoded, flags=re.DOTALL))
    return chunks


def _extract_struct_tag_text(raw: bytes) -> list[str]:
    decoded = raw.decode("latin-1", errors="ignore")
    tags = []
    tags.extend(re.findall(r"/T\s*\((.*?)\)", decoded, flags=re.DOTALL))
    tags.extend(re.findall(r"/E\s*\((.*?)\)", decoded, flags=re.DOTALL))
    return tags


def _clean_pdf_string(value: str) -> str:
    return (
        value.replace("\\n", "\n")
        .replace("\\r", " ")
        .replace("\\t", " ")
        .replace("\\(", "(")
        .replace("\\)", ")")
        .strip()
    )


def _normalized_lines(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return []

    combined = []
    idx = 0
    while idx < len(lines):
        current = lines[idx]
        next_line = lines[idx + 1] if idx + 1 < len(lines) else ""
        pair = f"{current} {next_line}".lower().strip()

        if pair in {"bill to", "bill to:", "invoice to", "invoice to:", "sold to", "sold to:"}:
            combined.append(f"{current} {next_line}".strip())
            idx += 2
            continue

        combined.append(current)
        idx += 1

    return combined


def parse_amount(text: str) -> float | None:
    lines = _normalized_lines(text)
    if not lines:
        return None

    strong_amount_labels = (
        "amount due",
        "total due",
        "balance due",
        "invoice total",
        "grand total",
        "total payable",
        "amount payable",
        "payment due",
    )
    weak_amount_labels = ("amount", "total", "balance", "payable")
    negative_labels = ("vat", "tax", "subtotal", "sub total", "discount", "qty", "quantity")

    scored: list[tuple[int, float]] = []
    for line in lines:
        amount = _extract_money_value(line)
        if amount is None:
            continue

        lowered = line.lower()
        score = 0
        if any(label in lowered for label in strong_amount_labels):
            score += 100
        elif any(label in lowered for label in weak_amount_labels):
            score += 50
        if any(label in lowered for label in negative_labels):
            score -= 30
        if any(symbol in line for symbol in ("£", "$", "€", "GBP", "USD", "EUR")):
            score += 15

        scored.append((score, amount))

    if scored:
        scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return scored[0][1]

    # Final fallback: only high-confidence money-like numbers (no plain years/IDs).
    all_amounts = re.findall(
        r"(?:[£$€]\s*[0-9][0-9,]*(?:\.[0-9]{2})?|[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2})",
        text,
    )
    parsed = []
    for candidate in all_amounts:
        numeric = re.sub(r"[^0-9.]", "", candidate)
        try:
            parsed.append(float(numeric))
        except ValueError:
            continue
    return max(parsed) if parsed else None


def _extract_money_value(value: str) -> float | None:
    match = re.search(
        r"(?:GBP|USD|EUR|£|\$|€)\s*([0-9][0-9,]*(?:\.[0-9]{2})?)|([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?)|([0-9]+\.[0-9]{2})",
        value,
        flags=re.IGNORECASE,
    )
    if not match:
        return None

    candidate = next((group for group in match.groups() if group), None)
    if not candidate:
        return None

    try:
        return float(candidate.replace(",", ""))
    except ValueError:
        return None


def parse_due_date(text: str) -> date | None:
    lines = _normalized_lines(text)
    strong_date_labels = ("due date", "payment due", "due")
    weak_date_labels = ("date",)
    candidates: list[tuple[int, date]] = []

    for line in lines:
        lowered = line.lower()
        line_dates = _extract_dates_from_text(line)
        for parsed_dt in line_dates:
            score = 0
            if any(label in lowered for label in strong_date_labels):
                score += 100
            elif any(label in lowered for label in weak_date_labels):
                score += 30
            candidates.append((score, parsed_dt))

    if candidates:
        candidates.sort(key=lambda item: item[0], reverse=True)
        return candidates[0][1]

    all_dates = _extract_dates_from_text(text)
    return all_dates[0] if all_dates else None


def _extract_dates_from_text(text: str) -> list[date]:
    patterns = [
        r"([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})",
        r"([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})",
    ]
    formats = [
        "%d/%m/%Y",
        "%d/%m/%y",
        "%d-%m-%Y",
        "%d-%m-%y",
        "%d %b %Y",
        "%d %B %Y",
        "%d %b %y",
        "%d %B %y",
    ]

    parsed_dates: list[date] = []
    seen: set[str] = set()
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            raw = match.group(1).strip()
            if raw in seen:
                continue
            seen.add(raw)
            for fmt in formats:
                try:
                    parsed_dates.append(datetime.strptime(raw, fmt).date())
                    break
                except ValueError:
                    continue
    return parsed_dates


def parse_invoice_number(text: str) -> str | None:
    lines = _normalized_lines(text)
    patterns = [
        r"invoice\s*(?:number|no\.?|#)[:\s\-]*([A-Za-z0-9\-_/]{3,})",
        r"inv[:\s\-#]*([A-Za-z0-9\-_/]{3,})",
        r"\bno\.?[:\s\-#]*([A-Za-z0-9\-_/]{2,})\b",
    ]
    for line in lines:
        for pattern in patterns:
            match = re.search(pattern, line, flags=re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                if _is_valid_invoice_id(value):
                    return value

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            if _is_valid_invoice_id(value):
                return value
    return None


def parse_debtor_name(text: str) -> str | None:
    lines = _normalized_lines(text)
    labels = ("bill to", "debtor", "customer", "invoice to", "sold to")
    for idx, line in enumerate(lines):
        lowered = line.lower()
        if any(label in lowered for label in labels):
            inline_value = _extract_inline_label_value(line)
            if inline_value and _is_valid_party_name(inline_value):
                return inline_value

            for offset in range(1, 6):
                if idx + offset >= len(lines):
                    break
                candidate = lines[idx + offset].strip(":- ").strip()
                if not candidate:
                    continue
                if _looks_like_field_label(candidate):
                    break

                # Handle stacked names split by OCR/PDF extraction ("SAM" + "ALTMAN").
                if idx + offset + 1 < len(lines):
                    next_candidate = lines[idx + offset + 1].strip(":- ").strip()
                    if _is_single_name_token(candidate) and _is_single_name_token(next_candidate):
                        merged = f"{candidate} {next_candidate}"
                        if _is_valid_party_name(merged):
                            return merged

                if _is_valid_party_name(candidate):
                    return candidate

    # Fallback: choose first likely name-ish line if label method fails.
    for line in lines:
        if _is_valid_party_name(line):
            return line

    return None


def _extract_inline_label_value(line: str) -> str | None:
    if ":" in line:
        right = line.split(":", 1)[1].strip()
        if right:
            return right

    match = re.search(r"(?:bill\s*to|invoice\s*to|sold\s*to|customer|debtor)\s+(.+)$", line, flags=re.IGNORECASE)
    if match:
        value = match.group(1).strip()
        return value if value else None
    return None


def _looks_like_field_label(line: str) -> bool:
    lowered = line.lower().strip(":")
    return lowered in {
        "invoice number",
        "invoice no",
        "invoice #",
        "due date",
        "date",
        "amount",
        "amount due",
        "total",
        "total due",
        "subtotal",
        "vat",
        "tax",
        "email",
        "phone",
    }


def _is_valid_invoice_id(value: str) -> bool:
    if len(value) < 3 or len(value) > 40:
        return False
    if not re.search(r"\d", value):
        return False
    return bool(re.match(r"^[A-Za-z0-9][A-Za-z0-9\-_/]*$", value))


def _is_valid_party_name(value: str) -> bool:
    cleaned = value.strip(":- ").strip()
    if len(cleaned) < 3:
        return False
    if "@" in cleaned:
        return False
    if re.search(r"\b(invoice|bill|sold|customer|debtor|total|amount|due|date|vat|tax)\b", cleaned, flags=re.IGNORECASE):
        return False
    if re.search(r"\d{3,}", cleaned):
        return False

    words = re.findall(r"[A-Za-z][A-Za-z&.'-]*", cleaned)
    if len(words) < 2:
        return False
    return True


def _is_single_name_token(value: str) -> bool:
    cleaned = value.strip()
    if not cleaned:
        return False
    return bool(re.fullmatch(r"[A-Za-z][A-Za-z&.'-]{1,30}", cleaned))


def parse_email(text: str) -> str | None:
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match.group(0) if match else None


def parse_phone(text: str) -> str | None:
    normalized = re.sub(r"[\r\n\t]+", " ", text)
    match = re.search(r"(\+?\d[\d \-()]{7,}\d)", normalized)
    if not match:
        return None
    candidate = re.sub(r"\s+", " ", match.group(1)).strip()
    digits_only = re.sub(r"\D", "", candidate)
    return candidate if len(digits_only) >= 8 else None


def build_layout_signature(text: str) -> str:
    lines = [line.strip().lower() for line in text.splitlines() if line.strip()]
    head = "|".join(lines[:8])
    return hashlib.sha256(head.encode("utf-8")).hexdigest()


def debtor_email_matches_company(email: str | None, debtor_name: str | None) -> bool | None:
    if not email or not debtor_name:
        return None
    domain = email.split("@")[-1].split(".")[0].lower()
    name_tokens = [token.lower() for token in re.findall(r"[A-Za-z]+", debtor_name) if len(token) > 2]
    if not name_tokens:
        return None
    return any(token in domain for token in name_tokens[:3])


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


def analyze_invoice(file_name: str, file_content: bytes) -> InvoiceDecisionResponse:
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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", response_model=AuthResponse)
def register_user(payload: RegisterRequest) -> AuthResponse:
    full_name = payload.full_name.strip()
    email = payload.email.strip().lower()
    password = payload.password

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    password_hash = _hash_password(password)
    created_at = datetime.utcnow().isoformat()

    try:
        with _get_db_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (full_name, email, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (full_name, email, password_hash, created_at),
            )
            connection.commit()
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail="An account with that email already exists.") from exc

    return AuthResponse(
        user=AuthUserResponse(
            id=user_id,
            full_name=full_name,
            email=email,
        )
    )


@app.post("/auth/login", response_model=AuthResponse)
def login_user(payload: LoginRequest) -> AuthResponse:
    email = payload.email.strip().lower()
    password_hash = _hash_password(payload.password)

    with _get_db_connection() as connection:
        user = connection.execute(
            """
            SELECT id, full_name, email, password_hash
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

    if user is None or user["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return AuthResponse(
        user=AuthUserResponse(
            id=int(user["id"]),
            full_name=str(user["full_name"]),
            email=str(user["email"]),
        )
    )


@app.post("/process-invoice", response_model=InvoiceDecisionResponse)
async def process_invoice(file: UploadFile = File(...)) -> InvoiceDecisionResponse:
    allowed_types = {"application/pdf"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF file.")

    file_content = await file.read()
    return analyze_invoice(file_name=file.filename or "invoice.pdf", file_content=file_content)
