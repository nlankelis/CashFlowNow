import { Home, Upload, History, LogOut } from "lucide-react";
import type { AuthUser } from "../types/auth";

type Screen = "home" | "upload" | "results" | "history";

interface SidebarProps {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  onLogout: () => void;
  currentUser: AuthUser;
}

export default function Sidebar({ currentScreen, setCurrentScreen, onLogout, currentUser }: SidebarProps) {
  const landingUrl = new URL("https://nlankelis.github.io/CashFlowNow/");
  landingUrl.searchParams.set("logged_in", "1");
  landingUrl.searchParams.set("name", currentUser.full_name);

  return (
    <div className="w-72 bg-white border-r border-gray-100 flex flex-col">
      <div className="p-6 border-b">
        <a href={landingUrl.toString()} className="flex items-center gap-3">
          <img src="/LogoNoBG.png" alt="CashFlowNow" className="h-9 w-auto" />
          <span className="heading-font text-3xl font-semibold tracking-tighter text-[#0a2540]">
            CashFlowNow
          </span>
        </a>
      </div>

      <div className="flex-1 p-4 space-y-1">
        <button
          onClick={() => setCurrentScreen("home")}
          className={`w-full flex items-center gap-3 px-5 py-4 rounded-3xl text-left transition-all ${
            currentScreen === "home" ? "bg-[#00d4c8] text-[#0a2540] font-medium" : "hover:bg-gray-50"
          }`}
        >
          <Home size={22} />
          <span className="font-medium">Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentScreen("upload")}
          className={`w-full flex items-center gap-3 px-5 py-4 rounded-3xl text-left transition-all ${
            currentScreen === "upload" ? "bg-[#00d4c8] text-[#0a2540] font-medium" : "hover:bg-gray-50"
          }`}
        >
          <Upload size={22} />
          <span className="font-medium">Upload Invoices</span>
        </button>

        <button
          onClick={() => setCurrentScreen("history")}
          className={`w-full flex items-center gap-3 px-5 py-4 rounded-3xl text-left transition-all ${
            currentScreen === "history" ? "bg-[#00d4c8] text-[#0a2540] font-medium" : "hover:bg-gray-50"
          }`}
        >
          <History size={22} />
          <span className="font-medium">History</span>
        </button>
      </div>

      <div className="p-4 border-t mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-5 py-4 text-red-600 hover:bg-red-50 rounded-3xl transition-all"
        >
          <LogOut size={22} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
