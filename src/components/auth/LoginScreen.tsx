import { useState } from "react";

interface LoginScreenProps {
  onLogin: (token: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [token, setToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed) onLogin(trimmed);
  };

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-white">
          Command Center
        </h1>
        <p className="mb-8 text-center text-sm text-slate-400">
          Enter your gateway token to connect
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Gateway token"
            autoFocus
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!token.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600"
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}
