import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { answerLanguages } from "../../src/lib/languages";
const advisory = "Inspect the undersides of your tomato leaves for whiteflies and mites. Compare new and older leaves, check soil moisture, and note when curling started. Confirm the cause with your local KVK before choosing any input.";
async function setup(page: Page) {
  await page.addInitScript(() => { if (!localStorage.getItem("joita-fa-preferences")) localStorage.setItem("joita-fa-preferences", JSON.stringify({language:"English"})); });
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, hasGeminiKey: true, hasOpenRouterKey: true, hasMarketKey: false, environment: "test", timestamp: new Date().toISOString() } }));
  await page.route("**/api.open-meteo.com/**", route => route.fulfill({ json: { current: { time: "2026-09-14T09:00", temperature_2m: 28, relative_humidity_2m: 65, wind_speed_10m: 12, precipitation: 0 }, daily: { time: ["2026-09-14"], temperature_2m_max: [31], temperature_2m_min: [23], precipitation_probability_max: [15], precipitation_sum: [0] } } }));
  await page.route("**/power.larc.nasa.gov/**", route => route.fulfill({ json: { properties: { parameter: { T2M: { SEP: 27 }, PRECTOTCORR: { SEP: 3 } } } } }));
  await page.route("**/api.gbif.org/**", route => route.fulfill({ json: { results: [] } }));
  await page.route("**/api.inaturalist.org/**", route => route.fulfill({ json: { results: [] } }));
  await page.route("**/api/market?*", route => route.fulfill({ json: { status: "unavailable", source: "AGMARKNET", records: [], message: "Live market feed is not connected." } }));
}
async function nav(page: Page, label: string) {
  if (await page.getByRole("button", { name: "Toggle navigation" }).isVisible()) await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("navigation", { name: "FarmAssist modules" }).getByRole("link", { name: label, exact: true }).click();
}
function silentAudio() {
  // A real PCM fixture exercises browser decoding without a provider call.
  const length=8000*2*5;
  const buffer=Buffer.alloc(44+length);
  buffer.write("RIFF",0); buffer.writeUInt32LE(36+length,4); buffer.write("WAVEfmt ",8);
  buffer.writeUInt32LE(16,16); buffer.writeUInt16LE(1,20); buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(8000,24); buffer.writeUInt32LE(16000,28); buffer.writeUInt16LE(2,32);
  buffer.writeUInt16LE(16,34); buffer.write("data",36); buffer.writeUInt32LE(length,40);
  return buffer.toString("base64");
}
test.beforeEach(async ({page}) => { await setup(page); });
test("JOITA branding and field-desk question carry into Ask without auto-submitting", async ({page}) => {
  let sent=0;
  await page.route("**/api/farmassist-chat",async route=>{sent++;await route.fulfill({json:{ok:true,source:"gemini",answer:advisory,model:"test"}});});
  await page.goto("./");
  await expect(page.getByRole("img",{name:"JOITA Bioseed AI",exact:true})).toBeVisible();
  await expect(page.locator(".dashboard-sprout")).toHaveCount(0);
  await page.getByLabel("What would you like to check today?").fill("Tomato leaves are curling");
  await page.getByRole("button",{name:"Ask JOITA",exact:true}).click();
  await expect(page.getByLabel("Your question",{exact:true})).toHaveValue("Tomato leaves are curling");
  expect(sent).toBe(0);
  await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await expect(page.locator(".answer-copy")).toContainText(advisory);
  expect(sent).toBe(1);
});
test("mobile dock opens tools, avoids overflow and respects reduced motion", async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("./");
  const dock=page.getByRole("navigation",{name:"Quick access",exact:true});
  await expect(dock).toBeVisible();
  await dock.getByRole("link",{name:"Market",exact:true}).click();
  await expect(page.locator(".page-title h2")).toHaveText("Mandi market prices");
  await dock.getByRole("button",{name:"All farm tools",exact:true}).click();
  await expect(page.getByRole("navigation",{name:"FarmAssist modules"})).toBeVisible();
  await page.getByRole("navigation",{name:"FarmAssist modules"}).getByRole("link",{name:"Home",exact:true}).click();
  expect(await page.locator(".field-line").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:"test-results/joita-home-mobile.png",fullPage:false,animations:"disabled"});
  await page.setViewportSize({width:1440,height:1000}); await page.screenshot({path:"test-results/joita-home-desktop.png",fullPage:false,animations:"disabled"});
});
test("dashboard has no invented measurements and all pages navigate", async ({page}) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("./"); await expect(page.getByText("No recording measured yet")).toBeVisible();
  for (const name of ["Ask", "Diagnose", "EHI / Sound", "Weather", "Calendar", "Calculators", "Income & Costs", "3D Plot", "Soil", "Market", "Community", "About", "Settings", "Home"]) {
    await nav(page, name); await expect(page.locator(".page-title h2")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  expect(errors).toEqual([]); await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true, animations: "disabled" });
});
test("live answer, saved history, offline failure, and crop search", async ({page}) => {
  await page.route("**/api/farmassist-chat", route => route.fulfill({ json: { ok: true, source: "gemini", model: "test-model", answer: advisory } }));
  await page.goto("./#/ask"); await page.getByLabel("Your question", {exact:true}).fill("Tomato leaves are yellowing and curling. What should I check?");
  await page.getByRole("button", { name: "Ask FarmAssist", exact: true }).click();
  await expect(page.locator(".advisory-result")).toContainText("JOITA Live AI");
  await expect(page.locator(".advisory-result")).toContainText("whiteflies");
  await expect(page.getByLabel("Crop", {exact:true})).toHaveValue("Tomato");
  await page.reload(); await page.locator(".history-item").first().click(); await expect(page.locator(".advisory-result")).toContainText("whiteflies");
  await page.route("**/api/farmassist-chat", route => route.abort("failed"));
  await page.getByLabel("Your question", {exact:true}).fill("How should I irrigate wheat?"); await page.getByRole("button", { name: "Ask FarmAssist", exact:true }).click();
  await expect(page.locator(".advisory-result")).toContainText("Offline KB"); await expect(page.locator(".advisory-result")).toContainText("crown root");
  await page.getByLabel("Search crop or topic", {exact:true}).fill("sarson"); await expect(page.locator(".knowledge-search summary").first()).toHaveText("Mustard");
});
test("diagnosis submits real image bytes and shows source", async ({page}) => {
  let image = "";
  await page.route("**/api/farmassist-chat", async route => { image = route.request().postDataJSON().imageUrl; await route.fulfill({ json: { ok: true, source: "gemini", model: "test", answer: advisory, imageAnalyzed: true, mode: "vision" } }); });
  await page.goto("./#/diagnose");
  await page.getByLabel("Crop photo (optional)").setInputFiles({ name: "crop.png", mimeType: "image/png", buffer: Buffer.from(await page.evaluate(() => { const canvas=document.createElement("canvas"); canvas.width=320; canvas.height=240; const ctx=canvas.getContext("2d")!; ctx.fillStyle="#427d4a"; ctx.fillRect(0,0,320,240); return canvas.toDataURL("image/png").split(",")[1]; }), "base64") });
  await expect(page.locator(".photo-preview img")).toBeVisible(); await page.getByLabel("Symptoms and field observations").fill("Leaves are curling");
  await page.getByRole("button", {name:"Analyze crop",exact:true}).click(); await expect(page.getByText("Photo included in AI analysis")).toBeVisible(); expect(image.startsWith("data:image/jpeg;base64,")).toBe(true);
});
test("plot changes geometry, saves, reopens, and renders nonblank pixels", async ({page}) => {
  await page.goto("./#/visualizer"); await expect(page.locator("canvas")).toBeVisible();
  await page.getByLabel("Length (metres)").fill("100"); await page.getByLabel("Width (metres)").fill("30"); await page.getByLabel("Number of rows").fill("12"); await page.getByLabel("Field notes").fill("North drainage channel");
  await page.getByRole("button", {name:"Save layout",exact:true}).click(); await expect(page.getByText("Layout saved. Reopen it from Saved layouts below.")).toBeVisible();
  await expect(page.locator(".plot-caption")).toContainText("3,000 m2");
  const pixels = await page.locator("canvas").evaluate((el: HTMLCanvasElement) => { const copy = document.createElement("canvas"); copy.width=el.width; copy.height=el.height; const ctx=copy.getContext("2d")!; ctx.drawImage(el,0,0); const data=ctx.getImageData(0,0,copy.width,copy.height).data; const colors=new Set(); for(let i=0;i<data.length;i+=400) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`); return colors.size; });
  expect(pixels).toBeGreaterThan(15);
  await page.screenshot({ path:"test-results/plot-desktop.png",fullPage:true,animations:"disabled" });
  const before=await page.locator("canvas").screenshot(); await page.getByRole("button",{name:"Top view",exact:true}).click(); await page.waitForTimeout(500); const after=await page.locator("canvas").screenshot(); expect(before.equals(after)).toBe(false);
  await page.reload(); await page.getByRole("button",{name:/Onion: 100 x 30 m/}).click(); await expect(page.getByLabel("Number of rows")).toHaveValue("12"); await expect(page.getByLabel("Field notes")).toHaveValue("North drainage channel");
  await page.getByLabel("Length (metres)").fill("0"); await page.getByRole("button",{name:"Save layout",exact:true}).click(); expect(await page.getByLabel("Length (metres)").evaluate((el: HTMLInputElement)=>el.validity.valid)).toBe(false);
});
test("soil report saves real entered values and can be reopened", async ({page}) => {
  await page.goto("./#/soil"); await page.getByLabel("pH (0 to 14)").fill("8.2"); await page.getByLabel("Organic carbon (%)",{exact:true}).fill("0.4"); await page.getByRole("button",{name:"Analyze and save report"}).click(); await expect(page.getByText(/Alkaline range/)).toBeVisible(); await expect(page.getByText(/Low organic carbon/)).toBeVisible(); await page.reload(); await page.getByRole("button",{name:/Soil report \//}).click(); await expect(page.getByLabel("pH (0 to 14)")).toHaveValue("8.2");
});
test("calendar and community save, search, complete, and delete records", async ({page}) => {
  await page.goto("./#/calendar"); await page.getByLabel("Search crops or topics").fill("sarson"); await expect(page.locator(".guide-list summary")).toContainText("Mustard"); await page.getByLabel("Task",{exact:true}).fill("Inspect irrigation channel"); await page.getByLabel("Task due date").fill("2026-10-01"); await page.getByRole("button",{name:"Save task",exact:true}).click(); await page.getByRole("checkbox").check(); await page.reload(); await expect(page.getByRole("checkbox")).toBeChecked();
  await nav(page,"Community"); await expect(page.getByText(/private to this browser/)).toBeVisible(); await page.getByLabel("Field note or question").fill("Onion needs a drainage inspection"); await page.getByRole("button",{name:"Save field note",exact:true}).click(); await page.reload(); await page.getByLabel("Search field notes").fill("drainage"); await expect(page.locator(".field-note")).toContainText("Onion needs"); await page.getByRole("button",{name:"Delete field note",exact:true}).click(); await expect(page.locator(".field-note")).toHaveCount(0);
});
function wav() { const count=16000*4; const b=Buffer.alloc(44+count*2); b.write("RIFF"); b.writeUInt32LE(b.length-8,4); b.write("WAVEfmt ",8); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(16000,24); b.writeUInt32LE(32000,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write("data",36); b.writeUInt32LE(count*2,40); for(let i=0;i<count;i++) b.writeInt16LE(Math.round(6000*Math.sin(2*Math.PI*440*i/16000)),44+i*2); return b; }
test("audio upload analyzes measurements and microphone denial is handled", async ({page}) => {
  await page.goto("./#/sound"); await page.getByLabel(/Or upload field audio/).setInputFiles({name:"field.wav",mimeType:"audio/wav",buffer:wav()}); await expect(page.getByText("Measured sound activity",{exact:true})).toBeVisible(); await expect(page.locator(".metrics")).toContainText("100%"); await page.screenshot({path:"test-results/audio-desktop.png",fullPage:true,animations:"disabled"});
  await page.evaluate(()=> { navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Permission denied","NotAllowedError");}; }); await page.getByRole("button",{name:"Record 60 seconds",exact:true}).click(); await expect(page.getByRole("alert")).toContainText("Microphone permission was denied");
});
test("weather location selection and market empty state are honest", async ({page}) => {
  await page.route("**/geocoding-api.open-meteo.com/**", route=>route.fulfill({json:{results:[{name:"Hisar",admin1:"Haryana",latitude:29.15,longitude:75.72}]}}));
  await page.goto("./#/weather"); await page.getByLabel("Search Indian town / district").fill("Hisar"); await page.getByRole("button",{name:"Search",exact:true}).click(); await page.getByRole("button",{name:"Hisar, Haryana",exact:true}).click(); await expect(page.locator(".location-picker")).toContainText("Selected location: Hisar, Haryana"); await expect(page.locator(".metrics")).toContainText("28 C"); await nav(page,"Market"); await expect(page.getByText(/No verified price records/)).toBeVisible(); await expect(page.locator("tbody tr")).toHaveCount(0);
});
test("market clears empty regional filters, shows dated prices, searches, and caches", async ({page}) => {
  const records=[{commodity:"Banana - Green",variety:"Banana - Green",state:"Tripura",district:"Dhalai",market:"Kulai APMC",arrival_date:"16/09/2026",min_price:1500,modal_price:1800,max_price:2000}];
  const queries: URLSearchParams[]=[];
  await page.route("**/api/market?*",route=>{
    const params=new URL(route.request().url()).searchParams; queries.push(params);
    const rows=params.get("state")==="Haryana"?[]:records;
    return route.fulfill({json:{status:"live",source:"AGMARKNET / Data.gov.in",records:rows,total:rows.length,retrievedAt:"2026-09-16T08:00:00Z",sourceUpdatedAt:"2026-09-16T00:00:28Z"}});
  });
  await page.goto("./#/market");
  await expect(page.getByText(/No published prices match Haryana/)).toBeVisible();
  await page.getByRole("button",{name:"Show all markets",exact:true}).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("1500 / 1800 / 2000");
  await expect(page.getByText(/Feed updated/)).toBeVisible();
  await expect(page.getByLabel("State",{exact:true})).toBeEmpty();
  await page.getByLabel("State",{exact:true}).fill("Tripura");
  await page.getByLabel("Commodity",{exact:true}).fill("Banana - Green");
  await page.getByLabel("Arrival date (optional)").fill("2026-09-16");
  await page.getByRole("button",{name:"Search prices",exact:true}).click();
  await expect.poll(()=>queries.at(-1)?.get("arrival_date")).toBe("16/09/2026");
  expect(queries.every(query=>!query.has("api-key"))).toBe(true);
  await page.route("**/api/market?*",route=>route.abort("failed"));
  await page.getByRole("button",{name:"Search prices",exact:true}).click();
  await expect(page.getByText(/Saved prices for these filters/)).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("cloud read-aloud plays audio parts and stops on navigation without device voices", async ({page}) => {
  await page.route("**/api/health",route=>route.fulfill({json:{ok:true,hasGeminiKey:true,hasSpeechKey:true}}));
  await page.route("**/api/farmassist-chat",route=>route.fulfill({json:{ok:true,source:"gemini",answer:advisory,model:"test"}}));
  let request: {text:string;language:string}|null=null;
  await page.route("**/api/farmassist-speech",route=>{
    request=route.request().postDataJSON();
    return route.fulfill({json:{ok:true,source:"google_tts",contentType:"audio/mpeg",audioParts:[silentAudio(),silentAudio()]}});
  });
  await page.goto("./#/ask");
  await page.getByLabel("Your question",{exact:true}).fill("Tomato leaves curling");
  await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await expect(page.getByText("Read-aloud sends this answer to Google for speech.")).toBeVisible();
  await page.getByRole("button",{name:"Read answer aloud",exact:true}).click();
  await expect(page.locator("audio")).toBeVisible();
  await expect.poll(()=>page.locator("audio").evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(0);
  expect(request).toEqual({text:advisory,language:"English"});
  await page.locator("audio").dispatchEvent("ended");
  await expect(page.getByText("Google speech / part 2 of 2")).toBeVisible();
  await page.evaluate(()=>{(window as unknown as {testPlayer:HTMLAudioElement}).testPlayer=document.querySelector("audio")!;});
  await nav(page,"Home");
  expect(await page.evaluate(()=>(window as unknown as {testPlayer:HTMLAudioElement}).testPlayer.paused)).toBe(true);
});
test("speech cancellation cannot start audio after the user has stopped", async ({page}) => {
  await page.route("**/api/health",route=>route.fulfill({json:{ok:true,hasGeminiKey:true,hasSpeechKey:true}}));
  await page.route("**/api/farmassist-chat",route=>route.fulfill({json:{ok:true,source:"gemini",answer:advisory,model:"test"}}));
  let release:()=>void=()=>{};
  const delayed=new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/api/farmassist-speech",async route=>{
    await delayed;
    await route.fulfill({json:{ok:true,source:"google_tts",contentType:"audio/mpeg",audioParts:[silentAudio()]}}).catch(()=>{});
  });
  await page.goto("./#/ask"); await page.getByLabel("Your question",{exact:true}).fill("Tomato leaves curling");
  await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await page.getByRole("button",{name:"Read answer aloud",exact:true}).click();
  await expect(page.getByText("Creating Google speech audio...")).toBeVisible();
  await page.getByRole("button",{name:"Stop reading",exact:true}).click(); release();
  await expect(page.getByText("Reading stopped.")).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Read answer aloud",exact:true})).toBeVisible();
});
test("speech provider failure leaves an explicit message and the answer intact", async ({page}) => {
  await page.addInitScript(()=>Object.defineProperty(window,"speechSynthesis",{value:{getVoices:()=>[],addEventListener:()=>{},removeEventListener:()=>{},cancel:()=>{}}}));
  await page.route("**/api/health",route=>route.fulfill({json:{ok:true,hasGeminiKey:true,hasSpeechKey:true}}));
  await page.route("**/api/farmassist-chat",route=>route.fulfill({json:{ok:true,source:"gemini",answer:advisory,model:"test"}}));
  await page.route("**/api/farmassist-speech",route=>route.fulfill({status:502,json:{ok:false,error:"Google speech is temporarily unavailable. Use device read-aloud."}}));
  await page.goto("./#/ask"); await page.getByLabel("Your question",{exact:true}).fill("Tomato leaves curling");
  await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await page.getByRole("button",{name:"Read answer aloud",exact:true}).click();
  await expect(page.locator(".answer-feedback")).toContainText("Google speech is temporarily unavailable");
  await expect(page.locator(".answer-feedback")).toContainText("No English voice is available");
  await expect(page.locator(".answer-copy")).toContainText(advisory);
});
test("mobile navigation, keyboard focus, and layout fit", async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await page.goto("./");
  for(const label of ["Ask","Diagnose","3D Plot","Soil","EHI / Sound","Calendar","Calculators","Income & Costs","Weather","Market","Community","Settings","Home"]) { await nav(page,label); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); }
  await page.screenshot({path:"test-results/dashboard-mobile.png",fullPage:true,animations:"disabled"}); await nav(page,"3D Plot"); await expect(page.locator("canvas")).toBeVisible(); await page.screenshot({path:"test-results/plot-mobile.png",fullPage:true,animations:"disabled"});
});
test("both home destinations stay visible without opening the menu", async ({page}) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({width, height:900});
    await page.goto("./#/ask");
    const home = page.getByRole("link", {name:"FarmAssist home",exact:true});
    const website = page.getByRole("link", {name:"JOITA website",exact:true});
    await expect(home).toBeVisible(); await expect(website).toBeVisible();
    await expect(website).toHaveAttribute("href", "https://www.joitabioseedai.com/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    expect((await home.boundingBox())!.y).toBeLessThan(200);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await home.click(); await expect(page.locator(".page-title h2")).toContainText("Good farming");
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Toggle navigation",exact:true}).click();
  await page.getByRole("link",{name:"FarmAssist home",exact:true}).click();
  await expect(page.getByRole("button",{name:"Toggle navigation",exact:true})).toHaveAttribute("aria-expanded","false");
  await page.route("https://www.joitabioseedai.com/", route => route.fulfill({contentType:"text/html",body:"<h1>JOITA main website</h1>"}));
  await page.getByRole("link", {name:"JOITA website",exact:true}).click();
  await expect(page).toHaveURL("https://www.joitabioseedai.com/");
});
test("all answer languages are submitted, saved, and shared between Ask, Diagnose, and Settings", async ({page}) => {
  const submitted: string[] = [];
  await page.route("**/api/farmassist-chat", async route => {
    const language=route.request().postDataJSON().language; submitted.push(language);
    await route.fulfill({json:{ok:true,source:"gemini",model:"test",answer:language === "Urdu" ? "ٹماٹر کے پتوں کے نیچے کیڑوں اور مٹی کی نمی کی جانچ کریں۔" : advisory}});
  });
  await page.goto("./#/ask"); await expect(page.getByLabel("Answer language").locator("option")).toHaveCount(15);
  for (const language of answerLanguages) {
    await page.getByLabel("Answer language").selectOption(language.name);
    await page.getByLabel("Your question", {exact:true}).fill("Tomato curling leaves");
    await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
    await expect(page.locator(".answer-copy")).toHaveAttribute("lang", language.locale);
    await expect(page.locator(".answer-copy")).toHaveAttribute("dir", language.name === "Urdu" ? "rtl" : "ltr");
  }
  expect(submitted).toEqual(answerLanguages.map(language=>language.name));
  await nav(page,"Settings"); await expect(page.getByLabel("Default answer language")).toHaveValue("Urdu");
  await page.getByLabel("Default answer language").selectOption("Punjabi"); await nav(page,"Diagnose");
  await expect(page.getByLabel("Answer language")).toHaveValue("Punjabi");
  await page.reload(); await expect(page.getByLabel("Answer language")).toHaveValue("Punjabi");
  await page.locator(".history-item").first().click();
  await expect(page.locator(".answer-copy")).toHaveAttribute("lang", "ur-IN");
  await expect(page.getByLabel("Answer language")).toHaveValue("Punjabi");
  await nav(page,"Ask"); await page.getByLabel("Search crop or topic",{exact:true}).fill("ਟਮਾਟਰ");
  await expect(page.locator(".knowledge-search summary").first()).toHaveText("Tomato");
  await page.getByRole("button",{name:"Show more saved answers",exact:true}).click();
  await expect(page.locator(".history-item")).toHaveCount(14);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:"test-results/languages-desktop.png",fullPage:true,animations:"disabled"});
});
test("follow-ups carry context, new questions reset it, and history deletion can be undone", async ({page}) => {
  const requests: {message:string; history:unknown[]}[]=[];
  await page.route("**/api/farmassist-chat", async route=>{requests.push(route.request().postDataJSON()); await route.fulfill({json:{ok:true,source:"gemini",model:"test",answer:advisory}});});
  await page.goto("./#/ask"); await page.getByLabel("Your question",{exact:true}).fill("Tomato leaves curling"); await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await page.getByRole("button",{name:"Ask a follow-up",exact:true}).click();
  await expect(page.getByLabel("Your question",{exact:true})).toBeEmpty(); await expect(page.locator(".conversation-context")).toContainText("Tomato leaves curling");
  await page.getByLabel("Your question",{exact:true}).fill("What if I see insects underneath?"); await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await expect(page.locator(".answer-copy")).toBeVisible(); expect(requests[1].history).toHaveLength(1);
  await page.getByRole("button",{name:"New question",exact:true}).click(); await expect(page.locator(".advisory-result")).toHaveCount(0); await expect(page.getByLabel("Crop",{exact:true})).toHaveValue("");
  await page.getByLabel("Your question",{exact:true}).fill("Wheat irrigation timing"); await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await expect(page.locator(".answer-copy")).toBeVisible(); expect(requests[2].history).toHaveLength(0);
  await page.getByRole("button",{name:"Delete saved answer: Wheat irrigation timing",exact:true}).click(); await expect(page.locator(".history-item")).toHaveCount(2);
  await page.getByRole("button",{name:"Undo",exact:true}).click(); await expect(page.locator(".history-item")).toHaveCount(3);
  await page.getByLabel("Search saved questions",{exact:true}).fill("nonexistent-question"); await expect(page.getByText("No saved answers match this search.")).toBeVisible();
  await page.reload(); await expect(page.locator(".history-item")).toHaveCount(3);
});
test("answer copy, download, share fallback, and denied permissions are handled", async ({page, context}) => {
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await page.route("**/api/farmassist-chat", route=>route.fulfill({json:{ok:true,source:"gemini",model:"test",answer:advisory}}));
  await page.goto("./#/ask"); await page.getByLabel("Your question",{exact:true}).fill("Tomato leaves curling"); await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await page.getByRole("button",{name:"Copy answer",exact:true}).click(); await expect(page.getByText("Answer copied.", {exact:true})).toBeVisible();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain("Source: JOITA Live AI");
  const downloaded=page.waitForEvent("download"); await page.getByRole("button",{name:"Download answer",exact:true}).click();
  const file=await downloaded; expect(file.suggestedFilename()).toBe("farmassist-advisory.txt");
  expect(await readFile((await file.path())!, "utf8")).toContain(advisory);
  await page.evaluate(()=>Object.defineProperty(navigator,"share",{configurable:true,value:undefined}));
  await page.getByRole("button",{name:"Share answer",exact:true}).click(); await expect(page.getByText("Answer copied.", {exact:true})).toBeVisible();
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new DOMException("Denied","NotAllowedError");};});
  await page.getByRole("button",{name:"Copy answer",exact:true}).click(); await expect(page.getByText(/Clipboard access is unavailable/)).toBeVisible();
});
test("native question automatically selects its language and simplified follow-ups preserve context", async ({page}) => {
  const requests: {language:string;history:unknown[];message:string}[]=[];
  await page.route("**/api/farmassist-chat",async route=>{
    requests.push(route.request().postDataJSON());
    await route.fulfill({json:{ok:true,source:"gemini",model:"test",answer:"टमाटर की पत्तियों के नीचे कीट देखें। मिट्टी की नमी जांचें।",responseTimeMs:1234}});
  });
  await page.goto("./#/ask"); await page.getByLabel("Answer language").selectOption("Auto");
  await page.getByLabel("Your question",{exact:true}).fill("टमाटर की पत्तियां पीली हो रही हैं। क्या जांच करूं?");
  await expect(page.locator(".answer-language-preview")).toContainText("हिन्दी");
  await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await expect(page.locator(".answer-copy")).toHaveAttribute("lang","hi-IN"); expect(requests[0].language).toBe("Hindi");
  await page.getByRole("button",{name:"Explain simply",exact:true}).click();
  await expect(page.locator(".answer-copy")).toBeVisible(); expect(requests[1].history).toHaveLength(1); expect(requests[1].message).toContain("आसान");
  await page.getByRole("button",{name:"New question",exact:true}).click(); await expect(page.getByLabel("Answer language")).toHaveValue("Auto");
  await page.getByRole("group",{name:"Language shortcuts"}).getByRole("button",{name:"ਪੰਜਾਬੀ",exact:true}).click();
  await expect(page.getByLabel("Answer language")).toHaveValue("Punjabi"); await expect(page.locator(".native-question-heading")).toContainText("ਖੇਤ");
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:"test-results/native-composer-mobile.png",fullPage:true,animations:"disabled"});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("live tokens appear before completion, Stop discards partials, and only completed answers are saved", async ({page}) => {
  await page.addInitScript(()=>{
    const original=window.fetch.bind(window);
    window.fetch=async (url, init)=> {
      if (!String(url).includes("/api/farmassist-chat")) return original(url,init);
      let streamController:ReadableStreamDefaultController<Uint8Array>;
      const encode=(name:string,data:unknown)=>new TextEncoder().encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
      const stream=new ReadableStream<Uint8Array>({start(controller){
        streamController=controller;
        controller.enqueue(encode("status",{provider:"gemini",message:"Receiving answer"}));
        controller.enqueue(encode("delta",{text:"Inspect the underside of affected leaves."}));
        init?.signal?.addEventListener("abort",()=>controller.error(new DOMException("Stopped","AbortError")),{once:true});
      }});
      (window as unknown as {finishTestAnswer:()=>void}).finishTestAnswer=()=>{
        streamController.enqueue(encode("complete",{ok:true,source:"gemini",answer:"Inspect the underside of affected leaves. Compare moisture in healthy and affected plants.",model:"test"}));
        streamController.close();
      };
      return new Response(stream,{headers:{"content-type":"text/event-stream"}});
    };
  });
  await page.goto("./#/ask"); await page.getByLabel("Your question",{exact:true}).fill("Tomato leaves curling");
  await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await expect(page.locator(".streaming-copy")).toContainText("Inspect the underside"); await expect(page.locator(".history-item")).toHaveCount(0);
  await page.getByRole("button",{name:"Stop",exact:true}).click(); await expect(page.getByRole("alert")).toContainText("No unfinished answer was saved");
  await expect(page.locator(".streaming-answer")).toHaveCount(0); await expect(page.locator(".history-item")).toHaveCount(0);
  await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click(); await expect(page.locator(".streaming-copy")).toBeVisible();
  await page.evaluate(()=>(window as unknown as {finishTestAnswer:()=>void}).finishTestAnswer());
  await expect(page.locator(".advisory-result")).toContainText("JOITA Live AI"); await expect(page.locator(".history-item")).toHaveCount(1);
  await expect(page.locator(".streaming-answer")).toHaveCount(0);
});
test("read-aloud uses a matching voice, stops on navigation, and missing voices are explicit", async ({page}) => {
  await page.addInitScript(()=>{
    const state=window as unknown as {speechTest:{utterances:SpeechSynthesisUtterance[]; cancelled:number}};
    state.speechTest={utterances:[],cancelled:0};
    const synth=new EventTarget();
    Object.assign(synth,{
      getVoices:()=>[{name:"English test voice",lang:"en-IN",localService:true}],
      cancel:()=>{state.speechTest.cancelled++;},
      speak:(utterance:SpeechSynthesisUtterance)=>{state.speechTest.utterances.push(utterance);},
    });
    Object.defineProperty(window,"speechSynthesis",{configurable:true,value:synth});
    // The platform normally creates these objects; the test speech engine only needs their fields.
    Object.defineProperty(window,"SpeechSynthesisUtterance",{configurable:true,value:class{ constructor(public text:string){} }});
  });
  await page.route("**/api/farmassist-chat", route=>route.fulfill({json:{ok:true,source:"gemini",model:"test",answer:advisory}}));
  await page.goto("./#/ask"); await page.getByLabel("Your question",{exact:true}).fill("Tomato leaves curling"); await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await page.getByRole("button",{name:"Read answer aloud",exact:true}).click(); await expect(page.getByRole("button",{name:"Stop reading",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {speechTest:{utterances:{lang:string}[]}}).speechTest.utterances[0].lang)).toBe("en-IN");
  await nav(page,"Home"); expect(await page.evaluate(()=>(window as unknown as {speechTest:{cancelled:number}}).speechTest.cancelled)).toBeGreaterThanOrEqual(2);
  await nav(page,"Ask"); await page.getByLabel("Answer language").selectOption("Punjabi"); await page.getByLabel("Your question",{exact:true}).fill("Wheat irrigation"); await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await page.getByRole("button",{name:"Read answer aloud",exact:true}).click(); await expect(page.getByText(/No Punjabi voice is available/)).toBeVisible();
});
test("area, water, and seed calculators produce unit-correct results and invalidate stale values", async ({page}) => {
  await page.goto("./#/calculators");
  await page.getByLabel("Field area",{exact:true}).fill("1"); await page.getByLabel("Area unit",{exact:true}).selectOption("Hectares");
  await page.getByRole("button",{name:"Calculate",exact:true}).click(); await expect(page.locator(".calculation-result")).toContainText("10,000");
  await page.getByRole("button",{name:"Water",exact:true}).click(); await expect(page.locator(".calculation-result")).toHaveCount(0);
  await page.getByLabel("Applied water depth (mm)").fill("25"); await page.getByLabel("Pump flow (litres/minute, optional)").fill("500");
  await page.getByRole("button",{name:"Calculate",exact:true}).click(); await expect(page.locator(".calculation-result")).toContainText("2,50,000"); await expect(page.locator(".calculation-result")).toContainText("8.333");
  const downloaded=page.waitForEvent("download"); await page.getByRole("button",{name:"Download calculation",exact:true}).click();
  expect(await readFile((await (await downloaded).path())!,"utf8")).toContain("Applied depth: 25 mm");
  await page.getByRole("button",{name:"Seed",exact:true}).click(); await page.getByLabel("Locally recommended seed rate").fill("100");
  await page.getByRole("button",{name:"Calculate",exact:true}).click(); await expect(page.locator(".calculation-result")).toContainText("100");
  await page.getByLabel("Field area",{exact:true}).fill("0"); await expect(page.locator(".calculation-result")).toHaveCount(0);
  await page.getByRole("button",{name:"Calculate",exact:true}).click(); expect(await page.getByLabel("Field area",{exact:true}).evaluate((input: HTMLInputElement)=>input.validity.valid)).toBe(false);
});
test("ledger saves exact amounts, edits without duplicating, filters, exports and undoes deletion", async ({page}) => {
  await page.goto("./#/ledger");
  await page.getByLabel("Amount (INR)").fill("1250.50"); await page.getByLabel("Transaction date").fill("2026-09-01"); await page.getByLabel("Crop",{exact:true}).selectOption("Wheat");
  await page.getByLabel("Note (optional)").fill("Seed purchase"); await page.getByRole("button",{name:"Save transaction",exact:true}).click();
  await expect(page.locator(".ledger-totals")).toContainText("1,250.50");
  await page.getByLabel("Transaction type").selectOption("income"); await page.getByLabel("Amount (INR)").fill("3000"); await page.getByRole("button",{name:"Save transaction",exact:true}).click();
  await expect(page.locator(".ledger-totals")).toContainText("1,749.50");
  await page.reload(); await expect(page.locator(".ledger-row")).toHaveCount(2);
  await page.getByRole("button",{name:"Edit transaction: Seed",exact:true}).click(); await page.getByLabel("Amount (INR)").fill("1500"); await page.getByRole("button",{name:"Update transaction",exact:true}).click(); await expect(page.locator(".ledger-row")).toHaveCount(2);
  await page.getByLabel("Filter by month").fill("2026-08"); await expect(page.locator(".ledger-row")).toHaveCount(0);
  await page.getByRole("button",{name:"Clear filters",exact:true}).click(); await page.getByLabel("Filter by crop").selectOption("Wheat");
  const downloaded=page.waitForEvent("download"); await page.getByRole("button",{name:"Export transactions",exact:true}).click();
  const report=JSON.parse(await readFile((await (await downloaded).path())!,"utf8")); expect(report.totalsPaise.net).toBe(150000); expect(report.currency).toBe("INR");
  await page.getByRole("button",{name:"Delete transaction: Seed",exact:true}).click(); await expect(page.locator(".ledger-row")).toHaveCount(1); await page.getByRole("button",{name:"Undo deletion",exact:true}).click(); await expect(page.locator(".ledger-row")).toHaveCount(2);
  await page.setViewportSize({width:390,height:844}); expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false); await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:"test-results/ledger-mobile.png",fullPage:true,animations:"disabled"});
});
test("AI answer creates a real task, dashboard completes it, and calendar exports it", async ({page}) => {
  await page.route("**/api/farmassist-chat", route=>route.fulfill({json:{ok:true,source:"gemini",model:"test",answer:advisory}}));
  await page.goto("./#/ask"); await page.getByLabel("Your question",{exact:true}).fill("Tomato yellowing leaves"); await page.getByRole("button",{name:"Ask FarmAssist",exact:true}).click();
  await page.getByRole("button",{name:"Create field task",exact:true}).click(); await page.getByLabel("Follow-up task",{exact:true}).fill("Check leaf undersides"); await page.getByLabel("Follow-up due date",{exact:true}).fill("2026-09-01");
  await page.getByRole("button",{name:"Save field task",exact:true}).click(); await expect(page.getByText("Field task saved.",{exact:false})).toBeVisible();
  await page.getByRole("link",{name:"FarmAssist home",exact:true}).click(); await expect(page.locator(".dashboard-tasks")).toContainText("Check leaf undersides"); await expect(page.locator(".dashboard-tasks")).toContainText("Overdue");
  await page.locator(".dashboard-tasks").getByRole("checkbox").click(); await expect(page.locator(".dashboard-tasks .task-row")).toHaveCount(0);
  await nav(page,"Calendar"); await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button",{name:"Edit task",exact:true}).click(); await page.getByLabel("Task",{exact:true}).fill("Record leaf observations"); await page.getByRole("button",{name:"Update task",exact:true}).click();
  await expect(page.locator(".task-row")).toHaveCount(1); await expect(page.locator(".task-row")).toContainText("Record leaf observations");
  const downloaded=page.waitForEvent("download"); await page.getByRole("button",{name:"Export task to calendar",exact:true}).click();
  const file=await downloaded; expect(file.suggestedFilename()).toBe("farmassist-task.ics"); expect(await readFile((await file.path())!,"utf8")).toContain("DTSTART;VALUE=DATE:20260901");
  await page.getByLabel("Task status").selectOption("Upcoming"); await expect(page.getByText("No tasks with this status.")).toBeVisible();
  await page.getByLabel("Task status").selectOption("All"); await page.getByRole("button",{name:"Delete task",exact:true}).click(); await expect(page.locator(".task-row")).toHaveCount(0);
});
test("saved records update in another open tab and storage failure never claims success", async ({page, context}) => {
  await page.goto("./#/ledger"); const other=await context.newPage(); await setup(other); await other.goto("./#/ledger");
  await page.getByLabel("Amount (INR)").fill("123.45"); await page.getByRole("button",{name:"Save transaction",exact:true}).click();
  await expect(other.locator(".ledger-row")).toHaveCount(1); await expect(other.locator(".ledger-totals")).toContainText("123.45");
  await other.getByRole("button",{name:"Delete transaction: Seed",exact:true}).click(); await expect(page.locator(".ledger-row")).toHaveCount(0);
  await page.reload(); await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException("Quota exceeded","QuotaExceededError");};});
  await page.getByLabel("Amount (INR)").fill("50"); await page.getByRole("button",{name:"Save transaction",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("Device storage is full or disabled"); await expect(page.locator(".ledger-row")).toHaveCount(0); await expect(page.getByText("Transaction saved on this device.")).toHaveCount(0);
});
