import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GatewayClient } from "../gateway";

// ── Mock WebSocket ──

type WSHandler = (ev: { data: string }) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: WSHandler | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  readyState = 0;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  // helpers for tests
  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose() {
    this.readyState = 3;
    this.onclose?.();
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function latestWs(): MockWebSocket {
  const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  if (!ws) throw new Error("No WebSocket instance");
  return ws;
}

async function performHandshake(client: GatewayClient, url = "ws://test") {
  const connectPromise = client.connect(url, "test-token");

  // wait for microtask so WebSocket constructor runs
  await vi.advanceTimersByTimeAsync(0);
  const ws = latestWs();

  ws.simulateOpen();
  // gateway sends challenge
  ws.simulateMessage({ type: "event", event: "connect.challenge", payload: { nonce: "abc", ts: 1 } });

  // client should have sent a connect request
  await vi.advanceTimersByTimeAsync(0);
  const connectReq = JSON.parse(ws.sent[0]!);
  expect(connectReq.type).toBe("req");
  expect(connectReq.method).toBe("connect");

  // gateway responds with hello-ok
  ws.simulateMessage({ type: "res", id: connectReq.id, ok: true, payload: { type: "hello-ok", protocol: 3 } });

  await connectPromise;
  return ws;
}

describe("GatewayClient", () => {
  describe("handshake", () => {
    it("completes the challenge/connect handshake", async () => {
      const client = new GatewayClient();
      const ws = await performHandshake(client);

      expect(client.getState()).toBe("connected");

      const req = JSON.parse(ws.sent[0]!);
      expect(req.params.auth.token).toBe("test-token");
      expect(req.params.client.id).toBe("command-center");
      expect(req.params.minProtocol).toBe(3);
      expect(req.params.maxProtocol).toBe(3);

      client.disconnect();
    });

    it("transitions through connecting → connected states", async () => {
      const client = new GatewayClient();
      const states: string[] = [];
      client.onStateChange((s) => states.push(s));

      await performHandshake(client);
      expect(states).toEqual(["connecting", "connected"]);

      client.disconnect();
      expect(states).toEqual(["connecting", "connected", "disconnected"]);
    });
  });

  describe("request/response", () => {
    it("matches responses to requests by id", async () => {
      const client = new GatewayClient();
      const ws = await performHandshake(client);

      const p1 = client.request("chat.send", { text: "hello" });
      const p2 = client.request("chat.history", { limit: 10 });

      await vi.advanceTimersByTimeAsync(0);

      const req1 = JSON.parse(ws.sent[1]!);
      const req2 = JSON.parse(ws.sent[2]!);

      // respond out of order
      ws.simulateMessage({ type: "res", id: req2.id, ok: true, payload: { messages: [] } });
      ws.simulateMessage({ type: "res", id: req1.id, ok: true, payload: { sent: true } });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual({ sent: true });
      expect(r2).toEqual({ messages: [] });

      client.disconnect();
    });

    it("rejects on error response", async () => {
      const client = new GatewayClient();
      const ws = await performHandshake(client);

      const p = client.request("bad.method", {});
      await vi.advanceTimersByTimeAsync(0);

      const req = JSON.parse(ws.sent[1]!);
      ws.simulateMessage({ type: "res", id: req.id, ok: false, error: { code: "NOT_FOUND", message: "Unknown method" } });

      await expect(p).rejects.toThrow("Unknown method");

      client.disconnect();
    });

    it("rejects request when not connected", async () => {
      const client = new GatewayClient();
      await expect(client.request("foo", {})).rejects.toThrow("Not connected");
    });
  });

  describe("event subscription", () => {
    it("delivers events to subscribers", async () => {
      const client = new GatewayClient();
      const ws = await performHandshake(client);

      const received: unknown[] = [];
      client.subscribe("chat/message", (payload) => received.push(payload));

      ws.simulateMessage({ type: "event", event: "chat/message", payload: { text: "hi" }, seq: 1 });
      ws.simulateMessage({ type: "event", event: "chat/message", payload: { text: "yo" }, seq: 2 });
      ws.simulateMessage({ type: "event", event: "other/event", payload: { x: 1 } });

      expect(received).toEqual([{ text: "hi" }, { text: "yo" }]);

      client.disconnect();
    });

    it("allows unsubscribing", async () => {
      const client = new GatewayClient();
      const ws = await performHandshake(client);

      const received: unknown[] = [];
      const unsub = client.subscribe("chat/message", (payload) => received.push(payload));

      ws.simulateMessage({ type: "event", event: "chat/message", payload: { text: "a" } });
      unsub();
      ws.simulateMessage({ type: "event", event: "chat/message", payload: { text: "b" } });

      expect(received).toEqual([{ text: "a" }]);

      client.disconnect();
    });
  });

  describe("reconnect", () => {
    it("reconnects with exponential backoff", async () => {
      const client = new GatewayClient();
      const states: string[] = [];
      client.onStateChange((s) => states.push(s));

      await performHandshake(client);
      const instanceCount = MockWebSocket.instances.length;

      // simulate unexpected close
      latestWs().simulateClose();
      expect(client.getState()).toBe("reconnecting");

      // 1s backoff — first reconnect attempt
      await vi.advanceTimersByTimeAsync(1000);
      expect(MockWebSocket.instances.length).toBe(instanceCount + 1);

      // simulate that reconnect also fails
      latestWs().simulateClose();

      // 2s backoff — second attempt
      await vi.advanceTimersByTimeAsync(1999);
      expect(MockWebSocket.instances.length).toBe(instanceCount + 1); // not yet
      await vi.advanceTimersByTimeAsync(1);
      expect(MockWebSocket.instances.length).toBe(instanceCount + 2);

      // third failure → 4s backoff
      latestWs().simulateClose();
      await vi.advanceTimersByTimeAsync(4000);
      expect(MockWebSocket.instances.length).toBe(instanceCount + 3);

      client.disconnect();
    });

    it("does not reconnect after explicit disconnect", async () => {
      const client = new GatewayClient();
      await performHandshake(client);
      const count = MockWebSocket.instances.length;

      client.disconnect();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(MockWebSocket.instances.length).toBe(count);
    });
  });
});
