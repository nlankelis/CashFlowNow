import { Download, CheckCircle, Clock, ArrowUpRight } from "lucide-react";

const mockHistory = [
  {
    id: "INV-7842",
    client: "GreenTech Solutions Ltd",
    date: "12 Apr 2026",
    amount: 2450,
    funded: 2327,
    status: "collected" as const,
    days: 14,
  },
  {
    id: "INV-7841",
    client: "Harbour Logistics",
    date: "10 Apr 2026",
    amount: 890,
    funded: 845,
    status: "collected" as const,
    days: 9,
  },
  {
    id: "INV-7840",
    client: "Peak Construction",
    date: "08 Apr 2026",
    amount: 3200,
    funded: 3040,
    status: "funded" as const,
    days: 3,
  },
  {
    id: "INV-7839",
    client: "BrightPrint Design",
    date: "05 Apr 2026",
    amount: 1250,
    funded: 1187,
    status: "collected" as const,
    days: 18,
  },
];

export default function HistoryScreen() {
  const totalFunded = mockHistory.reduce((sum, item) => sum + item.funded, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="heading-font text-5xl font-semibold tracking-tighter text-[#0a2540]">
            Funding History
          </h1>
          <p className="text-gray-600 text-xl mt-2">
            Every invoice you’ve turned into instant cash
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">TOTAL FUNDED THIS QUARTER</div>
          <div className="text-5xl font-bold text-[#0a2540] mt-1">
            £{totalFunded.toLocaleString()}
          </div>
          <div className="text-emerald-600 text-sm flex items-center gap-1 justify-end mt-1">
            <ArrowUpRight size={16} />
            +18% from last quarter
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">INVOICES FUNDED</div>
              <div className="text-4xl font-bold text-[#0a2540] mt-2">47</div>
            </div>
            <CheckCircle className="text-[#00d4c8]" size={48} />
          </div>
          <div className="text-emerald-600 text-sm mt-6">100% verified by Truth Engine™</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">AVG DISCOUNT</div>
              <div className="text-4xl font-bold text-[#0a2540] mt-2">4.8%</div>
            </div>
            <div className="text-4xl">📉</div>
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
          <div className="text-[#00d4c8] text-sm mt-6">Truth Engine record</div>
        </div>
      </div>

      {/* History Table */}
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
            {mockHistory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-5 px-8 font-medium">{item.id}</td>
                <td className="py-5 px-8 text-gray-700">{item.client}</td>
                <td className="py-5 px-8 text-gray-600">{item.date}</td>
                <td className="py-5 px-8 text-right font-medium">
                  £{item.amount.toLocaleString()}
                </td>
                <td className="py-5 px-8 text-right font-semibold text-[#00d4c8]">
                  £{item.funded.toLocaleString()}
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
        All invoices are protected by our Truth Engine™ and backed by Tier-1 UK banks
        <div className="h-px w-12 bg-gray-200"></div>
      </div>

      {/* Export button */}
      <button className="mt-10 mx-auto flex items-center gap-3 bg-white border border-gray-200 hover:border-gray-300 px-8 py-4 rounded-3xl font-medium text-gray-700 transition-all">
        <Download size={20} />
        Export full history (CSV)
      </button>
    </div>
  );
}