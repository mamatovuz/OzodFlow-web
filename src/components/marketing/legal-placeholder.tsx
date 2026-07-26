import { FileText, Mail, Send } from "lucide-react";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

/**
 * HUQUQIY HUJJAT — TAYYORLANMOQDA
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  NEGA MATN YOZILMAGAN
 *
 *  Foydalanish shartlari, maxfiylik siyosati va oferta — YURIDIK KUCHGA
 *  EGA hujjatlar. Ular O'zbekiston qonunchiligiga, shaxsiy ma'lumotlar
 *  to'g'risidagi talablarga va to'lov tizimlari qoidalariga mos bo'lishi
 *  kerak.
 *
 *  Namuna matn qo'yish XAVFLI: foydalanuvchi uni haqiqiy deb qabul
 *  qiladi, nizo chiqqanda esa u himoya qilmaydi va aksincha platformaga
 *  qarshi ishlatilishi mumkin.
 *
 *  Shuning uchun bu sahifalar hujjat tayyor bo'lgunicha ochiq holatni
 *  ko'rsatadi. Bu 404 dan ham, o'ylab topilgan matndan ham to'g'riroq.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function LegalPlaceholder({
  title,
  summary,
  points,
}: {
  title: string;
  /** Hujjat nimani qamrab olishi haqida qisqacha — kutish uchun */
  summary: string;
  /** Hujjatda ko'riladigan asosiy nuqtalar */
  points: string[];
}) {
  return (
    <>
      <section className="border-b border-border bg-hero">
        <div className="container-content py-14 sm:py-20">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted-foreground text-pretty">
            {summary}
          </p>
        </div>
      </section>

      <section className="container-content max-w-3xl py-12 sm:py-16">
        <Alert variant="warning" title="Hujjat tayyorlanmoqda">
          Bu hujjat yuridik ko&apos;rikdan o&apos;tkazilmoqda. Tayyor
          bo&apos;lguncha shartlar bo&apos;yicha savollaringizni bevosita
          bizga yo&apos;llashingiz mumkin — javob beramiz va yozma tasdiq
          qoldiramiz.
        </Alert>

        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold">
            Hujjatda nimalar bo&apos;ladi
          </h2>

          <ul className="mt-4 flex flex-col gap-3">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <FileText
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="text-[15px] leading-relaxed text-muted-foreground">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="brand">
            <a href={`mailto:${SITE.contact.email}`}>
              <Mail className="size-4" strokeWidth={2} aria-hidden />
              {SITE.contact.email}
            </a>
          </Button>

          <Button asChild variant="secondary">
            <a href={SITE.contact.telegram} target="_blank" rel="noopener noreferrer">
              <Send className="size-4" strokeWidth={2} aria-hidden />
              Telegram
            </a>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/contact">Aloqa sahifasi</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
