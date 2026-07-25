import type { Metadata } from "next";

import { Categories } from "@/components/marketing/sections/categories";
import { Developers } from "@/components/marketing/sections/developers";
import { Escrow } from "@/components/marketing/sections/escrow";
import { Faq } from "@/components/marketing/sections/faq";
import { FinalCta } from "@/components/marketing/sections/final-cta";
import { ForDevelopers } from "@/components/marketing/sections/for-developers";
import { Hero } from "@/components/marketing/sections/hero";
import { HowItWorks } from "@/components/marketing/sections/how-it-works";
import { Stats } from "@/components/marketing/sections/stats";
import {
  getFeaturedCategories,
  getFeaturedDevelopers,
  getPlatformStats,
  getPublicFaqs,
} from "@/lib/queries/marketing";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  // `absolute` — root layout'dagi "%s — OzodFlow" shabloni QO'LLANMASIN.
  // Oddiy matn berilsa sarlavha "OzodFlow — … — OzodFlow" bo'lib takrorlanadi.
  title: {
    absolute: `${SITE.name} — ${SITE.tagline}`,
  },
  description: SITE.description,
  alternates: { canonical: "/" },
};

/**
 * Sahifa har 5 daqiqada qayta yasaladi.
 *
 * Nega ISR va `force-dynamic` emas: bosh sahifa eng ko'p ochiladigan sahifa,
 * uni har so'rovda databasedan qurish keraksiz. Mutaxassislar ro'yxati va
 * statistika 5 daqiqa eskirgan bo'lsa hech narsa yo'qotmaydi.
 *
 * `marketing.ts` dagi so'rovlar try/catch ichida, shuning uchun database
 * mavjud bo'lmaganda ham (masalan Docker image yasashda) build yiqilmaydi.
 */
export const revalidate = 300;

export default async function HomePage() {
  // Barcha so'rovlar parallel — ketma-ket bo'lsa sahifa yasalishi
  // so'rovlar yig'indisi vaqtini olardi.
  const [categories, developers, stats, faqs] = await Promise.all([
    getFeaturedCategories(8),
    getFeaturedDevelopers(6),
    getPlatformStats(),
    getPublicFaqs(),
  ]);

  return (
    <>
      <Hero />
      <Stats stats={stats} />
      <HowItWorks />
      <Escrow />
      <Categories categories={categories} />
      <Developers developers={developers} />
      <ForDevelopers />
      <Faq items={faqs} />
      <FinalCta />

      <OrganizationStructuredData />
    </>
  );
}

/**
 * schema.org: Organization + WebSite.
 *
 * Google'ga saytning nomi, logotipi va aloqa ma'lumotlarini beradi —
 * qidiruv natijasida brend paneli shundan yasaladi. `SearchAction` esa
 * sayt ichidagi qidiruvni natijalarga chiqarish imkonini beradi.
 */
function OrganizationStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        logo: `${SITE.url}/web-app-manifest-512x512.png`,
        description: SITE.description,
        email: SITE.contact.email,
        telephone: SITE.contact.phone,
        address: {
          "@type": "PostalAddress",
          addressLocality: SITE.contact.city,
          addressCountry: "UZ",
        },
        sameAs: [SITE.contact.telegram],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: "uz-UZ",
        publisher: { "@id": `${SITE.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE.url}/developers?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
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
