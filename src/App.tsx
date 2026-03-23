import { useState } from "react";
import { useGateway } from "./hooks/useGateway";
import { useAgents } from "./hooks/useAgents";
import { useNotifications } from "./hooks/useNotifications";
import { AppShell } from "./components/layout/AppShell";
import { ChatView } from "./components/chat/ChatView";
import { AgentFeed } from "./components/agents/AgentFeed";
import { LoginScreen } from "./components/auth/LoginScreen";
import type { Tab } from "./components/layout/BottomNav";

function getGatewayUrl(): string {
  if (import.meta.env.VITE_GATEWAY_URL) return import.meta.env.VITE_GATEWAY_URL;
  if (import.meta.env.DEV) return "ws://localhost:18789";
  return "wss://openclaw.primordialpen.com";
}

const STORAGE_KEY = "cc-gateway-token";

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const { state, client } = useGateway(token ? getGatewayUrl() : undefined, token ?? undefined);
  const { agents, loading, error, killAgent, killAll } = useAgents(client);

  useNotifications(client);

  const handleLogin = (t: string) => {
    localStorage.setItem(STORAGE_KEY, t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppShell
      connectionState={state}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
    >
      {activeTab === "chat" ? (
        <ChatView client={client} connectionState={state} />
      ) : (
        <AgentFeed
          agents={agents}
          loading={loading}
          error={error}
          onKill={killAgent}
          onKillAll={killAll}
        />
      )}
    </AppShell>
  );
}

export default App;
