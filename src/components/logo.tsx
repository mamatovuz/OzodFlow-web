import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  showText = true,
}: {
  className?: string;
  href?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-semibold", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
        <Image
          src="/ozodflow-logo.png"
          alt="OzodFlow"
          width={32}
          height={32}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      {showText && (
        <span className="text-lg tracking-tight">
          Ozod<span className="text-accent">Flow</span>
        </span>
      )}
    </Link>
  );
}
