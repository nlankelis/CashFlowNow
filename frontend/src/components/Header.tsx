export default function Header() {
  return (
    <header className="h-16 bg-white border-b px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[#0a2540] font-semibold">Good morning, Alex 👋</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm text-gray-500">15 April 2026</div>
        <div className="w-9 h-9 bg-[#00d4c8]/10 text-[#0a2540] rounded-2xl flex items-center justify-center text-xl cursor-pointer hover:bg-[#00d4c8]/20 transition-colors">
          👤
        </div>
      </div>
    </header>
  );
}