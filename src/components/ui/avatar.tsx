import Image from "next/image";

import { cn, initials } from "@/lib/utils";

/**
 * Avatar.
 *
 * Rasm bo'lmasa bosh harflar ko'rsatiladi — bu tashqi so'rovni yo'q qiladi
 * va "buzilgan rasm" ikonkasi hech qachon chiqmaydi.
 *
 * Radix'ning `Avatar` komponenti ATAYLAB ishlatilmadi: uning asosiy foydasi
 * rasm yuklanmaganda zaxira ko'rsatish, lekin buning uchun klient JS kerak.
 * Bizda rasm bor-yo'qligi SERVERDA ma'lum, shuning uchun to'g'ri variantni
 * darhol chizamiz — klient kodi umuman kerak emas.
 */

const SIZES = {
  xs: { px: 24, text: "text-[10px]", cls: "size-6" },
  sm: { px: 32, text: "text-xs", cls: "size-8" },
  md: { px: 40, text: "text-sm", cls: "size-10" },
  lg: { px: 56, text: "text-base", cls: "size-14" },
  xl: { px: 96, text: "text-2xl", cls: "size-24" },
} as const;

export type AvatarProps = {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Yashil nuqta — onlayn holati */
  online?: boolean;
};

export function Avatar({
  name,
  src,
  size = "md",
  className,
  online,
}: AvatarProps) {
  const config = SIZES[size];

  const content = src ? (
    <Image
      src={src}
      alt=""
      width={config.px}
      height={config.px}
      className={cn(
        "shrink-0 rounded-full border border-border object-cover",
        config.cls
      )}
    />
  ) : (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-brand font-display font-bold text-white",
        config.cls,
        config.text
      )}
      // Ism yonida matn sifatida ham ko'rsatiladi, shuning uchun bosh
      // harflar ekran o'quvchi uchun ortiqcha shovqin.
      aria-hidden
    >
      {initials(name)}
    </span>
  );

  if (!online) {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {content}
      <span
        className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-success"
        aria-label="Onlayn"
      />
    </span>
  );
}
