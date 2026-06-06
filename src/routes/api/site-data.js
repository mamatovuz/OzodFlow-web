import { createFileRoute } from "@tanstack/react-router";

import { DEFAULT_SITE_DATA, normalizeSiteData } from "@/lib/site-data";

export const Route = createFileRoute("/api/site-data")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(await readSiteData());
      },
      PUT: async ({ request }) => {
        const payload = await request.json();
        return Response.json(await writeSiteData(payload));
      },
    },
  },
});

async function getDataFilePath() {
  const path = await import("node:path");
  return path.resolve(process.cwd(), "server/data/site-data.json");
}

async function readSiteData() {
  const { readFile } = await import("node:fs/promises");

  try {
    const content = await readFile(await getDataFilePath(), "utf8");
    return normalizeSiteData(JSON.parse(content));
  } catch {
    return DEFAULT_SITE_DATA;
  }
}

async function writeSiteData(data) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const dataFilePath = await getDataFilePath();
  const normalized = normalizeSiteData(data);

  await mkdir(path.dirname(dataFilePath), { recursive: true });
  await writeFile(dataFilePath, `${JSON.stringify(normalized, null, 2)}\n`);

  return normalized;
}
