import { Mail, MapPin, Phone, Send } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { SITE } from "@/lib/site";
import { formatPhone } from "@/lib/utils";

/**
 * Footer — server komponenti (interaktivligi yo'q, klient JS'i kerak emas).
 *
 * Havolalar to'rt ustunga guruhlangan. Tartib tasodifiy emas: foydalanuvchi
 * nima izlashiga qarab — avval xizmatlar, keyin rollarga qarab bo'limlar,
 * oxirida kompaniya va huquqiy hujjatlar.
 */
export async function SiteFooter() {
  const t = await getTranslations("footer");

  /**
   * FAQAT MAVJUD SAHIFALAR.
   *
   * Hali yozilmagan bo'limlar (`/pricing`, `/support`, `/apply`,
   * `/levels`, `/blog`, `/about`) ATAYLAB olib tashlangan. Footer'dagi
   * ishlamaydigan havola — foydalanuvchi uchun 404, qidiruv tizimi
   * uchun esa sayt sifatining pasayishi.
   *
   * Sahifa yozilgach shu yerga qaytariladi.
   */
  const columns = [
    {
      title: t("sections.platform"),
      links: [
        { href: "/services", label: t("links.services") },
        { href: "/developers", label: t("links.developers") },
        { href: "/how-it-works", label: t("links.howItWorks") },
      ],
    },
    {
      title: t("sections.forCustomers"),
      links: [
        { href: "/projects/new", label: t("links.postProject") },
        { href: "/how-it-works#escrow", label: t("links.escrow") },
      ],
    },
    {
      title: t("sections.forDevelopers"),
      links: [
        { href: "/register?role=developer", label: t("links.apply") },
        { href: "/how-it-works", label: t("links.howItWorks") },
      ],
    },
    {
      title: t("sections.company"),
      links: [{ href: "/contact", label: t("links.contact") }],
    },
  ];

  return (
    <footer className="mt-24 border-t border-border bg-surface-1">
      <div className="container-content py-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2.6fr)]">
          {/* ── Brend va aloqa ──────────────────────────────────────────── */}
          <div>
            <Logo size="md" />

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
              {t("tagline")}
            </p>

            <ul className="mt-6 space-y-2.5 text-sm">
              <li>
                <a
                  href={`tel:${SITE.contact.phone}`}
                  className="inline-flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Phone className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  {formatPhone(SITE.contact.phone)}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.contact.email}`}
                  className="inline-flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  {SITE.contact.email}
                </a>
              </li>
              <li>
                <a
                  href={SITE.contact.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Send className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Telegram
                </a>
              </li>
              <li className="inline-flex items-center gap-2.5 text-muted-foreground">
                <MapPin className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {SITE.contact.city}
              </li>
            </ul>
          </div>

          {/* ── Havola ustunlari ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="font-display text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pastki qator ──────────────────────────────────────────────── */}
        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {SITE.name}. {t("rights")}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <Link
              href="/terms"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("links.terms")}
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("links.privacy")}
            </Link>
            <Link
              href="/offer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("links.offer")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
