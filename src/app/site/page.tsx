import type { Metadata } from "next";
import { getSiteSetting, getActivityGrid } from "@/lib/site";
import { ActivityGrid } from "@/components/site/activity-grid";

export const dynamic = "force-dynamic";

// Bosh sahifa sarlavhasi — ota (OzodFlow) shablonisiz, faqat saytning o'zi.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSetting();
  return { title: { absolute: s.metaTitle }, description: s.metaDescription };
}

// To'liq minimalist bosh sahifa (otabek.io uslubi):
// faqat yil + "Faollik" kartasi. Obuna konverti va tema tugmasi — layoutда (suzuvchi).
export default async function SiteHome() {
  const activity = await getActivityGrid();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 py-16 sm:px-6">
      <p className="fade-up mb-5 text-sm font-semibold tracking-widest text-muted">{activity.year}</p>
      <div className="fade-up-1 w-full">
        <ActivityGrid
          monthName={activity.monthName}
          year={activity.year}
          cells={activity.cells}
          totalActive={activity.totalActive}
        />
      </div>
    </div>
  );
}
