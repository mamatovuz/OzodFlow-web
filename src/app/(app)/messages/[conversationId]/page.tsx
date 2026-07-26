import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MessageComposer } from "@/app/(app)/messages/[conversationId]/message-composer";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { ChatError, openConversation } from "@/lib/chat";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Suhbat",
  robots: { index: false, follow: false },
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await requireUser(`/messages/${conversationId}`);
  const t = await getTranslations("chat");

  let conversation;

  try {
    conversation = await openConversation({
      conversationId,
      userId: user.id,
      userRole: user.role,
    });
  } catch (error) {
    if (error instanceof ChatError) {
      /**
       * Topilmadi va huquq yo'q — IKKALASI HAM 404.
       *
       * "Huquqingiz yo'q" deb aytish suhbat MAVJUD ekanini oshkor
       * qiladi. Havolani sinab ko'rgan odam bunday ma'lumot olmasligi
       * kerak.
       */
      if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
        notFound();
      }
    }

    // Kutilmagan xato — sahifani yiqitmaymiz, ro'yxatga qaytaramiz.
    console.error("[chat.open]", error);
    redirect("/messages");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* ── Sarlavha ──────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center gap-3">
        <Link
          href="/messages"
          aria-label={t("backToList")}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
        </Link>

        <Avatar
          src={conversation.otherAvatarUrl}
          name={conversation.otherName}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold tracking-[-0.01em]">
            {conversation.otherName}
          </h1>

          {conversation.projectTitle && (
            <p className="truncate text-[13px] text-muted-foreground">
              {conversation.projectTitle}
            </p>
          )}
        </div>

        {conversation.projectPublicId && (
          <Link
            href={`/projects/${conversation.projectPublicId}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
            {t("openProject")}
          </Link>
        )}
      </header>

      {/* ── Xabarlar ──────────────────────────────────────────────────── */}
      <Card>
        {conversation.messages.length === 0 ? (
          <CardContent>
            <p className="py-6 text-center text-[15px] text-muted-foreground">
              {t("noMessages")}
            </p>
          </CardContent>
        ) : (
          <CardContent className="flex flex-col gap-3">
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col gap-1",
                  // O'z xabari o'ngda — messenjerlarda kutiladigan
                  // ko'rinish.
                  message.isMine ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5",
                    message.isMine
                      ? "bg-brand text-brand-foreground"
                      : "bg-surface-2 text-foreground"
                  )}
                >
                  {/* Boshqa odamning ismi — admin aralashsa kim
                      yozganini bilish kerak. */}
                  {!message.isMine && (
                    <p className="mb-0.5 text-[11px] font-semibold opacity-70">
                      {message.senderName}
                    </p>
                  )}

                  {/* `whitespace-pre-line` — foydalanuvchi qatorlarni
                      ataylab ajratgan bo'lishi mumkin. */}
                  <p className="whitespace-pre-line text-[15px] leading-relaxed break-words">
                    {message.body ?? t("attachment")}
                  </p>
                </div>

                <p className="px-1 text-[11px] text-muted-foreground">
                  {message.createdAt.toLocaleTimeString("uz-UZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {message.editedAt && ` · ${t("edited")}`}
                </p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* ── Yozish ────────────────────────────────────────────────────── */}
      {conversation.canWrite ? (
        <MessageComposer
          conversationId={conversation.id}
          labels={{
            placeholder: t("placeholder"),
            send: t("send"),
          }}
        />
      ) : (
        <Alert variant="info">{t("closed")}</Alert>
      )}
    </div>
  );
}
