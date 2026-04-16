export type Decision = "approved" | "manual_review" | "rejected";
export type RiskLevel = "low" | "medium" | "high";

export interface ExtractedInvoiceFields {
  invoice_number: string | null;
  amount: number | null;
  due_date: string | null;
  debtor_name: string | null;
  debtor_email: string | null;
  debtor_phone: string | null;
}

export interface ValidationChecks {
  missing_fields: string[];
  is_overdue: boolean;
  duplicate_file: boolean;
  duplicate_invoice_number: boolean;
  duplicate_invoice_profile: boolean;
  amount_outlier: boolean;
}

export interface RiskSignals {
  company_size: "micro" | "small" | "medium" | "large";
  filing_history: "clean" | "minor_issues" | "concerning";
  credit_rating: "weak" | "average" | "strong";
  risk_score: number;
  risk_level: RiskLevel;
}

export interface FraudSignals {
  debtor_email_domain_matches_company: boolean | null;
  format_consistent_with_history: boolean | null;
  suspicious_submitter_pattern: boolean;
  flags: string[];
}

export interface OfferDetails {
  advance_rate: number;
  advance_amount: number;
  fee_rate: number;
  fee_amount: number;
  payout_timeline: string;
}

export interface InvoiceDecisionResponse {
  filename: string;
  extracted_fields: ExtractedInvoiceFields;
  validation_checks: ValidationChecks;
  risk: RiskSignals;
  fraud_signals: FraudSignals;
  decision: Decision;
  decision_reasons: string[];
  offer: OfferDetails | null;
}

export interface ProcessedInvoiceResult extends InvoiceDecisionResponse {
  processing_time_ms: number;
}

export interface InvoiceHistoryRecord extends ProcessedInvoiceResult {
  history_id: string;
  processed_at: string;
}
