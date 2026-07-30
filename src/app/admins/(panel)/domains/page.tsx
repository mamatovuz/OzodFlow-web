import { DomainsModeration } from "@/components/admin/domains-moderation";

export const dynamic = "force-dynamic";

export default function AdminDomainsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Domen so'rovlari</h1>
        <p className="mt-1 text-sm text-muted">
          Foydalanuvchi domenini sozlang va restoranga ulang
        </p>
      </div>
      <DomainsModeration />
    </div>
  );
}
