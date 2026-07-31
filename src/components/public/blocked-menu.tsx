"use client";

import { useState } from "react";
import Image from "next/image";
import { Lock, Send, CheckCircle2, Loader2 } from "lucide-react";

export function BlockedMenu({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!body.trim()) {
      setError("Iltimos, xabar matnini yozing");
      return;
    }
    setSending(true);
    setError("");
    const res = await fetch("/api/support/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, body, contact }),
    });
    setSending(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Xatolik yuz berdi");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 h-14 w-14 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:ring-slate-700">
            <Image src="/ozodflow-logo.png" alt="OzodFlow" width={56} height={56} className="h-full w-full object-contain" />
          </div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {name}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Bu restoran menyusi administrator tomonidan vaqtincha bloklangan.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 flex flex-col items-center rounded-xl bg-green-50 p-5 text-center dark:bg-green-950/40">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-300">
              Xabaringiz administratorga yuborildi
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Administrator bilan bog'lanish
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Xabaringizni yozing..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Aloqa (telefon yoki Telegram) — ixtiyoriy"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={send}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Yuborish
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          OzodFlow · Elektron menyu platformasi
        </p>
      </div>
    </div>
  );
}
