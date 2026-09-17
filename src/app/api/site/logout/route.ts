import { ok } from "@/lib/api";
import { clearSiteSession } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSiteSession();
  return ok({ success: true });
}
