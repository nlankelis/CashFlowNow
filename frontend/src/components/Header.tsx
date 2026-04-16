import { useState } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import type { AuthUser } from "../types/auth";

interface HeaderProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

export default function Header({ currentUser, onLogout }: HeaderProps) {
  const [showPopup, setShowPopup] = useState(false);
  const today = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const initial = currentUser.full_name.charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-white border-b px-8 flex items-center justify-between relative">
      <div className="flex items-center gap-3">
        <span className="text-[#0a2540] font-semibold">CashFlowNow Dashboard</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm text-gray-500">{today}</div>

        <div
          onClick={() => setShowPopup((value) => !value)}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-1.5 rounded-2xl transition-colors"
        >
          <div className="w-9 h-9 bg-[#00d4c8]/10 text-[#0a2540] rounded-2xl flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
          <div>
            <p className="text-sm font-medium text-[#0a2540]">{currentUser.full_name}</p>
            <p className="text-xs text-gray-500 -mt-0.5">{currentUser.email}</p>
          </div>
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>

      {showPopup && (
        <div className="absolute top-16 right-8 bg-white rounded-3xl shadow-xl border border-gray-100 py-2 w-64 z-50">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00d4c8]/10 text-[#0a2540] rounded-2xl flex items-center justify-center text-lg font-semibold">
                {initial}
              </div>
              <div>
                <p className="font-semibold">{currentUser.full_name}</p>
                <p className="text-sm text-gray-500">{currentUser.email}</p>
              </div>
            </div>
          </div>

          <button className="w-full px-6 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700">
            <User size={18} />
            Account Settings
          </button>

          <button
            onClick={() => {
              setShowPopup(false);
              onLogout();
            }}
            className="w-full px-6 py-3 text-left hover:bg-red-50 flex items-center gap-3 text-red-600"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
