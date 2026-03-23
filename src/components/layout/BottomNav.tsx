export type Tab = "chat" | "agents";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "agents", label: "Agents", icon: "🤖" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="flex border-t border-slate-800 bg-slate-900" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
            activeTab === tab.id
              ? "text-blue-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
