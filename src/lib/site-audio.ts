// Maqola ovozini OLDINDAN tayyorlab saqlaydi (mp3) — har o'qishda qayta
// yaratilmaydi. Kalit (Edge/OpenAI) bo'lsa ishlaydi; bo'lmasa null (mijoz jonli
// TTS/brauzer zaxirasiga tushadi).
import crypto from "crypto";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { stripHtml } from "./site";
import { ttsMp3, splitForTts } from "./tts";
import { UPLOAD_DIR } from "./uploads";

function textHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 24);
}

/**
 * Post uchun ovoz mp3'ini yaratadi va saqlaydi. Matn o'zgarmagan bo'lsa
 * (audioHash mos) qayta yaratmaydi. Muvaffaqiyatда /media/... url qaytaradi.
 */
export async function generatePostAudio(post: {
  id: string;
  slug: string;
  contentHtml: string;
  audioHash?: string | null;
  audioUrl?: string | null;
}): Promise<string | null> {
  const text = stripHtml(post.contentHtml || "");
  if (!text || text.length < 20) return null;
  const hash = textHash(text);

  // Allaqachon shu matn uchun tayyor bo'lsa — qayta yaratmaymiz
  if (post.audioHash === hash && post.audioUrl) return post.audioUrl;

  const chunks = splitForTts(text, 3500);
  const buffers: Buffer[] = [];
  for (const c of chunks) {
    const mp3 = await ttsMp3(c, "uz").catch(() => null);
    if (!mp3) return null; // kalit yo'q/ishlamadi — jonli rejimga qoldiramiz
    buffers.push(mp3);
  }
  if (buffers.length === 0) return null;

  const audio = Buffer.concat(buffers);
  const name = `audio-${post.slug.slice(0, 40)}-${Date.now().toString(36)}.mp3`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), audio);
  const url = `/media/${name}`;

  // Eski faylni o'chiramiz (joy egallamasin)
  if (post.audioUrl) {
    const old = path.basename(post.audioUrl);
    if (old && old.endsWith(".mp3")) await unlink(path.join(UPLOAD_DIR, old)).catch(() => {});
  }

  await prisma.sitePost.update({ where: { id: post.id }, data: { audioUrl: url, audioHash: hash } }).catch(() => {});
  return url;
}

/** Post ovozini o'chiradi (fayl + DB). */
export async function clearPostAudio(post: { id: string; audioUrl?: string | null }): Promise<void> {
  if (post.audioUrl) {
    const old = path.basename(post.audioUrl);
    if (old && old.endsWith(".mp3")) await unlink(path.join(UPLOAD_DIR, old)).catch(() => {});
  }
  await prisma.sitePost.update({ where: { id: post.id }, data: { audioUrl: null, audioHash: null } }).catch(() => {});
}
