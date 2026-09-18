// ─────────────────────────────────────────────
// Email yuborish — Resend orqali (tasdiqlash kodi, parol tiklash havolasi).
// SDK qo'shmaymiz: oddiy REST (fetch) — https://resend.com/docs/api-reference.
// Domen (ozodflow.uz) Resend'da verify qilingan bo'lishi shart, aks holda
// "from" manzilidan email yetib bormaydi.
// ─────────────────────────────────────────────

const RESEND_URL = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function emailFrom(): string {
  return process.env.EMAIL_FROM || "OzodFlow <noreply@ozodflow.uz>";
}

/** Bitta email yuboradi. Muvaffaqiyatда true, xatoда false (log bilan). */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!emailConfigured()) {
    console.error("[email] RESEND_API_KEY yo'q — email yuborilmadi");
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[email] Resend xato:", res.status, t.slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] tarmoq xatosi:", e instanceof Error ? e.message : e);
    return false;
  }
}

// ─────────────────────────────────────────────
// Minimalist HTML shablon — oq fon, sokin tipografiya, keraksiz bezaksiz.
// (Email mijozlariga mos: inline CSS, jadval tuzilishi.)
// ─────────────────────────────────────────────
const INK = "#111111";
const MUTED = "#8A8F98";
const LINE = "#ECECEC";
const FONT = "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

function shell(inner: string, preheader = ""): string {
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#FFFFFF;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
  <tr><td align="center" style="padding:56px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:400px;">
      <tr><td style="font-family:${FONT};">
        <div style="font-size:15px;font-weight:600;color:${INK};letter-spacing:-.01em;">OzodFlow</div>
        <div style="height:28px;"></div>
        ${inner}
        <div style="height:36px;"></div>
        <div style="border-top:1px solid ${LINE};padding-top:16px;font-size:12px;line-height:1.6;color:${MUTED};">
          Agar bu so'rov sizdan bo'lmasa, xatni e'tiborsiz qoldiring.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<div style="font-size:18px;font-weight:600;color:${INK};letter-spacing:-.01em;margin:0 0 8px;">${text}</div>`;
}
function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4A4F57;">${text}</p>`;
}

/** Tasdiqlash kodi xati — sokin, katta o'qiladigan kod. */
export function verifyCodeEmail(code: string, name?: string): { subject: string; html: string } {
  const spaced = code.split("").join(" ");
  const inner = `
    ${heading("Emailingizni tasdiqlang")}
    ${paragraph(`${name ? name + ", r" : "R"}o'yxatdan o'tishni yakunlash uchun quyidagi kodni kiriting.`)}
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:10px;color:${INK};margin:4px 0 18px;">${spaced}</div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">Kod 10 daqiqa amal qiladi.</p>
  `;
  return { subject: `Tasdiqlash kodi: ${code}`, html: shell(inner, `Tasdiqlash kodingiz: ${code}`) };
}

/** Parolni tiklash havolasi — oddiy quyuq tugma. */
export function resetLinkEmail(url: string, name?: string): { subject: string; html: string } {
  const inner = `
    ${heading("Parolni tiklash")}
    ${paragraph(`${name ? name + ", p" : "P"}arolni tiklash so'rovi keldi. Yangi parol yaratish uchun tugmani bosing.`)}
    <a href="${url}" style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:12px 22px;border-radius:8px;">Yangi parol yaratish</a>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">Havola 30 daqiqa amal qiladi. Tugma ishlamasa:<br><a href="${url}" style="color:${MUTED};word-break:break-all;">${url}</a></p>
  `;
  return { subject: "Parolni tiklash", html: shell(inner, "Parolingizni tiklash havolasi") };
}

// ─────────────────────────────────────────────
// Blog xatlari — brend nomi, muqova rasmi va "obunani bekor qilish" havolasi
// bilan alohida qobiq (auth xatlaridan farqli).
// ─────────────────────────────────────────────
function blogShell(opts: {
  brand: string;
  inner: string;
  unsubscribeUrl?: string;
  preheader?: string;
}): string {
  const { brand, inner, unsubscribeUrl, preheader = "" } = opts;
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#F6F6F7;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6F7;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
      <tr><td style="font-family:${FONT};padding:28px 28px 8px;">
        <div style="font-size:14px;font-weight:600;color:${INK};letter-spacing:-.01em;">${brand}</div>
      </td></tr>
      <tr><td style="font-family:${FONT};padding:8px 28px 28px;">
        ${inner}
      </td></tr>
      <tr><td style="font-family:${FONT};border-top:1px solid ${LINE};padding:16px 28px;font-size:12px;line-height:1.7;color:${MUTED};">
        Siz ${brand} yangiliklariga obuna bo'lgansiz.${
          unsubscribeUrl
            ? ` <a href="${unsubscribeUrl}" style="color:${MUTED};text-decoration:underline;">Obunani bekor qilish</a>.`
            : ""
        }
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Yangi maqola e'loni — muqova, sarlavha, qisqacha, o'qish vaqti, "O'qish" tugmasi. */
export function newPostEmail(opts: {
  brand: string;
  title: string;
  excerpt?: string;
  coverImage?: string | null;
  minutes?: number;
  link: string;
  unsubscribeUrl?: string;
}): { subject: string; html: string } {
  const { brand, title, excerpt, coverImage, minutes, link, unsubscribeUrl } = opts;
  const meta = minutes ? `${minutes} daqiqalik o'qish` : "";
  const inner = `
    ${
      coverImage
        ? `<a href="${link}" style="text-decoration:none;"><img src="${coverImage}" alt="" width="424" style="display:block;width:100%;max-width:424px;height:auto;border-radius:12px;margin:0 0 20px;" /></a>`
        : ""
    }
    ${meta ? `<div style="font-size:12px;color:${MUTED};margin:0 0 6px;">${meta}</div>` : ""}
    <a href="${link}" style="display:block;font-size:21px;font-weight:600;color:${INK};letter-spacing:-.02em;line-height:1.3;text-decoration:none;margin:0 0 10px;">${title}</a>
    ${excerpt ? `<p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:#4A4F57;">${excerpt}</p>` : `<div style="height:12px;"></div>`}
    <a href="${link}" style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px;">O'qishni boshlash →</a>
  `;
  return {
    subject: title,
    html: blogShell({ brand, inner, unsubscribeUrl, preheader: excerpt || title }),
  };
}

/** Obunaga xush kelibsiz xati. */
export function welcomeEmail(opts: {
  brand: string;
  blogUrl: string;
  unsubscribeUrl?: string;
}): { subject: string; html: string } {
  const { brand, blogUrl, unsubscribeUrl } = opts;
  const inner = `
    ${heading("Obuna bo'lganingiz uchun rahmat 🙌")}
    ${paragraph(`Endi <b>${brand}</b>'da yangi maqola chiqqan zahoti birinchilardan bo'lib xabar olasiz.`)}
    ${paragraph("Bu yerda texnologiya, fikrlash va raqamli dunyodagi raqamsiz narsalar haqida yozamiz.")}
    <a href="${blogUrl}" style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px;">Blogni ochish →</a>
  `;
  return {
    subject: `${brand}'ga xush kelibsiz`,
    html: blogShell({ brand, inner, unsubscribeUrl, preheader: "Obuna tasdiqlandi" }),
  };
}

/** Muallif izohga javob berdi — izoh egasiga xabar. */
export function commentReplyEmail(opts: {
  brand: string;
  name: string; // izoh egasining ismi
  postTitle: string;
  replyBody: string;
  link: string; // maqola (izohlar bo'limi) havolasi
}): { subject: string; html: string } {
  const { brand, name, postTitle, replyBody, link } = opts;
  const inner = `
    ${heading("Izohingizga javob keldi 💬")}
    ${paragraph(`${name}, siz <b>“${postTitle}”</b> maqolasidagi izohingizga muallifdan javob oldingiz:`)}
    <div style="margin:0 0 20px;padding:14px 16px;background:#F6F6F7;border-left:3px solid ${INK};border-radius:8px;font-size:14px;line-height:1.6;color:#333;">${replyBody}</div>
    <a href="${link}" style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:12px 22px;border-radius:10px;">Suhbatni ko'rish →</a>
  `;
  return {
    subject: `“${postTitle}” — izohingizga javob`,
    html: blogShell({ brand, inner, preheader: "Muallif izohingizga javob berdi" }),
  };
}

/** Yangi izoh keldi — adminga (moderatsiya) xabar. */
export function newCommentAdminEmail(opts: {
  brand: string;
  name: string;
  body: string;
  postTitle: string;
  link: string;
  isReply: boolean;
}): { subject: string; html: string } {
  const { brand, name, body, postTitle, link, isReply } = opts;
  const inner = `
    ${heading(isReply ? "Yangi javob (tasdiq kutmoqda)" : "Yangi izoh (tasdiq kutmoqda)")}
    ${paragraph(`<b>${name}</b> — “${postTitle}”:`)}
    <div style="margin:0 0 20px;padding:14px 16px;background:#F6F6F7;border-radius:8px;font-size:14px;line-height:1.6;color:#333;">${body}</div>
    <a href="${link}" style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:12px 22px;border-radius:10px;">Panelda ko'rish →</a>
  `;
  return {
    subject: `Yangi izoh: ${name}`,
    html: blogShell({ brand, inner, preheader: body.slice(0, 100) }),
  };
}

/** Admin parol tiklash kodi. */
export function adminCodeEmail(code: string): { subject: string; html: string } {
  const spaced = code.split("").join(" ");
  const inner = `
    ${heading("Parolni tiklash")}
    ${paragraph("Admin paneli uchun tiklash kodi so'raldi. Kodni kiriting.")}
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:10px;color:${INK};margin:4px 0 18px;">${spaced}</div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">Kod 10 daqiqa amal qiladi.</p>
  `;
  return { subject: `Admin kodi: ${code}`, html: shell(inner, `Admin kodi: ${code}`) };
}
