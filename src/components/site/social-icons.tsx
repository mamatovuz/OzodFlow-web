import type { SiteLink } from "@/lib/site";
import { iconFor } from "./link-icons";

export function SocialIcons({ links, className }: { links: SiteLink[]; className?: string }) {
  if (!links.length) return null;
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2.5 ${className || ""}`}>
      {links.map((l) => {
        const Icon = iconFor(l.icon);
        return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            aria-label={l.label || l.icon}
            title={l.label || l.icon}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Icon className="h-[18px] w-[18px]" />
          </a>
        );
      })}
    </div>
  );
}
