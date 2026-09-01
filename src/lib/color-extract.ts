// Logodan (yoki istalgan rasmdan) dominant rang ajratib, unga mos fon/tugma
// ranglarini taklif qiladi. FAQAT brauzerda ishlaydi (canvas + Image).

export type SuggestedColors = {
  dominant: string; // logoning asosiy rangi
  bg: string; // mos to'q fon
  bg2: string; // gradient uchun 2-rang
  button: string; // tugma rangi
  buttonText: string; // tugma matn rangi
  text: string; // sarlavha matn rangi
};

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}
function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Yorug'lik (0–255) — matn/kontrast tanlash uchun
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function clampMix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Rasmni yuklab, eng ko'p uchraydigan (to'yingan) rangni topadi.
export async function suggestColorsFromImage(src: string): Promise<SuggestedColors | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Ranglarni "chelak"larga guruhlab, eng ko'p+to'yingan chelakni tanlaymiz
        const buckets: Record<string, { r: number; g: number; b: number; count: number; score: number }> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue; // shaffof
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = luminance(r, g, b);
          // deyarli oq/qora piksellarni tashlab yuboramiz (logo foni)
          if (lum > 240 || lum < 15) continue;
          const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const weight = 1 + sat * 3; // to'yingan ranglar ustunroq
          if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, count: 0, score: 0 };
          buckets[key].r += r;
          buckets[key].g += g;
          buckets[key].b += b;
          buckets[key].count += 1;
          buckets[key].score += weight;
        }

        const arr = Object.values(buckets);
        if (arr.length === 0) return resolve(null);
        arr.sort((a, b) => b.score - a.score);
        const top = arr[0];
        const r = top.r / top.count;
        const g = top.g / top.count;
        const b = top.b / top.count;
        const dominant = rgbToHex(r, g, b);
        const lum = luminance(r, g, b);

        // Mos fon: dominant rangning to'q varianti (gradient)
        const bg = rgbToHex(clampMix(r, 15, 0.82), clampMix(g, 18, 0.82), clampMix(b, 30, 0.82));
        const bg2 = rgbToHex(clampMix(r, 30, 0.68), clampMix(g, 33, 0.68), clampMix(b, 45, 0.68));

        // Tugma: agar dominant to'q bo'lsa — oq tugma; yorug' bo'lsa — dominantni tugma qilamiz
        let button: string;
        let buttonText: string;
        if (lum < 110) {
          button = "#FFFFFF";
          buttonText = dominant;
        } else {
          button = dominant;
          buttonText = lum > 150 ? "#111111" : "#FFFFFF";
        }

        resolve({
          dominant,
          bg,
          bg2,
          button,
          buttonText,
          text: "#FFFFFF",
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
