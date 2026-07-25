/**
 * Tema tanlovini sahifa chizilishidan OLDIN qo'llaydi.
 *
 * Muammo: qorong'i tema React yuklangandan keyin qo'llansa, foydalanuvchi bir
 * lahza oq ekranni ko'radi ("flash of wrong theme"). Bu ayniqsa qorong'i
 * temada ko'zni qamashtiradi.
 *
 * Yechim: `<head>` ichida bloklovchi kichik skript. U brauzer birinchi
 * pikselni chizishdan avval `<html>` ga `dark` sinfini qo'yadi.
 *
 * Skript ataylab minimal va try/catch ichida: localStorage o'chirilgan
 * brauzerlarda (yoki incognito cheklovlarida) xato butun sahifani yiqitmasligi
 * kerak.
 */

export const THEME_STORAGE_KEY = "ozodflow-theme";

const script = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var isDark = stored === 'dark' ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <script
      // Skript o'zimiz yozgan doimiy matn — foydalanuvchi ma'lumoti emas,
      // shuning uchun bu yerda XSS xavfi yo'q.
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
