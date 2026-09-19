import type { Metadata } from "next";
import { getSiteSetting, getActivityGrid } from "@/lib/site";
import { ActivityGrid } from "@/components/site/activity-grid";

export const dynamic = "force-dynamic";

// Bosh sahifa sarlavhasi — ota (OzodFlow) shablonisiz, faqat saytning o'zi.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSetting();
  return { title: { absolute: s.metaTitle }, description: s.metaDescription };
}

// To'liq minimalist bosh sahifa (otabek.io bilan 1:1):
// yil pill + "Activites" kartasi yuqori-o'rtada. Konvert (chap past) va tema
// tugmasi (o'ng past) — layoutда suzib turadi.
export default async function SiteHome() {
  const activity = await getActivityGrid();

  return (
    <div className="mx-auto flex max-w-[530px] flex-col items-center px-5 pt-12 sm:pt-16">
      {/* Yil belgisi (oq pill) */}
      <span className="fade-up rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-[#6b7280] shadow-sm ring-1 ring-black/5">
        {activity.year}
      </span>

      {/* Faollik kartasi */}
      <div className="fade-up-1 mt-9 w-full">
        <ActivityGrid cells={activity.cells} />
      </div>
    </div>
  );
}
