"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
        restaurantName: form.get("restaurantName"),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Xatolik yuz berdi");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Hisob yarating</h1>
      <p className="mt-1.5 text-sm text-muted">
        Bir daqiqada boshlang — bepul
      </p>

      {error && (
        <div className="mt-5 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label>Ismingiz</Label>
          <Input name="name" placeholder="Ism Familiya" required />
        </div>
        <div>
          <Label>Restoran nomi</Label>
          <Input name="restaurantName" placeholder="Masalan: Osh Markazi" required />
        </div>
        <div>
          <Label>Email</Label>
          <Input name="email" type="email" placeholder="siz@email.uz" />
        </div>
        <div>
          <Label>Telefon</Label>
          <Input name="phone" type="tel" placeholder="+998 90 123 45 67" />
        </div>
        <div>
          <Label>Parol</Label>
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
          Ro'yxatdan o'tish
        </Button>
        <p className="text-center text-xs text-muted">
          Email yoki telefondan kamida bittasini kiriting
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
