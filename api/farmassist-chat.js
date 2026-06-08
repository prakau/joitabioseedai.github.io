const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REFERER = "https://joitabioseedai.com";
const APP_TITLE = "JOITA FarmAssist AI";

const textModels = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "openrouter/free"
];

const visionModels = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "openrouter/free"
];

const systemPrompt = `You are FarmAssist AI by JOITA Bioseed AI.

Your role:
Help farmers, FPOs, field workers, and agri-input advisors with practical crop-stage-based agricultural guidance.

Tone:
Simple, farmer-friendly, short, practical, and field-ready.

Core rules:
* Ask for missing crop, location, crop stage, symptoms, weather, and photo when needed.
* For image diagnosis, never claim certainty. Say "likely issue" or "possible causes."
* First describe visible symptoms.
* Then give likely causes.
* Then give immediate safe action.
* Then ask what to check next.
* Never guarantee yield increase.
* Never recommend banned chemicals.
* Never give unsafe pesticide dosage.
* For pesticides, herbicides, fungicides, or fertilizer dose, say: "Use only locally approved label dose and confirm with local KVK/extension expert."
* Prefer IPM: sanitation, monitoring, irrigation correction, nutrition correction, biological options, and only then chemical escalation if needed.
* Do not overpromote JOITA.
* Mention JOITA products only softly when relevant: "BioSynth Nano may be considered as stress/nutrition support under expert guidance."
* If user asks in Hindi, reply in simple Hindi.
* If user asks in Haryanvi style, reply in simple farmer-friendly Hindi/Haryanvi mix.
* Keep response under 180 words unless user asks for detailed plan.

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
      max_tokens: 700
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || response.statusText;
    throw new Error(`${model}: ${detail}`);
  }

  const answer = payload?.choices?.[0]?.message?.content;
  if (!answer || typeof answer !== "string") {
    throw new Error(`${model}: empty answer`);
  }
  return answer.trim();
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      model: "not-configured",
      mode: "fallback",
      answer: "FarmAssist AI is not configured. Missing OPENROUTER_API_KEY."
    });
  }

  const {
    message = "",
    crop = "",
    location = "",
    stage = "",
    language = "English",
    problemType = "general",
    imageUrl = ""
  } = req.body || {};

  const hasImage = Boolean(imageUrl);
  const models = hasImage ? visionModels : textModels;
  const mode = hasImage ? "vision" : "text";
  const userText = `Farmer question: ${message}
Crop: ${crop || "not provided"}
Location: ${location || "not provided"}
Crop stage: ${stage || "not provided"}
Language: ${language || "English"}
Problem type: ${problemType || "general"}`;

  const userContent = hasImage
    ? [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    : userText;

  const errors = [];
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const answer = await callOpenRouter({ apiKey, model, userContent, signal: controller.signal });
      clearTimeout(timeout);
      return res.status(200).json({ ok: true, answer, model, mode });
    } catch (error) {
      clearTimeout(timeout);
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return res.status(200).json({
    ...fallbackAnswer(message),
    errors: process.env.NODE_ENV === "development" ? errors : undefined
  });
}
