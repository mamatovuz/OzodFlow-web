import path from "path";

// Yuklangan fayllar papkasi.
// Lokal: <loyiha>/uploads. Railway: UPLOAD_DIR=/app/data/uploads (volume ichida).
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Fayl nomi bo'yicha content-type
export function contentTypeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}
