const voices = {
  English: "en-IN", Hindi: "hi-IN", Haryanvi: "hi-IN", Punjabi: "pa-IN",
  Marathi: "mr-IN", Gujarati: "gu-IN", Bengali: "bn-IN", Tamil: "ta-IN",
  Telugu: "te-IN", Kannada: "kn-IN", Malayalam: "ml-IN", Urdu: "ur-IN",
};
const limits = globalThis.__joitaSpeechRateLimit ?? new Map();
globalThis.__joitaSpeechRateLimit = limits;
export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

// Google limits individual synthesis requests by UTF-8 bytes, not characters.
export function splitSpeechText(text) {
  const parts = [];
  let part = "";
  for (const word of text.split(/(\s+)/u)) {
    if (Buffer.byteLength(part + word, "utf8") <= 4500) {
      part += word;
      continue;
    }
    if (part) parts.push(part);
    part = "";
    for (const letter of word) {
      if (Buffer.byteLength(part + letter, "utf8") > 4500) {
        parts.push(part);
        part = "";
      }
      part += letter;
    }
  }
  if (part.trim()) parts.push(part);
  return parts;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.headers?.origin;
  const origins = new Set([
    "https://www.joitabioseedai.com", "https://joitabioseedai.com",
    "http://localhost:5173", "http://127.0.0.1:5173",
    ...[process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host => `https://${host}`),
  ]);
  if (origin && !origins.has(origin)) return res.status(403).json({ ok: false, error: "This origin is not allowed." });
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }
  if (!req.headers?.["content-type"]?.toLowerCase().startsWith("application/json"))
    return res.status(415).json({ ok: false, error: "Send a JSON request." });
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ ok: false, error: "Invalid JSON." }); }
  if (!body || typeof body.text !== "string" || !body.text.trim() || typeof body.language !== "string")
    return res.status(400).json({ ok: false, error: "An answer and its language are required." });
  if (Buffer.byteLength(body.text, "utf8") > 18000)
    return res.status(413).json({ ok: false, error: "This answer is too long for cloud speech. Use device read-aloud." });
  if (!Object.hasOwn(voices, body.language))
    return res.status(422).json({ ok: false, error: "Google speech is not available for this language. Use a matching device voice." });
  if (!process.env.GOOGLE_TTS_API_KEY)
    return res.status(503).json({ ok: false, error: "Google speech is not configured. Use device read-aloud." });

  // Instance-local protection; Google project quotas remain the cross-instance cap.
  const now = Date.now();
  for (const [key, value] of limits) if (value.resetAt <= now) limits.delete(key);
  const ip = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const bucket = limits.get(ip) || { count: 0, resetAt: now + 3600000 };
  limits.set(ip, bucket);
  if (++bucket.count > 10) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ ok: false, error: "Cloud read-aloud limit reached. Use device read-aloud or retry later." });
  }
  const languageCode = voices[body.language];
  const voice = `${languageCode}-Standard-A`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const audioParts = [];
    for (const text of splitSpeechText(body.text.trim())) {
      const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_TTS_API_KEY },
        body: JSON.stringify({ input: { text }, voice: { languageCode, name: voice }, audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 } }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.audioContent !== "string" || !data.audioContent) {
        console.warn(JSON.stringify({ service: "farmassist-speech", providerStatus: response.status, language: body.language, timestamp: new Date().toISOString() }));
        return res.status(response.status === 429 ? 429 : 502).json({ ok: false, providerStatus: response.status, error: "Google speech is temporarily unavailable. Use device read-aloud." });
      }
      audioParts.push(data.audioContent);
    }
    return res.status(200).json({ ok: true, source: "google_tts", contentType: "audio/mpeg", language: body.language, voice, audioParts });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.warn(JSON.stringify({ service: "farmassist-speech", reason: timedOut ? "timeout" : "connection_error", language: body.language, timestamp: new Date().toISOString() }));
    return res.status(timedOut ? 504 : 502).json({ ok: false, error: "Google speech could not finish. Use device read-aloud or retry." });
  } finally { clearTimeout(timeout); }
}
