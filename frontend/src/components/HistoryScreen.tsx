import { Download, CheckCircle, Clock, ArrowUpRight } from "lucide-react";

const invoiceHistory = [
  {
    id: "CFN-2026-1048",
    client: "Northgate Electrical Services",
    date: "14 Apr 2026",
    amount: 18450,
    funded: 17066,
    status: "collected" as const,
  },
  {
    id: "CFN-2026-1041",
    client: "Lark & Stone Interiors",
    date: "11 Apr 2026",
    amount: 12600,
    funded: 11655,
    status: "funded" as const,
  },
  {
    id: "CFN-2026-1036",
    client: "Peak Construction Group",
    date: "09 Apr 2026",
    amount: 28750,
    funded: 26452,
    status: "collected" as const,
  },
  {
    id: "CFN-2026-1029",
    client: "Harbour Facilities Management",
    date: "04 Apr 2026",
    amount: 9400,
    funded: 8648,
    status: "funded" as const,
  },
];

export default function HistoryScreen() {
  const totalFunded = invoiceHistory.reduce((sum, item) => sum + item.funded, 0);
  const fundedCount = invoiceHistory.length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="heading-font text-5xl font-semibold tracking-tighter text-[#0a2540]">
            Funding History
          </h1>
          <p className="text-gray-600 text-xl mt-2">Recent invoices processed through the platform</p>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">TOTAL FUNDED THIS MONTH</div>
          <div className="text-5xl font-bold text-[#0a2540] mt-1">GBP{totalFunded.toLocaleString()}</div>
          <div className="text-emerald-600 text-sm flex items-center gap-1 justify-end mt-1">
            <ArrowUpRight size={16} />
            +18% from last month
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">INVOICES FUNDED</div>
              <div className="text-4xl font-bold text-[#0a2540] mt-2">{fundedCount}</div>
            </div>
            <CheckCircle className="text-[#00d4c8]" size={48} />
          </div>
          <div className="text-emerald-600 text-sm mt-6">Submitted and verified by Truth Engine</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">AVG DISCOUNT</div>
              <div className="text-4xl font-bold text-[#0a2540] mt-2">4.8%</div>
            </div>
            <div className="text-4xl">GBP</div>
          </div>
          <div className="text-emerald-600 text-sm mt-6">Better than traditional factoring</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">FASTEST PAYOUT</div>
              <div className="text-4xl font-bold text-[#0a2540] mt-2">11s</div>
            </div>
            <Clock className="text-[#00d4c8]" size={48} />
          </div>
          <div className="text-[#00d4c8] text-sm mt-6">Fastest verified funding decision</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-5 px-8 font-medium text-gray-500">Invoice</th>
              <th className="text-left py-5 px-8 font-medium text-gray-500">Client</th>
              <th className="text-left py-5 px-8 font-medium text-gray-500">Date Funded</th>
              <th className="text-right py-5 px-8 font-medium text-gray-500">Invoice Value</th>
              <th className="text-right py-5 px-8 font-medium text-gray-500">You Received</th>
              <th className="text-center py-5 px-8 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoiceHistory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-5 px-8 font-medium">{item.id}</td>
                <td className="py-5 px-8 text-gray-700">{item.client}</td>
                <td className="py-5 px-8 text-gray-600">{item.date}</td>
                <td className="py-5 px-8 text-right font-medium">GBP{item.amount.toLocaleString()}</td>
                <td className="py-5 px-8 text-right font-semibold text-[#00d4c8]">
                  GBP{item.funded.toLocaleString()}
                </td>
                <td className="py-5 px-8 text-center">
                  {item.status === "collected" ? (
                    <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1 rounded-3xl text-sm font-medium">
                      <CheckCircle size={16} />
                      Collected
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1 rounded-3xl text-sm font-medium">
                      <Clock size={16} />
                      Funded
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
        <div className="h-px w-12 bg-gray-200"></div>
        Platform-funded invoices with automated verification and debtor checks
        <div className="h-px w-12 bg-gray-200"></div>
      </div>

      <button className="mt-10 mx-auto flex items-center gap-3 bg-white border border-gray-200 hover:border-gray-300 px-8 py-4 rounded-3xl font-medium text-gray-700 transition-all">
        <Download size={20} />
        Export full history (CSV)
      </button>
    </div>
  );
}
