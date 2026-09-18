import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, stripHtml } from "@/lib/site";
import { aiGenerateJson, aiConfigured, AiUnavailableError } from "@/lib/ai";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  mode: z.enum(["generate", "improve"]).default("generate"),
  topic: z.string().trim().max(300).optional(),
  current: z.string().max(20000).optional(),
});

export async function POST(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const limited = limitOrReject(req, "site-ai", { limit: 10, windowMs: WINDOW.fiveMin });
  if (limited) return limited;

  if (!(await aiConfigured())) return fail("AI kaliti sozlanmagan (admin panelda qo'shiladi)", 503);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumot noto'g'ri", 422);
  const d = parsed.data;

  const base = `Sen o'zbek tilida yozadigan blog muharrirsan. Faqat JSON qayta
(boshqa matnsiz): {"title": string, "excerpt": string (max 160 belgi),
"contentHtml": string (toza HTML: <p>, <h2>, <ul><li>, <strong>, <pre><code>),
"tags": string[] (2-5 ta)}. Matn tabiiy, foydali va qiziqarli bo'lsin.`;

  let prompt: string;
  if (d.mode === "improve") {
    const text = stripHtml(d.current || "");
    if (!text) return fail("Yaxshilash uchun matn yo'q", 422);
    prompt = `${base}\n\nQuyidagi qoralamani yaxshila, kengaytir va tartibga sol:\n"""${text.slice(0, 6000)}"""`;
  } else {
    if (!d.topic) return fail("Mavzu kiriting", 422);
    prompt = `${base}\n\nMavzu: "${d.topic}". Shu mavzuda to'liq blog maqola yoz.`;
  }

  try {
    const raw = await aiGenerateJson(prompt);
    const parsedJson = safeJson(raw);
    if (!parsedJson) return fail("AI javobi tushunarsiz, qayta urinib ko'ring", 502);
    return ok({
      title: String(parsedJson.title || "").slice(0, 120),
      excerpt: String(parsedJson.excerpt || "").slice(0, 200),
      contentHtml: String(parsedJson.contentHtml || ""),
      tags: Array.isArray(parsedJson.tags) ? parsedJson.tags.map(String).slice(0, 5) : [],
    });
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail("AI hozir band, keyinroq urinib ko'ring", 503);
    return fail("AI xatosi", 500);
  }
}

function safeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    // ba'zan AI ```json ... ``` bilan qaytaradi
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
