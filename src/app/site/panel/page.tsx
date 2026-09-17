import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSiteAdmin, siteBase, getSiteSetting, parseLinks } from "@/lib/site";
import { PanelClient } from "@/components/site/panel-client";

export const dynamic = "force-dynamic";

export default async function SitePanel() {
  const base = await siteBase();
  if (!(await isSiteAdmin())) redirect(`${base}/panel/login`);

  const [posts, settings] = await Promise.all([
    prisma.sitePost.findMany({ orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }] }),
    getSiteSetting(),
  ]);

  const initialSettings = {
    heroTitle: settings.heroTitle,
    heroRole: settings.heroRole,
    heroTagline: settings.heroTagline,
    heroImage: settings.heroImage,
    profileImage: settings.profileImage,
    aboutHtml: settings.aboutHtml,
    channel: settings.channel,
    links: parseLinks(settings.links),
  };

  return (
    <PanelClient
      base={base}
      initialPosts={JSON.parse(JSON.stringify(posts))}
      initialSettings={initialSettings}
    />
  );
}
