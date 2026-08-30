import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasPerm } from "@/lib/admin-perms";
import { BlogManager } from "@/components/admin/blog-manager";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/admins/login");
  if (!hasPerm(user, "blog")) redirect("/admins");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Blog</h1>
        <p className="mt-1 text-sm text-muted">
          Maqolalar yozing — ozodflow.uz/blog sahifasida chiqadi
        </p>
      </div>
      <BlogManager />
    </div>
  );
}
