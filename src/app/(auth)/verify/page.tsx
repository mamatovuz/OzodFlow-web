"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui";

export default function VerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("email");
    if (e) setEmail(e.toLowerCase());
  }, []);

  // Qayta yuborish uchun ortga sanoq
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: code.trim() }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.error || "Kod noto'g'ri");
      setLoading(false);
      return;
    }
    router.push(json.data.redirect || "/onboarding");
    router.refresh();
  }

  async function resend() {
    if (cooldown > 0 || !email) return;
    setError("");
    setResent(false);
    await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResent(true);
    setCooldown(60);
  }

  return (
    <div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <MailCheck className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Emailni tasdiqlang</h1>
      <p className="mt-1.5 text-sm text-muted">
        {email ? (
          <>
            <span className="font-medium text-foreground">{email}</span> manziliga
            6 xonali kod yubordik. Uni kiriting.
          </>
        ) : (
          "Pochtangizga yuborilgan 6 xonali kodni kiriting."
        )}
      </p>

      {error && (
        <div className="mt-5 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {resent && !error && (
        <div className="mt-5 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          Yangi kod yuborildi
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          autoFocus
          className="h-14 w-full rounded-xl border border-border bg-card text-center font-mono text-2xl tracking-[0.5em] text-foreground outline-none focus:border-accent"
        />
        <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Tasdiqlash
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Kod kelmadimi?{" "}
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="font-medium text-accent hover:underline disabled:text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Qayta yuborish (${cooldown})` : "Qayta yuborish"}
        </button>
      </p>
    </div>
  );
}
