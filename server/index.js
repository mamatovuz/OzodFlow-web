import express from "express";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SITE_DATA,
  normalizeSiteData,
  normalizeWorkspace,
  normalizeLeads,
} from "../src/lib/site-data.js";

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
const dataDir = path.dirname(dataFilePath);
const seedDataFilePath = path.resolve(rootDir, "server/data/site-data.json");
const leadsFilePath = path.resolve(dataDir, "leads.json");
const workspaceFilePath = path.resolve(dataDir, "workspace.json");
const adminCredsFilePath = path.resolve(dataDir, "admin.json");
const uploadsDir = path.resolve(dataDir, "uploads");
const distDir = path.resolve(rootDir, "dist");
const indexHtmlPath = path.resolve(distDir, "index.html");

const defaultAdminLogin = process.env.OZODFLOW_ADMIN_LOGIN || "admin";
const defaultAdminPassword = process.env.OZODFLOW_ADMIN_PASSWORD || "ozodflow2026";

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
const telegramChatId = process.env.TELEGRAM_CHAT_ID || "";

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "12mb" }));

// Simple in-memory rate limiter (per IP, sliding window).
const leadHits = new Map();
const LEAD_WINDOW_MS = 10 * 60 * 1000;
const LEAD_MAX = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (leadHits.get(ip) || []).filter((time) => now - time < LEAD_WINDOW_MS);
  if (hits.length >= LEAD_MAX) {
    leadHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  leadHits.set(ip, hits);
  return false;
}

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

async function readAdminCreds() {
  try {
    const content = JSON.parse(await readFile(adminCredsFilePath, "utf8"));
    return {
      login: content.login || defaultAdminLogin,
      password: content.password || defaultAdminPassword,
    };
  } catch {
    return { login: defaultAdminLogin, password: defaultAdminPassword };
  }
}

async function writeAdminCreds(creds) {
  await mkdir(dataDir, { recursive: true });
  const tempFilePath = `${adminCredsFilePath}.${process.pid}.tmp`;
  await writeFile(tempFilePath, `${JSON.stringify(creds, null, 2)}\n`, "utf8");
  await rename(tempFilePath, adminCredsFilePath);
}

async function isAdminRequest(req) {
  const creds = await readAdminCreds();
  return (req.headers["x-admin-password"] || "") === creds.password;
}

const UPLOAD_MIME_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

async function saveUpload(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) {
    throw new Error("Invalid image data");
  }

  const mime = match[1];
  const ext = UPLOAD_MIME_EXT[mime];
  if (!ext) {
    throw new Error("Unsupported image type");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("Image too large");
  }

  await mkdir(uploadsDir, { recursive: true });
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(uploadsDir, fileName), buffer);

  return `/uploads/${fileName}`;
}

async function readLeads() {
  try {
    const leads = JSON.parse(await readFile(leadsFilePath, "utf8"));
    return Array.isArray(leads) ? leads : [];
  } catch {
    return [];
  }
}

async function writeLeads(leads) {
  await mkdir(dataDir, { recursive: true });
  const tempFilePath = `${leadsFilePath}.${process.pid}.tmp`;
  await writeFile(tempFilePath, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await rename(tempFilePath, leadsFilePath);
}

async function appendLead(lead) {
  const leads = await readLeads();
  leads.push(lead);
  await writeLeads(leads);
}

async function readWorkspace() {
  try {
    return normalizeWorkspace(JSON.parse(await readFile(workspaceFilePath, "utf8")));
  } catch {
    return normalizeWorkspace(null);
  }
}

async function writeWorkspace(data) {
  const normalized = normalizeWorkspace(data);
  await mkdir(dataDir, { recursive: true });
  const tempFilePath = `${workspaceFilePath}.${process.pid}.tmp`;
  await writeFile(tempFilePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await rename(tempFilePath, workspaceFilePath);
  return normalized;
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

  // Honeypot: bots fill hidden fields. Pretend success, drop silently.
  if (String(req.body?.website || "").trim()) {
    res.json({ ok: true });
    return;
  }

  if (isRateLimited(req.ip)) {
    res.status(429).json({ error: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring." });
    return;
  }

  const name = String(req.body?.name || "").trim().slice(0, 120);
  const phone = String(req.body?.phone || "").trim().slice(0, 40);
  const service = String(req.body?.service || "").trim().slice(0, 120);
  const message = String(req.body?.message || "").trim().slice(0, 1000);

  if (!name || !phone) {
    res.status(400).json({ error: "Ism va telefon majburiy" });
    return;
  }

  const lead = {
    id: `lead-${Date.now()}-${randomBytes(3).toString("hex")}`,
    status: "new",
    name,
    phone,
    service,
    message,
    createdAt: new Date().toISOString(),
  };

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

app.post("/api/site-data", async (req, res) => {
  noStore(res);

  const creds = await readAdminCreds();
  if (req.body?.login !== creds.login || req.body?.password !== creds.password) {
    res.status(401).json({ ok: false });
    return;
  }

  res.json({ ok: true });
});

app.put("/api/site-data", async (req, res) => {
  noStore(res);

  if (!(await isAdminRequest(req))) {
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

app.post("/api/upload", async (req, res) => {
  noStore(res);

  if (!(await isAdminRequest(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const url = await saveUpload(req.body?.dataUrl);
    res.json({ url });
  } catch (error) {
    console.error("Upload failed:", error);
    res.status(400).json({ error: error.message || "Upload failed" });
  }
});

app.get("/api/leads", async (req, res) => {
  noStore(res);
  if (!(await isAdminRequest(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(normalizeLeads(await readLeads()));
});

app.put("/api/leads", async (req, res) => {
  noStore(res);
  if (!(await isAdminRequest(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const leads = normalizeLeads(req.body);
    await writeLeads(leads);
    res.json(leads);
  } catch (error) {
    console.error("Leads save failed:", error);
    res.status(500).json({ error: "Leads could not be saved" });
  }
});

app.get("/api/workspace", async (req, res) => {
  noStore(res);
  if (!(await isAdminRequest(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(await readWorkspace());
});

app.put("/api/workspace", async (req, res) => {
  noStore(res);
  if (!(await isAdminRequest(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    res.json(await writeWorkspace(req.body));
  } catch (error) {
    console.error("Workspace save failed:", error);
    res.status(500).json({ error: "Workspace could not be saved" });
  }
});

app.put("/api/admin-credentials", async (req, res) => {
  noStore(res);

  if (!(await isAdminRequest(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const login = String(req.body?.login || "").trim();
  const password = String(req.body?.password || "");

  if (login.length < 3) {
    res.status(400).json({ error: "Login kamida 3 ta belgidan iborat bo'lsin" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lsin" });
    return;
  }

  try {
    await writeAdminCreds({ login, password });
    res.json({ ok: true, login });
  } catch (error) {
    console.error("Credentials update failed:", error);
    res.status(500).json({ error: "Saqlab bo'lmadi" });
  }
});

app.use("/uploads", express.static(uploadsDir, { maxAge: "7d" }));

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
