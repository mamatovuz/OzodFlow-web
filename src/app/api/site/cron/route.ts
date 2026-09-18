import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { stripHtml, maybeNotifyTelegram, maybeEmailSubscribers } from "@/lib/site";
import { aiGenerateJson, aiConfigured, AiUnavailableError } from "@/lib/ai";

export const dynamic = "force-dynamic";
// AI generatsiyasi sekin bo'lishi mumkin — vaqt chegarasini uzaytiramiz
export const maxDuration = 60;

// ─────────────────────────────────────────────
// AI avto-post: haftada bir necha marta tashqi rejalashtiruvchi (Railway cron
// yoki cron-job.org) shu manzilga kiradi. Har kirishda AI bitta maqola yozadi,
// SITE holatida e'lon qiladi va (avtomatik) Telegram kanalga + obunachilarga
// yuboradi. Mavzular navbatma-navbat: dasturlash/IT yangiliklari va AI yangiliklari.
//
// Xavfsizlik: ?key=<CRON_SECRET> majburiy (env'da o'rnatiladi).
// Chaqirish: GET https://<domen>/api/site/cron?key=SECRET
//   - Takror bosilsa ham 3 kun ichida 2-marta yozmaydi (?force=1 bilan majburlash).
// ─────────────────────────────────────────────

const TOPICS = [
  {
    tag: "IT",
    label: "Dasturlash va IT",
    brief: `dasturlash, web/mobil texnologiyalar, dasturchilar uchun foydali vositalar,
frameworklar (React, Next.js, Node kabi), IT sohasidagi muhim tendensiyalar va
yangiliklar haqida. Amaliy maslahatlar va misollar bo'lsin.`,
  },
  {
    tag: "AI",
    label: "Sun'iy intellekt",
    brief: `sun'iy intellekt (AI), yirik til modellari (LLM), AI vositalari, ularning
dasturlash va kundalik hayotdagi qo'llanilishi, sohaning muhim yo'nalishlari va
ta'siri haqida. Amaliy va tushunarli bo'lsin.`,
  },
];

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || req.headers.get("x-cron-key") || "";
  const force = url.searchParams.get("force") === "1";

  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("CRON_SECRET env o'rnatilmagan", 503);
  if (key !== secret) return fail("Ruxsat yo'q", 401);

  if (!(await aiConfigured())) return fail("AI kaliti sozlanmagan", 503);

  // Takror himoyasi — oxirgi 3 kunda AI post yozilgan bo'lsa, qayta yozmaymiz
  if (!force) {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recent = await prisma.sitePost.findFirst({
      where: { aiAuto: true, createdAt: { gte: threeDaysAgo } },
      select: { id: true },
    });
    if (recent) return ok({ skipped: true, reason: "Oxirgi 3 kunda AI post yozilgan" });
  }

  // Mavzuni navbat bilan tanlaymiz (AI postlar soni juft/toq)
  const aiCount = await prisma.sitePost.count({ where: { aiAuto: true } });
  const topic = TOPICS[aiCount % TOPICS.length];

  const prompt = `Sen o'zbek tilida yozadigan tajribali IT blog muharrirsan. Bugun ${topic.label}
sohasi bo'yicha bitta to'liq, qiziqarli va foydali maqola yoz.

Mavzu doirasi: ${topic.brief}

FAQAT JSON qaytar (boshqa matnsiz), quyidagi tuzilishda:
{"title": string (jozibali sarlavha, max 90 belgi),
 "excerpt": string (qisqacha, max 160 belgi),
 "contentHtml": string (toza HTML: <p>, <h2>, <ul><li>, <strong>, kerak bo'lsa <pre><code>; 4-7 abzas, sarlavhalar bilan bo'lingan),
 "tags": string[] (3-5 ta o'zbekcha/inglizcha teg)}

Matn tabiiy, jonli va o'quvchiga qiymat beradigan bo'lsin. Suvli gaplarsiz, aniq va tushunarli yoz.`;

  let data: Record<string, unknown> | null = null;
  try {
    const raw = await aiGenerateJson(prompt);
    data = safeJson(raw);
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail("AI hozir band", 503);
    return fail("AI xatosi", 500);
  }
  if (!data) return fail("AI javobi tushunarsiz", 502);

  const title = String(data.title || "").trim().slice(0, 120);
  const contentHtml = String(data.contentHtml || "");
  const clean = stripHtml(contentHtml);
  if (!title || clean.length < 50) return fail("AI matni yetarli emas", 502);

  const tags = Array.isArray(data.tags) ? data.tags.map(String).map((t) => t.trim()).filter(Boolean).slice(0, 5) : [];
  if (!tags.some((t) => t.toLowerCase() === topic.tag.toLowerCase())) tags.unshift(topic.tag);

  let slug = slugify(title);
  if (!slug) slug = `post-${Date.now().toString(36)}`;
  const exists = await prisma.sitePost.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const post = await prisma.sitePost.create({
    data: {
      title,
      slug,
      contentHtml,
      excerpt: String(data.excerpt || "").trim().slice(0, 200) || clean.slice(0, 160),
      status: "SITE", // hammaga + bosh sahifada
      tags: JSON.stringify(tags.slice(0, 12)),
      publishDate: new Date(),
      aiAuto: true,
    },
  });

  // Telegram kanalga + obunachilarga (kanonik domen bilan) — natijani kutamiz
  await maybeNotifyTelegram(post).catch(() => {});
  await maybeEmailSubscribers(post).catch(() => {});

  return ok({ created: true, id: post.id, slug: post.slug, title: post.title, topic: topic.label });
}

function safeJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
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
