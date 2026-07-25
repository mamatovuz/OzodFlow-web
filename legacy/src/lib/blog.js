export function formatDate(value, lang = "uz") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(lang === "ru" ? "ru-RU" : "uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function readingTime(content, lang = "uz") {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 180));
  return lang === "ru" ? `${minutes} мин чтения` : `${minutes} daqiqa o'qish`;
}
