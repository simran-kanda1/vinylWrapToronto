export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RETELL_API_KEY;
  const callId = req.query?.callId || req.query?.id;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing RETELL_API_KEY" });
  }
  if (!callId || typeof callId !== "string") {
    return res.status(400).json({ error: "Missing callId" });
  }

  try {
    const response = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("get-call error:", error);
    return res.status(500).json({ error: "Failed to fetch call from Retell" });
  }
}
