import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasPerm } from "@/lib/admin-perms";
import { LandingManager } from "@/components/admin/landing-manager";

export const dynamic = "force-dynamic";

export default async function AdminLandingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/admins/login");
  if (!hasPerm(user, "landings")) redirect("/admins");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ariza sahifalari</h1>
        <p className="mt-1 text-sm text-muted">
          Tayyor shablonlardan ariza sahifalari yasang — ozodflow.uz/&lt;nom&gt; da ochiladi
        </p>
      </div>
      <LandingManager />
    </div>
  );
}
