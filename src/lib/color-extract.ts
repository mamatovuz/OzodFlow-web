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

// To'yinganlik (0–1) — kulrang piksellarni ajratish uchun
function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

// Rasmni yuklab, brend rangini (eng to'yingan, ko'p uchraydigan) topadi.
// Logo foni odatda oq/qora/kulrang bo'ladi — ularni chetlab, chinakam
// brend rangini ajratamiz. To'liq kulrang logolar uchun ham fallback bor.
export async function suggestColorsFromImage(src: string): Promise<SuggestedColors | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        // Aniqlik uchun kattaroq namuna (nisbatni saqlab)
        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        type Bucket = { r: number; g: number; b: number; count: number; score: number };
        // Ikki guruh: rangli (to'yingan) va zaxira (istalgan). Rangli bo'lsa
        // undan tanlaymiz — kulrang matn/fon brend rangini bosib ketmaydi.
        const colorful: Record<string, Bucket> = {};
        const fallback: Record<string, Bucket> = {};

        const add = (map: Record<string, Bucket>, key: string, r: number, g: number, b: number, weight: number) => {
          if (!map[key]) map[key] = { r: 0, g: 0, b: 0, count: 0, score: 0 };
          const bk = map[key];
          bk.r += r;
          bk.g += g;
          bk.b += b;
          bk.count += 1;
          bk.score += weight;
        };

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue; // shaffof
          const lum = luminance(r, g, b);
          if (lum > 244 || lum < 12) continue; // deyarli oq/qora
          const sat = saturation(r, g, b);
          // Nozik chelaklar (16 daraja/kanal) — rang aniqligini saqlaydi
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
          add(fallback, key, r, g, b, 1);
          if (sat >= 0.18) {
            // to'yinganlikni kuchli mukofotlaymiz — chinakam brend rangi ustun
            add(colorful, key, r, g, b, 1 + sat * sat * 6);
          }
        }

        const pick = (map: Record<string, Bucket>): Bucket | null => {
          const arr = Object.values(map);
          if (arr.length === 0) return null;
          arr.sort((a, b) => b.score - a.score);
          return arr[0];
        };

        // Avval rangli guruh; bo'sh bo'lsa (logo butunlay kulrang) — zaxira
        const top = pick(colorful) || pick(fallback);
        if (!top) return resolve(null);
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
