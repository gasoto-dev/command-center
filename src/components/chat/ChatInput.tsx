import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 border-t border-slate-800 bg-slate-950 p-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Rex..."
        autoFocus
        disabled={disabled}
        className="flex-1 rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}
