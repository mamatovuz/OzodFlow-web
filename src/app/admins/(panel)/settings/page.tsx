import { getSessionUser } from "@/lib/auth";
import { AccountForm } from "@/components/admin/account-form";
import { AdminSessions } from "@/components/admin/admin-sessions";
import { MonitorSmartphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = (await getSessionUser())!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sozlamalar</h1>
        <p className="mt-1 text-sm text-muted">
          Admin login va parolini o'zgartiring
        </p>
      </div>
      <AccountForm initial={{ name: user.name, email: user.email || "" }} />

      {/* Faol seanslar — faqat bosh admin ko'radi */}
      {user.isSuperAdmin && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Faol seanslar</h2>
              <p className="text-sm text-muted">
                Admin panelga kirgan qurilmalar. Shubhali seansni chiqarib
                tashlang.
              </p>
            </div>
          </div>
          <AdminSessions />
        </div>
      )}
    </div>
  );
}
