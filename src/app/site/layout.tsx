import type { Metadata } from "next";
import Link from "next/link";
import "./site.css";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/site/site-nav";
import { siteBase, getSiteSetting, siteOrigin, absUrl, parseNavButtons } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const [s, origin] = await Promise.all([getSiteSetting(), siteOrigin()]);
  const ogImg = absUrl(origin, s.ogImage);
  const favicon = s.favicon || undefined;

  return {
    metadataBase: new URL(origin),
    title: { default: s.metaTitle, template: `%s · ${s.siteName}` },
    description: s.metaDescription,
    applicationName: s.siteName,
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
  const [base, s, projectCount] = await Promise.all([
    siteBase(),
    getSiteSetting(),
    prisma.siteProject.count(),
  ]);
  const navButtons = parseNavButtons(s.navButtons);

  return (
    <div className="site-root flex min-h-screen flex-col">
      <SiteNav base={base} channel={s.channel} navButtons={navButtons} hasProjects={projectCount > 0} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 text-center sm:px-6">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted">
            <Link href={base || "/"} className="hover:text-foreground">Bosh sahifa</Link>
            <Link href={`${base}/blog`} className="hover:text-foreground">Blog</Link>
            <Link href={`${base}/about`} className="hover:text-foreground">Men haqimda</Link>
          </div>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} {s.siteName}. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </div>
  );
}
