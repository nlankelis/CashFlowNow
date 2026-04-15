import { CheckCircle, ArrowRight } from "lucide-react";

interface ResultsScreenProps {
  onBackToHome?: () => void;
}

export default function ResultsScreen({ onBackToHome }: ResultsScreenProps) {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 bg-[#00d4c8]/10 text-[#00d4c8] px-6 py-2 rounded-3xl mb-6">
        <CheckCircle size={20} />
        <span className="font-semibold">Truth Engine™ Verification Complete</span>
      </div>

      <h1 className="heading-font text-6xl font-semibold tracking-tighter text-[#0a2540] mb-4">
        All invoices verified ✅
      </h1>
      <p className="text-2xl text-gray-600 mb-12">
        You just got paid <span className="font-semibold text-[#00d4c8]">instantly</span>.
      </p>

      <div className="bg-white rounded-3xl p-10 border border-gray-100 mb-12">
        <div className="flex justify-between items-baseline mb-8">
          <div>
            <div className="text-gray-500">Total funded today</div>
            <div className="text-7xl font-bold text-[#0a2540]">£8,450</div>
          </div>
          <div className="text-right">
            <div className="text-emerald-500 font-medium">+24 hours faster</div>
            <div className="text-sm text-gray-500">than waiting for debtors</div>
          </div>
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
          <div className="h-full w-[85%] bg-[#00d4c8] rounded-full"></div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-left">
          <div className="flex gap-3">
            <CheckCircle className="text-[#00d4c8] mt-1" size={22} />
            <div>
              <div className="font-medium">Peppol network match</div>
              <div className="text-sm text-gray-500">Confirmed delivery</div>
            </div>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="text-[#00d4c8] mt-1" size={22} />
            <div>
              <div className="font-medium">Digital signature valid</div>
              <div className="text-sm text-gray-500">No fraud detected</div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onBackToHome}
        className="bg-[#00d4c8] hover:bg-[#00b8ae] text-[#0a2540] font-semibold text-xl px-16 py-6 rounded-3xl flex items-center gap-3 mx-auto"
      >
        Back to Dashboard
        <ArrowRight size={24} />
      </button>
    </div>
  );
}