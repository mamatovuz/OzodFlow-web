"use client";

import { useEffect, useState } from "react";
import { Trash2, Loader2, Mail, MailOpen, Clock } from "lucide-react";

type Message = {
  id: string;
  name: string;
  contact: string;
  body: string;
  read: boolean;
  createdAt: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminMessages() {
  const [items, setItems] = useState<Message[] | null>(null);

  useEffect(() => {
    fetch("/api/site/messages")
      .then((r) => r.json())
      .then((j) => setItems(j.data || []))
      .catch(() => setItems([]));
  }, []);

  async function toggleRead(id: string, read: boolean) {
    const res = await fetch(`/api/site/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    if (res.ok) setItems((p) => (p || []).map((m) => (m.id === id ? { ...m, read } : m)));
  }

  async function del(id: string) {
    if (!confirm("Xabarni o'chirasizmi?")) return;
    const res = await fetch(`/api/site/messages/${id}`, { method: "DELETE" });
    if (res.ok) setItems((p) => (p || []).filter((m) => m.id !== id));
  }

  if (!items) {
    return <div className="flex justify-center py-20 text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted">Xabar yo'q.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div key={m.id} className={`rounded-xl border p-4 ${m.read ? "border-border bg-card" : "border-accent/40 bg-accent/5"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{m.name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Clock className="h-3 w-3" /> {fmt(m.createdAt)}
                {m.contact && <span className="truncate">· {m.contact}</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => toggleRead(m.id, !m.read)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground" title={m.read ? "O'qilmagan deb belgilash" : "O'qilgan deb belgilash"}>
                {m.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
              </button>
              <button onClick={() => del(m.id)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-red-500" title="O'chirish">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p>
        </div>
      ))}
    </div>
  );
}
