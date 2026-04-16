import type { AuthUser } from "../types/auth";
import type { InvoiceHistoryRecord, ProcessedInvoiceResult } from "../types/invoice";

const HISTORY_STORAGE_PREFIX = "cashflownow-invoice-history";
const TRADITIONAL_BANK_FEE_RATE = 0.08;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface DashboardMetrics {
  totalAdvanced: number;
  pendingInvoices: number;
  avgApprovalTimeSeconds: number;
  thisMonthSavings: number;
  fundedLast30Days: number;
}

function getHistoryStorageKey(user: AuthUser): string {
  return `${HISTORY_STORAGE_PREFIX}-${user.email.toLowerCase()}`;
}

function createHistoryId(index: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadInvoiceHistory(user: AuthUser): InvoiceHistoryRecord[] {
  const raw = window.localStorage.getItem(getHistoryStorageKey(user));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as InvoiceHistoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(getHistoryStorageKey(user));
    return [];
  }
}

export function appendInvoiceHistory(
  user: AuthUser,
  invoices: ProcessedInvoiceResult[],
): InvoiceHistoryRecord[] {
  const existing = loadInvoiceHistory(user);
  const processedAt = new Date().toISOString();
  const stamped = invoices.map((invoice, index) => ({
    ...invoice,
    history_id: createHistoryId(index),
    processed_at: processedAt,
  }));
  const next = [...stamped, ...existing];

  window.localStorage.setItem(getHistoryStorageKey(user), JSON.stringify(next));

  return next;
}

export function computeDashboardMetrics(history: InvoiceHistoryRecord[]): DashboardMetrics {
  const now = Date.now();
  const last30Days = history.filter((invoice) => now - new Date(invoice.processed_at).getTime() <= 30 * DAY_IN_MS);
  const fundedInvoices = history.filter((invoice) => invoice.decision === "approved" && invoice.offer);
  const pendingInvoices = history.filter((invoice) => invoice.decision === "manual_review");

  const totalAdvanced = fundedInvoices.reduce((sum, invoice) => sum + (invoice.offer?.advance_amount ?? 0), 0);
  const fundedLast30Days = last30Days
    .filter((invoice) => invoice.decision === "approved" && invoice.offer)
    .reduce((sum, invoice) => sum + (invoice.offer?.advance_amount ?? 0), 0);
  const avgApprovalTimeMs =
    history.length > 0
      ? history.reduce((sum, invoice) => sum + invoice.processing_time_ms, 0) / history.length
      : 0;
  const thisMonthSavings = last30Days.reduce((sum, invoice) => {
    if (!invoice.offer || invoice.extracted_fields.amount === null) {
      return sum;
    }

    const traditionalFee = invoice.extracted_fields.amount * TRADITIONAL_BANK_FEE_RATE;
    return sum + Math.max(traditionalFee - invoice.offer.fee_amount, 0);
  }, 0);

  return {
    totalAdvanced,
    pendingInvoices: pendingInvoices.length,
    avgApprovalTimeSeconds: avgApprovalTimeMs / 1000,
    thisMonthSavings,
    fundedLast30Days,
  };
}

export function buildHistoryCsv(history: InvoiceHistoryRecord[]): string {
  const rows = [
    [
      "Processed At",
      "Invoice Number",
      "Filename",
      "Debtor",
      "Amount",
      "Advance Offered",
      "Fee",
      "Decision",
      "Risk Level",
      "Processing Time (ms)",
    ],
    ...history.map((invoice) => [
      invoice.processed_at,
      invoice.extracted_fields.invoice_number ?? "",
      invoice.filename,
      invoice.extracted_fields.debtor_name ?? "",
      invoice.extracted_fields.amount?.toString() ?? "",
      invoice.offer?.advance_amount?.toString() ?? "",
      invoice.offer?.fee_amount?.toString() ?? "",
      invoice.decision,
      invoice.risk.risk_level,
      invoice.processing_time_ms.toString(),
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}
