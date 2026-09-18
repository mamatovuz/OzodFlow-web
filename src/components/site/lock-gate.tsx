"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export function LockGate({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/site/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, password }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Parol noto'g'ri");
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted">Bu maqola qulflangan. Ochish uchun parolni kiriting.</p>

      <form onSubmit={submit} className="mt-6 w-full max-w-xs">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Parol"
          autoFocus
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-center text-sm outline-none focus:border-foreground"
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Ochish
        </button>
      </form>
    </div>
  );
}
