export type AgentStatus = "running" | "completed" | "failed" | "killed";

export interface AgentSession {
  id: string;
  label: string;
  status: AgentStatus;
  task?: string;
  startedAt: number;
  completedAt?: number;
  model?: string;
}

export interface AgentEvent {
  type: "session.updated" | "session.created" | "session.removed";
  session: AgentSession;
}
