import { useState } from "react";
import type { AgentSession } from "../../types/agents";
import { AgentCard } from "./AgentCard";

const statusOrder: Record<string, number> = {
  running: 0,
  failed: 1,
  killed: 2,
  completed: 3,
};

function sortAgents(agents: AgentSession[]): AgentSession[] {
  return [...agents].sort((a, b) => {
    const orderDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    return b.startedAt - a.startedAt;
  });
}

interface AgentFeedProps {
  agents: AgentSession[];
  loading: boolean;
  error: string | null;
  onKill: (id: string) => void;
  onKillAll: () => void;
}

export function AgentFeed({ agents, loading, error, onKill, onKillAll }: AgentFeedProps) {
  const [confirmKillAll, setConfirmKillAll] = useState(false);
  const sorted = sortAgents(agents);
  const hasRunning = agents.some((a) => a.status === "running");

  const handleKillAll = () => {
    if (!confirmKillAll) {
      setConfirmKillAll(true);
      return;
    }
    onKillAll();
    setConfirmKillAll(false);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Agents</h2>
        {hasRunning && (
          <button
            data-testid="kill-all"
            onClick={handleKillAll}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              confirmKillAll
                ? "bg-red-600 text-white"
                : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
            }`}
          >
            {confirmKillAll ? "Confirm Kill All" : "Kill All"}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && agents.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">Loading agents…</p>
      )}

      {!loading && agents.length === 0 && !error && (
        <p data-testid="empty-state" className="py-8 text-center text-sm text-slate-500">
          No agents running
        </p>
      )}

      {sorted.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onKill={onKill} />
      ))}
    </div>
  );
}
