import { Clock, FileText, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ProjectStatusBadge } from "@/components/app/project-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { ProposalStatus, UserRole } from "@/lib/enums";
import { formatMoney, formatMoneyRange } from "@/lib/money";
import { listMyProposals } from "@/lib/queries/projects";

export const metadata: Metadata = {
  title: "Takliflarim",
  robots: { index: false, follow: false },
};

/** Taklif holati → nishon varianti. */
const PROPOSAL_VARIANT = {
  [ProposalStatus.PENDING]: "info",
  [ProposalStatus.ACCEPTED]: "success",
  [ProposalStatus.REJECTED]: "neutral",
  [ProposalStatus.WITHDRAWN]: "neutral",
} as const;

const PROPOSAL_LABEL = {
  [ProposalStatus.PENDING]: "Javob kutilmoqda",
  [ProposalStatus.ACCEPTED]: "Qabul qilindi",
  [ProposalStatus.REJECTED]: "Rad etildi",
  [ProposalStatus.WITHDRAWN]: "Qaytarib olindi",
} as const;

export default async function ProposalsPage() {
  const user = await requireUser("/proposals");

  // Bu sahifa faqat mutaxassis uchun.
  if (user.role !== UserRole.DEVELOPER) {
    redirect("/dashboard");
  }

  const t = await getTranslations("appNav");
  const proposals = await listMyProposals(user.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("proposals")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Yuborgan takliflaringiz va ularning holati.
        </p>
      </header>

      <Card>
        {proposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Hali taklif yubormagansiz"
            description="Ochiq loyihalarni ko'rib chiqing va o'zingizga mos ishga taklif yuboring."
            action={
              <Button asChild variant="brand">
                <Link href="/projects">
                  <Search className="size-4" strokeWidth={2} aria-hidden />
                  Ochiq loyihalar
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {proposals.map((proposal) => (
              <li key={proposal.id}>
                <Link
                  href={`/projects/${proposal.project.publicId}`}
                  className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-1 sm:px-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="amount text-[11px] uppercase tracking-wider text-muted-foreground">
                          {proposal.project.publicId}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {proposal.project.category.name}
                        </span>
                      </div>

                      <h2 className="mt-1 truncate font-display text-[15px] font-semibold leading-snug transition-colors group-hover:text-brand">
                        {proposal.project.title}
                      </h2>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge
                        variant={PROPOSAL_VARIANT[proposal.status as ProposalStatus] ?? "neutral"}
                        size="sm"
                      >
                        {PROPOSAL_LABEL[proposal.status as ProposalStatus] ?? proposal.status}
                      </Badge>

                      {/* Loyihaning o'z holati ham muhim: taklif kutilmoqda,
                          lekin loyiha bekor qilingan bo'lishi mumkin. */}
                      <ProjectStatusBadge status={proposal.project.status} size="sm" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
                    <span>
                      Taklifim:{" "}
                      <span className="amount font-medium text-foreground">
                        {formatMoney(proposal.amount)}
                      </span>
                    </span>

                    <span>
                      Byudjet:{" "}
                      <span className="amount">
                        {formatMoneyRange(
                          proposal.project.budgetMin,
                          proposal.project.budgetMax
                        )}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" strokeWidth={1.75} aria-hidden />
                      {proposal.deliveryDays} kun
                    </span>

                    <span>
                      {proposal.createdAt.toLocaleDateString("uz-UZ", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
