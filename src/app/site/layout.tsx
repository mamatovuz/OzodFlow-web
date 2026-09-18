import type { Metadata } from "next";
import Link from "next/link";
import "./site.css";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/site/site-nav";
import { siteBase, getSiteSetting, siteOrigin, absUrl, parseNavButtons } from "@/lib/site";
import { getLang, tr } from "@/lib/site-i18n";

export async function generateMetadata(): Promise<Metadata> {
  const [s, origin, base] = await Promise.all([getSiteSetting(), siteOrigin(), siteBase()]);
  const ogImg = absUrl(origin, s.ogImage);
  const favicon = s.favicon || undefined;

  return {
    metadataBase: new URL(origin),
    title: { default: s.metaTitle, template: `%s · ${s.siteName}` },
    description: s.metaDescription,
    applicationName: s.siteName,
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
  const [base, s, projectCount, lang, origin] = await Promise.all([
    siteBase(),
    getSiteSetting(),
    prisma.siteProject.count(),
    getLang(),
    siteOrigin(),
  ]);
  const navButtons = parseNavButtons(s.navButtons);
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: s.siteName,
    url: `${origin}${base || ""}`,
    description: s.metaDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}${base}/blog?q={q}`,
      "query-input": "required name=q",
    },
  };
  const labels = {
    blog: tr(lang, "blog"),
    projects: tr(lang, "projects"),
    about: tr(lang, "about"),
    channel: tr(lang, "channel"),
  };

  return (
    <div className="site-root flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      <SiteNav
        base={base}
        channel={s.channel}
        navButtons={navButtons}
        hasProjects={projectCount > 0}
        lang={lang}
        labels={labels}
      />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 text-center sm:px-6">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted">
            <Link href={base || "/"} className="hover:text-foreground">{tr(lang, "home")}</Link>
            <Link href={`${base}/blog`} className="hover:text-foreground">{tr(lang, "blog")}</Link>
            <Link href={`${base}/about`} className="hover:text-foreground">{tr(lang, "about")}</Link>
            <Link href={`${base}/saved`} className="hover:text-foreground">{tr(lang, "saved")}</Link>
          </div>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} {s.siteName}. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </div>
  );
}
