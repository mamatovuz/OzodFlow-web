import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasPerm } from "@/lib/admin-perms";
import { BlogEditor } from "@/components/admin/blog-editor";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/admins/login");
  if (!hasPerm(user, "blog")) redirect("/admins");

  const { id } = await params;
  return <BlogEditor postId={id} />;
}
