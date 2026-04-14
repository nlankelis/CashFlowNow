import { Upload, Home, History, LogOut } from "lucide-react";

type Screen = "home" | "upload" | "results" | "history";

interface SidebarProps {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
}

export default function Sidebar({
  currentScreen,
  setCurrentScreen,
}: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <img src="/src/assets/LogoNoBG.png" alt="Logo" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CashFlowNow</h1>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-1">
        <button
          onClick={() => setCurrentScreen("home")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${currentScreen === "home" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}
        >
          <Home size={20} />
          <span className="font-medium">Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentScreen("upload")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${currentScreen === "upload" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}
        >
          <Upload size={20} />
          <span className="font-medium">Upload Invoices</span>
        </button>

        <button
          onClick={() => setCurrentScreen("history")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${currentScreen === "history" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}
        >
          <History size={20} />
          <span className="font-medium">History</span>
        </button>
      </div>

      <div className="p-4 border-t">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl">
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
