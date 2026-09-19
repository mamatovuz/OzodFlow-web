import type { Metadata } from "next";
import "./site.css";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/site/site-nav";
import { PwaRegister } from "@/components/site/pwa-register";
import { NewsletterEnvelope } from "@/components/site/newsletter-envelope";
import { SiteThemeToggle } from "@/components/site/site-theme-toggle";
import { siteBase, getSiteSetting, siteCanonical, absUrl, parseNavButtons, parseLinks } from "@/lib/site";
import { getLang, tr } from "@/lib/site-i18n";

export async function generateMetadata(): Promise<Metadata> {
  const [s, { origin, base }, reqBase] = await Promise.all([getSiteSetting(), siteCanonical(), siteBase()]);
  const ogImg = absUrl(origin, s.ogImage);
  const favicon = s.favicon || undefined;

  return {
    metadataBase: new URL(origin),
    title: { default: s.metaTitle, template: `%s · ${s.siteName}` },
    description: s.metaDescription,
    applicationName: s.siteName,
    manifest: `${reqBase}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: s.siteName, statusBarStyle: "black-translucent" },
    alternates: { types: { "application/rss+xml": [{ url: `${origin}${base}/rss.xml`, title: s.siteName }] } },
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
    openGraph: {
      type: "website",
      siteName: s.siteName,
      title: s.metaTitle,
      description: s.metaDescription,
      ...(ogImg ? { images: [{ url: ogImg }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: s.metaTitle,
      description: s.metaDescription,
      ...(ogImg ? { images: [ogImg] } : {}),
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [base, s, projectCount, lang, canon] = await Promise.all([
    siteBase(),
    getSiteSetting(),
    prisma.siteProject.count(),
    getLang(),
    siteCanonical(),
  ]);
  const navButtons = parseNavButtons(s.navButtons);
  const origin = canon.origin;
  const homeUrl = `${origin}${canon.base || ""}` || origin;
  const sameAs = parseLinks(s.links).map((l) => l.url).filter((u) => /^https?:\/\//i.test(u));
  // WebSite + Person + qidiruv harakati — Google boy natija va sitelinks qidiruv oynasi
  const siteLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        name: s.siteName,
        url: homeUrl,
        description: s.metaDescription,
        inLanguage: "uz",
        publisher: { "@id": `${homeUrl}#person` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${origin}${canon.base}/blog?q={q}` },
          "query-input": "required name=q",
        },
      },
      {
        "@type": "Person",
        "@id": `${homeUrl}#person`,
        name: s.heroTitle || s.siteName,
        jobTitle: s.heroRole || undefined,
        description: s.heroTagline || s.metaDescription,
        url: homeUrl,
        ...(absUrl(origin, s.profileImage) ? { image: absUrl(origin, s.profileImage) } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      },
    ],
  };
  const labels = {
    blog: tr(lang, "blog"),
    projects: tr(lang, "projects"),
    about: tr(lang, "about"),
    channel: tr(lang, "channel"),
    quickSearch: tr(lang, "quickSearch"),
    searchPlaceholder: tr(lang, "search"),
    more: lang === "en" ? "More" : lang === "ru" ? "Ещё" : "Ko'proq",
    coffee: lang === "en" ? "Buy me a coffee" : lang === "ru" ? "Купить кофе" : "Kofe sotib olish",
    tags: tr(lang, "tags"),
    archive: tr(lang, "archive"),
    saved: tr(lang, "saved"),
  };

  // Footer uchun domen (© 2026 ozodbeck.uz) — kanonik/siteUrl'dan olinadi.
  const rawDomain = (s.siteUrl || origin || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  const domain = !rawDomain || rawDomain.startsWith("localhost") || /^\d/.test(rawDomain) ? s.siteName : rawDomain;

  return (
    <div className="site-root flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      <SiteNav
        base={base}
        brand={s.siteName}
        channel={s.channel}
        coffeeUrl={s.coffeeUrl}
        navButtons={navButtons}
        hasProjects={projectCount > 0}
        lang={lang}
        labels={labels}
      />
      <main className="flex-1">{children}</main>
      <PwaRegister />

      {/* Butun sayt bo'ylab: pastda chapda obuna konverti, o'ngda tema tugmasi */}
      <NewsletterEnvelope channel={s.channel} />
      <SiteThemeToggle />

      {/* Minimalist footer — faqat yil va domen (otabek.io uslubi) */}
      <footer className="py-10">
        <p className="text-center text-sm text-[#73737d]">
          © {new Date().getFullYear()} {domain}
        </p>
      </footer>
    </div>
  );
}
