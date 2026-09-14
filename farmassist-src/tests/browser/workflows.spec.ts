import { test, expect, type Page } from "@playwright/test";
const advisory = "Inspect the undersides of your tomato leaves for whiteflies and mites. Compare new and older leaves, check soil moisture, and note when curling started. Confirm the cause with your local KVK before choosing any input.";
async function setup(page: Page) {
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, hasGeminiKey: true, hasOpenRouterKey: true, hasMarketKey: false, environment: "test", timestamp: new Date().toISOString() } }));
  await page.route("**/api.open-meteo.com/**", route => route.fulfill({ json: { current: { time: "2026-09-14T09:00", temperature_2m: 28, relative_humidity_2m: 65, wind_speed_10m: 12, precipitation: 0 }, daily: { time: ["2026-09-14"], temperature_2m_max: [31], temperature_2m_min: [23], precipitation_probability_max: [15], precipitation_sum: [0] } } }));
  await page.route("**/power.larc.nasa.gov/**", route => route.fulfill({ json: { properties: { parameter: { T2M: { SEP: 27 }, PRECTOTCORR: { SEP: 3 } } } } }));
  await page.route("**/api.gbif.org/**", route => route.fulfill({ json: { results: [] } }));
  await page.route("**/api.inaturalist.org/**", route => route.fulfill({ json: { results: [] } }));
  await page.route("**/api/market?*", route => route.fulfill({ json: { status: "unavailable", source: "AGMARKNET", records: [], message: "Live market feed is not connected." } }));
}
async function nav(page: Page, label: string) {
  if (await page.getByRole("button", { name: "Toggle navigation" }).isVisible()) await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("navigation").getByRole("link", { name: label, exact: true }).click();
}
test.beforeEach(async ({page}) => { await setup(page); });
test("dashboard has no invented measurements and all pages navigate", async ({page}) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("./"); await expect(page.getByText("No recording measured yet")).toBeVisible();
  for (const name of ["Ask", "Diagnose", "EHI / Sound", "Weather", "Calendar", "3D Plot", "Soil", "Market", "Community", "About", "Settings", "Home"]) {
    await nav(page, name); await expect(page.locator(".page-title h2")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  expect(errors).toEqual([]); await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true, animations: "disabled" });
});
test("live answer, saved history, offline failure, and crop search", async ({page}) => {
  await page.route("**/api/farmassist-chat", route => route.fulfill({ json: { ok: true, source: "gemini", model: "test-model", answer: advisory } }));
  await page.goto("./#/ask"); await page.getByLabel("Your question", {exact:true}).fill("Tomato leaves are yellowing and curling. What should I check?");
  await page.getByRole("button", { name: "Ask FarmAssist", exact: true }).click();
  await expect(page.locator(".advisory-result")).toContainText("Live AI: Gemini");
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
test("mobile navigation, keyboard focus, and layout fit", async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await page.goto("./");
  for(const label of ["Ask","3D Plot","Soil","EHI / Sound","Home"]) { await nav(page,label); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); }
  await page.screenshot({path:"test-results/dashboard-mobile.png",fullPage:true,animations:"disabled"}); await nav(page,"3D Plot"); await expect(page.locator("canvas")).toBeVisible(); await page.screenshot({path:"test-results/plot-mobile.png",fullPage:true,animations:"disabled"});
});
