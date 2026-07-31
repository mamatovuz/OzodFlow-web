import { MessagesInbox } from "@/components/admin/messages-inbox";

export const dynamic = "force-dynamic";

export default function AdminMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Xabarlar</h1>
        <p className="mt-1 text-sm text-muted">
          Restoran egalari va tashrifchilardan kelgan yozishmalar
        </p>
      </div>
      <MessagesInbox />
    </div>
  );
}
