import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Escrow } from "@/components/marketing/sections/escrow";
import { Faq } from "@/components/marketing/sections/faq";
import { FinalCta } from "@/components/marketing/sections/final-cta";
import { HowItWorks } from "@/components/marketing/sections/how-it-works";
import { getPublicFaqs } from "@/lib/queries/marketing";

export const metadata: Metadata = {
  title: "Qanday ishlaydi",
  description:
    "OzodFlow qanday ishlaydi: loyiha joylashtirish, mutaxassis tanlash, " +
    "escrow orqali to'lov va ishni qabul qilish. Har bosqich tushuntirilgan.",
  alternates: { canonical: "/how-it-works" },
};

export const revalidate = 3600;

/**
 * "Qanday ishlaydi" sahifasi.
 *
 * Bosh sahifadagi bo'limlar QAYTA ISHLATILADI — matn ikki joyda
 * yozilmaydi. Bosh sahifa qisqacha tanishtiradi, bu sahifa esa
 * batafsil o'qish uchun alohida manzil beradi (uni ulashish va
 * Google'da indekslash mumkin).
 */
export default async function HowItWorksPage() {
  const t = await getTranslations("home.howItWorks");
  const faqs = await getPublicFaqs();

  return (
    <>
      <section className="border-b border-border bg-hero">
        <div className="container-content py-14 text-center sm:py-20">
          <h1 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight tracking-[-0.03em] text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[17px] leading-relaxed text-muted-foreground text-pretty">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <HowItWorks />
      <Escrow />
      <Faq items={faqs} />
      <FinalCta />
    </>
  );
}
