"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { GoogleButton, AuthDivider } from "@/components/auth/google-button";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email,
        password: form.get("password"),
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.error || "Xatolik yuz berdi");
      setLoading(false);
      return;
    }
    // Tasdiqlash kodi pochtaga yuborildi — kod kiritish sahifasiga o'tamiz
    router.push(`/verify?email=${encodeURIComponent(json.data.email || email)}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Hisob yarating</h1>
      <p className="mt-1.5 text-sm text-muted">Bir daqiqada boshlang — 30 kun bepul</p>

      {error && (
        <div className="mt-5 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mt-6">
        <GoogleButton label="Google bilan ro'yxatdan o'tish" />
      </div>
      <AuthDivider />

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>Ismingiz</Label>
          <Input name="name" placeholder="Ism Familiya" required />
        </div>
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
        <div>
          <Label>Parol</Label>
          <Input
            name="password"
            type="password"
            placeholder="Kamida 6 belgi"
            minLength={6}
            autoComplete="new-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Davom etish
        </Button>
        <p className="text-center text-xs text-muted">
          Emailingizga tasdiqlash kodi yuboramiz
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Kirish
        </Link>
      </p>
    </div>
  );
}
