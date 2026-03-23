import { useEffect, useState, useCallback } from "react";
import type { GatewayClient } from "../lib/gateway";
import {
  requestPermission,
  notify,
  getPermissionState,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "../lib/notifications";

export interface PushState {
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function useNotifications(client: GatewayClient | null): PushState {
  const [permission, setPermission] = useState<NotificationPermission>(getPermissionState);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Request permission and check existing subscription on mount
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const perm = await requestPermission();
      if (cancelled) return;
      setPermission(perm);

      const existing = await getExistingSubscription();
      if (cancelled) return;
      setSubscribed(existing !== null);
      setLoading(false);
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    const sub = await subscribeToPush();
    setSubscribed(sub !== null);
    setPermission(getPermissionState());
    setLoading(false);
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setLoading(false);
  }, []);

  // Subscribe to "chat" events for notifications (assistant messages only)
  useEffect(() => {
    if (!client) return;
    return client.subscribe("chat", (payload) => {
      // Only notify for assistant messages, not user echoes or partial deltas
      if (payload.role !== "assistant") return;
      if (payload.done === false) return; // skip partial chunks
      const delta = (payload.delta as string) ?? "";
      const content = payload.content;
      let text = delta;
      if (!text && Array.isArray(content)) {
        text = (content as Array<{ type: string; text: string }>)
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
      }
      if (text) {
        void notify("Rex", text);
      }
    });
  }, [client]);

  return { permission, subscribed, loading, subscribe, unsubscribe };
}
