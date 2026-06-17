import express from "express";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_SITE_DATA, normalizeSiteData } from "../src/lib/site-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 4000);
const defaultDataFile = process.env.RAILWAY_ENVIRONMENT
  ? "/data/site-data.json"
  : "server/data/site-data.json";
const dataFilePath = path.resolve(
  rootDir,
  process.env.SITE_DATA_FILE || defaultDataFile
);
const seedDataFilePath = path.resolve(rootDir, "server/data/site-data.json");
const leadsFilePath = path.resolve(path.dirname(dataFilePath), "leads.json");
const distDir = path.resolve(rootDir, "dist");
const indexHtmlPath = path.resolve(distDir, "index.html");

const adminLogin = process.env.OZODFLOW_ADMIN_LOGIN || "admin";
const adminPassword = process.env.OZODFLOW_ADMIN_PASSWORD || "ozodflow2026";

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
const telegramChatId = process.env.TELEGRAM_CHAT_ID || "";

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const allowedOrigins = (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;

  if (allowedOrigins.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Admin-Password");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

async function readSiteData() {
  try {
    const content = await readFile(dataFilePath, "utf8");
    return normalizeSiteData(JSON.parse(content));
  } catch {
    try {
      const seedContent = await readFile(seedDataFilePath, "utf8");
      return normalizeSiteData(JSON.parse(seedContent));
    } catch {
      return DEFAULT_SITE_DATA;
    }
  }
}

async function writeSiteData(data) {
  const normalized = normalizeSiteData(data);
  await mkdir(path.dirname(dataFilePath), { recursive: true });

  const tempFilePath = `${dataFilePath}.${process.pid}.tmp`;
  await writeFile(tempFilePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await rename(tempFilePath, dataFilePath);

  return normalized;
}

function isAdminPassword(req) {
  return (req.headers["x-admin-password"] || "") === adminPassword;
}

async function appendLead(lead) {
  await mkdir(path.dirname(leadsFilePath), { recursive: true });

  let leads = [];
  try {
    leads = JSON.parse(await readFile(leadsFilePath, "utf8"));
    if (!Array.isArray(leads)) leads = [];
  } catch {
    leads = [];
  }

  leads.push(lead);

  const tempFilePath = `${leadsFilePath}.${process.pid}.tmp`;
  await writeFile(tempFilePath, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await rename(tempFilePath, leadsFilePath);
}

async function sendLeadToTelegram(lead) {
  if (!telegramBotToken || !telegramChatId) return false;

  const lines = [
    "🟢 *Yangi murojaat — OzodFlow*",
    "",
    `👤 *Ism:* ${lead.name}`,
    `📞 *Telefon:* ${lead.phone}`,
    lead.service ? `🧩 *Xizmat:* ${lead.service}` : "",
    lead.message ? `💬 *Xabar:* ${lead.message}` : "",
  ].filter(Boolean);

  const response = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: lines.join("\n"),
        parse_mode: "Markdown",
      }),
    }
  );

  return response.ok;
}

app.get("/api/health", (req, res) => {
  noStore(res);
  res.json({ ok: true });
});

app.post("/api/lead", async (req, res) => {
  noStore(res);

  const name = String(req.body?.name || "").trim().slice(0, 120);
  const phone = String(req.body?.phone || "").trim().slice(0, 40);
  const service = String(req.body?.service || "").trim().slice(0, 120);
  const message = String(req.body?.message || "").trim().slice(0, 1000);

  if (!name || !phone) {
    res.status(400).json({ error: "Ism va telefon majburiy" });
    return;
  }

  const lead = { name, phone, service, message, createdAt: new Date().toISOString() };

  try {
    await appendLead(lead);
  } catch (error) {
    console.error("Lead save failed:", error);
  }

  try {
    await sendLeadToTelegram(lead);
  } catch (error) {
    console.error("Telegram notify failed:", error);
  }

  res.json({ ok: true });
});

app.get("/api/site-data", async (req, res) => {
  noStore(res);
  res.json(await readSiteData());
});

app.post("/api/site-data", (req, res) => {
  noStore(res);

  if (req.body?.login !== adminLogin || req.body?.password !== adminPassword) {
    res.status(401).json({ ok: false });
    return;
  }

  res.json({ ok: true });
});

app.put("/api/site-data", async (req, res) => {
  noStore(res);

  if (!isAdminPassword(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    res.json(await writeSiteData(req.body));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Site data could not be saved" });
  }
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) {
      next();
      return;
    }

    res.sendFile(indexHtmlPath);
  });
}

app.listen(port, () => {
  console.log(`OzodFlow server running on http://localhost:${port}`);
  console.log(`Site data file: ${dataFilePath}`);
});
