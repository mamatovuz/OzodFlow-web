import type { Metadata } from "next";
import Link from "next/link";
import "./site.css";
import { SiteNav } from "@/components/site/site-nav";
import { siteBase, getSiteSetting } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "Ozodbek's Blog", template: "%s · Ozodbek's Blog" },
  description: "Raqamli dunyoda raqamsiz narsalar haqida gaplashamiz.",
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [base, s] = await Promise.all([siteBase(), getSiteSetting()]);

  return (
    <div className="site-root flex min-h-screen flex-col">
      <SiteNav base={base} channel={s.channel} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 text-center sm:px-6">
          <div className="flex gap-5 text-sm text-muted">
            <Link href={base || "/"} className="hover:text-foreground">Bosh sahifa</Link>
            <Link href={`${base}/blog`} className="hover:text-foreground">Blog</Link>
            <Link href={`${base}/about`} className="hover:text-foreground">Men haqimda</Link>
          </div>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Ozodbek. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </div>
  );
}
