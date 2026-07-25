import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section-heading";

/** Kodda yozilgan asosiy savollar. Admin qo'shmagan bo'lsa shular ko'rinadi. */
const BUILT_IN_KEYS = [
  "cost",
  "commission",
  "notSatisfied",
  "howVerified",
  "timeline",
  "payment",
] as const;

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

/**
 * Savol-javob bo'limi.
 *
 * Ikki texnik qaror:
 *
 *  1. Native `<details>`/`<summary>` ishlatilgan — JavaScript kerak emas.
 *     Akkordeon klaviatura bilan ishlaydi, ekran o'quvchi to'g'ri o'qiydi
 *     va JS yuklanmasdan ham ochiladi. Radix Accordion bu yerda ortiqcha
 *     klient kodi bo'lardi.
 *
 *  2. Javoblar HTML sifatida serverda chiziladi, ya'ni Google ularni
 *     indekslaydi. Pastda `FAQPage` schema.org ham beriladi.
 */
export async function Faq({ items }: { items: FaqItem[] }) {
  const t = await getTranslations("home.faq");

  // Admin FAQ qo'shmagan bo'lsa — kodda yozilgan asosiy savollar.
  const faqs: FaqItem[] =
    items.length > 0
      ? items
      : BUILT_IN_KEYS.map((key) => ({
          id: key,
          question: t(`items.${key}.q`),
          answer: t(`items.${key}.a`),
        }));

  return (
    <Section id="faq">
      <div className="container-content">
        <SectionHeading label={t("label")} title={t("title")} className="mx-auto" />

        <div className="mx-auto mt-14 max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {faqs.map((faq) => (
            <details key={faq.id} className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 transition-colors hover:bg-surface-1 sm:p-6">
                <h3 className="font-display text-[15px] font-semibold leading-snug sm:text-base">
                  {faq.question}
                </h3>

                {/* Plus 45° aylanib X ga aylanadi — alohida ikonka kerak emas */}
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 text-muted-foreground transition-transform duration-300 ease-[var(--ease-out-quart)] group-open:rotate-45">
                  <Plus className="size-4" strokeWidth={2} aria-hidden />
                </span>
              </summary>

              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
                  {faq.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Google'ning "savol-javob" natijalarida chiqishi uchun */}
      <FaqStructuredData faqs={faqs} />
    </Section>
  );
}

/**
 * schema.org FAQPage.
 *
 * `dangerouslySetInnerHTML` bilan yozilgan, chunki `<script type="ld+json">`
 * ichidagi matn React tomonidan escape qilinmasligi kerak. `JSON.stringify`
 * ma'lumotni xavfsiz qiladi, lekin `</script>` ketma-ketligi qochirilishi
 * shart — aks holda savol matni ichida u skriptni yopib qo'yishi mumkin.
 */
function FaqStructuredData({ faqs }: { faqs: FaqItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
