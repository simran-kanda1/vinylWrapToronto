import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT || 3000);
const RETELL_BASE = "https://api.retellai.com";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function listCalls(limit) {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;
  if (!apiKey || !agentId) {
    const err = new Error("Missing RETELL_API_KEY or RETELL_AGENT_ID");
    err.status = 500;
    throw err;
  }

  const response = await fetch(`${RETELL_BASE}/v2/list-calls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter_criteria: { agent_id: [agentId] },
      sort_order: "descending",
      limit: Math.min(Math.max(limit, 1), 100),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.message || "Retell list-calls failed");
    err.status = response.status;
    err.body = data;
    throw err;
  }

  return Array.isArray(data) ? { calls: data } : data;
}

async function getCall(callId) {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    const err = new Error("Missing RETELL_API_KEY");
    err.status = 500;
    throw err;
  }

  const response = await fetch(`${RETELL_BASE}/v2/get-call/${callId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.message || "Retell get-call failed");
    err.status = response.status;
    err.body = data;
    throw err;
  }
  return data;
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";

  const filePath = path.normalize(path.join(DIST, rel));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(DIST, "index.html"), (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404).end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(indexData);
      });
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname === "/api/calls") {
      if (req.method !== "GET" && req.method !== "POST") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }
      const limit = Number(url.searchParams.get("limit") || 50);
      const data = await listCalls(limit);
      sendJson(res, 200, data);
      return;
    }

    if (url.pathname.startsWith("/api/calls/")) {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }
      const callId = url.pathname.replace("/api/calls/", "").replace(/\/$/, "");
      if (!callId) {
        sendJson(res, 400, { error: "Missing callId" });
        return;
      }
      const data = await getCall(callId);
      sendJson(res, 200, data);
      return;
    }

    if (url.pathname === "/api/call") {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }
      const callId = url.searchParams.get("callId") || url.searchParams.get("id");
      if (!callId) {
        sendJson(res, 400, { error: "Missing callId" });
        return;
      }
      const data = await getCall(callId);
      sendJson(res, 200, data);
      return;
    }

    serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, error.status || 500, error.body || { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Vinyl Wraps Toronto dashboard listening on :${PORT}`);
});
