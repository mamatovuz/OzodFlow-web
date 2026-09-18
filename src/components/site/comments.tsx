"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Loader2, Send, CornerDownRight, Heart } from "lucide-react";

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  parentId?: string | null;
  isAuthor?: boolean;
  likes?: number;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" });
}

export function Comments({ postId, initial, isAdmin }: { postId: string; initial: Comment[]; isAdmin?: boolean }) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  // Bir daraja daraxt: ildizlar + har biriga javoblar
  const { roots, childrenOf } = useMemo(() => {
    const childrenOf = new Map<string, Comment[]>();
    const roots: Comment[] = [];
    for (const c of comments) {
      if (c.parentId) {
        const arr = childrenOf.get(c.parentId) || [];
        arr.push(c);
        childrenOf.set(c.parentId, arr);
      } else {
        roots.push(c);
      }
    }
    return { roots, childrenOf };
  }, [comments]);

  function addApproved(c: Comment) {
    setComments((list) => [...list, c]);
    setReplyTo(null);
  }

  return (
    <section className="mt-12 border-t border-border pt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageCircle className="h-5 w-5" /> Izohlar {comments.length > 0 && <span className="text-muted">({comments.length})</span>}
      </h2>

      {/* Ro'yxat */}
      <div className="mt-6 space-y-4">
        {roots.length === 0 ? (
          <p className="text-sm text-muted">Hali izoh yo'q. Birinchi bo'lib fikr bildiring.</p>
        ) : (
          roots.map((c) => (
            <div key={c.id}>
              <CommentCard c={c} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} replying={replyTo === c.id} />

              {/* Javoblar */}
              {(childrenOf.get(c.id) || []).length > 0 && (
                <div className="ml-5 mt-3 space-y-3 border-l border-border pl-4 sm:ml-6 sm:pl-5">
                  {(childrenOf.get(c.id) || []).map((r) => (
                    <CommentCard key={r.id} c={r} reply />
                  ))}
                </div>
              )}

              {/* Javob formasi */}
              {replyTo === c.id && (
                <div className="ml-5 mt-3 border-l border-border pl-4 sm:ml-6 sm:pl-5">
                  <CommentForm postId={postId} parentId={c.id} onApproved={addApproved} onCancel={() => setReplyTo(null)} isAdmin={isAdmin} compact />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Asosiy forma */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-medium">Fikr bildiring</p>
        <CommentForm postId={postId} parentId={null} onApproved={addApproved} isAdmin={isAdmin} />
      </div>
    </section>
  );
}

function CommentCard({
  c,
  reply,
  onReply,
  replying,
}: {
  c: Comment;
  reply?: boolean;
  onReply?: () => void;
  replying?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${c.isAuthor ? "border-accent/40 bg-accent/5" : "border-border"}`}>
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
            c.isAuthor ? "bg-accent/20 text-accent" : "bg-surface-2"
          }`}
        >
          {c.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium leading-none">
            {c.name}
            {c.isAuthor && (
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">Muallif</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted">{fmt(c.createdAt)}</p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
      <div className="mt-3 flex items-center gap-4">
        <CommentLike id={c.id} initial={c.likes || 0} />
        {!reply && onReply && (
          <button
            onClick={onReply}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-accent"
          >
            <CornerDownRight className="h-3 w-3" /> {replying ? "Bekor qilish" : "Javob berish"}
          </button>
        )}
      </div>
    </div>
  );
}

function CommentLike({ id, initial }: { id: string; initial: number }) {
  const [likes, setLikes] = useState(initial);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    try {
      setLiked(localStorage.getItem(`clike_${id}`) === "1");
    } catch {}
  }, [id]);

  async function toggle() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      localStorage.setItem(`clike_${id}`, next ? "1" : "0");
    } catch {}
    await fetch(`/api/site/comments/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta: next ? 1 : -1 }),
    }).catch(() => {});
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
        liked ? "text-rose-500" : "text-muted hover:text-rose-500"
      }`}
      aria-pressed={liked}
    >
      <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> {likes > 0 ? likes : ""}
    </button>
  );
}

function CommentForm({
  postId,
  parentId,
  onApproved,
  onCancel,
  compact,
  isAdmin,
}: {
  postId: string;
  parentId: string | null;
  onApproved: (c: Comment) => void;
  onCancel?: () => void;
  compact?: boolean;
  isAdmin?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 1 || body.trim().length < 2) {
      setError("Ism va izohni to'ldiring");
      return;
    }
    if (!isAdmin && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("To'g'ri email kiriting");
      return;
    }
    setSending(true);
    const res = await fetch("/api/site/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, parentId, name, email: email.trim(), body, website }),
    });
    setSending(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      // Admin javobi darhol qaytadi — ro'yxatga qo'shamiz
      if (j.data?.comment) {
        onApproved({ ...j.data.comment, createdAt: j.data.comment.createdAt || new Date().toISOString() });
        return;
      }
      setDone(true);
      setName("");
      setEmail("");
      setBody("");
    } else {
      setError(j.error || "Yuborilmadi");
    }
  }

  if (done) {
    return (
      <p className={`text-sm text-emerald-600 dark:text-emerald-400 ${compact ? "" : "py-1"}`}>
        Rahmat! Izohingiz yuborildi — tasdiqlangach ko'rinadi.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={`grid gap-3 ${isAdmin ? "" : "sm:grid-cols-2"}`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isAdmin ? "Ism (Muallif)" : "Ismingiz"}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        {!isAdmin && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (javob shu yerga keladi)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        )}
      </div>
      {/* honeypot — ko'rinmaydi */}
      <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={compact ? 2 : 3}
        placeholder={parentId ? "Javobingiz..." : "Izohingiz..."}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Yuborish
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground">
            Bekor
          </button>
        )}
      </div>
    </form>
  );
}
