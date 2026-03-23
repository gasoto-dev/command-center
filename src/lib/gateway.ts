import type {
  AnyResponseFrame,
  ConnectParams,
  ConnectionState,
  EventFrame,
  Frame,
  RequestFrame,
} from "../types/protocol";

type StateListener = (state: ConnectionState) => void;
type EventListener = (payload: Record<string, unknown>, frame: EventFrame) => void;

interface PendingRequest {
  resolve: (payload: Record<string, unknown>) => void;
  reject: (err: Error) => void;
}

const BACKOFF_BASE = 1000;
const BACKOFF_MAX = 30_000;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private url = "";
  private token = "";
  private state: ConnectionState = "disconnected";
  private pending = new Map<string, PendingRequest>();
  private eventListeners = new Map<string, Set<EventListener>>();
  private stateListeners = new Set<StateListener>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(fn: StateListener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  subscribe(event: string, fn: EventListener): () => void {
    let set = this.eventListeners.get(event);
    if (!set) {
      set = new Set();
      this.eventListeners.set(event, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  connect(url: string, token = ""): Promise<void> {
    this.url = url;
    this.token = token;
    this.shouldReconnect = true;
    this.reconnectAttempt = 0;
    return this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.rejectAllPending("Client disconnected");
    this.setState("disconnected");
  }

  async request(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (this.state !== "connected") {
      throw new Error("Not connected");
    }
    const id = crypto.randomUUID();
    const frame: RequestFrame = { type: "req", id, method, params };
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(frame));
    });
  }

  // ── internals ──

  private openSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.setState("connecting");
      const ws = new WebSocket(this.url);
      this.ws = ws;

      let handshakeDone = false;

      ws.onopen = () => {
        // wait for challenge event
      };

      ws.onmessage = (ev: MessageEvent) => {
        let frame: Frame;
        try {
          frame = JSON.parse(ev.data as string) as Frame;
        } catch {
          return;
        }

        if (!handshakeDone && frame.type === "event" && frame.event === "connect.challenge") {
          this.handleChallenge(ws)
            .then(() => {
              handshakeDone = true;
              this.reconnectAttempt = 0;
              this.setState("connected");
              resolve();
            })
            .catch((err) => {
              ws.close();
              reject(err);
            });
          return;
        }

        if (frame.type === "res") {
          this.handleResponse(frame);
        } else if (frame.type === "event") {
          this.handleEvent(frame);
        }
      };

      ws.onerror = () => {
        // onclose fires after onerror
      };

      ws.onclose = () => {
        this.ws = null;
        this.rejectAllPending("Connection closed");
        if (!handshakeDone) {
          reject(new Error("Connection closed before handshake"));
        }
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        } else {
          this.setState("disconnected");
        }
      };
    });
  }

  private async handleChallenge(ws: WebSocket): Promise<void> {
    const id = crypto.randomUUID();
    const params: ConnectParams = {
      minProtocol: 3,
      maxProtocol: 3,
      client: { id: "openclaw-control-ui", version: "0.1.0", platform: "web", mode: "webchat" },
      role: "operator",
      scopes: ["operator.read", "operator.write"],
      caps: [],
      commands: [],
      permissions: {},
      auth: { token: this.token },
    };
    const frame: RequestFrame = { type: "req", id, method: "connect", params: params as unknown as Record<string, unknown> };

    return new Promise<void>((resolve, reject) => {
      this.pending.set(id, {
        resolve: () => resolve(),
        reject: (err) => reject(err),
      });
      ws.send(JSON.stringify(frame));
    });
  }

  private handleResponse(frame: AnyResponseFrame): void {
    const p = this.pending.get(frame.id);
    if (!p) return;
    this.pending.delete(frame.id);
    if (frame.ok) {
      p.resolve(frame.payload);
    } else {
      p.reject(new Error(frame.error.message));
    }
  }

  private handleEvent(frame: EventFrame): void {
    const listeners = this.eventListeners.get(frame.event);
    if (listeners) {
      for (const fn of listeners) {
        fn(frame.payload, frame);
      }
    }
  }

  private scheduleReconnect(): void {
    this.setState("reconnecting");
    const delay = Math.min(BACKOFF_BASE * 2 ** this.reconnectAttempt, BACKOFF_MAX);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket().catch(() => {
        // reconnect failure handled by onclose → scheduleReconnect
      });
    }, delay);
  }

  private setState(s: ConnectionState): void {
    if (s === this.state) return;
    this.state = s;
    for (const fn of this.stateListeners) {
      fn(s);
    }
  }

  private rejectAllPending(msg: string): void {
    for (const [, p] of this.pending) {
      p.reject(new Error(msg));
    }
    this.pending.clear();
  }
}
