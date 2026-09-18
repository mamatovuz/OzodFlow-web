import type { Metadata } from "next";
import { getSiteSetting, parseLinks } from "@/lib/site";
import { SocialIcons } from "@/components/site/social-icons";
import { ContactForm } from "@/components/site/contact-form";
import { SubscribeForm } from "@/components/site/subscribe-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Men haqimda" };

export default async function SiteAbout() {
  const s = await getSiteSetting();
  const links = parseLinks(s.links);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.profileImage}
          alt={s.heroTitle}
          className="h-24 w-24 rounded-full object-cover ring-1 ring-border"
        />
        <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Men haqimda</h1>
        {s.heroRole && <p className="mt-1 text-sm text-muted">{s.heroRole}</p>}
      </div>

      <div className="site-content mt-10" dangerouslySetInnerHTML={{ __html: s.aboutHtml || "" }} />

      {links.length > 0 && (
        <div className="mt-12 border-t border-border pt-8">
          <p className="mb-4 text-center text-sm text-muted">Ijtimoiy tarmoqlar</p>
          <SocialIcons links={links} />
        </div>
      )}

      {/* Obuna */}
      <div className="mt-12">
        <SubscribeForm channel={s.channel} />
      </div>

      {/* Bog'lanish */}
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
