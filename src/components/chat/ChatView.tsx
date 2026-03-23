import { useEffect, useRef } from "react";
import type { GatewayClient } from "../../lib/gateway";
import type { ConnectionState } from "../../types/protocol";
import { useChat } from "../../hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface ChatViewProps {
  client: GatewayClient;
  connectionState: ConnectionState;
}

export function ChatView({ client, connectionState }: ChatViewProps) {
  const { messages, loading, sendMessage } = useChat(client);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isConnected = connectionState === "connected";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center py-8 text-slate-500">
            Loading messages...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-slate-600">
            No messages yet
          </div>
        )}

        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={(text) => void sendMessage(text)}
        disabled={!isConnected}
      />
    </div>
  );
}
