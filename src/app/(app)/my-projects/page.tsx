import { Briefcase, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ProjectListItem } from "@/components/app/project-list-item";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { ProjectStatus, UserRole, valuesOf } from "@/lib/enums";
import { listMyProjects } from "@/lib/queries/projects";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Loyihalarim",
  robots: { index: false, follow: false },
};

/** Filtr tugmalari. "ACTIVE" — bir necha holatni birlashtiradi. */
const FILTERS = [
  { value: undefined, key: "all" },
  { value: "ACTIVE", key: "active" },
  { value: ProjectStatus.OPEN, key: "open" },
  { value: ProjectStatus.COMPLETED, key: "completed" },
  { value: ProjectStatus.DRAFT, key: "draft" },
] as const;

export default async function MyProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser("/my-projects");
  const params = await searchParams;

  const t = await getTranslations("appNav");
  const tStatus = await getTranslations("projectStatus");
  const tDash = await getTranslations("dashboard");

  const isDeveloper = user.role === UserRole.DEVELOPER;

  /**
   * URL'dan kelgan `status` ni TEKSHIRAMIZ.
   *
   * Tekshirilmasa u to'g'ridan-to'g'ri Prisma so'roviga tushardi. Bu
   * xavfsizlik teshigi emas (Prisma parametrlarni qochiradi), lekin
   * noto'g'ri qiymat bilan bo'sh ro'yxat chiqib, foydalanuvchi
   * loyihalarim yo'qoldi deb o'ylardi.
   */
  const validStatuses = new Set<string>([...valuesOf(ProjectStatus), "ACTIVE"]);
  const status =
    params.status && validStatuses.has(params.status) ? params.status : undefined;

  const projects = await listMyProjects({
    userId: user.id,
    role: user.role,
    status,
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
            {isDeveloper ? t("myWork") : t("myProjects")}
          </h1>
        </div>

        {!isDeveloper && (
          <Button asChild variant="brand">
            <Link href="/projects/new">
              <Plus className="size-4" strokeWidth={2.5} aria-hidden />
              {tDash("customer.emptyCta")}
            </Link>
          </Button>
        )}
      </header>

      {/* ── Filtrlar ─────────────────────────────────────────────────────
          Oddiy havolalar, klient JS emas: har filtr o'z URL'iga ega,
          ya'ni uni ulashish va orqaga qaytish tugmasi bilan ishlatish
          mumkin. */}
      <nav className="flex flex-wrap gap-2" aria-label="Filtr">
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          const href = filter.value
            ? `/my-projects?status=${filter.value}`
            : "/my-projects";

          const label =
            filter.key === "all" ? "Barchasi"
            : filter.key === "active" ? "Faol"
            : tStatus(filter.value as string);

          return (
            <Link
              key={filter.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-brand bg-brand-soft text-brand-soft-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <Card>
        {projects.length === 0 ? (
          <EmptyState
            icon={isDeveloper ? Search : Briefcase}
            title={
              status
                ? "Bu filtr bo'yicha loyiha yo'q"
                : isDeveloper
                  ? tDash("developer.emptyTitle")
                  : tDash("customer.emptyTitle")
            }
            description={
              status
                ? "Boshqa filtrni tanlab ko'ring."
                : isDeveloper
                  ? tDash("developer.emptyDescription")
                  : tDash("customer.emptyDescription")
            }
            action={
              status ? (
                <Button asChild variant="secondary">
                  <Link href="/my-projects">Barcha loyihalar</Link>
                </Button>
              ) : (
                <Button asChild variant="brand">
                  <Link href={isDeveloper ? "/projects" : "/projects/new"}>
                    {isDeveloper
                      ? tDash("developer.emptyCta")
                      : tDash("customer.emptyCta")}
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectListItem project={project} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
