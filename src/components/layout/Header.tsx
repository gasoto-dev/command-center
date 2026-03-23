import type { ConnectionState } from "../../types/protocol";

const statusColor: Record<ConnectionState, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500",
  reconnecting: "bg-yellow-500",
  disconnected: "bg-red-500",
};

interface HeaderProps {
  connectionState: ConnectionState;
}

export function Header({ connectionState }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
      <h1 className="text-lg font-semibold text-slate-100">Command Center</h1>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 capitalize">{connectionState}</span>
        <span
          data-testid="connection-indicator"
          className={`h-2.5 w-2.5 rounded-full ${statusColor[connectionState]}`}
        />
      </div>
    </header>
  );
}
