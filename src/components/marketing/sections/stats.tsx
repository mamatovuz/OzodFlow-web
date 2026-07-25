import { getTranslations } from "next-intl/server";

import type { PlatformStats } from "@/lib/queries/marketing";

/**
 * Platforma ko'rsatkichlari.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MUHIM QAROR: bu raqamlar TO'QIB CHIQARILMAYDI.
 *
 * Marketing sahifalarida "500+ loyiha, 10 000 mijoz" deb yozish keng
 * tarqalgan, lekin yangi platformada bu yolg'on da'vo bo'ladi va haqiqiy
 * biznes sayti uchun yaramaydi.
 *
 * Shu sababli:
 *  • har bir ko'rsatkich databasedan hisoblanadi
 *  • ma'lumot yetarli bo'lmasa ko'rsatkich KO'RSATILMAYDI (`null`)
 *  • hech qanday ko'rsatkich yo'q bo'lsa butun bo'lim chizilmaydi
 *
 * Platforma o'sgani sari raqamlar o'zi paydo bo'la boradi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function Stats({ stats }: { stats: PlatformStats }) {
  const t = await getTranslations("home.stats");

  const items = [
    stats.completedProjects > 0 && {
      value: formatCount(stats.completedProjects),
      label: t("projects"),
    },
    stats.verifiedDevelopers > 0 && {
      value: formatCount(stats.verifiedDevelopers),
      label: t("developers"),
    },
    stats.averageRating !== null && {
      value: stats.averageRating.toFixed(1).replace(".", ","),
      label: t("rating"),
    },
    stats.onTimePercent !== null && {
      value: `${stats.onTimePercent}%`,
      label: t("onTime"),
    },
  ].filter((item): item is { value: string; label: string } => Boolean(item));

  // Bitta-ikkita raqam bilan "statistika" bo'limi ishonchsiz ko'rinadi —
  // kamida uchtasi bo'lsa ko'rsatamiz.
  if (items.length < 3) return null;

  return (
    <section className="border-y border-border bg-card">
      <div className="container-content py-14">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <dt className="order-2 mt-2 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                {item.label}
              </dt>
              <dd className="order-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                <span className="text-gradient">{item.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** 1200 → "1 200". Uzilmas probel bilan, raqam bo'linib ketmasligi uchun. */
function formatCount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
