import { ExternalLink, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { VerifyActions } from "@/app/admin/users/user-actions";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/current-user";
import { listUsersForAdmin } from "@/lib/developers";
import { UserRole, valuesOf } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Foydalanuvchilar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdmin("/admin/users");

  const params = await searchParams;
  const t = await getTranslations("admin.users");

  const filter = params.filter;
  const unverifiedOnly = filter === "unverified";
  const roleFilter =
    filter && valuesOf(UserRole).includes(filter as UserRole)
      ? filter
      : undefined;

  const users = await listUsersForAdmin({
    role: roleFilter,
    unverifiedOnly,
  });

  const filters = [
    { value: undefined, label: t("filterAll") },
    { value: "unverified", label: t("filterUnverified") },
    { value: UserRole.DEVELOPER, label: t("filterDevelopers") },
    { value: UserRole.CUSTOMER, label: t("filterCustomers") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Alert variant="info">{t("verifyNote")}</Alert>

      <nav className="flex flex-wrap gap-2" aria-label="Filtr">
        {filters.map((item) => {
          const active = filter === item.value;
          const href = item.value ? `/admin/users?filter=${item.value}` : "/admin/users";

          return (
            <Link
              key={item.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-brand bg-brand-soft text-brand-soft-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Card>
        {users.length === 0 ? (
          <EmptyState icon={Users} title={t("empty")} />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {users.map((user) => (
              <li key={user.id} className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar name={user.name} size="md" />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{user.name}</span>

                        <Badge variant="neutral" size="sm">
                          {t.has(`roleLabel.${user.role}`)
                            ? t(`roleLabel.${user.role}` as "roleLabel.CUSTOMER")
                            : user.role}
                        </Badge>

                        {user.role === UserRole.DEVELOPER && (
                          <Badge
                            variant={user.isVerifiedDeveloper ? "success" : "warning"}
                            size="sm"
                          >
                            {user.isVerifiedDeveloper
                              ? t("verified")
                              : t("notVerified")}
                          </Badge>
                        )}
                      </div>

                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {user.email ?? user.phone ?? user.id}
                      </p>

                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {t("registeredAt")}:{" "}
                        {user.createdAt.toLocaleDateString("uz-UZ", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {user.completedProjects > 0 &&
                          ` · ${user.completedProjects} loyiha`}
                      </p>

                      {user.username && user.isVerifiedDeveloper && (
                        <Link
                          href={`/dev/${user.username}`}
                          target="_blank"
                          className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
                        >
                          {t("profile")}: /dev/{user.username}
                          <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tasdiqlash amallari faqat mutaxassislar uchun */}
                {user.role === UserRole.DEVELOPER && (
                  <VerifyActions
                    userId={user.id}
                    isVerified={user.isVerifiedDeveloper}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
