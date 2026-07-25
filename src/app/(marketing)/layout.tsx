import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Ommaviy sahifalar uchun qobiq: bosh sahifa, xizmatlar, developer profillari,
 * blog, huquqiy hujjatlar.
 *
 * Kabinet va admin panel BOSHQA route guruhlarida — ularning navigatsiyasi
 * butunlay boshqacha va bu sarlavha/footer ularga tushmasligi kerak.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
