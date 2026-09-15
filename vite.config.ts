import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const RETELL_BASE = "https://api.retellai.com";

function retellDevApi(): Plugin {
  return {
    name: "retell-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/calls")) return next();

        const env = loadEnv(server.config.mode, process.cwd(), "");
        const apiKey = env.RETELL_API_KEY;
        const agentId = env.RETELL_AGENT_ID;

        if (!apiKey || !agentId) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing RETELL_API_KEY or RETELL_AGENT_ID" }));
          return;
        }

        try {
          const url = new URL(req.url, "http://localhost");
          const callId = url.pathname.replace(/^\/api\/calls\/?/, "").replace(/\/$/, "");

          if (callId) {
            const response = await fetch(`${RETELL_BASE}/v2/get-call/${callId}`, {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            const data = await response.json();
            res.statusCode = response.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
            return;
          }

          const limit = Number(url.searchParams.get("limit") || "50");
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
          res.statusCode = response.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(Array.isArray(data) ? { calls: data } : data));
        } catch (error) {
          console.error("Retell proxy error:", error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Failed to fetch calls from Retell" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), retellDevApi()],
  build: {
    outDir: "dist",
  },
});
