import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit jurnali",
  robots: { index: false, follow: false },
};

/** Sahifadagi yozuvlar soni. */
const PAGE_SIZE = 50;

/**
 * Filtr guruhlari.
 *
 * `AuditLog.action` matn ko'rinishida ("escrow.released"). Prefiks
 * bo'yicha filtrlash eng oddiy va yangi amal qo'shilganda avtomatik
 * to'g'ri guruhga tushadi.
 */
const FILTERS = {
  all: null,
  money: ["escrow.", "wallet.", "withdrawal.", "payment.", "dispute."],
  auth: ["auth."],
} as const;

type FilterKey = keyof typeof FILTERS;

function isFilterKey(value: string): value is FilterKey {
  return value in FILTERS;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  await requireRole(UserRole.ADMIN, "/admin/audit");

  const t = await getTranslations("admin");
  const params = await searchParams;

  const filter: FilterKey =
    params.filter && isFilterKey(params.filter) ? params.filter : "all";

  // Sahifa raqami — noto'g'ri qiymat 1 ga tushadi.
  const pageParam = Number(params.page ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const prefixes = FILTERS[filter];

  const where = prefixes
    ? { OR: prefixes.map((prefix) => ({ action: { startsWith: prefix } })) }
    : {};

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      // Bittasini ORTIQ olamiz: keyingi sahifa bor-yo'qligini
      // qo'shimcha `count` so'rovisiz bilish uchun.
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        ip: true,
        createdAt: true,
        afterJson: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  const hasMore = entries.length > PAGE_SIZE;
  const visible = hasMore ? entries.slice(0, PAGE_SIZE) : entries;

  /** Filtr va sahifani saqlagan manzil. */
  const linkTo = (nextPage: number) =>
    `/admin/audit?filter=${filter}&page=${nextPage}`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("audit.title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {t("audit.subtitle")}
        </p>
      </header>

      {/* ── Filtr ─────────────────────────────────────────────────────── */}
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {(
          [
            ["all", t("audit.filterAll")],
            ["money", t("audit.filterMoney")],
            ["auth", t("audit.filterAuth")],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/audit?filter=${key}`}
            aria-current={filter === key ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
              filter === key
                ? "bg-surface-2 text-foreground"
                : "text-muted-foreground hover:bg-surface-1 hover:text-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={ScrollText} title={t("audit.empty")} />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border-subtle">
            {visible.map((entry) => (
              <li key={entry.id} className="px-5 py-3 sm:px-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2">
                    {/* Amal kodi monoshiriftda — u texnik qiymat va
                        uni nusxalash kerak bo'ladi. */}
                    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px]">
                      {entry.action}
                    </code>

                    {entry.entityType && (
                      <Badge variant="neutral" size="sm">
                        {entry.entityType}
                      </Badge>
                    )}
                  </p>

                  <p className="text-[13px] text-muted-foreground">
                    {entry.createdAt.toLocaleString("uz-UZ", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <p className="mt-1 text-[13px] text-muted-foreground">
                  {/* Tizim amali — `actorId` bo'lmasligi mumkin. */}
                  {entry.actor
                    ? `${entry.actor.name}${entry.actor.email ? ` (${entry.actor.email})` : ""}`
                    : t("audit.system")}
                  {entry.ip && ` · ${entry.ip}`}
                  {entry.entityId && ` · ${entry.entityId}`}
                </p>

                {/* Batafsil ma'lumot — `<details>` bilan yig'ilgan:
                    ro'yxat o'qilishi kerak, JSON esa kerak bo'lganda. */}
                {entry.afterJson && (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[13px] text-muted-foreground transition-colors hover:text-foreground">
                      {t("audit.details")}
                    </summary>
                    <pre className="mt-1.5 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-[12px] leading-relaxed">
                      {formatJson(entry.afterJson)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>

          {/* ── Sahifalash ────────────────────────────────────────────── */}
          {(page > 1 || hasMore) && (
            <CardContent className="flex items-center justify-between gap-3 border-t border-border-subtle">
              <span className="amount text-[13px] text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–
                {(page - 1) * PAGE_SIZE + visible.length} / {total}
              </span>

              <div className="flex gap-2">
                <Button
                  asChild={page > 1}
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                >
                  {page > 1 ? (
                    <Link href={linkTo(page - 1)}>{t("audit.newerPage")}</Link>
                  ) : (
                    <span>{t("audit.newerPage")}</span>
                  )}
                </Button>

                <Button
                  asChild={hasMore}
                  variant="secondary"
                  size="sm"
                  disabled={!hasMore}
                >
                  {hasMore ? (
                    <Link href={linkTo(page + 1)}>{t("audit.olderPage")}</Link>
                  ) : (
                    <span>{t("audit.olderPage")}</span>
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

/**
 * JSON'ni o'qiladigan ko'rinishga keltiradi.
 *
 * Buzuq JSON sahifani yiqitmasligi kerak — xom matn ko'rsatiladi.
 */
function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
