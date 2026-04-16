import { Download, CheckCircle, Clock, ArrowUpRight, AlertTriangle } from "lucide-react";
import {
  buildHistoryCsv,
  type DashboardMetrics,
} from "../lib/invoiceHistory";
import type { InvoiceHistoryRecord } from "../types/invoice";

interface HistoryScreenProps {
  history: InvoiceHistoryRecord[];
  metrics: DashboardMetrics;
}

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

function formatStatus(invoice: InvoiceHistoryRecord): {
  label: string;
  className: string;
  icon: typeof CheckCircle;
} {
  if (invoice.decision === "approved") {
    return {
      label: "Funded",
      className: "bg-emerald-100 text-emerald-700",
      icon: CheckCircle,
    };
  }

  if (invoice.decision === "manual_review") {
    return {
      label: "Manual Review",
      className: "bg-amber-100 text-amber-700",
      icon: Clock,
    };
  }

  return {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  };
}

export default function HistoryScreen({ history, metrics }: HistoryScreenProps) {
  const fundedInvoices = history.filter((invoice) => invoice.decision === "approved").length;
  const averageFeeRate =
    history.length > 0
      ? history.reduce((sum, invoice) => sum + (invoice.offer?.fee_rate ?? 0), 0) / history.length
      : 0;

  const handleExportCsv = () => {
    const csv = buildHistoryCsv(history);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cashflownow-history.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="heading-font text-5xl font-semibold tracking-tighter text-[#0a2540]">
            Funding History
          </h1>
          <p className="text-gray-600 text-xl mt-2">Every processed invoice saved to your account history</p>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">TOTAL FUNDED THIS MONTH</div>
          <div className="text-5xl font-bold text-[#0a2540] mt-1">
            {currency.format(metrics.fundedLast30Days)}
          </div>
          <div className="text-emerald-600 text-sm flex items-center gap-1 justify-end mt-1">
            <ArrowUpRight size={16} />
            Approved advances in the last 30 days
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">INVOICES SAVED</div>
              <div className="text-4xl font-bold text-[#0a2540] mt-2">{history.length}</div>
            </div>
            <CheckCircle className="text-[#00d4c8]" size={48} />
          </div>
          <div className="text-emerald-600 text-sm mt-6">Saved automatically after each upload</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">FUNDED INVOICES</div>
              <div className="text-4xl font-bold text-[#0a2540] mt-2">{fundedInvoices}</div>
            </div>
            <ArrowUpRight className="text-[#00d4c8]" size={48} />
          </div>
          <div className="text-emerald-600 text-sm mt-6">Approved and offered an advance</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">AVG FEE RATE</div>
              <div className="text-4xl font-bold text-[#0a2540] mt-2">{(averageFeeRate * 100).toFixed(1)}%</div>
            </div>
            <Clock className="text-[#00d4c8]" size={48} />
          </div>
          <div className="text-[#00d4c8] text-sm mt-6">Across all offers currently stored</div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center text-gray-600">
          No invoices have been processed yet. Upload an invoice and it will appear here automatically.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-5 px-8 font-medium text-gray-500">Invoice</th>
                <th className="text-left py-5 px-8 font-medium text-gray-500">Debtor</th>
                <th className="text-left py-5 px-8 font-medium text-gray-500">Processed</th>
                <th className="text-right py-5 px-8 font-medium text-gray-500">Invoice Value</th>
                <th className="text-right py-5 px-8 font-medium text-gray-500">Advance Offered</th>
                <th className="text-center py-5 px-8 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((item) => {
                const status = formatStatus(item);
                const StatusIcon = status.icon;

                return (
                  <tr key={item.history_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-5 px-8">
                      <div className="font-medium">{item.extracted_fields.invoice_number ?? item.filename}</div>
                      <div className="text-sm text-gray-500">{item.filename}</div>
                    </td>
                    <td className="py-5 px-8 text-gray-700">{item.extracted_fields.debtor_name ?? "Unknown debtor"}</td>
                    <td className="py-5 px-8 text-gray-600">
                      {new Date(item.processed_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-5 px-8 text-right font-medium">
                      {item.extracted_fields.amount !== null ? currency.format(item.extracted_fields.amount) : "N/A"}
                    </td>
                    <td className="py-5 px-8 text-right font-semibold text-[#00d4c8]">
                      {item.offer ? currency.format(item.offer.advance_amount) : "N/A"}
                    </td>
                    <td className="py-5 px-8 text-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-3xl text-sm font-medium ${status.className}`}>
                        <StatusIcon size={16} />
                        {status.label}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
        <div className="h-px w-12 bg-gray-200"></div>
        Export includes every saved invoice, decision, fee and processing time
        <div className="h-px w-12 bg-gray-200"></div>
      </div>

      <button
        onClick={handleExportCsv}
        disabled={history.length === 0}
        className="mt-10 mx-auto flex items-center gap-3 bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-3xl font-medium text-gray-700 transition-all"
      >
        <Download size={20} />
        Export full history CSV
      </button>
    </div>
  );
}
