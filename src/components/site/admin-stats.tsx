"use client";

import { useEffect, useState } from "react";
import { Eye, ThumbsUp, ThumbsDown, FileText, MessageSquare, Mail, Users, Loader2, TrendingUp } from "lucide-react";

type Stats = {
  totals: {
    posts: number;
    published: number;
    drafts: number;
    views: number;
    likes: number;
    dislikes: number;
    pendingComments: number;
    unreadMessages: number;
    subscribers: number;
  };
  topPosts: { id: string; title: string; slug: string; views: number; likes: number; dislikes: number }[];
  days: { day: string; views: number }[];
};

type Tab = "dashboard" | "posts" | "comments" | "messages" | "projects" | "settings";

export function AdminStats({ onGoto }: { onGoto: (t: Tab) => void }) {
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/site/stats")
      .then((r) => r.json())
      .then((j) => setData(j.data))
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-20 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const t = data.totals;
  const maxViews = Math.max(1, ...data.days.map((d) => d.views));

  const cards = [
    { icon: <Eye className="h-4 w-4" />, label: "Jami ko'rish", value: t.views },
    { icon: <FileText className="h-4 w-4" />, label: "Yozuvlar", value: t.posts, sub: `${t.drafts} qoralama` },
    { icon: <ThumbsUp className="h-4 w-4" />, label: "Yoqdi", value: t.likes },
    { icon: <ThumbsDown className="h-4 w-4" />, label: "Yoqmadi", value: t.dislikes },
  ];

  return (
    <div className="space-y-6">
      {/* Asosiy ko'rsatkichlar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted">{c.icon}<span className="text-xs">{c.label}</span></div>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
            {c.sub && <p className="text-xs text-muted">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Diqqat talab (izoh/xabar) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button onClick={() => onGoto("comments")} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground">
          <span className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4 text-muted" /> Tasdiq kutayotgan izoh</span>
          <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${t.pendingComments ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "text-muted"}`}>{t.pendingComments}</span>
        </button>
        <button onClick={() => onGoto("messages")} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground">
          <span className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted" /> O'qilmagan xabar</span>
          <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${t.unreadMessages ? "bg-accent/15 text-accent" : "text-muted"}`}>{t.unreadMessages}</span>
        </button>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <span className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted" /> Obunachilar</span>
          <span className="text-sm font-semibold">{t.subscribers}</span>
        </div>
      </div>

      {/* Oxirgi 7 kun grafigi */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-muted" /> Oxirgi 7 kun — ko'rishlar</h3>
        <div className="mt-5 flex items-end justify-between gap-2" style={{ height: 120 }}>
          {data.days.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-accent/80 transition-all"
                  style={{ height: `${(d.views / maxViews) * 100}%`, minHeight: d.views ? 4 : 0 }}
                  title={`${d.views} ko'rish`}
                />
              </div>
              <span className="text-[10px] text-muted">{d.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top maqolalar */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Eng ko'p o'qilgan</h3>
        {data.topPosts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Hali ma'lumot yo'q.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.topPosts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-5 text-sm font-semibold text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                <span className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.views}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{p.likes}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
