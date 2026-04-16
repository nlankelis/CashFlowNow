# CODEX INSTRUCTIONS

Implement working functionality in the dashboard for MVP invoice factoring software.

The user can select files currently. The file is a PDF invoice that needs to be visually checked by AI for these Key fields:
	•	Invoice number
	•	Amount
	•	Due date
	•	Debtor (who owes the money)

Currently the front-end doesn't have it implemented, but we will also be taking the following information:
2. Debtor information
	•	Company name
	•	Registration number (e.g. Companies House ID in the UK)
	•	Contact details (email/phone)

3. Proof of delivery / service
	•	Delivery note, signed receipt, or contract
	•	This is important—it proves the invoice is legitimate

4. Basic business info (once per account)
	•	Company details
	•	Bank account for funding
	•	Possibly ID/KYC documents

For current purposes, you will be ignoring everything but the invoice information, but the software needs to be done in such a way that 2, 3 and 4 will be easily implemented later via user text-input, after we change the front-end to have those fields. 

A suggestion of what the backend should do/be fitted to be able to do later you have the freedom to do things as you please, and to ignore things or add more things, as long as you succesfully make a simple MVP invoice factoring software:

1. Data extraction (OCR / parsing)
	•	Reads the invoice PDF
	•	Extracts:
	•	Amount
	•	Due date
	•	Debtor name
	•	Flags missing or inconsistent fields

	Use simple OCR + regex

2. Validation checks

Basic sanity checks:
	•	Is the invoice overdue already?
	•	Is the amount reasonable (not £1M from a tiny company)?
	•	Duplicate invoice detection

3. Debtor risk check

This is the core decision driver.

For MVP:
	•	Query external data sources (e.g. credit agencies or public records)
	•	Assign a simple risk score based on:
	•	Company size
	•	Filing history
	•	Credit rating (if available)
👉 Output:
	•	“Low risk / Medium risk / High risk”
    
4. Fraud / authenticity signals

Even in MVP, include lightweight checks:
	•	Does the debtor email domain match the company?
	•	Is the invoice format consistent with past uploads?
	•	Has this user submitted suspicious invoices before?
👉 MVP can be rule-based:
	•	No AI needed yet

5. Advance rate calculation

Simple formula:
	•	Advance = 70–90% of invoice value
Adjusted by:
	•	Risk level
	•	Invoice age
	•	Debtor reliability
Example:
	•	£10,000 invoice
	•	Medium risk → 80% advance → £8,000 offered

6. Decision engine

At MVP, this is rule-based, not ML:

IF debtor risk = high → reject
IF invoice overdue → reject
IF amount > threshold → manual review
ELSE → approve

7. Offer generation

If approved:
	•	Show:
	•	Advance amount
	•	Fee (e.g. 2–5%)
	•	Expected payout timeline
User can:
	•	Accept → triggers funding process
	•	Reject → do nothing


❌ No complex AI underwriting
❌ No deep financial modeling
❌ No real-time bank integrations (optional later)
