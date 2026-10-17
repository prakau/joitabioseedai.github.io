import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";

// Explicitly opt in: this check consumes the existing production provider quota.
if (process.env.JOITA_LIVE_TESTS !== "1") throw new Error("Set JOITA_LIVE_TESTS=1 to run the live provider checks.");
const origin = "https://www.joitabioseedai.com";
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
const evidence = "test-results/production-crop-care";
await mkdir(evidence, { recursive: true });
const results = { origin, timestamp: new Date().toISOString() };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  results.answers = [];
  // Read the completed, validated app record, not Chromium's evictable SSE body.
  const completedAnswer = () => page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem("joita-fa-questions"))[0];
    return { source: record.source, imageAnalyzed: record.imageAnalyzed, language: record.answerLanguage, answer: record.answer };
  });
  const healthResponse = await context.request.get(`${origin}/api/health`);
  results.health = await healthResponse.json();
  assert(healthResponse.ok() && results.health.ok && results.health.hasVoiceInput && results.health.hasGeminiKey);
  await page.goto(`${origin}/farmassist/`);
  const voice = page.getByLabel("Voice note (1–30 seconds)", {exact:true});
  await voice.waitFor({state:"attached"});
  await page.waitForFunction(() => !document.querySelector('input[aria-label="Voice note (1–30 seconds)"]').disabled);
  const speech = await context.request.post(`${origin}/api/farmassist-speech`, {data:{text:"मेरी सरसों की पत्तियां पीली हो रही हैं। क्या जांच करूं?", language:"Hindi"}});
  const audio = await speech.json();
  assert(speech.ok() && audio.ok && audio.audioParts?.length);
  await voice.setInputFiles({name:"qa-hindi-question.mp3",mimeType:"audio/mpeg",buffer:Buffer.from(audio.audioParts[0],"base64")});
  await page.waitForFunction(() => document.querySelector("#field-question")?.value.includes("सरसों"));
  results.transcript = await page.locator("#field-question").inputValue();
  assert.equal(await page.locator(".advisory-result").count(),0);
  await page.getByRole("button",{name:"Ask JOITAFA",exact:true}).click();
  await page.locator(".advisory-result").waitFor();
  assert.match(await page.locator(".advisory-result").innerText(),/JOITA Live AI/);
  assert.equal(await page.locator(".answer-copy").getAttribute("lang"),"hi-IN");
  results.answers.push(await completedAnswer());
  await page.screenshot({path:`${evidence}/hindi-voice-answer.png`,fullPage:true});
  await page.goto(`${origin}/farmassist/#/diagnose`);
  await page.getByLabel("Crop",{exact:true}).selectOption("Tomato");
  await page.getByLabel("Plot name (optional)").fill("QA public-domain crop case");
  await page.getByLabel("When did symptoms start?").selectOption("2-3 days");
  await page.getByLabel("Where do you see symptoms?").selectOption("patches");
  await page.getByLabel("Symptoms and field observations").fill("टमाटर की पत्तियां पीली हैं और कुछ धब्बे दिख रहे हैं। फोटो देखकर क्या जांचूं?");
  // Public PlantVillage reference image, not a farmer's private photo.
  await page.getByLabel("Crop photo (optional)",{exact:true}).setInputFiles({name:"tomato-reference.jpg",mimeType:"image/jpeg",buffer:await readFile(process.env.JOITA_TEST_PHOTO || "/private/tmp/joita-tomato-leaf.jpg")});
  await page.locator(".photo-preview img").waitFor();
  await page.getByRole("button",{name:"Analyze crop",exact:true}).click();
  await page.locator(".advisory-result").waitFor();
  assert.match(await page.locator(".advisory-result").innerText(),/JOITA Live AI/);
  assert.match(await page.locator(".advisory-result").innerText(),/फोटो पर आधारित/);
  assert.equal(await page.locator(".answer-copy").getAttribute("lang"),"hi-IN");
  results.answers.push(await completedAnswer());
  await page.screenshot({path:`${evidence}/photo-advisory.png`,fullPage:true});
  await page.locator(".save-crop-case > summary").click();
  await page.getByRole("button",{name:"Save case & recheck",exact:true}).click();
  await page.getByRole("link",{name:"Open this crop case",exact:true}).click();
  await page.reload();
  await page.locator(".case-timeline > li").waitFor();
  await page.getByLabel("Symptoms observed",{exact:true}).fill("QA follow-up: compared affected and healthy plants");
  await page.getByLabel("Plants checked (optional)",{exact:true}).fill("10");
  await page.getByLabel("Plants with symptoms (optional)",{exact:true}).fill("2");
  await page.getByRole("button",{name:"Save observation",exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll(".case-timeline > li").length===2);
  results.case = await page.evaluate(()=>({observations:JSON.parse(localStorage.getItem("joita-fa-diary-v1")).length,rechecks:JSON.parse(localStorage.getItem("joita-fa-plans-v3")).length,rawMediaStored:Object.values(localStorage).some(value=>value.includes("data:image")||value.includes("audio/mpeg"))}));
  assert.equal(results.case.observations,2);assert.equal(results.case.rechecks,1);assert.equal(results.case.rawMediaStored,false);
  await page.screenshot({path:`${evidence}/saved-case.png`,fullPage:true});
  results.browserErrors=errors;assert.deepEqual(errors,[]);
  assert.equal(results.answers.length,2);
  assert(results.answers.every(answer=>["gemini","openrouter"].includes(answer.source)));
  assert.equal(results.answers[1].imageAnalyzed,true);
  await context.close();
  await writeFile(`${evidence}/result.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
