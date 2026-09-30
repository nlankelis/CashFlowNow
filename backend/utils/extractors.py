import hashlib
import re
from datetime import date, datetime


def _looks_like_receipt_document(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in ("receipt", "2eceipt", "merchant", "-erchant", "status", "3tatus"))


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
        "total amount",
    )
    weak_amount_labels = ("amount", "total", "balance", "payable", "gbp")
    negative_labels = ("vat", "tax", "subtotal", "sub total", "discount", "qty", "quantity")

    scored: list[tuple[int, float]] = []
    for idx, line in enumerate(lines):
        amount = _extract_money_value(line)
        if amount is None:
            continue

        lowered = line.lower()
        prev_line = lines[idx - 1].lower() if idx > 0 else ""
        next_line = lines[idx + 1].lower() if idx + 1 < len(lines) else ""
        score = 0
        if any(label in lowered for label in strong_amount_labels):
            score += 100
        elif any(label in lowered for label in weak_amount_labels):
            score += 50
        if any(label in prev_line for label in strong_amount_labels):
            score += 90
        elif any(label in prev_line for label in weak_amount_labels):
            score += 45
        if any(label in next_line for label in strong_amount_labels):
            score += 40
        elif any(label in next_line for label in weak_amount_labels):
            score += 20
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
        if _looks_like_receipt_document(text) and candidates[0][0] < 100:
            return None
        return candidates[0][1]

    if _looks_like_receipt_document(text):
        return None

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

    if _looks_like_receipt_document(text):
        return None

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
    if len(cleaned.split()) > 6:
        return False
    if re.search(r"\b(invoice|bill|sold|customer|debtor|total|amount|due|date|vat|tax)\b", cleaned, flags=re.IGNORECASE):
        return False
    if re.search(r"\b(receipt|support|transaction|reference|message|automated|merchant|status|card)\b", cleaned, flags=re.IGNORECASE):
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


def parse_amount_input(value: str | None) -> float | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9.]", "", value)
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_due_date_input(value: str | None) -> date | None:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


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

