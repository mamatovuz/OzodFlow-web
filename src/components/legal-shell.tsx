import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** Huquqiy sahifalar uchun umumiy sarlavha/footer qobig'i (landing dizayniga mos) */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo href="/" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Bosh sahifa
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted">Oxirgi yangilangan: {updated}</p>
        <div className="legal-content mt-8 space-y-6">{children}</div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} OzodFlow</span>
          <nav className="flex flex-wrap items-center gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Maxfiylik
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Shartlar
            </Link>
            <Link href="/data-deletion" className="hover:text-foreground">
              Ma'lumotni o'chirish
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Bo'lim sarlavhasi + matn bloki */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}
