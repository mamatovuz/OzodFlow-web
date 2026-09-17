import type { Metadata } from "next";
import { getSiteSetting } from "@/lib/site";
import { SocialIcons } from "@/components/site/social-icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Men haqimda" };

export default async function SiteAbout() {
  const s = await getSiteSetting();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.profileImage}
          alt={s.heroTitle}
          className="h-28 w-28 rounded-full object-cover ring-1 ring-border"
        />
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Men haqimda</h1>
        <SocialIcons
          className="mt-5"
          youtube={s.youtube}
          github={s.github}
          linkedin={s.linkedin}
          telegram={s.telegram}
        />
      </div>

      <div
        className="site-content mt-10"
        dangerouslySetInnerHTML={{ __html: s.aboutHtml || "" }}
      />
    </div>
  );
}
