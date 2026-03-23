import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { AppShell } from "../AppShell";

describe("AppShell", () => {
  const defaultProps = {
    connectionState: "connected" as const,
    activeTab: "chat" as const,
    onTabChange: vi.fn(),
  };

  test("renders header with app name", () => {
    render(<AppShell {...defaultProps}><div>content</div></AppShell>);
    expect(screen.getByRole("heading", { name: /command center/i })).toBeInTheDocument();
  });

  test("shows bottom navigation tabs", () => {
    render(<AppShell {...defaultProps}><div>content</div></AppShell>);
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
  });

  test("connection indicator shows green when connected", () => {
    render(<AppShell {...defaultProps} connectionState="connected"><div>content</div></AppShell>);
    const dot = screen.getByTestId("connection-indicator");
    expect(dot.className).toContain("bg-green-500");
  });

  test("connection indicator shows yellow when connecting", () => {
    render(<AppShell {...defaultProps} connectionState="connecting"><div>content</div></AppShell>);
    const dot = screen.getByTestId("connection-indicator");
    expect(dot.className).toContain("bg-yellow-500");
  });

  test("connection indicator shows red when disconnected", () => {
    render(<AppShell {...defaultProps} connectionState="disconnected"><div>content</div></AppShell>);
    const dot = screen.getByTestId("connection-indicator");
    expect(dot.className).toContain("bg-red-500");
  });

  test("calls onTabChange when tab is clicked", () => {
    const onTabChange = vi.fn();
    render(<AppShell {...defaultProps} onTabChange={onTabChange}><div>content</div></AppShell>);
    fireEvent.click(screen.getByText("Agents"));
    expect(onTabChange).toHaveBeenCalledWith("agents");
  });
});
