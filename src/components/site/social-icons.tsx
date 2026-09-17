import { Youtube, Github, Linkedin, Send } from "lucide-react";

type Props = {
  youtube?: string;
  github?: string;
  linkedin?: string;
  telegram?: string;
  className?: string;
};

const items = [
  { key: "youtube", Icon: Youtube, label: "YouTube" },
  { key: "github", Icon: Github, label: "GitHub" },
  { key: "linkedin", Icon: Linkedin, label: "LinkedIn" },
  { key: "telegram", Icon: Send, label: "Telegram" },
] as const;

export function SocialIcons(props: Props) {
  return (
    <div className={`flex items-center gap-2.5 ${props.className || ""}`}>
      {items.map(({ key, Icon, label }) => {
        const href = props[key];
        if (!href) return null;
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Icon className="h-[18px] w-[18px]" />
          </a>
        );
      })}
    </div>
  );
}
