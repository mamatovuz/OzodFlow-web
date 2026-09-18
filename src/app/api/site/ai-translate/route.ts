import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, parseTranslations } from "@/lib/site";
import { aiGenerateJson, aiConfigured, AiUnavailableError } from "@/lib/ai";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  postId: z.string().min(1),
  lang: z.enum(["ru", "en"]),
  force: z.boolean().optional(),
});

const LANG_NAME: Record<string, string> = { ru: "rus", en: "ingliz" };

function safeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch { return null; }
    return null;
  }
}

// AI tarjima — maqola sarlavhasi va HTML matnini ru/en ga tarjima qilib keshlaydi.
export async function POST(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const limited = limitOrReject(req, "site-ai", { limit: 12, windowMs: WINDOW.fiveMin });
  if (limited) return limited;
  if (!(await aiConfigured())) return fail("AI kaliti sozlanmagan", 503);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);
  const { postId, lang, force } = parsed.data;

  const post = await prisma.sitePost.findUnique({ where: { id: postId } });
  if (!post) return fail("Maqola topilmadi", 404);

  const existing = parseTranslations(post.translations);
  if (existing[lang] && !force) return ok({ lang, cached: true, ...existing[lang] });

  const prompt = `Sen professional tarjimonsan. Quyidagi blog maqolasini ${LANG_NAME[lang]} tiliga tabiiy,
ravon tarjima qil. HTML teglar (<p>, <h2>, <h3>, <ul>, <li>, <strong>, <pre>, <code>, <a>, <img>)
o'z joyida QOLSIN — faqat matnni tarjima qil, teg tuzilmasini o'zgartirma. Kod bloklarini (<pre><code>)
tarjima qilma. Faqat JSON qaytar: {"title": string, "html": string}.

Sarlavha: ${post.title}
HTML: """${post.contentHtml.slice(0, 14000)}"""`;

  try {
    const raw = await aiGenerateJson(prompt);
    const j = safeJson(raw);
    const title = String(j?.title || "").trim().slice(0, 300);
    const html = String(j?.html || "").trim();
    if (!html) return fail("Tarjima chiqmadi", 502);
    const updated = { ...existing, [lang]: { title, html } };
    await prisma.sitePost.update({ where: { id: post.id }, data: { translations: JSON.stringify(updated) } });
    return ok({ lang, title, html });
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail("AI hozir band", 503);
    return fail("AI xatosi", 500);
  }
}
