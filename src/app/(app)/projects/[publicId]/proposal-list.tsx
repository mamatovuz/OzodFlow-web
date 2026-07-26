"use client";

import { Clock, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { acceptProposalAction } from "@/app/(app)/actions";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProposalStatus } from "@/lib/enums";
import type { ProjectDetail } from "@/lib/queries/projects";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * Takliflar ro'yxati.
 *
 * Mijoz hammasini ko'radi, developer faqat o'zinikini — bu ajratish
 * SO'ROV darajasida bajarilgan (`getProjectDetail`), bu yerda emas.
 * Komponentga tayanish xavfli: yangi sahifa yozilganda unutilishi mumkin.
 */
export function ProposalList({
  proposals,
  canAccept,
  formatAmount,
}: {
  proposals: ProjectDetail["proposals"];
  /** Mijoz va loyiha OPEN holatida bo'lsagina tanlash mumkin */
  canAccept: boolean;
  /** Serverda formatlangan summalar: id → matn */
  formatAmount: Record<string, string>;
}) {
  const t = useTranslations("projects.detail");
  const tLevels = useTranslations("levels");

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    acceptProposalAction,
    IDLE
  );

  if (proposals.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground sm:px-6">
        {t("noProposals")}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {state.status === "error" && state.message && (
        <div className="px-5 pt-5 sm:px-6">
          <Alert variant="danger">{state.message}</Alert>
        </div>
      )}

      {state.status === "success" && state.message && (
        <div className="px-5 pt-5 sm:px-6">
          <Alert variant="success">{state.message}</Alert>
        </div>
      )}

      <ul className="divide-y divide-border-subtle">
        {proposals.map((proposal) => {
          const isAccepted = proposal.status === ProposalStatus.ACCEPTED;
          const isRejected = proposal.status === ProposalStatus.REJECTED;

          return (
            <li
              key={proposal.id}
              className={cnClasses(isAccepted, isRejected)}
            >
              <div className="flex flex-wrap items-start gap-3">
                <Avatar
                  name={proposal.developer.name}
                  src={proposal.developer.avatarUrl}
                  size="md"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {proposal.developer.username ? (
                      <Link
                        href={`/dev/${proposal.developer.username}`}
                        className="font-display text-[15px] font-semibold transition-colors hover:text-brand"
                      >
                        {proposal.developer.name}
                      </Link>
                    ) : (
                      <span className="font-display text-[15px] font-semibold">
                        {proposal.developer.name}
                      </span>
                    )}

                    {proposal.developer.level && (
                      <Badge variant="brand" size="sm">
                        {tLevels.has(proposal.developer.level)
                          ? tLevels(proposal.developer.level)
                          : proposal.developer.level}
                      </Badge>
                    )}

                    {isAccepted && (
                      <Badge variant="success" size="sm">
                        Tanlandi
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="neutral" size="sm">
                        Rad etildi
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    {proposal.developer.ratingCount ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                        <span className="amount">
                          {proposal.developer.ratingAvg
                            ?.toFixed(1)
                            .replace(".", ",")}
                        </span>
                        <span>({proposal.developer.ratingCount})</span>
                      </span>
                    ) : null}

                    {proposal.developer.completedProjects ? (
                      <span>{proposal.developer.completedProjects} loyiha</span>
                    ) : null}

                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" strokeWidth={1.75} aria-hidden />
                      {t("deliveryDays", { days: proposal.deliveryDays })}
                    </span>
                  </div>
                </div>

                {/* Summa — o'ngda, ajratib ko'rsatilgan */}
                <div className="text-right">
                  <p className="amount text-lg font-semibold [font-variant-numeric:proportional-nums]">
                    {formatAmount[proposal.id]}
                  </p>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {proposal.coverLetter}
              </p>

              {canAccept && proposal.status === ProposalStatus.PENDING && (
                <form action={formAction} className="mt-4">
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <Button type="submit" variant="brand" size="sm" loading={isPending}>
                    {t("acceptProposal")}
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Qabul qilingan taklif ajratib ko'rsatiladi, rad etilgani xiralashadi. */
function cnClasses(isAccepted: boolean, isRejected: boolean): string {
  const base = "px-5 py-5 sm:px-6";

  if (isAccepted) return `${base} bg-success-soft/25`;
  if (isRejected) return `${base} opacity-55`;

  return base;
}
