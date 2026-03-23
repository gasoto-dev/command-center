import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../../types/protocol";

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractText(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-slate-800 text-slate-100"
        }`}
      >
        <div className="prose prose-invert prose-sm max-w-none break-words">
          <ReactMarkdown>{extractText(message.content)}</ReactMarkdown>
        </div>
        <div
          className={`mt-1 text-xs ${
            isUser ? "text-indigo-200" : "text-slate-500"
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
