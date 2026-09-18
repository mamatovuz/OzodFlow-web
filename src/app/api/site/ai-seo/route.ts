import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, stripHtml } from "@/lib/site";
import { aiGenerateJson, aiConfigured, AiUnavailableError } from "@/lib/ai";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().trim().max(300).optional(),
  contentHtml: z.string().max(30000).optional(),
});

function safeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch { return null; }
    return null;
  }
}

// AI SEO — matndan meta-title, meta-description, teglar va FAQ takliflari.
export async function POST(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const limited = limitOrReject(req, "site-ai", { limit: 20, windowMs: WINDOW.fiveMin });
  if (limited) return limited;
  if (!(await aiConfigured())) return fail("AI kaliti sozlanmagan", 503);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);
  const text = stripHtml(parsed.data.contentHtml || "");
  if (text.length < 40 && !parsed.data.title) return fail("Matn juda qisqa", 422);

  const prompt = `Sen SEO mutaxassisisan. Quyidagi o'zbekcha blog maqolasi uchun qidiruv
optimallashtirish ma'lumotlarini tayyorla. Faqat JSON qaytar:
{"metaTitle": string (max 60 belgi, jozibali),
 "metaDescription": string (max 155 belgi, kalit so'zlar bilan),
 "tags": string[] (3-6 ta aniq teg),
 "faq": [{"q": string, "a": string}] (2-4 ta maqola asosidagi savol-javob)}.

Sarlavha: ${parsed.data.title || "(yo'q)"}
Matn: """${text.slice(0, 7000)}"""`;

  try {
    const raw = await aiGenerateJson(prompt);
    const j = safeJson(raw);
    if (!j) return fail("AI javobi tushunarsiz", 502);
    const faqRaw = Array.isArray(j.faq) ? j.faq : [];
    return ok({
      metaTitle: String(j.metaTitle || "").slice(0, 70),
      metaDescription: String(j.metaDescription || "").slice(0, 170),
      tags: Array.isArray(j.tags) ? j.tags.map(String).slice(0, 6) : [],
      faq: faqRaw
        .filter((x: unknown): x is { q: string; a: string } => {
          const o = x as { q?: unknown; a?: unknown };
          return !!o && typeof o.q === "string" && typeof o.a === "string";
        })
        .map((x) => ({ q: String(x.q).slice(0, 200), a: String(x.a).slice(0, 600) }))
        .slice(0, 6),
    });
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail("AI hozir band", 503);
    return fail("AI xatosi", 500);
  }
}
