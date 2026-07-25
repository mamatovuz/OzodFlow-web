import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Logotip.
 *
 * Belgi (ko'k gradientli "OF" monogrammasi) mavjud brend fayli sifatida
 * qoladi — uni SVG'da qaytadan chizish brendni buzish xavfini tug'diradi.
 * Yozuv esa matn: shu tufayli u tema bilan rang almashadi va ekran o'quvchi
 * uni o'qiy oladi.
 *
 * Belgi ikkala temada ham ishlaydi, chunki ko'k gradient oq va to'q fonda
 * bir xil aniq ko'rinadi.
 */

const SIZES = {
  sm: { mark: 26, text: "text-[15px]" },
  md: { mark: 32, text: "text-lg" },
  lg: { mark: 40, text: "text-xl" },
} as const;

export function LogoMark({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const dimension = SIZES[size].mark;

  return (
    <Image
      src="/ozodflow-ikonka-kok.png"
      alt=""
      width={dimension}
      height={dimension}
      // Logotip har sahifada, birinchi ekranda ko'rinadi — kechiktirilmaydi.
      priority
      className={cn("shrink-0 rounded-[7px]", className)}
    />
  );
}

export function Logo({
  size = "md",
  href = "/",
  showText = true,
  className,
}: {
  size?: keyof typeof SIZES;
  /** `null` berilsa havola emas, oddiy blok bo'ladi (footer, auth sahifalar). */
  href?: string | null;
  showText?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <LogoMark size={size} />
      {showText && (
        <span
          className={cn(
            "font-display font-extrabold tracking-[-0.03em] text-foreground",
            SIZES[size].text
          )}
        >
          OzodFlow
        </span>
      )}
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2.5 rounded-lg",
    href && "transition-opacity hover:opacity-80",
    className
  );

  if (!href) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link href={href} className={classes} aria-label="OzodFlow — bosh sahifa">
      {content}
    </Link>
  );
}
