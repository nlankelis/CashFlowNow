import { CheckCircle, AlertTriangle, ArrowRight, Upload, ShieldAlert } from "lucide-react";
import type { InvoiceHistoryRecord } from "../types/invoice";

interface ResultsScreenProps {
  results: InvoiceHistoryRecord[];
  onBackToHome?: () => void;
  onUploadMore?: () => void;
}

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

function decisionPill(decision: InvoiceHistoryRecord["decision"]) {
  if (decision === "approved") {
    return <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Approved</span>;
  }
  if (decision === "manual_review") {
    return <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Manual Review</span>;
  }
  return <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Rejected</span>;
}

export default function ResultsScreen({ results, onBackToHome, onUploadMore }: ResultsScreenProps) {
  const approved = results.filter((r) => r.decision === "approved");
  const rejected = results.filter((r) => r.decision === "rejected");
  const manualReview = results.filter((r) => r.decision === "manual_review");

  const totalAdvance = results.reduce((sum, result) => sum + (result.offer?.advance_amount ?? 0), 0);
  const totalFees = results.reduce((sum, result) => sum + (result.offer?.fee_amount ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-[#00d4c8]/10 text-[#0a2540] px-6 py-2 rounded-3xl mb-5">
          <CheckCircle size={20} />
          <span className="font-semibold">Invoice Assessment Complete</span>
        </div>
        <h1 className="heading-font text-5xl font-semibold tracking-tighter text-[#0a2540] mb-2">
          Decision Summary
        </h1>
        <p className="text-xl text-gray-600">
          {results.length} invoice{results.length !== 1 ? "s" : ""} analysed with extraction, risk and fraud checks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-3xl border border-gray-100 p-5 bg-white">
          <div className="text-xs uppercase tracking-wide text-gray-500">Approved</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{approved.length}</div>
        </div>
        <div className="rounded-3xl border border-gray-100 p-5 bg-white">
          <div className="text-xs uppercase tracking-wide text-gray-500">Manual Review</div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{manualReview.length}</div>
        </div>
        <div className="rounded-3xl border border-gray-100 p-5 bg-white">
          <div className="text-xs uppercase tracking-wide text-gray-500">Rejected</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{rejected.length}</div>
        </div>
        <div className="rounded-3xl border border-gray-100 p-5 bg-white">
          <div className="text-xs uppercase tracking-wide text-gray-500">Total Advance Offer</div>
          <div className="text-2xl font-bold text-[#0a2540] mt-2">{currency.format(totalAdvance)}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 mb-8">
        <div className="text-sm text-gray-500 mb-1">Estimated Total Fees</div>
        <div className="text-3xl font-bold text-[#0a2540]">{currency.format(totalFees)}</div>
      </div>

      <div className="space-y-5">
        {results.map((result) => (
          <div key={`${result.filename}-${result.extracted_fields.invoice_number ?? "unknown"}`} className="rounded-3xl border border-gray-100 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm text-gray-500">{result.filename}</div>
                <div className="text-xl font-semibold text-[#0a2540]">
                  {result.extracted_fields.invoice_number ?? "Invoice number not found"}
                </div>
              </div>
              {decisionPill(result.decision)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500">Debtor</div>
                <div className="font-medium">{result.extracted_fields.debtor_name ?? "Not found"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Amount</div>
                <div className="font-medium">
                  {result.extracted_fields.amount !== null
                    ? currency.format(result.extracted_fields.amount)
                    : "Not found"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Due Date</div>
                <div className="font-medium">{result.extracted_fields.due_date ?? "Not found"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Risk</div>
                <div className="font-medium capitalize">
                  {result.risk.risk_level} ({result.risk.risk_score}/100)
                </div>
              </div>
            </div>

            {result.offer && (
              <div className="rounded-2xl bg-[#00d4c8]/10 border border-[#00d4c8]/20 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">Advance</div>
                    <div className="font-semibold">{currency.format(result.offer.advance_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Advance Rate</div>
                    <div className="font-semibold">{Math.round(result.offer.advance_rate * 100)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Fee</div>
                    <div className="font-semibold">{currency.format(result.offer.fee_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Payout</div>
                    <div className="font-semibold">{result.offer.payout_timeline}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Validation & Fraud Checks
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Missing fields: {result.validation_checks.missing_fields.join(", ") || "None"}</li>
                  <li>Overdue: {result.validation_checks.is_overdue ? "Yes" : "No"}</li>
                  <li>
                    Duplicate detected:{" "}
                    {result.validation_checks.duplicate_file || result.validation_checks.duplicate_invoice_number
                      ? "Yes"
                      : "No"}
                  </li>
                  <li>Fraud flags: {result.fraud_signals.flags.length > 0 ? result.fraud_signals.flags.join(" | ") : "None"}</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Decision Reasons
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {result.decision_reasons.map((reason, index) => (
                    <li key={`${result.filename}-reason-${index}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          onClick={onBackToHome}
          className="bg-[#00d4c8] hover:bg-[#00b8ae] text-[#0a2540] font-semibold text-lg px-10 py-4 rounded-3xl inline-flex items-center gap-2"
        >
          Back to Dashboard
          <ArrowRight size={20} />
        </button>
        <button
          onClick={onUploadMore}
          className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium text-lg px-8 py-4 rounded-3xl inline-flex items-center gap-2"
        >
          <Upload size={20} />
          Upload More Invoices
        </button>
      </div>
    </div>
  );
}
