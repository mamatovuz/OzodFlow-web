import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-semibold", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M6 4h12a2 2 0 0 1 2 2v3a4 4 0 0 1-4 4h-1v5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-5H8a4 4 0 0 1-4-4V6a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-lg tracking-tight">
        Ozod<span className="text-accent">Flow</span>
      </span>
    </Link>
  );
}
