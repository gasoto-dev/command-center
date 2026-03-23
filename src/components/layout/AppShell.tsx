import type { ReactNode } from "react";
import type { ConnectionState } from "../../types/protocol";
import { Header } from "./Header";
import { BottomNav, type Tab } from "./BottomNav";

interface AppShellProps {
  connectionState: ConnectionState;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
}

export function AppShell({ connectionState, activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div
      className="flex flex-col bg-slate-950"
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <Header connectionState={connectionState} />
      <main className="flex-1 overflow-hidden">{children}</main>
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
