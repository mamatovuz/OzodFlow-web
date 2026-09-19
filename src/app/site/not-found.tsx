import Link from "next/link";
import { Home } from "lucide-react";
import { siteBase, getSiteSetting } from "@/lib/site";

export default async function SiteNotFound() {
  const [base, s] = await Promise.all([siteBase(), getSiteSetting()]);
  const suggestions = [
    { label: "Blog", href: `${base}/blog`, emoji: "📝" },
    { label: "Men haqimda", href: `${base}/about`, emoji: "👋" },
    { label: "Teglar", href: `${base}/blog/tags`, emoji: "🏷️" },
    ...(s.coffeeUrl ? [{ label: "Kofe", href: `${base}/coffee`, emoji: "☕" }] : []),
  ];

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center sm:py-32">
      {/* Gradient 404 */}
      <div className="fade-up relative">
        <span className="float-y pointer-events-none absolute -left-6 -top-4 h-4 w-4 rounded-full bg-sky-400/70" />
        <span className="float-y pointer-events-none absolute -right-4 top-8 h-6 w-6 rounded-full bg-fuchsia-400/50" style={{ animationDelay: "0.5s" }} />
        <span className="float-y pointer-events-none absolute -bottom-2 left-10 h-3 w-3 rounded-full bg-violet-400/60" style={{ animationDelay: "1s" }} />
        <h1 className="bg-linear-to-r from-sky-500 via-violet-500 to-fuchsia-500 bg-clip-text text-8xl font-extrabold tracking-tighter text-transparent drop-shadow-sm sm:text-[10rem]">
          404
        </h1>
      </div>

      <p className="fade-up-1 mt-6 text-lg text-muted">
        Voy! Bu sahifa hech kimga aytmasdan ta'tilga chiqib ketibdi. 🏖️
      </p>

      <p className="fade-up-2 mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/50 px-3.5 py-1.5 text-xs text-muted">
        Qidirish uchun bosing{" "}
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px]">⌘ K</kbd>
      </p>

      <p className="fade-up-3 mt-10 text-xs font-medium uppercase tracking-wide text-muted/70">Balki shulardan birini qidirgandirsiz:</p>
      <div className="fade-up-3 mt-4 grid w-full max-w-sm grid-cols-2 gap-2.5">
        {suggestions.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-left text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-md"
          >
            <span className="text-lg">{it.emoji}</span> {it.label}
          </Link>
        ))}
      </div>

      <Link
        href={base || "/"}
        className="fade-up-4 mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-all hover:-translate-y-0.5 hover:opacity-90"
      >
        <Home className="h-4 w-4" /> Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
