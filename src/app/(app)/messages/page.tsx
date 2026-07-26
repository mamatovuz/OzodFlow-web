import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ConversationList } from "@/app/(app)/messages/conversation-list";
import { Card, EmptyState } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { listConversations } from "@/lib/chat";

export const metadata: Metadata = {
  title: "Xabarlar",
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const t = await getTranslations("chat");

  const conversations = await listConversations(user.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>

      {conversations.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title={t("empty")}
            description={t("emptyBody")}
          />
        </Card>
      ) : (
        <Card>
          <ConversationList
            conversations={conversations.map((conversation) => ({
              id: conversation.id,
              otherName: conversation.otherName,
              otherAvatarUrl: conversation.otherAvatarUrl,
              projectTitle: conversation.projectTitle,
              projectPublicId: conversation.projectPublicId,
              lastMessage: conversation.lastMessage,
              unreadCount: conversation.unreadCount,
              // Vaqt SERVERDA formatlanadi — hidratsiya nomuvofiqligi
              // bo'lmasligi uchun.
              timeLabel: conversation.lastMessageAt
                ? formatWhen(conversation.lastMessageAt, {
                    today: t("today"),
                    yesterday: t("yesterday"),
                  })
                : null,
              unreadLabel:
                conversation.unreadCount > 0
                  ? t("unread", { count: conversation.unreadCount })
                  : null,
            }))}
          />
        </Card>
      )}
    </div>
  );
}

/**
 * Suhbat vaqtini qisqa ko'rinishda beradi.
 *
 * Bugun → soat, kecha → "Kecha", eskisi → sana. Bu messenjerlarda
 * kutiladigan ko'rinish va ro'yxatni ixcham saqlaydi.
 */
function formatWhen(
  date: Date,
  labels: { today: string; yesterday: string }
): string {
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const wasYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (wasYesterday) return labels.yesterday;

  return date.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}
