import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ConversationListItem = {
  id: string;
  otherName: string;
  otherAvatarUrl: string | null;
  projectTitle: string | null;
  projectPublicId: string | null;
  lastMessage: string | null;
  unreadCount: number;
  timeLabel: string | null;
  unreadLabel: string | null;
};

/**
 * Suhbatlar ro'yxati.
 *
 * SERVER komponent: hech qanday interaktivlik yo'q, faqat havolalar.
 * Klient komponent qilish keraksiz JavaScript qo'shardi.
 */
export function ConversationList({
  conversations,
}: {
  conversations: ConversationListItem[];
}) {
  return (
    <ul className="divide-y divide-border-subtle">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <Link
            href={`/messages/${conversation.id}`}
            className={cn(
              "flex items-center gap-3 px-5 py-4 transition-colors sm:px-6",
              "hover:bg-surface-1",
              "focus-visible:bg-surface-1 focus-visible:outline-none",
              // O'qilmagan suhbat ajralib turadi.
              conversation.unreadCount > 0 && "bg-brand-soft/30"
            )}
          >
            <Avatar
              src={conversation.otherAvatarUrl}
              name={conversation.otherName}
              size="md"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm",
                    conversation.unreadCount > 0
                      ? "font-semibold"
                      : "font-medium"
                  )}
                >
                  {conversation.otherName}
                </p>

                {conversation.timeLabel && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {conversation.timeLabel}
                  </span>
                )}
              </div>

              {conversation.projectTitle && (
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                  {conversation.projectPublicId && (
                    <span className="amount">
                      {conversation.projectPublicId}
                      {" · "}
                    </span>
                  )}
                  {conversation.projectTitle}
                </p>
              )}

              <div className="mt-1 flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-[13px]",
                    conversation.unreadCount > 0
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {conversation.lastMessage ?? "—"}
                </p>

                {conversation.unreadLabel && (
                  <Badge variant="brand" size="sm" className="shrink-0">
                    {conversation.unreadLabel}
                  </Badge>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
