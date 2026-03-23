import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatView } from "../ChatView";
import type { GatewayClient } from "../../../lib/gateway";
import type { ChatMessage } from "../../../types/protocol";

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const mockMessages: ChatMessage[] = [
  { id: "1", role: "user", content: "Hello Rex", timestamp: 1700000000000 },
  { id: "2", role: "assistant", content: "Hi there!", timestamp: 1700000001000 },
];

function createMockClient(opts: { messages?: ChatMessage[] } = {}): GatewayClient {
  const subscribers = new Map<string, Set<(payload: Record<string, unknown>) => void>>();

  return {
    getState: () => "connected",
    request: vi.fn(async (method: string) => {
      if (method === "sessions.list") {
        return { sessions: [{ sessionKey: "test-session", type: "chat" }] };
      }
      if (method === "chat.history") {
        return { messages: opts.messages ?? mockMessages };
      }
      if (method === "chat.send") {
        return { runId: "run-123", status: "started" };
      }
      return {};
    }),
    subscribe: vi.fn((event: string, fn: (payload: Record<string, unknown>) => void) => {
      let set = subscribers.get(event);
      if (!set) {
        set = new Set();
        subscribers.set(event, set);
      }
      set.add(fn);
      return () => set!.delete(fn);
    }),
    onStateChange: vi.fn(() => () => {}),
  } as unknown as GatewayClient;
}

describe("ChatView", () => {
  let client: GatewayClient;

  beforeEach(() => {
    localStorage.clear();
    client = createMockClient();
  });

  it("renders the chat view", async () => {
    render(<ChatView client={client} connectionState="connected" />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Message Rex...")).toBeInTheDocument();
    });
  });

  it("displays messages from history", async () => {
    render(<ChatView client={client} connectionState="connected" />);
    await waitFor(() => {
      expect(screen.getByText("Hello Rex")).toBeInTheDocument();
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });
  });

  it("sends a message with correct protocol params", async () => {
    render(<ChatView client={client} connectionState="connected" />);

    await waitFor(() => {
      expect(screen.getByText("Hello Rex")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Message Rex...");
    fireEvent.change(input, { target: { value: "New message" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        "chat.send",
        expect.objectContaining({
          sessionKey: "test-session",
          message: "New message",
          deliver: false,
          idempotencyKey: expect.any(String),
        }),
      );
    });
  });

  it("adds optimistic user message on send", async () => {
    render(<ChatView client={client} connectionState="connected" />);

    await waitFor(() => {
      expect(screen.getByText("Hello Rex")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Message Rex...");
    fireEvent.change(input, { target: { value: "New message" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("New message")).toBeInTheDocument();
    });
  });

  it("shows user vs assistant messages differently", async () => {
    render(<ChatView client={client} connectionState="connected" />);

    await waitFor(() => {
      const userMsg = screen.getByTestId("message-user");
      const assistantMsg = screen.getByTestId("message-assistant");
      expect(userMsg).toBeInTheDocument();
      expect(assistantMsg).toBeInTheDocument();
      expect(userMsg.className).toContain("justify-end");
      expect(assistantMsg.className).toContain("justify-start");
    });
  });

  it("subscribes to 'chat' events (not 'chat.message')", async () => {
    render(<ChatView client={client} connectionState="connected" />);

    await waitFor(() => {
      expect(client.subscribe).toHaveBeenCalledWith("chat", expect.any(Function));
    });

    // Should NOT subscribe to chat.message
    const subscribeCalls = (client.subscribe as ReturnType<typeof vi.fn>).mock.calls;
    const eventNames = subscribeCalls.map((call: unknown[]) => call[0]);
    expect(eventNames).not.toContain("chat.message");
  });

  it("loads session key from sessions.list", async () => {
    render(<ChatView client={client} connectionState="connected" />);

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith("sessions.list", {});
    });

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith(
        "chat.history",
        expect.objectContaining({ sessionKey: "test-session" }),
      );
    });
  });
});
