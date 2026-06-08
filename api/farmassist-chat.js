const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REFERER = "https://joitabioseedai.com";
const APP_TITLE = "JOITA FarmAssist AI";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const TEXT_MODEL = "openrouter/free";
const VISION_MODEL = "openrouter/free";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb"
    }
  }
};

const rateLimitStore = globalThis.__joitaFarmAssistRateLimit ?? new Map();
globalThis.__joitaFarmAssistRateLimit = rateLimitStore;

const systemPrompt = `You are FarmAssist AI by JOITA Bioseed AI.

Give short, practical, farmer-friendly crop advisory. Ask for missing crop, location, stage, symptoms, and photo if needed. Never guarantee yield. Never give unsafe pesticide dose. For chemicals, say use locally approved label dose and confirm with KVK or agriculture expert.

Answer format:
Likely Issue:
Immediate Action:
What to Check:
Safe Advisory:
When to Contact Expert:`;

function setCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    "https://joitabioseedai.com",
    "https://www.joitabioseedai.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]);
  const corsOrigin = allowedOrigins.has(origin) ? origin : REFERER;
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function setRateHeaders(res, bucket) {
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT_MAX - bucket.count)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown";
}

function checkRateLimit(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now) rateLimitStore.delete(key);
  }
  const current = rateLimitStore.get(ip);
  if (!current || current.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(ip, bucket);
    return { allowed: true, bucket };
  }
  current.count += 1;
  return { allowed: current.count <= RATE_LIMIT_MAX, bucket: current };
}

function sanitizeLogField(value, fallback = "not provided") {
  const clean = String(value || fallback)
    .replace(/[^\w\s,.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return clean || fallback;
}

function logSafeEvent({ crop, location, problemType, model }) {
  const safeLog = {
    crop: sanitizeLogField(crop),
    locationDistrictState: sanitizeLogField(location),
    problemType: sanitizeLogField(problemType, "general"),
    model: sanitizeLogField(model, "not used"),
    timestamp: new Date().toISOString()
  };
  console.info("[farmassist-chat]", JSON.stringify(safeLog));
}

function fallbackAnswer(message) {
  return {
    ok: false,
    model: "offline-fallback",
    mode: "fallback",
    answer: `Likely Issue:
FarmAssist AI could not reach the live model right now. Based on your question, collect crop, stage, location, symptoms, weather, and a clear leaf/plant photo.

Immediate Action:
Use sanitation, correct irrigation stress, monitor pests, and avoid unnecessary spray.

What to Check:
Check underside of leaves, soil moisture, recent rain, and spread pattern. Question received: ${String(message || "not provided").slice(0, 180)}

Safe Advisory:
Use only locally approved label dose and confirm with local KVK/extension expert.

When to Contact Expert:
If symptoms spread quickly, plants wilt, or fruit/grain damage appears.`
  };
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function estimateDataUrlBytes(imageUrl) {
  if (!imageUrl) return 0;
  if (typeof imageUrl !== "string") return Number.POSITIVE_INFINITY;
  if (!imageUrl.startsWith("data:image/")) return Number.POSITIVE_INFINITY;
  const commaIndex = imageUrl.indexOf(",");
  if (commaIndex === -1) return Number.POSITIVE_INFINITY;
  const base64 = imageUrl.slice(commaIndex + 1).replace(/\s/g, "");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function callOpenRouter({ apiKey, model, userContent, signal }) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": REFERER,
      "X-Title": APP_TITLE
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || response.statusText;
    const error = new Error(`${model}: ${detail}`);
    error.status = response.status;
    throw error;
  }

  const answer = payload?.choices?.[0]?.message?.content;
  if (!answer || typeof answer !== "string") {
    const error = new Error(`${model}: empty answer`);
    error.status = 502;
    throw error;
  }
  return answer.trim();
}

async function handleFarmAssistChat(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const {
    healthCheck = false,
    message = "",
    crop = "",
    location = "",
    stage = "",
    language = "English",
    problemType = "general",
    imageUrl = ""
  } = readBody(req);

  if (healthCheck) {
    const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY);
    return res.status(200).json({
      ok: hasOpenRouterKey,
      model: "health-check",
      mode: "health",
      status: hasOpenRouterKey ? "AI online" : "FarmAssist AI is not configured yet. Add OPENROUTER_API_KEY in Vercel Environment Variables.",
      timestamp: new Date().toISOString()
    });
  }

  const rate = checkRateLimit(req);
  setRateHeaders(res, rate.bucket);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      model: "rate-limited",
      mode: "fallback",
      answer: "FarmAssist AI is receiving many requests. Please try again after one hour."
    });
  }

  const cleanMessage = String(message || "").slice(0, MAX_MESSAGE_LENGTH);
  if (!cleanMessage.trim()) {
    return res.status(400).json({
      ok: false,
      model: "validation",
      mode: "fallback",
      answer: "Please ask a crop question so FarmAssist AI can help."
    });
  }

  if (String(message || "").length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      ok: false,
      model: "validation",
      mode: "fallback",
      answer: "Please keep the FarmAssist question under 1000 characters."
    });
  }

  const imageBytes = estimateDataUrlBytes(imageUrl);
  if (imageBytes > MAX_IMAGE_BYTES) {
    return res.status(400).json({
      ok: false,
      model: "validation",
      mode: "fallback",
      answer: "Please upload a crop image smaller than 4 MB. Personal documents are not accepted."
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      model: "not-configured",
      mode: "fallback",
      answer: "FarmAssist AI is not configured yet. Add OPENROUTER_API_KEY in Vercel Environment Variables."
    });
  }

  const hasImage = Boolean(imageUrl);
  const model = hasImage ? VISION_MODEL : TEXT_MODEL;
  const mode = hasImage ? "vision" : "text";
  const userText = `Crop: ${crop || "not provided"}
Location: ${location || "not provided"}
Stage: ${stage || "not provided"}
Language: ${language || "English"}
Problem type: ${problemType || "general"}
Question: ${cleanMessage}`;

  const userContent = hasImage
    ? [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    : userText;

  const errors = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const answer = await callOpenRouter({ apiKey, model, userContent, signal: controller.signal });
    clearTimeout(timeout);
    logSafeEvent({ crop, location, problemType, model });
    return res.status(200).json({ ok: true, answer, model, mode });
  } catch (error) {
    clearTimeout(timeout);
    errors.push(error);
  }

  const firstError = errors[0];
  const upstreamStatus = typeof firstError?.status === "number" ? firstError.status : 502;
  const answer = upstreamStatus === 401
    ? "FarmAssist AI OpenRouter key is missing or invalid. Check OPENROUTER_API_KEY in Vercel Environment Variables."
    : upstreamStatus === 402 || upstreamStatus === 429
      ? "FarmAssist AI model access is temporarily limited by OpenRouter free-model quota or rate limits."
      : "FarmAssist AI backend reached OpenRouter but did not receive a usable AI answer. Please check Vercel function logs.";
  logSafeEvent({ crop, location, problemType, model });
  return res.status(upstreamStatus).json({
    ok: false,
    answer,
    model,
    mode: "fallback",
    upstreamStatus,
    errors: process.env.NODE_ENV === "development" ? errors : undefined
  });
}

export default async function handler(req, res) {
  try {
    return await handleFarmAssistChat(req, res);
  } catch (error) {
    console.error("[farmassist-chat]", JSON.stringify({
      crop: "not provided",
      locationDistrictState: "not provided",
      problemType: "general",
      model: TEXT_MODEL,
      timestamp: new Date().toISOString()
    }));
    return res.status(500).json({
      ok: false,
      answer: "FarmAssist AI backend error. Please check Vercel function logs.",
      model: TEXT_MODEL,
      mode: "fallback",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined
    });
  }
}
