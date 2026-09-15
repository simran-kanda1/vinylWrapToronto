export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || !agentId) {
    return res.status(500).json({ error: "Missing RETELL_API_KEY or RETELL_AGENT_ID" });
  }

  try {
    const limit = Number(
      req.query?.limit ||
        (typeof req.body === "object" && req.body?.limit) ||
        50
    );

    const response = await fetch("https://api.retellai.com/v2/list-calls", {
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
      return res.status(response.status).json(data);
    }

    return res.status(200).json(Array.isArray(data) ? { calls: data } : data);
  } catch (error) {
    console.error("list-calls error:", error);
    return res.status(500).json({ error: "Failed to fetch calls from Retell" });
  }
}
