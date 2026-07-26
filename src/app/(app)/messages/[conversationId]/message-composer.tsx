"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { sendMessageAction } from "@/app/(app)/messages/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/validators/form";

/**
 * Xabar yozish maydoni.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ENTER YUBORADI, SHIFT+ENTER YANGI QATOR
 *
 *  Bu messenjerlarda kutiladigan xatti-harakat. Faqat tugma bilan
 *  yuborish chatni sekinlashtiradi.
 *
 *  Lekin `<Textarea>` qoladi (`<input>` emas): uzun xabar va bir necha
 *  qatorli matn normal holat.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function MessageComposer({
  conversationId,
  labels,
}: {
  conversationId: string;
  labels: { placeholder: string; send: string };
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    sendMessageAction,
    IDLE
  );

  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Yuborilgach maydon tozalanadi va fokus qaytadi.
   *
   * `key` orqali qayta yasash ham ishlaydi, lekin u fokusni yo'qotadi
   * va ketma-ket yozishni buzadi.
   */
  useEffect(() => {
    if (state.status !== "success") return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.value = "";
    textarea.style.height = "";
    textarea.focus();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
    >
      <input type="hidden" name="conversationId" value={conversationId} />

      <Textarea
        ref={textareaRef}
        name="body"
        rows={1}
        maxLength={8000}
        placeholder={labels.placeholder}
        required
        // Balandlik matnga qarab o'sadi — bo'sh joyni bekorga
        // egallamasligi kerak.
        onInput={(event) => {
          const el = event.currentTarget;
          el.style.height = "auto";
          // 200px dan oshmasin: undan keyin ichida aylantiriladi.
          el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
        }}
        onKeyDown={(event) => {
          // Shift+Enter — yangi qator, oddiy Enter — yuborish.
          if (event.key !== "Enter" || event.shiftKey) return;

          /**
           * IME (masalan xitoy/yapon klaviaturasi) matn tanlash uchun
           * Enter ishlatadi. `isComposing` bo'lsa yuborilmasligi kerak.
           */
          if (event.nativeEvent.isComposing) return;

          event.preventDefault();

          // Bo'sh xabar yuborilmaydi.
          if (event.currentTarget.value.trim() === "") return;

          formRef.current?.requestSubmit();
        }}
        className="min-h-0 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
      />

      <Button
        type="submit"
        size="icon"
        loading={isPending}
        aria-label={labels.send}
        className="shrink-0"
      >
        <Send className="size-4" strokeWidth={2} aria-hidden />
      </Button>

      {state.status === "error" && state.message && (
        <Alert variant="danger" className="w-full">
          {state.message}
        </Alert>
      )}
    </form>
  );
}
