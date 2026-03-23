import { useEffect } from "react";
import type { GatewayClient } from "../lib/gateway";
import { requestPermission, notify } from "../lib/notifications";

export function useNotifications(client: GatewayClient | null) {
  useEffect(() => {
    void requestPermission();
  }, []);

  useEffect(() => {
    if (!client) return;
    return client.subscribe("chat.message", (payload) => {
      const sender = (payload.sender as string) ?? "Rex";
      const text = (payload.text as string) ?? "";
      notify(sender, text);
    });
  }, [client]);
}
