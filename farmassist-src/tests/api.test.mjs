import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import handler from "../../api/farmassist-chat.js";
import health from "../../api/health.js";
import market from "../../api/market.js";
const originalFetch = globalThis.fetch;
const originalEnv = { gemini: process.env.GEMINI_API_KEY, router: process.env.OPENROUTER_API_KEY, node: process.env.NODE_ENV, market: process.env.DATAGOV_API_KEY };
beforeEach(() => { globalThis.__joitaFarmAssistRateLimit.clear(); process.env.GEMINI_API_KEY = "test-gemini-token"; process.env.OPENROUTER_API_KEY = "test-router-token"; process.env.NODE_ENV = "production"; delete process.env.DATAGOV_API_KEY; });
afterEach(() => { globalThis.fetch = originalFetch; for (const [key, value] of Object.entries({ GEMINI_API_KEY: originalEnv.gemini, OPENROUTER_API_KEY: originalEnv.router, NODE_ENV: originalEnv.node, DATAGOV_API_KEY: originalEnv.market })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
const question = { message: "Tomato leaves are yellowing and curling. What should I check?", crop: "Mustard", location: "Haryana", stage: "flowering", language: "English", problemType: "disease" };
function response() { return { statusCode: 200, headers: {}, data: null, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; }, end() { return this; } }; }
async function run(body, method = "POST") { const res = response(); await handler({ method, body, headers: {}, socket: { remoteAddress: "test-ip" } }, res); return res; }
function geminiReply(answer = "Inspect the underside of the leaves and compare soil moisture in affected and healthy patches. Confirm the cause with your KVK before choosing an input.") { return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: answer }] }, finishReason: "STOP" }] }), { status: 200 }); }
test("Gemini receives the photo bytes, actual crop, and follow-up context", async () => {
  let request;
  globalThis.fetch = async (_, options) => { request = JSON.parse(options.body); return geminiReply(); };
  const res = await run({ ...question, imageUrl: "data:image/png;base64,aGVsbG8=", history: [{ question: "When did it start?", answer: "Yesterday." }] });
  assert.equal(res.data.source, "gemini"); assert.equal(res.data.mode, "vision"); assert.equal(res.data.imageAnalyzed, true); assert.equal(res.data.crop, "Tomato");
  assert.equal(request.contents[0].parts[1].inlineData.data, "aGVsbG8="); assert.match(request.contents[0].parts[0].text, /Yesterday/);
});
test("failed Gemini attempts OpenRouter with the image", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push(url); if (calls.length === 1) return new Response(JSON.stringify({ error: { message: "Provider quota exceeded" } }), { status: 429 }); const body = JSON.parse(options.body); assert.equal(body.messages[1].content[1].type, "image_url"); return new Response(JSON.stringify({ choices: [{ message: { content: "Check the affected and healthy plants carefully. Confirm the cause locally before selecting any crop input." }, finish_reason: "stop" }] })); };
  const res = await run({ ...question, imageUrl: "data:image/jpeg;base64,aGVsbG8=" });
  assert.equal(calls.length, 2); assert.equal(res.data.source, "openrouter");
});
test("two provider failures produce explicitly offline JSON without production debug", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "Unavailable" } }), { status: 503 });
  const res = await run(question); assert.equal(res.data.source, "offline_kb"); assert.match(res.data.failureReason, /503/); assert.equal(res.data.errorDebug, undefined); assert.equal(res.data.imageAnalyzed, false);
});
test("short greeting answer is accepted", async () => {
  globalThis.fetch = async () => geminiReply("Hello! Which crop would you like help with today?");
  const res = await run({ ...question, message: "Hi" }); assert.equal(res.data.source, "gemini"); assert.match(res.data.answer, /Hello/);
});
test("requested native language overrides the language of previous answers", async () => {
  let prompt;
  globalThis.fetch = async (_, options) => { prompt = JSON.parse(options.body).contents[0].parts[0].text; return geminiReply("टमाटर की पत्तियों के नीचे कीट देखें। मिट्टी की नमी जांचें। कारण की पुष्टि के लिए स्थानीय कृषि विशेषज्ञ से संपर्क करें।"); };
  const res = await run({ ...question, language: "Hindi", history: [{question:"What crop?", answer:"Tomato."}] });
  assert.equal(res.data.source, "gemini");
  assert.match(prompt, /Answer language: Hindi/);
  assert.match(prompt, /previous conversation's language must not override/);
  assert.match(res.data.answer, /टमाटर/);
});
test("invalid inputs return JSON and do not call providers", async () => {
  globalThis.fetch = async () => { throw new Error("Should not be called"); };
  for (const body of ["null", { ...question, message: "" }, { ...question, message: "x".repeat(1001) }, { ...question, imageUrl: "https://example.com/private" }, { ...question, crop: { bad: true } }]) assert.equal((await run(body)).statusCode, 400);
  assert.equal((await run(question, "GET")).statusCode, 405);
});
test("rate limiter stops request eleven", async () => {
  globalThis.fetch = async () => geminiReply();
  for (let i = 0; i < 10; i++) assert.equal((await run(question)).statusCode, 200);
  assert.equal((await run(question)).statusCode, 429);
});
test("health reports configuration without exposing credentials", async () => {
  const res = response(); await health({ method: "GET", headers: {} }, res); assert.equal(res.data.hasGeminiKey, true); assert.equal(res.data.hasMarketKey, false); assert.doesNotMatch(JSON.stringify(res.data), /test-gemini-token/);
});
test("unconfigured market does not return demonstration prices", async () => {
  const res = response(); await market({ method: "GET", query: {} }, res); assert.equal(res.data.status, "unavailable"); assert.deepEqual(res.data.records, []);
});
