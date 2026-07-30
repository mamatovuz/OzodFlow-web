"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldCheck, ArrowLeft, Send } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

type Mode = "login" | "forgot" | "reset";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [email, setEmail] = useState("");

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: f.get("identifier"),
        password: f.get("password"),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Email yoki parol noto'g'ri");
      setLoading(false);
      return;
    }
    if (json.data?.role !== "ADMIN") {
      setError("Bu hisob admin emas");
      setLoading(false);
      return;
    }
    router.push("/admins");
    router.refresh();
  }

  async function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const em = String(f.get("email"));
    const res = await fetch("/api/admins/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setEmail(em);
    setInfo("Tiklash kodi Telegram bot orqali yuborildi. Kodni kiriting.");
    setMode("reset");
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admins/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: f.get("code"),
        password: f.get("password"),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }
    setInfo("Parol yangilandi. Endi kirishingiz mumkin.");
    setError("");
    setMode("login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-foreground">Admin panel</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "login" && "Boshqaruv paneliga kirish"}
            {mode === "forgot" && "Parolni tiklash"}
            {mode === "reset" && "Yangi parol o'rnating"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          {error && (
            <div className="mb-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              {info}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  name="identifier"
                  placeholder="admin@email.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <Label>Parol</Label>
                <Input name="password" type="password" placeholder="••••••" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Kirish
              </Button>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setInfo("");
                }}
                className="w-full text-center text-sm text-accent hover:underline"
              >
                Parolni unutdingizmi?
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={onForgot} className="space-y-4">
              <div>
                <Label>Admin email</Label>
                <Input
                  name="email"
                  placeholder="admin@email.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                <p className="mt-1.5 text-xs text-muted">
                  Tiklash kodi Telegram bot orqali yuboriladi.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Kod yuborish
              </Button>
              <BackToLogin onClick={() => setMode("login")} />
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={onReset} className="space-y-4">
              <div>
                <Label>Telegramdan kelgan kod</Label>
                <Input
                  name="code"
                  placeholder="6 xonali kod"
                  inputMode="numeric"
                  required
                />
              </div>
              <div>
                <Label>Yangi parol</Label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Kamida 6 belgi"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Parolni yangilash
              </Button>
              <BackToLogin onClick={() => setMode("login")} />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function BackToLogin({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 text-sm text-muted hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Kirishga qaytish
    </button>
  );
}
