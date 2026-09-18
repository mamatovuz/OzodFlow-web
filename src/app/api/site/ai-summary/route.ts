import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, stripHtml } from "@/lib/site";
import { aiGenerateJson, aiConfigured, AiUnavailableError } from "@/lib/ai";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  postId: z.string().min(1).optional(),
  title: z.string().max(300).optional(),
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

// AI TL;DR — maqolani 2-3 jumlada xulosalab, SitePost.summary ga saqlaydi.
export async function POST(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const limited = limitOrReject(req, "site-ai", { limit: 20, windowMs: WINDOW.fiveMin });
  if (limited) return limited;
  if (!(await aiConfigured())) return fail("AI kaliti sozlanmagan", 503);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);
  const d = parsed.data;

  // postId berilsa — bazadan; aks holda editordan kelgan matndan
  let title = d.title || "";
  let html = d.contentHtml || "";
  if (d.postId) {
    const post = await prisma.sitePost.findUnique({ where: { id: d.postId } });
    if (!post) return fail("Maqola topilmadi", 404);
    title = post.title;
    html = post.contentHtml;
  }

  const text = stripHtml(html);
  if (text.length < 40) return fail("Maqola matni juda qisqa", 422);

  const prompt = `Sen o'zbek tilida yozadigan muharrirsan. Quyidagi maqolani o'qib,
uni O'QISHDAN OLDIN tushunish uchun 2-3 ta qisqa jumlada xulosa (TL;DR) yoz.
Sof, aniq, qiziqarli bo'lsin. Faqat JSON qaytar: {"summary": string}.

Sarlavha: ${title}
Matn: """${text.slice(0, 7000)}"""`;

  try {
    const raw = await aiGenerateJson(prompt);
    const j = safeJson(raw);
    const summary = String(j?.summary || "").trim().slice(0, 600);
    if (!summary) return fail("AI xulosa bermadi", 502);
    // postId bo'lsa darhol saqlaymiz (aks holda editor Saqlaganda yoziladi)
    if (d.postId) await prisma.sitePost.update({ where: { id: d.postId }, data: { summary } });
    return ok({ summary });
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail("AI hozir band", 503);
    return fail("AI xatosi", 500);
  }
}
