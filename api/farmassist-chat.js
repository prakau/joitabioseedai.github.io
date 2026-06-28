const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openrouter/free";
const REFERER = "https://joitabioseedai.com";
const APP_TITLE = "JOITA FarmAssist AI";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const PROVIDER_TIMEOUT_MS = 18000;
const DEFAULT_MESSAGE = "Hi. Please give quick practical crop checks for my farm.";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb"
    }
  }
};

const rateLimitStore = globalThis.__joitaFarmAssistRateLimit ?? new Map();
globalThis.__joitaFarmAssistRateLimit = rateLimitStore;

const systemPrompt = "You are FarmAssist AI by JOITA Bioseed AI. Give complete, practical, farmer-friendly crop advisory in the requested language. Never guarantee yield. Never give unsafe pesticide dose. For chemicals say use locally approved label dose and confirm with KVK/agriculture expert.";

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
  res.setHeader("Cache-Control", "no-store");
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

function safeProviderError(provider, error) {
  return {
    provider,
    statusCode: typeof error?.statusCode === "number" ? error.statusCode : null,
    message: sanitizeLogField(error?.message || String(error || "unknown provider error"), "unknown provider error")
  };
}

function logSafeEvent({ crop, location, problemType, model, source, status = "ok" }) {
  const safeLog = {
    crop: sanitizeLogField(crop),
    locationDistrictState: sanitizeLogField(location),
    problemType: sanitizeLogField(problemType, "general"),
    model: sanitizeLogField(model, "not used"),
    source: sanitizeLogField(source, "not used"),
    status: sanitizeLogField(status, "ok"),
    timestamp: new Date().toISOString()
  };
  console.info("[farmassist-chat]", JSON.stringify(safeLog));
}

function logProviderFailure(provider, error, context) {
  console.error("[farmassist-chat-provider-failed]", JSON.stringify({
    ...safeProviderError(provider, error),
    crop: sanitizeLogField(context.crop),
    locationDistrictState: sanitizeLogField(context.location),
    problemType: sanitizeLogField(context.problemType, "general"),
    timestamp: new Date().toISOString()
  }));
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

function buildUserPrompt({ crop, location, stage, language, problemType, message }) {
  return `SYSTEM: ${systemPrompt}

USER: Crop: ${crop || "not provided"}
Location: ${location || "not provided"}
Stage: ${stage || "not provided"}
Language: ${language || "English"}
Problem type: ${problemType || "general"}
Question: ${message}

Return a complete answer with these short sections:
Likely causes
What to check today
Immediate safe actions
When to contact KVK/agriculture expert`;
}

function withTimeout() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  return {
    signal: controller.signal,
    done: () => clearTimeout(timeout)
  };
}

async function readJsonResponse(response) {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
}

function providerError(provider, statusCode, message) {
  const error = new Error(`${provider}: ${message}`);
  error.statusCode = statusCode;
  return error;
}

function isCompleteAnswer(answer) {
  const clean = String(answer || "").replace(/\s+/g, " ").trim();
  if (clean.length < 120) return false;
  const lower = clean.toLowerCase();
  const incompleteEndings = [" due", " because", " and", " or", " to", " with", " for", " can be", " may be", " include"];
  if (incompleteEndings.some((ending) => lower.endsWith(ending))) return false;
  return /[.!?)]$/.test(clean);
}

async function callGemini({ apiKey, prompt }) {
  if (!apiKey) throw providerError("gemini", null, "GEMINI_API_KEY not configured");
  const timeout = withTimeout();
  try {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      signal: timeout.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      })
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw providerError("gemini", response.status, payload?.error?.message || payload?.message || response.statusText);
    }
    const parts = payload?.candidates?.[0]?.content?.parts;
    const answer = Array.isArray(parts)
      ? parts.map((part) => part?.text).filter(Boolean).join("\n").trim()
      : "";
    if (!answer) throw providerError("gemini", 502, "empty answer");
    if (!isCompleteAnswer(answer)) throw providerError("gemini", 502, "incomplete answer");
    return answer;
  } catch (error) {
    if (error?.name === "AbortError") throw providerError("gemini", 504, "request timed out");
    throw error;
  } finally {
    timeout.done();
  }
}

async function callOpenRouter({ apiKey, prompt }) {
  if (!apiKey) throw providerError("openrouter", null, "OPENROUTER_API_KEY not configured");
  const timeout = withTimeout();
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: timeout.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": REFERER,
        "X-Title": APP_TITLE
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw providerError("openrouter", response.status, payload?.error?.message || payload?.message || response.statusText);
    }
    const answer = payload?.choices?.[0]?.message?.content;
    if (!answer || typeof answer !== "string") throw providerError("openrouter", 502, "empty answer");
    const cleanAnswer = answer.trim();
    if (!isCompleteAnswer(cleanAnswer)) throw providerError("openrouter", 502, "incomplete answer");
    return cleanAnswer;
  } catch (error) {
    if (error?.name === "AbortError") throw providerError("openrouter", 504, "request timed out");
    throw error;
  } finally {
    timeout.done();
  }
}

function offlineTopicGuidance({ message, crop, stage }) {
  const text = `${message} ${crop} ${stage}`.toLowerCase();
  if (text.includes("tomato") && (text.includes("curl") || text.includes("yellow"))) {
    return "Likely causes can include whitefly-transmitted leaf curl, sucking pests, nutrient imbalance, water stress, or herbicide drift. Start by checking leaf underside for whitefly/mites, whether new leaves are curled, and whether yellowing is uniform or patchy.";
  }
  if (text.includes("mustard") && text.includes("flower")) {
    return "At flowering, check aphids on tender shoots and inflorescences, Alternaria spots, powdery growth, irrigation stress, and sulphur/boron-related flower retention issues.";
  }
  if (text.includes("wheat") && (text.includes("heat") || text.includes("hot") || text.includes("dry"))) {
    return "For wheat under heat or dry wind, check soil moisture in the root zone, leaf rolling, terminal heat symptoms, and whether irrigation can be timed during cooler hours.";
  }
  if (text.includes("cotton") && (text.includes("whitefly") || text.includes("white insects"))) {
    return "For cotton white insects, check the underside of leaves for whitefly adults/nymphs, honeydew, sooty mould, and yellowing patches. Use field scouting before any spray decision.";
  }
  if (text.includes("hi") || text.includes("hello")) {
    return "FarmAssist is ready. Share crop, location, stage, and the symptom you see. Meanwhile, check soil moisture, leaf underside, new growth, pest count, disease spots, and recent weather stress.";
  }
  return "Start with field scouting: check soil moisture, leaf underside, new growth, pest count, disease spots, recent weather stress, and whether the issue is spreading in patches or across the field.";
}

function offlineKbAnswer({ message, crop, location, stage }) {
  return `Likely Issue:
Live AI could not answer right now. For ${crop || "the crop"} at ${stage || "the current stage"} in ${location || "your area"}, use this immediate JOITA offline advisory.

Field Clue:
${offlineTopicGuidance({ message, crop, stage })}

Immediate Action:
Check soil moisture, leaf underside, new growth, flower/pod condition, pest count, disease spots, and recent weather stress. Avoid unnecessary spray.

What to Check:
Question received: ${String(message || "not provided").slice(0, 180)}

Safe Advisory:
Use only locally approved label dose and confirm pesticide/fertilizer use with local KVK or agriculture expert.

When to Contact Expert:
Contact an expert if symptoms spread quickly, plants wilt, flowering/pod set is affected, or pest pressure increases.`;
}

function failureSummary(errors) {
  return errors.map((error) => {
    const safe = safeProviderError(error.provider, error.error);
    const status = safe.statusCode ? `status ${safe.statusCode}` : "not available";
    return `${safe.provider} ${status}: ${safe.message}`;
  }).join("; ");
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
    message = "",
    crop = "",
    location = "",
    stage = "",
    language = "English",
    problemType = "general",
    imageUrl = ""
  } = readBody(req);

  const rawMessage = String(message || "");
  if (rawMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      ok: false,
      answer: "Please keep the FarmAssist question under 1000 characters.",
      source: "validation",
      model: "validation",
      mode: "fallback",
      failureReason: "Message length exceeded 1000 characters."
    });
  }

  const cleanMessage = rawMessage.trim() ? rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH) : DEFAULT_MESSAGE;

  const rate = checkRateLimit(req);
  setRateHeaders(res, rate.bucket);
  if (!rate.allowed) {
    return res.status(429).json({
      ok: false,
      answer: `${offlineKbAnswer({ message: cleanMessage, crop, location, stage })}

Rate limit note:
Live AI is limited to 10 requests per IP per hour, so this answer came from the JOITA offline knowledge base.`,
      source: "offline_kb",
      model: "rate-limited",
      mode: "fallback",
      failureReason: "Rate limit exceeded: max 10 requests per IP per hour."
    });
  }

  const imageBytes = estimateDataUrlBytes(imageUrl);
  if (imageBytes > MAX_IMAGE_BYTES) {
    return res.status(400).json({
      ok: false,
      answer: "Please upload a crop image smaller than 4 MB. Personal documents are not accepted.",
      source: "validation",
      model: "validation",
      mode: "fallback"
    });
  }

  const prompt = buildUserPrompt({ crop, location, stage, language, problemType, message: cleanMessage });
  const providerErrors = [];

  try {
    const answer = await callGemini({ apiKey: process.env.GEMINI_API_KEY, prompt });
    logSafeEvent({ crop, location, problemType, model: GEMINI_MODEL, source: "gemini" });
    return res.status(200).json({
      ok: true,
      answer,
      source: "gemini",
      model: GEMINI_MODEL,
      mode: "text"
    });
  } catch (error) {
    providerErrors.push({ provider: "gemini", error });
    logProviderFailure("gemini", error, { crop, location, problemType });
  }

  try {
    const answer = await callOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY, prompt });
    logSafeEvent({ crop, location, problemType, model: OPENROUTER_MODEL, source: "openrouter" });
    return res.status(200).json({
      ok: true,
      answer,
      source: "openrouter",
      model: OPENROUTER_MODEL,
      mode: "text"
    });
  } catch (error) {
    providerErrors.push({ provider: "openrouter", error });
    logProviderFailure("openrouter", error, { crop, location, problemType });
  }

  const failureReason = failureSummary(providerErrors);
  logSafeEvent({ crop, location, problemType, model: "offline-kb", source: "offline_kb", status: "provider-fallback" });
  return res.status(200).json({
    ok: false,
    answer: offlineKbAnswer({ message: cleanMessage, crop, location, stage }),
    source: "offline_kb",
    model: "offline-kb",
    mode: "fallback",
    failureReason,
    errorDebug: process.env.NODE_ENV === "production" ? undefined : providerErrors.map((item) => safeProviderError(item.provider, item.error))
  });
}

export default async function handler(req, res) {
  try {
    return await handleFarmAssistChat(req, res);
  } catch (error) {
    const body = readBody(req);
    const message = String(body?.message || "").trim() || DEFAULT_MESSAGE;
    console.error("[farmassist-chat-unhandled]", JSON.stringify({
      message: sanitizeLogField(error?.message || String(error || "unknown error"), "unknown error"),
      timestamp: new Date().toISOString()
    }));
    return res.status(500).json({
      ok: false,
      answer: offlineKbAnswer({
        message,
        crop: body?.crop,
        location: body?.location,
        stage: body?.stage
      }),
      source: "offline_kb",
      model: "backend-error",
      mode: "fallback",
      failureReason: "Unhandled backend error.",
      errorDebug: process.env.NODE_ENV === "production" ? undefined : String(error)
    });
  }
}
