"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import type { LandingBlock, FieldKey } from "@/lib/landing-blocks";

function fieldKey(b: Extract<LandingBlock, { type: "field" }>): string {
  return b.field === "custom" ? b.id : (b.field as FieldKey);
}

export function LandingRenderer({
  slug,
  blocks,
}: {
  slug: string;
  blocks: LandingBlock[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const fields = blocks.filter(
    (b): b is Extract<LandingBlock, { type: "field" }> => b.type === "field"
  );
  const submitBlock = blocks.find((b) => b.type === "submit") as
    | Extract<LandingBlock, { type: "submit" }>
    | undefined;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    // majburiy maydonlar
    for (const f of fields) {
      if (f.required && !(values[fieldKey(f)] || "").trim()) {
        setError(`"${f.label}" to'ldirilishi shart`);
        return;
      }
    }
    setSubmitting(true);
    const res = await fetch(`/api/landing/${slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error || "Yuborishda xatolik. Qayta urinib ko'ring.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10 sm:py-16">
        {done ? (
          <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <CheckCircle2 className="h-14 w-14 text-success" />
            <h2 className="mt-4 text-2xl font-bold text-foreground">Rahmat!</h2>
            <p className="mt-2 text-muted">
              Arizangiz qabul qilindi. Tez orada siz bilan bog'lanamiz.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {blocks.map((b) => {
              if (b.type === "heading")
                return (
                  <h1
                    key={b.id}
                    className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                  >
                    {b.text}
                  </h1>
                );
              if (b.type === "text")
                return (
                  <p key={b.id} className="text-muted">
                    {b.text}
                  </p>
                );
              if (b.type === "image")
                return b.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={b.id}
                    src={b.url}
                    alt=""
                    className="w-full rounded-2xl border border-border object-cover"
                  />
                ) : null;
              if (b.type === "field") {
                const k = fieldKey(b);
                return (
                  <div key={b.id}>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {b.label} {b.required && <span className="text-error">*</span>}
                    </label>
                    <input
                      type={b.field === "phone" ? "tel" : "text"}
                      value={values[k] || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                      placeholder={b.placeholder}
                      required={b.required}
                      className="h-12 w-full rounded-xl border border-border bg-card px-4 text-[15px] text-foreground outline-none transition-colors focus:border-accent"
                    />
                  </div>
                );
              }
              if (b.type === "submit")
                return (
                  <div key={b.id} className="pt-2">
                    {error && (
                      <div className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                      {b.text}
                    </button>
                  </div>
                );
              return null;
            })}

            {!submitBlock && (
              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                Yuborish
              </button>
            )}
          </form>
        )}

        <p className="mt-8 text-center text-xs text-muted">
          <a href="https://ozodflow.uz" className="hover:text-foreground">
            OzodFlow
          </a>{" "}
          orqali yaratilgan
        </p>
      </main>
    </div>
  );
}
