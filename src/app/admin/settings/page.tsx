import { getSessionUser } from "@/lib/auth";
import { AccountForm } from "@/components/admin/account-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = (await getSessionUser())!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sozlamalar</h1>
        <p className="mt-1 text-sm text-muted">
          Admin login va parolini o'zgartiring
        </p>
      </div>
      <AccountForm initial={{ name: user.name, email: user.email || "" }} />
    </div>
  );
}
