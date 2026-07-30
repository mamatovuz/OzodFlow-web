"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: form.get("identifier"),
        password: form.get("password"),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Xatolik yuz berdi");
      setLoading(false);
      return;
    }
    router.push(json.data?.role === "ADMIN" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Xush kelibsiz</h1>
      <p className="mt-1.5 text-sm text-muted">
        Hisobingizga kirish uchun ma'lumotlarni kiriting
      </p>

      {error && (
        <div className="mt-5 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label>Email yoki telefon</Label>
          <Input
            name="identifier"
            placeholder="siz@email.uz"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Parol</Label>
            <Link href="#" className="text-xs text-accent hover:underline">
              Parolni unutdingizmi?
            </Link>
          </div>
          <Input name="password" type="password" placeholder="••••••" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Kirish
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Hisobingiz yo'qmi?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Ro'yxatdan o'ting
        </Link>
      </p>
    </div>
  );
}
