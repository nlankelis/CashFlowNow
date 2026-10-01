from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from schemas import (
    AuthUserResponse,
    InvoiceDecisionResponse,
    InvoiceHistoryRecordResponse,
    SupplementalInvoiceFields,
)
from services.auth_service import get_current_user
from services.invoice_service import analyze_invoice, get_user_invoices
from utils.extractors import parse_amount_input, parse_due_date_input
from utils.rate_limiter import invoice_limiter

router = APIRouter(tags=["invoice"])


@router.post("/process-invoice", response_model=InvoiceDecisionResponse)
async def process_invoice(
    file: UploadFile = File(...),
    invoice_number: str | None = Form(default=None),
    amount: str | None = Form(default=None),
    due_date: str | None = Form(default=None),
    debtor_name: str | None = Form(default=None),
    debtor_email: str | None = Form(default=None),
    debtor_phone: str | None = Form(default=None),
    current_user: AuthUserResponse = Depends(get_current_user),
) -> InvoiceDecisionResponse:
    # Rate limit check per authenticated user
    invoice_limiter.check(f"user:{current_user.id}")

    allowed_types = {"application/pdf"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF file.")

    file_content = await file.read()

    # Validate PDF magic bytes
    if not file_content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Invalid PDF file format.")

    supplemental = SupplementalInvoiceFields(
        invoice_number=invoice_number.strip() if isinstance(invoice_number, str) and invoice_number.strip() else None,
        amount=parse_amount_input(amount) if isinstance(amount, str) else None,
        due_date=parse_due_date_input(due_date) if isinstance(due_date, str) else None,
        debtor_name=debtor_name.strip() if isinstance(debtor_name, str) and debtor_name.strip() else None,
        debtor_email=debtor_email.strip() if isinstance(debtor_email, str) and debtor_email.strip() else None,
        debtor_phone=debtor_phone.strip() if isinstance(debtor_phone, str) and debtor_phone.strip() else None,
    )
    return analyze_invoice(
        file_name=file.filename or "invoice.pdf",
        file_content=file_content,
        user_id=current_user.id,
        supplemental=supplemental,
    )


@router.get("/invoices/history", response_model=list[InvoiceHistoryRecordResponse])
def get_invoice_history(
    current_user: AuthUserResponse = Depends(get_current_user),
) -> list[InvoiceHistoryRecordResponse]:
    return get_user_invoices(user_id=current_user.id)

