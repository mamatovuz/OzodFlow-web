"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Lock,
  WalletCards,
  Send,
  Loader2,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { Billing } from "@/components/dashboard/billing";
import type { PlanKey } from "@/lib/plans";

type Message = {
  id: string;
  topic: string;
  sender: string;
  body: string;
  createdAt: string;
};

async function logout(router: ReturnType<typeof useRouter>) {
  await fetch("/api/auth/logout", { method: "POST" });
  router.push("/login");
  router.refresh();
}

// Egasi ↔ admin yozishmasi (blok yoki to'lov mavzusi bo'yicha)
function SupportThread({ topic }: { topic: "BLOCK" | "PAYMENT" }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/support");
    const json = await res.json();
    if (json.success) {
      setMessages(json.data.filter((m: Message) => m.topic === topic));
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, body: text }),
    });
    setSending(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Xatolik");
      return;
    }
    setText("");
    load();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-medium text-foreground">
        {topic === "BLOCK"
          ? "Administrator bilan yozishmalar"
          : "To'lov bo'yicha yozishmalar"}
      </p>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            Hali xabar yo'q. Quyidan yozing.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "OWNER" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.sender === "OWNER"
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-foreground"
                }`}
              >
                {m.sender === "ADMIN" && (
                  <p className="mb-0.5 text-[10px] font-semibold opacity-70">Administrator</p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[10px] opacity-60">
                  {new Date(m.createdAt).toLocaleString("uz-UZ")}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-2 text-sm text-error">{error}</p>}
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Xabar yozing..."
          className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
              <Image src="/ozodflow-logo.png" alt="OzodFlow" width={36} height={36} className="h-full w-full object-contain" />
            </span>
            <span className="font-semibold text-foreground">
              Ozod<span className="text-accent">Flow</span>
            </span>
          </div>
          <button
            onClick={() => logout(router)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted hover:text-error"
          >
            <LogOut className="h-4 w-4" /> Chiqish
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BlockedScreen({ reason }: { reason: string | null }) {
  return (
    <Shell>
      <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Restoraningiz bloklangan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {reason
            ? reason
            : "Hisobingiz administrator tomonidan vaqtincha bloklandi. Menyu va panel imkoniyatlari o'chirilgan."}
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-foreground">
          <ShieldAlert className="h-4 w-4 text-warning" />
          Blokdan chiqarishni administratordan so'rang
        </p>
      </div>

      <SupportThread topic="BLOCK" />
    </Shell>
  );
}

export function PaymentLockScreen({
  plan,
}: {
  plan: PlanKey;
}) {
  const [showPay, setShowPay] = useState(false);

  return (
    <Shell>
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning">
          <WalletCards className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          To'lov muddati tugagan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Obuna to'lovi muddati o'tib ketdi. Panel va menyudan foydalanishni
          davom ettirish uchun to'lovni amalga oshiring.
        </p>
        {!showPay && (
          <button
            onClick={() => setShowPay(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <WalletCards className="h-4 w-4" /> To'lovni amalga oshirish
          </button>
        )}
      </div>

      {showPay && (
        <Billing currentPlan={plan} daysLeft={0} expired={true} />
      )}

      <SupportThread topic="PAYMENT" />
    </Shell>
  );
}
