"use client";

import { useEffect, useState } from "react";
import { Check, Trash2, Loader2, MessageSquare, Clock } from "lucide-react";

type Comment = {
  id: string;
  name: string;
  body: string;
  approved: boolean;
  createdAt: string;
  post: { title: string; slug: string } | null;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminComments() {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    fetch("/api/site/comments")
      .then((r) => r.json())
      .then((j) => setItems(j.data || []))
      .catch(() => setItems([]));
  }, []);

  async function approve(id: string, approved: boolean) {
    const res = await fetch(`/api/site/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    if (res.ok) setItems((p) => (p || []).map((c) => (c.id === id ? { ...c, approved } : c)));
  }

  async function del(id: string) {
    if (!confirm("Izohni o'chirasizmi?")) return;
    const res = await fetch(`/api/site/comments/${id}`, { method: "DELETE" });
    if (res.ok) setItems((p) => (p || []).filter((c) => c.id !== id));
  }

  if (!items) {
    return <div className="flex justify-center py-20 text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const shown = filter === "pending" ? items.filter((c) => !c.approved) : items;
  const pendingCount = items.filter((c) => !c.approved).length;

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl border border-border p-1">
        <button onClick={() => setFilter("pending")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${filter === "pending" ? "bg-foreground text-background" : "text-muted"}`}>
          Tasdiq kutmoqda {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button onClick={() => setFilter("all")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${filter === "all" ? "bg-foreground text-background" : "text-muted"}`}>
          Hammasi ({items.length})
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted">
          {filter === "pending" ? "Tasdiq kutayotgan izoh yo'q." : "Izoh yo'q."}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <Clock className="h-3 w-3" /> {fmt(c.createdAt)}
                    {c.post && <span className="truncate">· {c.post.title}</span>}
                    {!c.approved && <span className="rounded-full bg-amber-500/15 px-1.5 text-amber-600 dark:text-amber-400">kutmoqda</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!c.approved && (
                    <button onClick={() => approve(c.id, true)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-emerald-500" title="Tasdiqlash">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {c.approved && (
                    <button onClick={() => approve(c.id, false)} className="rounded-lg px-2 py-1 text-xs text-muted hover:text-foreground" title="Yashirish">
                      Yashirish
                    </button>
                  )}
                  <button onClick={() => del(c.id)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-red-500" title="O'chirish">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
