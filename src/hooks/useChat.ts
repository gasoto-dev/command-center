import { useCallback, useEffect, useRef, useState } from "react";
import type { GatewayClient } from "../lib/gateway";
import type { ChatMessage } from "../types/protocol";

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
}

export function useChat(client: GatewayClient | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Load history on mount when client is connected
  useEffect(() => {
    if (!client || loadedRef.current) return;

    const state = client.getState();
    if (state !== "connected") return;

    loadedRef.current = true;
    setLoading(true);
    client
      .request("chat.history", { limit: 50 })
      .then((payload) => {
        const history = (payload.messages ?? []) as ChatMessage[];
        setMessages(history);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [client]);

  // Subscribe to incoming chat messages
  useEffect(() => {
    if (!client) return;
    const unsub = client.subscribe("chat.message", (payload) => {
      const msg = payload as unknown as ChatMessage;
      setMessages((prev) => [...prev, msg]);
    });
    return unsub;
  }, [client]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!client) throw new Error("No client");
      const payload = await client.request("chat.send", { text });
      const msg = payload as unknown as ChatMessage;
      setMessages((prev) => [...prev, msg]);
    },
    [client],
  );

  return { messages, loading, error, sendMessage };
}
