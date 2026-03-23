import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AgentFeed } from "../AgentFeed";
import type { AgentSession } from "../../../types/agents";

const mockAgents: AgentSession[] = [
  {
    id: "a1",
    label: "Code Review Agent",
    status: "running",
    task: "Reviewing PR #42",
    startedAt: Date.now() - 120_000,
    model: "claude-sonnet-4-6",
  },
  {
    id: "a2",
    label: "Test Runner",
    status: "completed",
    task: "Running unit tests",
    startedAt: Date.now() - 300_000,
    completedAt: Date.now() - 60_000,
  },
  {
    id: "a3",
    label: "Deploy Agent",
    status: "failed",
    task: "Deploying to staging",
    startedAt: Date.now() - 600_000,
    completedAt: Date.now() - 500_000,
  },
  {
    id: "a4",
    label: "Linter",
    status: "killed",
    task: "Linting src/",
    startedAt: Date.now() - 200_000,
    completedAt: Date.now() - 150_000,
  },
];

const defaultProps = {
  agents: mockAgents,
  loading: false,
  error: null,
  onKill: vi.fn(),
  onKillAll: vi.fn(),
};

describe("AgentFeed", () => {
  it("renders all agents", () => {
    render(<AgentFeed {...defaultProps} />);
    expect(screen.getByText("Code Review Agent")).toBeInTheDocument();
    expect(screen.getByText("Test Runner")).toBeInTheDocument();
    expect(screen.getByText("Deploy Agent")).toBeInTheDocument();
    expect(screen.getByText("Linter")).toBeInTheDocument();
  });

  it("shows empty state when no agents", () => {
    render(<AgentFeed {...defaultProps} agents={[]} />);
    expect(screen.getByTestId("empty-state")).toHaveTextContent("No agents running");
  });

  it("kill button triggers onKill after confirm", () => {
    const onKill = vi.fn();
    render(<AgentFeed {...defaultProps} onKill={onKill} />);

    const killBtn = screen.getByTestId("kill-a1");
    expect(killBtn).toHaveTextContent("Kill");

    // First click shows confirm
    fireEvent.click(killBtn);
    expect(killBtn).toHaveTextContent("Confirm");
    expect(onKill).not.toHaveBeenCalled();

    // Second click triggers kill
    fireEvent.click(killBtn);
    expect(onKill).toHaveBeenCalledWith("a1");
  });

  it("shows correct status badge colors", () => {
    render(<AgentFeed {...defaultProps} />);

    const runningBadge = screen.getByTestId("status-a1");
    expect(runningBadge).toHaveTextContent("running");
    expect(runningBadge.className).toContain("text-green-400");

    const completedBadge = screen.getByTestId("status-a2");
    expect(completedBadge).toHaveTextContent("completed");
    expect(completedBadge.className).toContain("text-blue-400");

    const failedBadge = screen.getByTestId("status-a3");
    expect(failedBadge).toHaveTextContent("failed");
    expect(failedBadge.className).toContain("text-red-400");

    const killedBadge = screen.getByTestId("status-a4");
    expect(killedBadge).toHaveTextContent("killed");
    expect(killedBadge.className).toContain("text-orange-400");
  });

  it("shows Kill All button only when running agents exist", () => {
    const { rerender } = render(<AgentFeed {...defaultProps} />);
    expect(screen.getByTestId("kill-all")).toBeInTheDocument();

    const noRunning = mockAgents.map((a) => ({
      ...a,
      status: "completed" as const,
    }));
    rerender(<AgentFeed {...defaultProps} agents={noRunning} />);
    expect(screen.queryByTestId("kill-all")).not.toBeInTheDocument();
  });

  it("does not show kill button on non-running agents", () => {
    render(<AgentFeed {...defaultProps} />);
    // Running agent has kill button
    expect(screen.getByTestId("kill-a1")).toBeInTheDocument();
    // Completed agent does not
    expect(screen.queryByTestId("kill-a2")).not.toBeInTheDocument();
  });
});
