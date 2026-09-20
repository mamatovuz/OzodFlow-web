// Maqola ovozini OLDINDAN tayyorlab saqlaydi (mp3) — har o'qishda qayta
// yaratilmaydi. Kalit (Edge/OpenAI) bo'lsa ishlaydi; bo'lmasa null (mijoz jonli
// TTS/brauzer zaxirasiga tushadi).
import crypto from "crypto";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { stripHtml } from "./site";
import { ttsTimedMp3, splitForTts } from "./tts";
import type { WordTiming } from "./tts-timing";
import { geminiTtsPcm, wavHeader } from "./gemini-tts";
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
  if (chunks.length === 0) return null;

  // 1) MP3 yo'li (Edge → OpenAI). Har bo'lak mp3 bo'lsa — ulaymiz.
  let audio: Buffer | null = null;
  let ext = "mp3";
  const mp3s: Buffer[] = [];
  const timings: WordTiming[] = [];
  let timed = true;
  let audioSeconds = 0;
  let mp3ok = true;
  for (const c of chunks) {
    const result = await ttsTimedMp3(c, "uz").catch(() => null);
    if (!result) {
      mp3ok = false;
      break;
    }
    if (!result.timings.length) timed = false;
    timings.push(...result.timings.map((word) => ({ ...word, time: word.time + audioSeconds })));
    // Edge output is 48 kbps CBR. Include actual audio bytes, including pauses,
    // rather than the last spoken word's end when joining chunks.
    audioSeconds += result.audio.length * 8 / 48000;
    mp3s.push(result.audio);
  }
  if (mp3ok && mp3s.length) {
    audio = Buffer.concat(mp3s);
    ext = "mp3";
  } else {
    // 2) Gemini yo'li (WAV) — foydalanuvchida faqat Gemini kaliti bo'lsa.
    //    Har bo'lakning xom PCM'ini olib, bitta WAV faylga birlashtiramiz.
    try {
      const pcms: Buffer[] = [];
      let rate = 24000;
      for (const c of chunks) {
        const g = await geminiTtsPcm(c);
        if (!g.pcm.length) throw new Error("bo'sh");
        pcms.push(g.pcm);
        rate = g.rate;
      }
      const pcm = Buffer.concat(pcms);
      audio = Buffer.concat([wavHeader(pcm.length, rate), pcm]);
      ext = "wav";
    } catch {
      return null; // hech qaysi provayder ishlamadi
    }
  }
  if (!audio || audio.length < 200) return null;

  const name = `audio-${post.slug.slice(0, 40)}-${Date.now().toString(36)}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), audio);
  if (ext === "mp3" && timed && timings.length) {
    await writeFile(path.join(UPLOAD_DIR, `${name}.timings.json`), JSON.stringify({ timings }));
  }
  const url = `/media/${name}`;

  // Eski faylni o'chiramiz (joy egallamasin)
  if (post.audioUrl) {
    const old = path.basename(post.audioUrl);
    if (old && (old.endsWith(".mp3") || old.endsWith(".wav"))) await unlink(path.join(UPLOAD_DIR, old)).catch(() => {});
    if (old) await unlink(path.join(UPLOAD_DIR, `${old}.timings.json`)).catch(() => {});
  }

  await prisma.sitePost.update({ where: { id: post.id }, data: { audioUrl: url, audioHash: hash } }).catch(() => {});
  return url;
}

/** Post ovozini o'chiradi (fayl + DB). */
export async function clearPostAudio(post: { id: string; audioUrl?: string | null }): Promise<void> {
  if (post.audioUrl) {
    const old = path.basename(post.audioUrl);
    if (old && (old.endsWith(".mp3") || old.endsWith(".wav"))) await unlink(path.join(UPLOAD_DIR, old)).catch(() => {});
    if (old) await unlink(path.join(UPLOAD_DIR, `${old}.timings.json`)).catch(() => {});
  }
  await prisma.sitePost.update({ where: { id: post.id }, data: { audioUrl: null, audioHash: null } }).catch(() => {});
}
