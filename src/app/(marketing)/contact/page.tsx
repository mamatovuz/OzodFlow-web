import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/lib/site";
import { formatPhone } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aloqa",
  description: `OzodFlow bilan bog'lanish: ${SITE.contact.email}, ${formatPhone(SITE.contact.phone)}, Telegram.`,
  alternates: { canonical: "/contact" },
};

/**
 * Aloqa sahifasi.
 *
 * Forma ATAYLAB yo'q. Sabab: forma spam filtri, xat yuborish va murojaat
 * boshqaruvini talab qiladi — SMTP hali ulanmagan, ya'ni yuborilgan
 * xabar hech qayerga bormasdi. Ishlamaydigan formadan ko'ra to'g'ridan-
 * to'g'ri aloqa kanallari foydaliroq.
 *
 * Support tizimi qo'shilgach bu yerga murojaat formasi keladi.
 */
export default function ContactPage() {
  const channels = [
    {
      icon: Send,
      label: "Telegram",
      value: "@ozodflow",
      href: SITE.contact.telegram,
      hint: "Eng tez javob — odatda bir necha soat ichida",
      external: true,
    },
    {
      icon: Mail,
      label: "Email",
      value: SITE.contact.email,
      href: `mailto:${SITE.contact.email}`,
      hint: "Batafsil savollar va hujjatlar uchun",
      external: false,
    },
    {
      icon: Phone,
      label: "Telefon",
      value: formatPhone(SITE.contact.phone),
      href: `tel:${SITE.contact.phone}`,
      hint: "Ish kunlari, 9:00 — 18:00",
      external: false,
    },
  ];

  return (
    <>
      <section className="border-b border-border bg-hero">
        <div className="container-content py-14 sm:py-20">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
            Aloqa
          </h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted-foreground text-pretty">
            Savolingiz bormi yoki hamkorlik taklif qilmoqchimisiz — yozing.
          </p>
        </div>
      </section>

      <section className="container-content py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {channels.map((channel) => (
            <Card key={channel.label}>
              <CardContent className="flex flex-col gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                  <channel.icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {channel.label}
                  </p>
                  <a
                    href={channel.href}
                    {...(channel.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="mt-0.5 block font-medium transition-colors hover:text-brand"
                  >
                    {channel.value}
                  </a>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    {channel.hint}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
            {SITE.contact.city}, O&apos;zbekiston
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4" strokeWidth={1.75} aria-hidden />
            Dushanba — Shanba, 9:00 — 18:00
          </span>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-surface-1 p-6 text-center">
          <p className="text-[15px] text-muted-foreground text-pretty">
            Loyiha boshlamoqchimisiz? Aloqaga chiqishning eng tez yo&apos;li —
            loyihani joylashtirish. Mutaxassislar o&apos;zlari taklif yuboradi.
          </p>
          <Button asChild variant="brand" className="mt-5">
            <Link href="/projects/new">Loyiha joylashtirish</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
