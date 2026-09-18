import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSiteAdmin, siteBase, getSiteSetting, parseLinks, parseNavButtons, parseTags } from "@/lib/site";
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
    navButtons: parseNavButtons(settings.navButtons),
    metaTitle: settings.metaTitle,
    metaDescription: settings.metaDescription,
    ogImage: settings.ogImage || "",
    favicon: settings.favicon || "",
    siteName: settings.siteName,
  };

  const initialPosts = posts.map((p) => ({
    ...JSON.parse(JSON.stringify(p)),
    tags: parseTags(p.tags),
  }));

  return <PanelClient base={base} initialPosts={initialPosts} initialSettings={initialSettings} />;
}
