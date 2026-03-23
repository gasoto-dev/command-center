export type Tab = "chat" | "agents" | "controls" | "status" | "metrics" | "notifications";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "agents", icon: "🤖", label: "Agents" },
  { id: "controls", icon: "⚡", label: "Ctrl" },
  { id: "status", icon: "📊", label: "Status" },
  { id: "metrics", icon: "📈", label: "Metrics" },
  { id: "notifications", icon: "🔔", label: "Notif" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="flex border-t border-slate-800 bg-slate-900" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
            activeTab === tab.id
              ? "text-blue-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className="text-base">{tab.icon}</span>
          <span className="leading-tight">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
