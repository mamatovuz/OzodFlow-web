"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { GoogleButton, AuthDivider } from "@/components/auth/google-button";

// Google yo'naltirishidan qaytgan xato kodlarini o'zbekcha xabarga o'giradi.
const GOOGLE_ERRORS: Record<string, string> = {
  google: "Google orqali kirishда xatolik. Qayta urinib ko'ring.",
  google_off: "Google bilan kirish hozircha sozlanmagan.",
  google_cancel: "Google orqali kirish bekor qilindi.",
  google_state: "Sessiya muddati tugadi. Qaytadan urinib ko'ring.",
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Google callback xato bilan qaytarsa (?error=...) — ko'rsatamiz.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) setError(GOOGLE_ERRORS[code] || "Kirishда xatolik yuz berdi");
  }, []);

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
    router.push(json.data?.redirect || "/dashboard");
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

      <div className="mt-6">
        <GoogleButton label="Google bilan kirish" />
      </div>
      <AuthDivider />

      <form onSubmit={onSubmit} className="space-y-4">
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
