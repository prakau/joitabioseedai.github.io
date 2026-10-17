import { test, expect, type Page } from "@playwright/test";

const advisory = "पत्तियों के नीचे कीट और मिट्टी की नमी जांचें। प्रभावित और स्वस्थ पौधों की तुलना करें। कारण की पुष्टि के लिए स्थानीय कृषि विशेषज्ञ से संपर्क करें।";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, hasGeminiKey: true, hasVoiceInput: true } }));
  await page.route("**/api.open-meteo.com/**", route => route.abort());
  await page.route("**/power.larc.nasa.gov/**", route => route.abort());
});
async function photo(page: Page, label: string, color: string) {
  const buffer = Buffer.from(await page.evaluate(color => {
    const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = color; ctx.fillRect(0, 0, 640, 480);
    return canvas.toDataURL("image/png").split(",")[1];
  }, color), "base64");
  await page.getByLabel(label, { exact: true }).setInputFiles({ name: "crop.png", mimeType: "image/png", buffer });
}
async function startCase(page: Page) {
  await page.goto("./#/diagnose");
  await page.getByLabel("Crop", { exact: true }).selectOption("Tomato");
  await page.getByLabel("Plot name (optional)").fill("North plot");
  await page.getByLabel("Symptoms and field observations").fill("Tomato leaves are yellowing and curling");
  await photo(page, "Crop photo (optional)", "#448544");
  await page.getByRole("button", { name: "Analyze crop", exact: true }).click();
  await expect(page.locator(".answer-copy")).toBeVisible();
  await page.locator(".save-crop-case > summary").click();
}
test("guided three-photo investigation becomes a case, recheck and linked diary follow-up", async ({ page }) => {
  const bodies: any[] = [];
  await page.route("**/api/farmassist-chat", route => { bodies.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true, source: "gemini", language: "Hindi", imageAnalyzed: true, imagesAnalyzed: bodies.at(-1).images.length, answer: advisory } }); });
  await page.goto("./#/diagnose");
  await page.getByLabel("Crop", { exact: true }).selectOption("Tomato");
  await page.getByLabel("Plot name (optional)").fill("North plot");
  await page.getByLabel("When did symptoms start?").selectOption("2-3 days");
  await page.getByLabel("Where do you see symptoms?").selectOption("patches");
  await page.getByLabel("Recent irrigation, spray or other action (optional)").fill("Irrigated yesterday");
  await photo(page, "Crop photo (optional)", "#478744");
  await page.locator(".additional-views > summary").click();
  await photo(page, "Leaf underside photo", "#777744");
  await photo(page, "Field view photo", "#5588aa");
  await expect(page.locator(".photo-preview img")).toHaveCount(3);
  await page.getByLabel("Symptoms and field observations").fill("Tomato leaves are yellowing and curling");
  await page.getByRole("button", { name: "Analyze crop", exact: true }).click();
  await expect(page.locator(".answer-copy")).toContainText("मिट्टी की नमी");
  expect(bodies[0].images.map((image: any) => image.view)).toEqual(["whole_plant", "leaf_underside", "field_view"]);
  expect(bodies[0].investigation).toEqual({ plot: "North plot", duration: "2-3 days", spread: "patches", recentAction: "Irrigated yesterday" });
  expect(bodies[0].imageUrl).toBeUndefined();
  await page.locator(".save-crop-case > summary").click();
  await page.getByRole("button", { name: "Save case & recheck", exact: true }).click();
  await expect(page.locator(".save-crop-case")).toContainText("Case and calendar recheck saved");
  await expect(page.getByRole("button", { name: "Case already saved", exact: true })).toBeDisabled();
  const root = await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-diary-v1")!)[0]);
  expect(root.caseInfo.status).toBe("monitoring"); expect(root.advisory.answer).toBe(advisory);
  expect(JSON.stringify(root)).not.toContain("data:image");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-plans-v3")!).length)).toBe(1);
  await page.getByRole("link", { name: "Open this crop case", exact: true }).click();
  await expect(page.locator(".case-timeline > li")).toHaveCount(1);
  await page.getByLabel("Symptoms observed", { exact: true }).fill("Only a few plants show symptoms today");
  await page.getByLabel("Plants checked (optional)", { exact: true }).fill("10");
  await page.getByLabel("Plants with symptoms (optional)", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Save observation", exact: true }).click();
  await expect(page.locator(".case-timeline > li")).toHaveCount(2);
  await page.reload(); await expect(page.locator(".case-timeline")).toContainText("20.0%");
  await page.getByRole("button", { name: "Close case", exact: true }).click();
  await expect(page.locator(".case-overview")).toContainText("Closed by farmer");
  await expect(page.getByRole("link", { name: "Add a photo follow-up", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Reopen case", exact: true }).click();
  await page.getByRole("link", { name: "Add a photo follow-up", exact: true }).click();
  await expect(page.getByLabel("Crop", { exact: true })).toHaveValue("Tomato");
  await expect(page.getByLabel("Plot name (optional)")).toHaveValue("North plot");
  await photo(page, "Crop photo (optional)", "#558a44");
  await page.getByLabel("Symptoms and field observations").fill("Tomato follow-up: fewer affected plants, what next?");
  await page.getByRole("button", { name: "Analyze crop", exact: true }).click();
  await expect(page.locator(".answer-copy")).toBeVisible();
  expect(bodies[1].history).toHaveLength(1); expect(bodies[1].history[0].answer).toBe(advisory);
  expect(bodies[1].investigation.previousObservations).toContain("2/10");
  await page.getByRole("button", { name: "Save case & recheck", exact: true }).click();
  await page.getByRole("link", { name: "Open this crop case", exact: true }).click();
  await expect(page.locator(".case-timeline > li")).toHaveCount(3);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-diary-v1")!).filter((entry: any) => entry.caseInfo).length)).toBe(1);
});
test("calendar quota failure retains the case and retry does not duplicate observations", async ({ page }) => {
  await page.route("**/api/farmassist-chat", route => route.fulfill({ json: { ok: true, source: "gemini", language: "Hindi", answer: advisory } }));
  await startCase(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).__restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) { if (key === "joita-fa-plans-v3") throw new DOMException("full", "QuotaExceededError"); return original.call(this, key, value); };
  });
  await page.getByRole("button", { name: "Save case & recheck", exact: true }).click();
  await expect(page.locator(".save-crop-case")).toContainText("Case saved. The calendar recheck could not be saved");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-diary-v1")!).length)).toBe(1);
  await page.evaluate(() => (window as any).__restoreStorage());
  await page.getByRole("button", { name: "Save case & recheck", exact: true }).click();
  await expect(page.locator(".save-crop-case")).toContainText("Case and calendar recheck saved");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-diary-v1")!).length)).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-plans-v3")!).length)).toBe(1);
});
function wav() {
  const count = 16000 * 2, buffer = Buffer.alloc(44 + count * 2);
  buffer.write("RIFF"); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) buffer.writeInt16LE(Math.round(5000 * Math.sin(2 * Math.PI * 440 * i / 16000)), 44 + i * 2);
  return buffer;
}
test("Hindi voice note fills an editable question and sends one advisory only after confirmation", async ({ page }) => {
  let questions = 0, voices = 0;
  await page.route("**/api/farmassist-transcribe", route => { voices++; const body = route.request().postDataJSON(); expect(body.mimeType).toBe("audio/wav"); expect(body.language).toBe("Hindi"); expect(Buffer.from(body.audio, "base64").subarray(0, 4).toString()).toBe("RIFF"); return route.fulfill({ json: { ok: true, transcript: "मेरी सरसों की पत्तियां पीली हैं", source: "joita_voice" } }); });
  await page.route("**/api/farmassist-chat", route => { questions++; expect(route.request().postDataJSON().language).toBe("Hindi"); return route.fulfill({ json: { ok: true, source: "gemini", language: "Hindi", answer: advisory } }); });
  await page.goto("./");
  await page.getByLabel("Voice note (1–30 seconds)", { exact: true }).setInputFiles({ name: "question.wav", mimeType: "audio/wav", buffer: wav() });
  await expect(page.locator("#field-question")).toHaveValue("मेरी सरसों की पत्तियां पीली हैं");
  expect(voices).toBe(1); expect(questions).toBe(0);
  await page.locator("#field-question").fill("मेरी सरसों की पत्तियां पीली हैं, क्या जांचूं?");
  await page.getByRole("button", { name: "Ask JOITAFA", exact: true }).click();
  await expect(page.locator(".answer-copy")).toContainText("मिट्टी");
  expect(questions).toBe(1);
  expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes("audio/wav") || value.includes("UklGR")))).toBe(false);
});
test("voice failures preserve typed text and canceled microphone permission releases late streams", async ({ page }) => {
  let voices = 0;
  await page.route("**/api/farmassist-transcribe", route => { voices++; return route.fulfill({ status: 503, json: { ok: false, error: "Voice transcription unavailable" } }); });
  await page.goto("./"); await page.locator("#field-question").fill("Keep this question");
  await page.getByLabel("Voice note (1–30 seconds)", { exact: true }).setInputFiles({ name: "question.wav", mimeType: "audio/wav", buffer: wav() });
  await expect(page.locator(".voice-error")).toContainText("unavailable");
  await expect(page.locator("#field-question")).toHaveValue("Keep this question");
  await page.evaluate(() => {
    (window as any).__stops = 0;
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { (window as any).__grantMic = () => resolve({ getTracks: () => [{ stop: () => (window as any).__stops++ }] } as unknown as MediaStream); });
  });
  await page.getByRole("button", { name: "बोलकर सवाल पूछें", exact: true }).click();
  await page.getByRole("button", { name: "आवाज़ का सवाल रद्द करें", exact: true }).click();
  await page.evaluate(() => (window as any).__grantMic());
  await expect.poll(() => page.evaluate(() => (window as any).__stops)).toBe(1);
  expect(voices).toBe(1);
});
test("guided checks and case views fit Hindi phone, tablet and desktop layouts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/farmassist-chat", route => route.fulfill({ json: { ok: true, source: "gemini", language: "Hindi", answer: advisory } }));
  await startCase(page);
  await page.getByRole("button", { name: "Save case & recheck", exact: true }).click();
  await page.getByRole("link", { name: "Open this crop case", exact: true }).click();
  await expect(page.locator(".case-overview")).toBeVisible();
  await page.locator(".interface-options button[lang=hi]").click();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/crop-case-hi-${width}.png`, fullPage: true, animations: "disabled" });
  }
  await page.getByRole("link", { name: "फोटो से दोबारा जांच करें", exact: true }).click();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/guided-check-hi-${width}.png`, fullPage: true, animations: "disabled" });
  }
});
