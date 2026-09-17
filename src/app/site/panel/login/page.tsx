"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export default function SitePanelLogin() {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.replace(/\/panel\/login\/?$/, "");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/site/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Kirishda xatolik");
      return;
    }
    router.push(`${base}/panel`);
    router.refresh();
  }

  return (
    <div className="site-root flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-7">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Admin panel</h1>
        <p className="mt-1 text-sm text-muted">Blog yozish uchun kiring.</p>

        <div className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol"
            required
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Kirish
        </button>
      </form>
    </div>
  );
}
