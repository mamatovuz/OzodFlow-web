import { FileSearch, Zap } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ModerationActions } from "@/app/admin/moderation/moderation-actions";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ProjectStatus } from "@/lib/enums";
import { formatMoneyRange } from "@/lib/money";

export const metadata: Metadata = {
  title: "Moderatsiya",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  await requireAdmin("/admin/moderation");
  const t = await getTranslations("admin.moderation");

  const projects = await db.project.findMany({
    where: { status: ProjectStatus.PENDING_REVIEW },
    // Eng eskisi birinchi — navbat adolatli bo'lishi kerak.
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      publicId: true,
      title: true,
      description: true,
      requirements: true,
      budgetMin: true,
      budgetMax: true,
      deadlineAt: true,
      createdAt: true,
      isUrgent: true,
      category: { select: { name: true } },
      customer: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>

      {projects.length === 0 ? (
        <Card>
          <EmptyState icon={FileSearch} title={t("empty")} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {projects.map((project) => (
            <li key={project.id}>
              <Card>
                <div className="flex flex-col gap-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="amount text-[11px] uppercase tracking-wider text-muted-foreground">
                          {project.publicId}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {project.category.name}
                        </span>
                        {project.isUrgent && (
                          <Badge variant="warning" size="sm" className="gap-1">
                            <Zap className="size-3" strokeWidth={2.5} aria-hidden />
                            Shoshilinch
                          </Badge>
                        )}
                      </div>

                      <h2 className="mt-1.5 font-display text-[17px] font-semibold leading-snug">
                        {project.title}
                      </h2>

                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {t("customer")}: {project.customer.name}
                        {project.customer.email && ` · ${project.customer.email}`}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t("budget")}
                      </p>
                      <p className="amount mt-0.5 text-[15px] font-semibold [font-variant-numeric:proportional-nums]">
                        {formatMoneyRange(project.budgetMin, project.budgetMax)}
                      </p>
                    </div>
                  </div>

                  {/* To'liq tavsif — admin nimani tasdiqlayotganini
                      ko'rishi kerak, qisqartirilgan matn yetarli emas. */}
                  <div className="rounded-xl bg-surface-1 p-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {project.description}
                    </p>

                    {project.requirements && (
                      <>
                        <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Texnik talablar
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                          {project.requirements}
                        </p>
                      </>
                    )}
                  </div>

                  <ModerationActions projectId={project.id} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
