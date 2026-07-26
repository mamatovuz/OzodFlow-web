import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  NewProjectForm,
  type CategoryOption,
} from "@/app/(app)/projects/new/new-project-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/enums";
import { isProjectModerationEnabled } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Yangi loyiha",
  robots: { index: false, follow: false },
};

/**
 * Kategoriyalarni daraxt ko'rinishida oladi.
 *
 * Ikki darajali: asosiy yo'nalish va uning ichki bo'limlari. Chuqurroq
 * daraja ATAYLAB qo'llanmaydi — uch darajali tanlash formada chalkash
 * bo'ladi va foydalanuvchi adashadi.
 */
async function getCategoryOptions(): Promise<CategoryOption[]> {
  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
    },
  });

  return categories;
}

export default async function NewProjectPage() {
  const user = await requireUser("/projects/new");

  // Developer loyiha joylashtirmaydi — uni kabinetga qaytaramiz.
  if (user.role === UserRole.DEVELOPER) {
    redirect("/dashboard");
  }

  const t = await getTranslations("projects.new");

  const [categories, moderationEnabled] = await Promise.all([
    getCategoryOptions(),
    isProjectModerationEnabled(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground text-pretty">
          {t("subtitle")}
        </p>
      </header>

      <Card>
        <CardContent>
          <NewProjectForm
            categories={categories}
            moderationEnabled={moderationEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
