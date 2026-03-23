// ── Frame envelope types ──

export interface RequestFrame {
  type: "req";
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface ResponseFrame {
  type: "res";
  id: string;
  ok: true;
  payload: Record<string, unknown>;
}

export interface ErrorResponseFrame {
  type: "res";
  id: string;
  ok: false;
  error: { code: string; message: string };
}

export type AnyResponseFrame = ResponseFrame | ErrorResponseFrame;

export interface EventFrame {
  type: "event";
  event: string;
  payload: Record<string, unknown>;
  seq?: number;
  stateVersion?: number;
}

export type Frame = RequestFrame | AnyResponseFrame | EventFrame;

// ── Connect handshake ──

export interface ConnectChallengePayload {
  nonce: string;
  ts: number;
}

export interface ClientInfo {
  id: string;
  version: string;
  platform: string;
  mode: string;
}

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: ClientInfo;
  role: string;
  scopes: string[];
  caps: string[];
  commands: string[];
  permissions: Record<string, unknown>;
  auth: { token: string };
}

export interface HelloOkPayload {
  type: "hello-ok";
  protocol: number;
}

// ── Chat ──

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: number;
}

export interface ChatSendParams {
  text: string;
  channel?: string;
}

export interface ChatHistoryParams {
  channel?: string;
  before?: number;
  limit?: number;
}

// ── Connection state ──

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";
