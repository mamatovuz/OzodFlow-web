"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

export default function ResetPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) setToken(t);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Parol kamida 6 belgi bo'lishi kerak");
      return;
    }
    if (password !== confirm) {
      setError("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || !json.success) {
      setError(json.error || "Havola noto'g'ri yoki muddati tugagan");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1800);
  }

  if (done) {
    return (
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Parol yangilandi</h1>
        <p className="mt-1.5 text-sm text-muted">
          Endi yangi parolingiz bilan kirishingiz mumkin. Kirish sahifasiga
          yo'naltiryapmiz...
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Havola noto'g'ri</h1>
        <p className="mt-1.5 text-sm text-muted">
          Parolni tiklash havolasi topilmadi yoki muddati tugagan.
        </p>
        <Link
          href="/forgot"
          className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
        >
          Qaytadan so'rash
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Yangi parol</h1>
      <p className="mt-1.5 text-sm text-muted">
        Hisobingiz uchun yangi parol o'ylab toping.
      </p>

      {error && (
        <div className="mt-5 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label>Yangi parol</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kamida 6 belgi"
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <Label>Yangi parolni takrorlang</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Parolni qayta kiriting"
            autoComplete="new-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Parolni saqlash
        </Button>
      </form>
    </div>
  );
}
