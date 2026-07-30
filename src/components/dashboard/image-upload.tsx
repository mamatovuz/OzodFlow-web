"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Yuklashda xatolik");
  return json.data.url;
}

// ─── Bitta rasm (logo, cover) ───
export function ImageUpload({
  value,
  onChange,
  aspect = "square",
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "wide";
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const box = aspect === "wide" ? "h-28 w-full" : "h-24 w-24";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handle}
      />
      {value ? (
        <div className={`relative overflow-hidden rounded-xl border border-border ${box}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label || ""} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white hover:bg-black/80"
          >
            O'zgartirish
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted transition-colors hover:border-accent hover:text-accent ${box}`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5" />
              <span className="text-[11px]">Rasm tanlash</span>
            </>
          )}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

// ─── Ko'p rasm (mahsulot) ───
export function MultiImageUpload({
  images,
  onChange,
  max = 5,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, max - images.length)) {
        uploaded.push(await uploadFile(file));
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handle}
      />
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div
            key={i}
            className="relative h-16 w-16 overflow-hidden rounded-lg border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, x) => x !== i))}
              className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-error text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted hover:border-accent hover:text-accent"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
