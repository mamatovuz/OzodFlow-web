// Taplinkning commonda ochiladigan ko'rinishi (ozodflow.uz/<handle>).
// Server komponent — hook ishlatmaydi.
import { UtensilsCrossed } from "lucide-react";
import { LinkIcon } from "./link-icon";
import {
  parseDesign,
  parseLinks,
  linkHref,
  linkLabel,
  taplinkBgCss,
  FONT_STACK,
  LINK_TYPES,
  type TaplinkDesign,
  type TaplinkLink,
} from "@/lib/taplink";
import { youtubeEmbed } from "@/lib/design";

export type TaplinkViewData = {
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  logo?: string | null;
  videoUrl?: string | null;
  links: string;
  design: string;
  showMenuButton: boolean;
};

function buttonRadius(d: TaplinkDesign): string {
  if (d.buttonShape === "pill") return "9999px";
  if (d.buttonShape === "sharp") return "4px";
  return "14px";
}

function avatarRadius(d: TaplinkDesign): string {
  if (d.avatarShape === "circle") return "9999px";
  if (d.avatarShape === "square") return "8px";
  return "22px";
}

function buttonStyle(d: TaplinkDesign): React.CSSProperties {
  const radius = buttonRadius(d);
  switch (d.buttonFill) {
    case "outline":
      return {
        background: "transparent",
        color: d.buttonColor,
        border: `2px solid ${d.buttonColor}`,
        borderRadius: radius,
      };
    case "soft":
      return {
        background: `${d.buttonColor}22`,
        color: d.buttonColor,
        border: "none",
        borderRadius: radius,
      };
    case "glass":
      return {
        background: "rgba(255,255,255,0.14)",
        color: d.textColor,
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: radius,
        backdropFilter: "blur(8px)",
      };
    case "solid":
    default:
      return {
        background: d.buttonColor,
        color: d.buttonTextColor,
        border: "none",
        borderRadius: radius,
      };
  }
}

export function TaplinkView({
  data,
  menuUrl,
  preview = false,
}: {
  data: TaplinkViewData;
  menuUrl: string;
  preview?: boolean;
}) {
  const d = parseDesign(data.design);
  const links = parseLinks(data.links);
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();

  const bgCss = taplinkBgCss(d);
  const embed = data.videoUrl ? youtubeEmbed(data.videoUrl) : null;
  const isDirectVideo = data.videoUrl && !embed;

  const rootStyle: React.CSSProperties = {
    fontFamily: FONT_STACK[d.font],
    color: d.textColor,
    minHeight: preview ? "100%" : "100dvh",
    ...(d.bgType === "image" && d.bgImage
      ? {}
      : { background: bgCss }),
  };

  function iconColor(link: TaplinkLink): string | undefined {
    if (!d.brandIcons) return undefined;
    if (d.buttonFill === "solid") return undefined; // solidda matn rangi ustun
    return LINK_TYPES[link.type]?.color;
  }

  return (
    <div style={rootStyle} className="relative w-full">
      {/* Fon rasm + overlay */}
      {d.bgType === "image" && d.bgImage && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${d.bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: `rgba(0,0,0,${d.bgOverlay / 100})` }}
          />
        </>
      )}

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center px-5 py-10">
        {/* Logo / avatar */}
        {data.logo ? (
          <img
            src={data.logo}
            alt={data.displayName}
            className="h-28 w-28 object-cover shadow-lg"
            style={{
              borderRadius: avatarRadius(d),
              border: "3px solid rgba(255,255,255,0.25)",
            }}
          />
        ) : (
          <div
            className="flex h-28 w-28 items-center justify-center text-3xl font-bold shadow-lg"
            style={{
              borderRadius: avatarRadius(d),
              background: d.buttonColor,
              color: d.buttonTextColor,
            }}
          >
            {data.displayName?.[0]?.toUpperCase() || "?"}
          </div>
        )}

        {/* Nom */}
        <h1 className="mt-4 text-center text-2xl font-bold" style={{ color: d.textColor }}>
          {data.displayName}
        </h1>
        {fullName && (
          <p className="mt-0.5 text-center text-sm font-medium" style={{ color: d.textColor, opacity: 0.85 }}>
            {fullName}
          </p>
        )}
        {data.bio && (
          <p className="mt-2 max-w-xs text-center text-sm" style={{ color: d.textColor, opacity: 0.8 }}>
            {data.bio}
          </p>
        )}

        {/* Video */}
        {(embed || isDirectVideo) && (
          <div
            className="mt-6 w-full overflow-hidden shadow-lg"
            style={{ borderRadius: buttonRadius(d) === "9999px" ? "20px" : buttonRadius(d) }}
          >
            {embed ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={embed}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="video"
                />
              </div>
            ) : (
              <video src={data.videoUrl!} controls playsInline className="w-full" />
            )}
          </div>
        )}

        {/* Menyu tugmasi (asosiy) */}
        {data.showMenuButton && (
          <a
            href={preview ? undefined : menuUrl}
            target={preview ? undefined : "_blank"}
            rel="noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2.5 px-5 py-4 text-base font-semibold shadow-md transition-transform active:scale-[0.98]"
            style={buttonStyle(d)}
          >
            <UtensilsCrossed className="h-5 w-5" />
            Menyuni ochish
          </a>
        )}

        {/* Tugmalar */}
        <div className="mt-3 flex w-full flex-col gap-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={preview ? undefined : linkHref(link.type, link.value)}
              target={preview || link.type === "phone" || link.type === "email" ? undefined : "_blank"}
              rel="noreferrer"
              className="flex w-full items-center gap-3 px-5 py-3.5 text-base font-medium shadow-md transition-transform active:scale-[0.98]"
              style={buttonStyle(d)}
            >
              <LinkIcon
                type={link.type}
                className="h-5 w-5 shrink-0"
                style={iconColor(link) ? { color: iconColor(link) } : undefined}
              />
              <span className="flex-1 truncate text-left">{linkLabel(link)}</span>
            </a>
          ))}
        </div>

        {/* Footer */}
        <a
          href={preview ? undefined : "https://ozodflow.uz"}
          target={preview ? undefined : "_blank"}
          rel="noreferrer"
          className="mt-10 text-xs opacity-60"
          style={{ color: d.textColor }}
        >
          OzodFlow bilan yaratilgan
        </a>
      </div>
    </div>
  );
}
