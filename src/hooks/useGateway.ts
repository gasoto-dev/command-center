import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionState } from "../types/protocol";
import { GatewayClient } from "../lib/gateway";

export function useGateway(url?: string, token?: string) {
  const clientRef = useRef<GatewayClient | null>(null);
  const [state, setState] = useState<ConnectionState>("disconnected");

  if (!clientRef.current) {
    clientRef.current = new GatewayClient();
  }
  const client = clientRef.current;

  useEffect(() => {
    const unsub = client.onStateChange(setState);
    return unsub;
  }, [client]);

  const connect = useCallback(
    (overrideUrl?: string, overrideToken?: string) => {
      const u = overrideUrl ?? url;
      if (!u) throw new Error("No URL provided");
      return client.connect(u, overrideToken ?? token ?? "");
    },
    [client, url, token],
  );

  const disconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  // Auto-connect when url is provided
  useEffect(() => {
    if (url) {
      client.connect(url, token ?? "").catch(() => {
        // handled by state listeners
      });
      return () => client.disconnect();
    }
  }, [client, url, token]);

  return { state, client, connect, disconnect };
}
