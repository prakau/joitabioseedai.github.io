function setCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    "https://joitabioseedai.com",
    "https://www.joitabioseedai.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]);
  res.setHeader("Access-Control-Allow-Origin", allowedOrigins.has(origin) ? origin : "https://joitabioseedai.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  return res.status(200).json({
    ok: true,
    service: "JOITA FarmAssist API",
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    timestamp: new Date().toISOString()
  });
}
