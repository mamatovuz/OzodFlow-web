import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySubscribeToken, getSiteSetting } from "@/lib/site";

export const dynamic = "force-dynamic";

// Emaildagi "Obunani bekor qilish" havolasi shu yerga keladi (GET — bir bosishda).
// Token HMAC bilan tekshiriladi, keyin obunachi o'chiriladi va sokin sahifa ko'rsatiladi.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") || "").toLowerCase();
  const token = url.searchParams.get("t") || "";
  const s = await getSiteSetting().catch(() => ({ siteName: "Blog" }));

  let title = "Obuna bekor qilindi";
  let body = "Endi bu emailga yangi maqola xatlari kelmaydi. Fikringizni o'zgartirsangiz — istalgan vaqt qayta obuna bo'lishingiz mumkin.";

  if (!email || !token || !verifySubscribeToken(email, token)) {
    title = "Havola yaroqsiz";
    body = "Obunani bekor qilish havolasi eskirgan yoki noto'g'ri. Iltimos, so'nggi xatdagi havoladan foydalaning.";
  } else {
    await prisma.siteSubscriber.deleteMany({ where: { email } }).catch(() => {});
  }

  const html = `<!doctype html>
<html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
    background:#f6f6f7;color:#111}
  .card{max-width:400px;margin:20px;padding:32px;background:#fff;border:1px solid #ececec;
    border-radius:16px;text-align:center}
  h1{font-size:19px;margin:0 0 10px;letter-spacing:-.01em}
  p{font-size:14px;line-height:1.65;color:#4a4f57;margin:0}
  @media (prefers-color-scheme:dark){
    body{background:#0b0b0c;color:#f4f4f5}
    .card{background:#161618;border-color:#262629}
    p{color:#a1a1aa}
  }
</style></head>
<body><div class="card">
  <div style="font-size:13px;font-weight:600;opacity:.6;margin-bottom:16px">${escape(s.siteName || "Blog")}</div>
  <h1>${title}</h1>
  <p>${body}</p>
</div></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escape(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
