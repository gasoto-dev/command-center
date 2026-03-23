import { useCallback, useEffect, useState } from "react";
import type { GatewayClient } from "../lib/gateway";
import type { AgentSession, AgentEvent } from "../types/agents";

export function useAgents(client: GatewayClient | null) {
  const [agents, setAgents] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || client.getState() !== "connected") return;

    let cancelled = false;

    setLoading(true);
    client
      .request("sessions.list", {})
      .then((payload) => {
        if (cancelled) return;
        const sessions = (payload.sessions ?? []) as AgentSession[];
        setAgents(sessions);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubUpdate = client.subscribe("session.updated", (payload) => {
      const event = payload as unknown as AgentEvent;
      setAgents((prev) => {
        const idx = prev.findIndex((a) => a.id === event.session.id);
        if (idx === -1) return [...prev, event.session];
        const next = [...prev];
        next[idx] = event.session;
        return next;
      });
    });

    const unsubCreate = client.subscribe("session.created", (payload) => {
      const event = payload as unknown as AgentEvent;
      setAgents((prev) => {
        if (prev.some((a) => a.id === event.session.id)) return prev;
        return [...prev, event.session];
      });
    });

    const unsubRemove = client.subscribe("session.removed", (payload) => {
      const event = payload as unknown as AgentEvent;
      setAgents((prev) => prev.filter((a) => a.id !== event.session.id));
    });

    return () => {
      cancelled = true;
      unsubUpdate();
      unsubCreate();
      unsubRemove();
    };
  }, [client]);

  const killAgent = useCallback(
    async (id: string) => {
      if (!client) return;
      await client.request("sessions.kill", { id });
    },
    [client],
  );

  const killAll = useCallback(async () => {
    if (!client) return;
    await client.request("sessions.killAll", {});
  }, [client]);

  return { agents, loading, error, killAgent, killAll };
}
