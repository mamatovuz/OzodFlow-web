/** Instagram API bilan ishlash uchun kichik klient yordamchilari */

export async function igGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`/api/instagram${path}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Xatolik yuz berdi");
  return json.data as T;
}

export async function igSend<T = any>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`/api/instagram${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Xatolik yuz berdi");
  return json.data as T;
}
