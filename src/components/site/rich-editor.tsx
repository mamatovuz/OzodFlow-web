"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Heading, Link2, Image as ImageIcon, Eraser, Loader2, Code2, Youtube, List, Quote } from "lucide-react";

type Props = {
  /** Post almashganini bildiradi — editor mazmuni qayta yuklanadi */
  docId: string;
  initialHtml: string;
  onChange: (html: string) => void;
  onUpload: (file: File) => Promise<string | null>;
};

export function RichEditor({ docId, initialHtml, onChange, onUpload }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Post almashganda (yoki birinchi mount) editor mazmunini o'rnatamiz.
  // Har `onChange`da qayta o'rnatmaymiz — kursor sakramasligi uchun.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml || "";
  }, [docId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    sync();
  };

  const addLink = () => {
    const url = window.prompt("Havola manzili (URL):", "https://");
    if (url) exec("createLink", url);
  };

  const insertHtml = (html: string) => {
    ref.current?.focus();
    document.execCommand("insertHTML", false, html);
    sync();
  };

  const addCode = () => {
    // Bo'sh kod bloki — foydalanuvchi ichiga yozadi
    insertHtml('<pre><code>kod shu yerda...</code></pre><p><br/></p>');
  };

  const addVideo = () => {
    const url = window.prompt("YouTube havolasi:", "https://youtu.be/");
    if (!url) return;
    const id = ytId(url);
    if (!id) {
      alert("YouTube havolasi noto'g'ri");
      return;
    }
    insertHtml(`<div class="yt-embed"><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe></div><p><br/></p>`);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const url = await onUpload(file);
    setUploading(false);
    if (!url) return;
    ref.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      `<figure><img src="${url}" alt="" /></figure><p><br/></p>`
    );
    sync();
  };

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
        <Btn onClick={() => exec("bold")} title="Qalin">
          <Bold className="h-[15px] w-[15px]" />
        </Btn>
        <Btn onClick={() => exec("formatBlock", "<h2>")} title="Sarlavha">
          <Heading className="h-[15px] w-[15px]" />
        </Btn>
        <Btn onClick={addLink} title="Havola">
          <Link2 className="h-[15px] w-[15px]" />
        </Btn>
        <Btn onClick={() => exec("insertUnorderedList")} title="Ro'yxat">
          <List className="h-[15px] w-[15px]" />
        </Btn>
        <Btn onClick={() => exec("formatBlock", "<blockquote>")} title="Iqtibos">
          <Quote className="h-[15px] w-[15px]" />
        </Btn>
        <div className="mx-1 h-4 w-px bg-border" />
        <Btn onClick={() => fileRef.current?.click()} title="Rasm">
          {uploading ? <Loader2 className="h-[15px] w-[15px] animate-spin" /> : <ImageIcon className="h-[15px] w-[15px]" />}
        </Btn>
        <Btn onClick={addVideo} title="YouTube video">
          <Youtube className="h-[15px] w-[15px]" />
        </Btn>
        <Btn onClick={addCode} title="Kod bloki">
          <Code2 className="h-[15px] w-[15px]" />
        </Btn>
        <div className="mx-1 h-4 w-px bg-border" />
        <Btn onClick={() => exec("removeFormat")} title="Formatni tozalash">
          <Eraser className="h-[15px] w-[15px]" />
        </Btn>
      </div>

      <div
        ref={ref}
        className="site-editor px-4 py-4"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Bu yerdan yozishni boshlang…"
        onInput={sync}
        onBlur={sync}
      />

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
    </div>
  );
}

// YouTube havolasidan video ID ni ajratadi
function ytId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}
