import { DEFAULT_SITE_DATA, normalizeSiteData } from "../src/lib/site-data.js";

const DATA_PATH = "server/data/site-data.json";

function getConfig() {
  return {
    owner: process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || "mamatovuz",
    repo: process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || "OzodFlow-web",
    branch: process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main",
    token: process.env.OZODFLOW_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    adminLogin: process.env.OZODFLOW_ADMIN_LOGIN || "admin",
    adminPassword: process.env.OZODFLOW_ADMIN_PASSWORD || "ozodflow2026",
  };
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function getGithubHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "OzodFlow-site-data",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function getContentUrl(config) {
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${DATA_PATH}?ref=${encodeURIComponent(
    config.branch
  )}`;
}

function decodeBase64(content) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

function encodeBase64(content) {
  return Buffer.from(content, "utf8").toString("base64");
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

async function fetchGithubFile(config) {
  const response = await fetch(getContentUrl(config), {
    headers: getGithubHeaders(config.token),
  });

  if (response.status === 404) {
    return { data: DEFAULT_SITE_DATA, sha: null };
  }

  if (!response.ok) {
    throw new Error(`GitHub read failed: ${response.status}`);
  }

  const file = await response.json();
  return {
    data: normalizeSiteData(JSON.parse(decodeBase64(file.content || ""))),
    sha: file.sha,
  };
}

async function writeGithubFile(config, data) {
  if (!config.token) {
    const error = new Error("GitHub token is not configured");
    error.status = 503;
    throw error;
  }

  const current = await fetchGithubFile(config);
  const normalized = normalizeSiteData(data);
  const body = {
    message: "Update OzodFlow site data",
    content: encodeBase64(`${JSON.stringify(normalized, null, 2)}\n`),
    branch: config.branch,
  };

  if (current.sha) {
    body.sha = current.sha;
  }

  const response = await fetch(getContentUrl(config).replace(/\?ref=.*/, ""), {
    method: "PUT",
    headers: {
      ...getGithubHeaders(config.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = new Error(`GitHub write failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return normalized;
}

function isAuthorized(config, req, body = {}) {
  const headerPassword = req.headers["x-admin-password"];
  return body.login === config.adminLogin && (body.password || headerPassword) === config.adminPassword;
}

export default async function handler(req, res) {
  const config = getConfig();

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === "GET") {
      const { data } = await fetchGithubFile(config);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === "POST") {
      const body = await parseBody(req);
      if (!isAuthorized(config, req, body)) {
        sendJson(res, 401, { ok: false });
        return;
      }

      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "PUT") {
      const body = await parseBody(req);
      if ((req.headers["x-admin-password"] || "") !== config.adminPassword) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      const saved = await writeGithubFile(config, body);
      sendJson(res, 200, saved);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || "Server error",
    });
  }
}
