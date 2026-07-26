import { ArrowLeft, CalendarDays, Lock, Tag, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  DeliverPanel,
  FundEscrowPanel,
  ReviewPanel,
} from "@/app/(app)/projects/[publicId]/project-actions";
import { ProposalForm } from "@/app/(app)/projects/[publicId]/proposal-form";
import { ProposalList } from "@/app/(app)/projects/[publicId]/proposal-list";
import { ProjectStatusBadge } from "@/components/app/project-status-badge";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { EscrowStatus, ProjectStatus } from "@/lib/enums";
import { formatMoney, formatMoneyRange } from "@/lib/money";
import { getProjectDetail } from "@/lib/queries/projects";
import { getFreeRevisionCount } from "@/lib/settings";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const user = await requireUser(`/projects/${publicId}`);

  const project = await getProjectDetail({
    publicId,
    viewerId: user.id,
    viewerRole: user.role,
  });

  /**
   * Huquqi yo'q bo'lsa ham 404.
   *
   * 403 ko'rsatish "bunday loyiha BOR, lekin sizga ruxsat yo'q" degan
   * ma'lumot beradi. Kodlarni ketma-ket sinab, qaysi loyihalar
   * mavjudligini aniqlash mumkin bo'lardi.
   */
  if (!project) notFound();

  const t = await getTranslations("projects.detail");
  const tDash = await getTranslations("dashboard.project");

  const isCustomer = project.viewerRole === "customer";
  const isDeveloper = project.viewerRole === "developer";

  // ── Escrow to'lash bosqichi ─────────────────────────────────────────────
  // Developer tanlangan, summa kelishilgan, lekin pul hali bloklanmagan.
  const needsFunding =
    isCustomer &&
    project.status === ProjectStatus.OPEN &&
    project.developer !== null &&
    project.agreedAmount !== null &&
    (!project.escrow || project.escrow.status !== EscrowStatus.FUNDED);

  // Mablag' yetadimi — tugmani bosishdan OLDIN bilish kerak.
  const wallet = needsFunding
    ? await db.wallet.findUnique({
        where: { userId: user.id },
        select: { balance: true },
      })
    : null;

  const hasEnoughBalance =
    wallet !== null &&
    project.agreedAmount !== null &&
    wallet.balance >= project.agreedAmount;

  const freeRevisions = await getFreeRevisionCount();

  /**
   * Pul summalari SERVERDA formatlanadi.
   *
   * `bigint` ni klient komponentiga uzatib bo'lmaydi — u JSON'ga
   * serializatsiya qilinmaydi. Shuning uchun tayyor matn uzatiladi.
   */
  const proposalAmounts = Object.fromEntries(
    project.proposals.map((proposal) => [proposal.id, formatMoney(proposal.amount)])
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/my-projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
        {t("backToList")}
      </Link>

      {/* ── Sarlavha ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="amount text-[11px] uppercase tracking-wider text-muted-foreground">
            {project.publicId}
          </span>
          <ProjectStatusBadge status={project.status} size="sm" />
          {project.isUrgent && (
            <Badge variant="warning" size="sm" className="gap-1">
              <Zap className="size-3" strokeWidth={2.5} aria-hidden />
              Shoshilinch
            </Badge>
          )}
        </div>

        <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-balance">
          {project.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Tag className="size-3.5" strokeWidth={1.75} aria-hidden />
            {project.categoryName}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" strokeWidth={1.75} aria-hidden />
            {project.deadlineAt
              ? project.deadlineAt.toLocaleDateString("uz-UZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : tDash("noDeadline")}
          </span>

          <span>
            {project.agreedAmount !== null ? (
              <>
                {tDash("agreed")}:{" "}
                <span className="amount font-medium text-foreground">
                  {formatMoney(project.agreedAmount)}
                </span>
              </>
            ) : (
              <>
                {tDash("budget")}:{" "}
                <span className="amount font-medium text-foreground">
                  {formatMoneyRange(project.budgetMin, project.budgetMax)}
                </span>
              </>
            )}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── Chap ustun ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("description")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* `whitespace-pre-line` — foydalanuvchi kiritgan qator
                  ajratishlari saqlanadi. Markdown ATAYLAB ishlatilmaydi:
                  u XSS yuzasini kengaytiradi va bu yerda kerak emas. */}
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            </CardContent>
          </Card>

          {project.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>{t("requirements")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                  {project.requirements}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Takliflar — mijoz va admin ko'radi */}
          {(isCustomer || project.viewerRole === "admin") && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("proposals")}
                  {project.proposals.length > 0 && (
                    <span className="ml-2 text-muted-foreground">
                      ({project.proposals.length})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>

              <ProposalList
                proposals={project.proposals}
                canAccept={isCustomer && project.status === ProjectStatus.OPEN}
                formatAmount={proposalAmounts}
              />
            </Card>
          )}

          {/* Jarayon tarixi */}
          <Card>
            <CardHeader>
              <CardTitle>{t("timeline")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-4">
                {project.events.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        {event.message ?? event.type}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {event.actorName && `${event.actorName} · `}
                        {event.createdAt.toLocaleDateString("uz-UZ", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* ── O'ng ustun: amallar ────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {project.canPropose && (
            <ProposalForm
              projectId={project.id}
              budgetRange={formatMoneyRange(project.budgetMin, project.budgetMax)}
            />
          )}

          {project.hasProposed && project.status === ProjectStatus.OPEN && (
            <Alert variant="info">{t("proposalAlreadySent")}</Alert>
          )}

          {needsFunding && project.agreedAmount !== null && (
            <FundEscrowPanel
              projectId={project.id}
              amountLabel={formatMoney(project.agreedAmount)}
              hasEnoughBalance={hasEnoughBalance}
            />
          )}

          {isDeveloper &&
            (project.status === ProjectStatus.IN_PROGRESS ||
              project.status === ProjectStatus.IN_REVISION) && (
              <DeliverPanel projectId={project.id} />
            )}

          {isCustomer && project.status === ProjectStatus.DELIVERED && (
            <ReviewPanel
              projectId={project.id}
              revisionsLeft={freeRevisions - project.revisionCount}
            />
          )}

          {/* Escrow holati */}
          {project.escrow?.status === EscrowStatus.FUNDED && (
            <Card className="border-success/25 bg-success-soft/20">
              <CardContent className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
                  <Lock className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium uppercase tracking-wider text-success-soft-foreground/80">
                    {t("escrowAmount")}
                  </p>
                  <p className="amount mt-1 text-xl font-semibold text-success-soft-foreground [font-variant-numeric:proportional-nums]">
                    {formatMoney(project.escrow.amount)}
                  </p>
                  {isDeveloper && (
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      Sizga tegadigan: {formatMoney(project.escrow.developerAmount)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ikkinchi tomon */}
          {(project.developer || !isCustomer) && (
            <Card>
              <CardHeader>
                <CardTitle>{isCustomer ? t("developer") : t("customer")}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                {isCustomer && project.developer ? (
                  <>
                    <Avatar
                      name={project.developer.name}
                      src={project.developer.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      {project.developer.username ? (
                        <Link
                          href={`/dev/${project.developer.username}`}
                          className="font-medium transition-colors hover:text-brand"
                        >
                          {project.developer.name}
                        </Link>
                      ) : (
                        <p className="font-medium">{project.developer.name}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar
                      name={project.customer.name}
                      src={project.customer.avatarUrl}
                      size="md"
                    />
                    <p className="font-medium">{project.customer.name}</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
