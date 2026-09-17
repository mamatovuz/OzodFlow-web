import type { LucideIcon } from "lucide-react";
import {
  Youtube,
  Github,
  Linkedin,
  Send,
  Instagram,
  Facebook,
  Twitter,
  Globe,
  Mail,
  Phone,
  Music2,
  MessageCircle,
  Twitch,
  Dribbble,
  Figma,
  Rss,
  Link as LinkIcon,
} from "lucide-react";

// Havola uchun tanlanadigan ikonalar. `key` — bazada saqlanadi.
export const SITE_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "telegram", label: "Telegram", Icon: Send },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "github", label: "GitHub", Icon: Github },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "twitter", label: "X / Twitter", Icon: Twitter },
  { key: "tiktok", label: "TikTok", Icon: Music2 },
  { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { key: "twitch", label: "Twitch", Icon: Twitch },
  { key: "dribbble", label: "Dribbble", Icon: Dribbble },
  { key: "figma", label: "Figma", Icon: Figma },
  { key: "website", label: "Vebsayt", Icon: Globe },
  { key: "email", label: "Email", Icon: Mail },
  { key: "phone", label: "Telefon", Icon: Phone },
  { key: "rss", label: "RSS", Icon: Rss },
  { key: "link", label: "Havola", Icon: LinkIcon },
];

const MAP: Record<string, LucideIcon> = Object.fromEntries(
  SITE_ICONS.map((i) => [i.key, i.Icon])
);

export function iconFor(key: string): LucideIcon {
  return MAP[key] || LinkIcon;
}
