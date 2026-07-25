"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { Input, type InputProps } from "@/components/ui/input";
import {
  checkPasswordStrength,
  passwordScoreLabel,
} from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";

/**
 * Parol maydoni — ko'rsatish/yashirish tugmasi bilan.
 *
 * "Ko'rsatish" tugmasi ATAYLAB bor: parolni ko'rmasdan yozish xatolarga
 * olib keladi va odamlar natijada oddiyroq parol tanlaydi. Ko'rish
 * imkoniyati aksincha kuchli parol qo'yishga yordam beradi.
 */
export function PasswordInput({ className, ...props }: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />

      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        // `tabIndex={-1}` — Tab bilan yurganda bu tugma parol maydoni va
        // "Kirish" tugmasi orasiga tushib, oqimni uzmasligi kerak.
        tabIndex={-1}
        aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        {visible ? (
          <EyeOff className="size-[18px]" strokeWidth={1.75} aria-hidden />
        ) : (
          <Eye className="size-[18px]" strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </div>
  );
}

/**
 * Yangi parol maydoni — mustahkamlik ko'rsatkichi bilan.
 *
 * Ko'rsatkich foydalanuvchi yozayotganda yangilanadi. Muhim detal:
 * kamchiliklar ro'yxati ham ko'rsatiladi, faqat "zaif" degan baho emas —
 * aks holda nimani tuzatish kerakligi tushunarsiz qoladi.
 */
export function NewPasswordInput({ className, ...props }: InputProps) {
  const [value, setValue] = useState("");
  const meterId = useId();

  const check = value.length > 0 ? checkPasswordStrength(value) : null;

  const barColors = [
    "bg-destructive",
    "bg-destructive",
    "bg-warning",
    "bg-success",
    "bg-success",
  ];

  return (
    <div className="flex flex-col gap-2">
      <PasswordInput
        {...props}
        className={className}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          props.onChange?.(event);
        }}
        aria-describedby={
          check ? [props["aria-describedby"], meterId].filter(Boolean).join(" ") : props["aria-describedby"]
        }
      />

      {check && (
        <div id={meterId}>
          {/* Ko'rsatkich chizig'i: 4 bo'lak */}
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  index < check.score ? barColors[check.score] : "bg-border"
                )}
              />
            ))}
          </div>

          {/* Ekran o'quvchi uchun matnli baho */}
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Mustahkamlik:{" "}
            <span
              className={cn(
                "font-medium",
                check.score >= 3
                  ? "text-success"
                  : check.score >= 2
                    ? "text-warning"
                    : "text-destructive"
              )}
            >
              {passwordScoreLabel(check.score)}
            </span>
          </p>

          {check.problems.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5">
              {check.problems.map((problem) => (
                <li key={problem} className="text-[13px] leading-snug text-muted-foreground">
                  • {problem}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
