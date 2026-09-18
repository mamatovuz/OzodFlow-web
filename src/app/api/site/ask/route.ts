import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { stripHtml, publicPostWhere } from "@/lib/site";
import { aiGenerateJson, aiConfigured, AiUnavailableError } from "@/lib/ai";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().min(1),
  question: z.string().trim().min(2).max(500),
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

// Ommaviy "maqoladan so'rang" — AI faqat shu maqola matni asosida javob beradi (RAG).
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "site-ask", { limit: 15, windowMs: WINDOW.fiveMin });
  if (limited) return limited;
  if (!(await aiConfigured())) return fail("AI hozir mavjud emas", 503);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Savol noto'g'ri", 422);
  const { slug, question } = parsed.data;

  const post = await prisma.sitePost.findFirst({
    where: { slug, ...publicPostWhere() },
    select: { title: true, contentHtml: true, password: true },
  });
  if (!post) return fail("Maqola topilmadi", 404);
  if (post.password) return fail("Bu maqola qulflangan", 403);

  const text = stripHtml(post.contentHtml);
  const prompt = `Sen blog maqolasi bo'yicha yordamchisan. FAQAT quyidagi maqola matni
asosida javob ber. Agar javob maqolada bo'lmasa, "Bu haqda maqolada ma'lumot yo'q"
deb yoz — o'zingdan to'qima. Qisqa, aniq, o'quvchi tilida (savol qaysi tilda bo'lsa,
shu tilda) javob ber. Faqat JSON: {"answer": string}.

Maqola sarlavhasi: ${post.title}
Maqola matni: """${text.slice(0, 9000)}"""

Savol: ${question}`;

  try {
    const raw = await aiGenerateJson(prompt);
    const j = safeJson(raw);
    const answer = String(j?.answer || "").trim().slice(0, 1500);
    if (!answer) return fail("Javob chiqmadi, qayta urinib ko'ring", 502);
    return ok({ answer });
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail("AI hozir band, keyinroq urinib ko'ring", 503);
    return fail("AI xatosi", 500);
  }
}
