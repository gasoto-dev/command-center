import { useState } from "react";
import type { AgentSession, AgentStatus } from "../../types/agents";

const statusColors: Record<AgentStatus, string> = {
  running: "bg-green-500/20 text-green-400",
  completed: "bg-blue-500/20 text-blue-400",
  failed: "bg-red-500/20 text-red-400",
  killed: "bg-orange-500/20 text-orange-400",
};

function formatDuration(startedAt: number, completedAt?: number): string {
  const end = completedAt ?? Date.now();
  const seconds = Math.floor((end - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

interface AgentCardProps {
  agent: AgentSession;
  onKill: (id: string) => void;
}

export function AgentCard({ agent, onKill }: AgentCardProps) {
  const [confirming, setConfirming] = useState(false);

  const handleKill = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onKill(agent.id);
    setConfirming(false);
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-slate-100">
              {agent.label}
            </h3>
            <span
              data-testid={`status-${agent.id}`}
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[agent.status]}`}
            >
              {agent.status}
            </span>
          </div>
          {agent.task && (
            <p className="mt-1 truncate text-xs text-slate-400">{agent.task}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span>{formatDuration(agent.startedAt, agent.completedAt)}</span>
            {agent.model && <span>{agent.model}</span>}
          </div>
        </div>
        {agent.status === "running" && (
          <button
            data-testid={`kill-${agent.id}`}
            onClick={handleKill}
            className={`shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              confirming
                ? "bg-red-600 text-white"
                : "bg-slate-800 text-red-400 hover:bg-red-600/20"
            }`}
          >
            {confirming ? "Confirm" : "Kill"}
          </button>
        )}
      </div>
    </div>
  );
}
