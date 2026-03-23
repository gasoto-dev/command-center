import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatView } from "../ChatView";
import type { GatewayClient } from "../../../lib/gateway";
import type { ChatMessage } from "../../../types/protocol";

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const mockMessages: ChatMessage[] = [
  { id: "1", sender: "user", text: "Hello Rex", ts: 1700000000000 },
  { id: "2", sender: "assistant", text: "Hi there!", ts: 1700000001000 },
];

function createMockClient(opts: { messages?: ChatMessage[] } = {}): GatewayClient {
  const subscribers = new Map<string, Set<(payload: Record<string, unknown>) => void>>();

  return {
    getState: () => "connected",
    request: vi.fn(async (method: string) => {
      if (method === "chat.history") {
        return { messages: opts.messages ?? mockMessages };
      }
      if (method === "chat.send") {
        return { id: "3", sender: "user", text: "test", ts: Date.now() };
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

  it("sends a message on form submit", async () => {
    render(<ChatView client={client} connectionState="connected" />);

    await waitFor(() => {
      expect(screen.getByText("Hello Rex")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Message Rex...");
    fireEvent.change(input, { target: { value: "New message" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(client.request).toHaveBeenCalledWith("chat.send", { text: "New message" });
    });
  });

  it("shows user vs assistant messages differently", async () => {
    render(<ChatView client={client} connectionState="connected" />);

    await waitFor(() => {
      const userMsg = screen.getByTestId("message-user");
      const assistantMsg = screen.getByTestId("message-assistant");
      expect(userMsg).toBeInTheDocument();
      expect(assistantMsg).toBeInTheDocument();
      // User messages are right-aligned (justify-end), assistant left-aligned (justify-start)
      expect(userMsg.className).toContain("justify-end");
      expect(assistantMsg.className).toContain("justify-start");
    });
  });
});
