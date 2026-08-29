import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminsManager } from "@/components/admin/admins-manager";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const user = (await getSessionUser())!;
  // Faqat bosh admin qo'shimcha adminlarni boshqaradi.
  if (!user.isSuperAdmin) redirect("/admins");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Adminlar</h1>
        <p className="mt-1 text-sm text-muted">
          Qo'shimcha adminlar qo'shing, ularga login/parol bering va qaysi
          bo'limlarni boshqara olishini belgilang. Ular <b>/admins</b> orqali shu
          login bilan kiradi va faqat yoqilgan bo'limlarni ko'radi.
        </p>
      </div>
      <AdminsManager />
    </div>
  );
}
