// Link turini lucide ikonkaga bog'laydi. Server va client'da ishlaydi.
import {
  Phone,
  Send,
  Instagram,
  MessageCircle,
  Globe,
  MapPin,
  Youtube,
  Facebook,
  Mail,
  Music2,
  Link2,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { LinkType } from "@/lib/taplink";

const MAP: Record<string, LucideIcon> = {
  phone: Phone,
  telegram: Send,
  instagram: Instagram,
  whatsapp: MessageCircle,
  website: Globe,
  location: MapPin,
  youtube: Youtube,
  facebook: Facebook,
  email: Mail,
  tiktok: Music2,
  link: Link2,
  custom: Link2,
  menu: UtensilsCrossed,
};

export function iconFor(key: LinkType | string): LucideIcon {
  return MAP[key] ?? Link2;
}

export function LinkIcon({
  type,
  className,
  style,
}: {
  type: LinkType | string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = iconFor(type);
  return <Icon className={className} style={style} />;
}
