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
// Chiroyli, brendli HTML shablon (email mijozlariga mos — inline CSS, jadval).
// ─────────────────────────────────────────────
const ACCENT = "#2563EB";
const INK = "#0F172A";
const MUTED = "#64748B";
const BG = "#F1F5F9";

function shell(inner: string, preheader = ""): string {
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${BG};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08);">
      <tr>
        <td style="background:${ACCENT};padding:22px 28px;">
          <span style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:20px;font-weight:800;color:#FFFFFF;letter-spacing:-.02em;">OzodFlow</span>
        </td>
      </tr>
      <tr><td style="padding:32px 28px 34px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        ${inner}
      </td></tr>
    </table>
    <p style="max-width:480px;margin:18px auto 0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};text-align:center;">
      Bu xat OzodFlow tomonidan yuborildi. Agar bu so'rov sizdan bo'lmasa, xatni e'tiborsiz qoldiring.<br>
      © ${new Date().getFullYear()} OzodFlow · ozodflow.uz
    </p>
  </td></tr>
</table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${INK};letter-spacing:-.02em;">${text}</h1>`;
}
function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${MUTED};">${text}</p>`;
}

/** Tasdiqlash kodi xati (katta, o'qishga oson kod bloki bilan). */
export function verifyCodeEmail(code: string, name?: string): { subject: string; html: string } {
  const spaced = code.split("").join(" ");
  const inner = `
    ${heading("Emailingizni tasdiqlang")}
    ${paragraph(`${name ? name + ", x" : "X"}ush kelibsiz! Ro'yxatdan o'tishni yakunlash uchun quyidagi tasdiqlash kodini kiriting.`)}
    <div style="margin:8px 0 20px;padding:20px;background:${BG};border-radius:12px;text-align:center;">
      <div style="font-family:-apple-system,Segoe UI,Roboto,monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:${ACCENT};">${spaced}</div>
    </div>
    ${paragraph("Kod <b>10 daqiqa</b> davomida amal qiladi. Uni hech kim bilan bo'lishmang.")}
  `;
  return { subject: `OzodFlow tasdiqlash kodi: ${code}`, html: shell(inner, `Tasdiqlash kodingiz: ${code}`) };
}

/** Parolni tiklash havolasi xati (tugma bilan). */
export function resetLinkEmail(url: string, name?: string): { subject: string; html: string } {
  const inner = `
    ${heading("Parolni tiklash")}
    ${paragraph(`${name ? name + ", p" : "P"}arolingizni tiklash so'rovi keldi. Yangi parol yaratish uchun quyidagi tugmani bosing.`)}
    <div style="margin:8px 0 22px;">
      <a href="${url}" style="display:inline-block;background:${ACCENT};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:10px;">Yangi parol yaratish</a>
    </div>
    ${paragraph("Havola <b>30 daqiqa</b> davomida amal qiladi. Agar tugma ishlamasa, quyidagi manzilni brauzerga nusxalang:")}
    <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:${ACCENT};">${url}</p>
  `;
  return { subject: "OzodFlow — parolni tiklash", html: shell(inner, "Parolingizni tiklash havolasi") };
}

/** Admin parol tiklash kodi xati. */
export function adminCodeEmail(code: string): { subject: string; html: string } {
  const spaced = code.split("").join(" ");
  const inner = `
    ${heading("Admin — parolni tiklash")}
    ${paragraph("Admin paneliga parolni tiklash kodi so'raldi. Kodni kiriting:")}
    <div style="margin:8px 0 20px;padding:20px;background:${BG};border-radius:12px;text-align:center;">
      <div style="font-family:-apple-system,Segoe UI,Roboto,monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:${ACCENT};">${spaced}</div>
    </div>
    ${paragraph("Kod <b>10 daqiqa</b> davomida amal qiladi. Agar bu so'rov sizdan bo'lmasa, darhol parolingizni tekshiring.")}
  `;
  return { subject: `OzodFlow admin kodi: ${code}`, html: shell(inner, `Admin kodi: ${code}`) };
}
