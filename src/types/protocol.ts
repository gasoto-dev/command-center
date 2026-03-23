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

export interface DeviceParams {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce: string;
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
  device?: DeviceParams;
}

export interface HelloOkPayload {
  type: "hello-ok";
  protocol: number;
  auth?: { deviceToken?: string };
}

// ── Chat ──

export interface ChatContentBlock {
  type: "text";
  text: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: ChatContentBlock[] | string;
  timestamp: number;
  runId?: string;
}

export interface ChatSendParams {
  sessionKey: string;
  message: string;
  deliver: boolean;
  idempotencyKey: string;
}

export interface ChatHistoryParams {
  sessionKey: string;
  limit?: number;
}

export interface ChatSendResponse {
  runId: string;
  status: "started" | "in_flight" | "ok";
}

export interface ChatStreamPayload {
  runId: string;
  delta?: string;
  content?: ChatContentBlock[];
  done?: boolean;
}

// ── Connection state ──

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";
