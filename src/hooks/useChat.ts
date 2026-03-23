import { useCallback, useEffect, useRef, useState } from "react";
import type { GatewayClient } from "../lib/gateway";
import type { ChatMessage, ChatSendResponse, ChatStreamPayload } from "../types/protocol";

const SESSION_KEY_STORAGE = "chat_sessionKey";

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  sessionKey: string | null;
}

function getStoredSessionKey(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY_STORAGE);
  } catch {
    return null;
  }
}

function storeSessionKey(key: string): void {
  try {
    localStorage.setItem(SESSION_KEY_STORAGE, key);
  } catch {
    // storage unavailable
  }
}

export function useChat(client: GatewayClient | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(getStoredSessionKey);
  const loadedRef = useRef(false);
  // Track the in-progress streaming message by runId
  const streamingRef = useRef<{ runId: string; content: string } | null>(null);

  // On connect: resolve session key, then load history
  useEffect(() => {
    if (!client || loadedRef.current) return;
    const state = client.getState();
    if (state !== "connected") return;

    loadedRef.current = true;
    setLoading(true);

    (async () => {
      try {
        // Try to get a session key
        let key = sessionKey;

        if (!key) {
          // Ask gateway for existing sessions
          try {
            const sessResp = await client.request("sessions.list", {});
            const sessions = (sessResp.sessions ?? []) as Array<{ key?: string; sessionKey?: string; type?: string }>;
            // Find a chat/main session
            const chatSession = sessions.find(
              (s) => s.type === "chat" || s.type === "main",
            ) ?? sessions[0];
            if (chatSession) {
              key = chatSession.sessionKey ?? chatSession.key ?? null;
            }
          } catch {
            // sessions.list may not be available — fall back to "default"
          }
        }

        // Fall back to a well-known default
        if (!key) {
          key = "default";
        }

        setSessionKey(key);
        storeSessionKey(key);

        // Load chat history with session key
        const payload = await client.request("chat.history", {
          sessionKey: key,
          limit: 50,
        });
        const history = (payload.messages ?? []) as ChatMessage[];
        setMessages(history);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [client, sessionKey]);

  // Subscribe to "chat" streaming events
  useEffect(() => {
    if (!client) return;

    const unsub = client.subscribe("chat", (payload) => {
      const data = payload as unknown as ChatStreamPayload;

      if (data.done) {
        // Streaming finished — finalize the message
        setStreaming(false);
        streamingRef.current = null;
        return;
      }

      // Accumulate delta into the streaming message
      const delta = data.delta ?? "";
      if (!delta && !data.content) return;

      if (!streamingRef.current && data.runId) {
        // First chunk — create the assistant message
        streamingRef.current = { runId: data.runId, content: "" };
      }

      if (streamingRef.current) {
        if (delta) {
          streamingRef.current.content += delta;
        } else if (data.content) {
          // Full content replacement
          const text = Array.isArray(data.content)
            ? data.content
                .filter((b) => b.type === "text")
                .map((b) => b.text)
                .join("")
            : "";
          streamingRef.current.content = text;
        }

        const current = streamingRef.current;
        setStreaming(true);
        setMessages((prev) => {
          // Update existing streaming message or append new one
          const streamMsgId = `stream-${current.runId}`;
          const idx = prev.findIndex((m) => m.id === streamMsgId);
          const streamMsg: ChatMessage = {
            id: streamMsgId,
            role: "assistant",
            content: current.content,
            timestamp: Date.now(),
            runId: current.runId,
          };

          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = streamMsg;
            return updated;
          }
          return [...prev, streamMsg];
        });
      }
    });

    return unsub;
  }, [client]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!client) throw new Error("No client");
      if (!sessionKey) throw new Error("No session key");

      // Add optimistic user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Send with correct protocol params
      const resp = (await client.request("chat.send", {
        sessionKey,
        message: text,
        deliver: false,
        idempotencyKey: crypto.randomUUID(),
      })) as unknown as ChatSendResponse;

      // Response is { runId, status } — not a message.
      // The assistant response will stream in via "chat" events.
      if (resp.runId) {
        streamingRef.current = { runId: resp.runId, content: "" };
        setStreaming(true);
      }
    },
    [client, sessionKey],
  );

  return { messages, loading, streaming, error, sendMessage, sessionKey };
}
