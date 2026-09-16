"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

export default function ForgotPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(form.get("email") || "").trim().toLowerCase() }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || !json.success) {
      setError(json.error || "Xatolik yuz berdi");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Havola yuborildi</h1>
        <p className="mt-1.5 text-sm text-muted">
          Agar bu email ro'yxatda bo'lsa, unga parolni tiklash havolasini yubordik.
          Pochtangizni (va spam papkasini) tekshiring.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
        >
          Kirish sahifasiga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Parolni tiklash</h1>
      <p className="mt-1.5 text-sm text-muted">
        Hisobingiz emailini kiriting — parolni tiklash havolasini yuboramiz.
      </p>

      {error && (
        <div className="mt-5 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label>Email</Label>
          <Input
            name="email"
            type="email"
            placeholder="siz@email.uz"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Havola yuborish
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Kirish sahifasiga qaytish
        </Link>
      </p>
    </div>
  );
}
