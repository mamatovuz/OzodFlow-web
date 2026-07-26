import { CalendarDays, Check, MessageSquare, Search, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/enums";
import { formatMoneyRange } from "@/lib/money";
import { listOpenProjects } from "@/lib/queries/projects";
import { cn, truncate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ochiq loyihalar",
  robots: { index: false, follow: false },
};

export default async function BrowseProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser("/projects");

  // Mijoz uchun bu sahifa ma'nosiz — u loyiha yaratadi, izlamaydi.
  if (user.role === UserRole.CUSTOMER) {
    redirect("/my-projects");
  }

  const params = await searchParams;
  const t = await getTranslations("projects.browse");

  const [projects, categories] = await Promise.all([
    listOpenProjects({ developerId: user.id, categoryId: params.category }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* Yo'nalish filtri — oddiy havolalar, klient JS emas */}
      <nav className="flex flex-wrap gap-2" aria-label="Yo'nalish">
        <FilterLink href="/projects" active={!params.category}>
          {t("allCategories")}
        </FilterLink>

        {categories.map((category) => (
          <FilterLink
            key={category.id}
            href={`/projects?category=${category.id}`}
            active={params.category === category.id}
          >
            {category.name}
          </FilterLink>
        ))}
      </nav>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title={params.category ? t("emptyFiltered") : t("empty")}
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.publicId}`}
                className="surface-highlight block rounded-2xl border border-border bg-card p-5 shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-brand/30 hover:shadow-md sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {project.categoryName}
                      </span>

                      {project.isUrgent && (
                        <Badge variant="warning" size="sm" className="gap-1">
                          <Zap className="size-3" strokeWidth={2.5} aria-hidden />
                          {t("urgent")}
                        </Badge>
                      )}

                      {/* Allaqachon taklif yuborilgani DARHOL ko'rinadi —
                          developer bosib kirib, keyin bilib qolmasligi kerak. */}
                      {project.alreadyProposed && (
                        <Badge variant="success" size="sm" className="gap-1">
                          <Check className="size-3" strokeWidth={3} aria-hidden />
                          {t("alreadyProposed")}
                        </Badge>
                      )}
                    </div>

                    <h2 className="mt-1.5 font-display text-[17px] font-semibold leading-snug">
                      {project.title}
                    </h2>

                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {truncate(project.description, 220)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="amount text-[15px] font-semibold [font-variant-numeric:proportional-nums]">
                      {formatMoneyRange(project.budgetMin, project.budgetMax)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
                  {project.deadlineAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" strokeWidth={1.75} aria-hidden />
                      {project.deadlineAt.toLocaleDateString("uz-UZ", {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="size-3.5" strokeWidth={1.75} aria-hidden />
                    {project.proposalCount} taklif
                  </span>

                  {project.counterparty && (
                    <span className="inline-flex items-center gap-2">
                      <Avatar
                        name={project.counterparty.name}
                        src={project.counterparty.avatarUrl}
                        size="xs"
                      />
                      {project.counterparty.name}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "border-brand bg-brand-soft text-brand-soft-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
