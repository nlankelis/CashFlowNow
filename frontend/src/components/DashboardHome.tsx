import { Upload, TrendingUp, Clock, Award } from "lucide-react";

interface DashboardHomeProps {
  onUploadClick: () => void;
}

export default function DashboardHome({ onUploadClick }: DashboardHomeProps) {
  return (
    <div>
      <div className="mb-10">
        <h1 className="heading-font text-5xl font-semibold tracking-tighter text-[#0a2540] mb-2">
          Welcome back
        </h1>
        <p className="text-gray-600 text-xl">Here is what is happening with your cash flow today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-500 text-sm font-medium">TOTAL ADVANCED</div>
            <TrendingUp className="text-[#00d4c8]" size={24} />
          </div>
          <div className="text-4xl font-bold text-[#0a2540] mb-1">GBP24,850</div>
          <div className="text-emerald-600 text-sm font-medium">+GBP8,200 this week</div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-500 text-sm font-medium">PENDING INVOICES</div>
            <Clock className="text-amber-500" size={24} />
          </div>
          <div className="text-4xl font-bold text-[#0a2540] mb-1">12</div>
          <div className="text-amber-600 text-sm font-medium">Worth GBP31,450</div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-500 text-sm font-medium">AVG APPROVAL TIME</div>
            <Award className="text-[#00d4c8]" size={24} />
          </div>
          <div className="text-4xl font-bold text-[#0a2540] mb-1">18s</div>
          <div className="text-[#00d4c8] text-sm font-medium">Truth Engine powered</div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-500 text-sm font-medium">THIS MONTH SAVED</div>
            <TrendingUp className="text-[#00d4c8]" size={24} />
          </div>
          <div className="text-4xl font-bold text-[#0a2540] mb-1">GBP1,340</div>
          <div className="text-emerald-600 text-sm font-medium">vs traditional banks</div>
        </div>
      </div>

      <button
        onClick={onUploadClick}
        className="bg-[#00d4c8] hover:bg-[#00b8ae] text-[#0a2540] text-xl font-semibold px-12 py-6 rounded-3xl flex items-center gap-4 shadow-xl transition-all hover:scale-105"
      >
        <Upload size={28} />
        Upload New Invoices
      </button>
    </div>
  );
}
