"use client";

import { useState } from "react";
import { Star, Loader2, Check, ExternalLink } from "lucide-react";

export function ReviewForm({
  slug,
  name,
  logo,
  accent,
  enabled,
}: {
  slug: string;
  name: string;
  logo: string | null;
  accent: string;
  enabled: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [state, setState] = useState<"form" | "sending" | "done" | "redirect">("form");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  async function submit() {
    if (rating < 1) return;
    setState("sending");
    try {
      const res = await fetch("/api/reviews/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rating, name: reviewName, phone, text }),
      });
      const json = await res.json();
      if (!json.success) {
        setState("form");
        return;
      }
      if (json.data?.redirectUrl) {
        setRedirectUrl(json.data.redirectUrl);
        setState("redirect");
        setTimeout(() => {
          window.location.href = json.data.redirectUrl;
        }, 1800);
      } else {
        setState("done");
      }
    } catch {
      setState("form");
    }
  }

  const stars = hover || rating;
  const accentVar = { "--acc": accent } as React.CSSProperties;

  if (!enabled) {
    return (
      <Shell accent={accent} logo={logo} name={name}>
        <p className="text-center text-muted">Izohlar vaqtincha o'chirilgan.</p>
      </Shell>
    );
  }

  return (
    <Shell accent={accent} logo={logo} name={name}>
      {state === "done" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `${accent}20`, color: accent }}>
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Rahmat!</h2>
          <p className="text-muted">Fikringiz biz uchun juda muhim. Yaxshilanishga harakat qilamiz.</p>
        </div>
      )}

      {state === "redirect" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `${accent}20`, color: accent }}>
            <Star className="h-8 w-8 fill-current" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Rahmat!</h2>
          <p className="text-muted">Bahoyingizni xaritada ham qoldirsangiz — biz uchun katta yordam.</p>
          <Loader2 className="mt-2 h-5 w-5 animate-spin" style={{ color: accent }} />
          {redirectUrl && (
            <a href={redirectUrl} className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: accent }}>
              <ExternalLink className="h-4 w-4" /> Ochilmadimi? Bu yerni bosing
            </a>
          )}
        </div>
      )}

      {(state === "form" || state === "sending") && (
        <>
          <p className="mb-4 text-center text-muted">Xizmatimizni qanday baholaysiz?</p>

          {/* Yulduzlar */}
          <div className="mb-6 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className="h-10 w-10 transition-colors"
                  style={{
                    color: n <= stars ? "#F59E0B" : "#D1D5DB",
                    fill: n <= stars ? "#F59E0B" : "none",
                  }}
                />
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <input
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
              placeholder="Ismingiz (ixtiyoriy)"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[color:var(--acc)]"
              style={accentVar}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon (ixtiyoriy)"
              inputMode="tel"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[color:var(--acc)]"
              style={accentVar}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Fikringiz (ixtiyoriy)"
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[color:var(--acc)]"
              style={accentVar}
            />
          </div>

          <button
            onClick={submit}
            disabled={rating < 1 || state === "sending"}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: accent }}
          >
            {state === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Yuborish
          </button>
        </>
      )}
    </Shell>
  );
}

function Shell({
  accent,
  logo,
  name,
  children,
}: {
  accent: string;
  logo: string | null;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface-2 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-4 flex flex-col items-center">
          {logo ? (
            <img src={logo} alt={name} className="h-20 w-20 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md" style={{ background: accent }}>
              {name[0]?.toUpperCase()}
            </div>
          )}
          <h1 className="mt-3 text-center text-2xl font-bold text-foreground">{name}</h1>
        </div>
        <div className="rounded-2xl bg-card p-6 shadow-card">{children}</div>
        <p className="mt-4 text-center text-xs text-muted">OzodFlow bilan yaratilgan</p>
      </div>
    </div>
  );
}
