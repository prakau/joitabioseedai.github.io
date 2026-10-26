import { test, expect } from "@playwright/test";
const records = [
  { commodity:"Onion",variety:"Local",state:"Haryana",district:"Hisar",market:"Hisar",arrival_date:"26/10/2026",min_price:1500,modal_price:1800,max_price:2200 },
  { commodity:"Onion",variety:"Local",state:"Haryana",district:"Hisar",market:"Hansi",arrival_date:"25/10/2026",min_price:1700,modal_price:2000,max_price:2300 },
  { commodity:"Wheat",variety:"Local",state:"Haryana",district:"Karnal",market:"Karnal",arrival_date:"01/10/2026",min_price:2400,modal_price:2600,max_price:2800 },
  { commodity:"Onion",variety:"Local",state:"Haryana",district:"Hisar",market:"Bad price",arrival_date:"26/10/2026",min_price:1500,modal_price:99999,max_price:2200 },
];
test.beforeEach(async ({page}) => {
  await page.clock.setFixedTime(new Date("2026-10-26T06:00:00Z"));
  await page.route("**/api/health",r=>r.fulfill({json:{ok:true,hasGeminiKey:true}}));
  await page.route("**/api.open-meteo.com/**",r=>r.abort());
  await page.route("**/api/market?*",r=>r.fulfill({json:{status:"live",source:"AGMARKNET / Data.gov.in",records,retrievedAt:"2026-10-26T06:00:00Z",sourceUpdatedAt:"2026-10-26T00:00:00Z",total:records.length}}));
});
test("market harvest arithmetic, units and dated references become a net-cost sale comparison", async ({page}) => {
  await page.goto("./#/market"); await expect(page.locator(".market-table tbody tr")).toHaveCount(4);
  await page.getByLabel("Your harvest quantity (optional)",{exact:true}).fill("2.50");
  await page.getByLabel("Harvest unit",{exact:true}).selectOption("quintal");
  await expect(page.locator(".market-table tbody tr").filter({hasText:"Hisar"}).first()).toContainText("₹4,500");
  await page.getByRole("radio",{name:"Rs / kg",exact:true}).check();
  await expect(page.locator(".market-table tbody tr").first()).toContainText("15 / 18 / 22");
  await expect(page.getByRole("checkbox",{name:/Select Onion.*Bad price/})).toBeDisabled();
  await page.getByRole("checkbox",{name:/Select Onion.*Hisar \/ 26/}).check();
  await page.getByRole("checkbox",{name:/Select Onion.*Hansi/}).check();
  await page.getByRole("button",{name:"Compare after costs",exact:true}).click();
  await expect(page.getByLabel("Quantity to sell (kg)",{exact:true})).toHaveValue("250");
  await expect(page.locator(".buyer-offer").first().getByLabel("Quoted price (INR)")).toHaveValue("1800");
  await expect(page.locator(".buyer-offer").first().getByLabel("Buyer / mandi name")).toHaveValue("AGMARKNET Hisar 26/10/2026");
  expect(await page.evaluate(()=>sessionStorage.getItem("joita-fa-market-sale-draft-v1"))).toBeNull();
  await page.locator(".buyer-offer").nth(1).getByLabel("Total transport cost (INR)").fill("900");
  await page.getByRole("button",{name:"Compare net proceeds",exact:true}).click();
  await expect(page.locator(".sale-results tbody tr").first()).toContainText("Hisar");
  await expect(page.locator(".sale-results tbody tr").first()).toContainText("₹4,500");
  await page.getByRole("button",{name:"Save comparison",exact:true}).click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("joita-fa-sale-comparisons-v1")!)[0].offers[0].price)).toBe("1800");
});
test("mixed crops cannot be imported as a comparable sale and storage denial preserves selection", async ({page}) => {
  await page.goto("./#/market");
  await page.getByRole("checkbox",{name:/Select Onion.*Hisar \/ 26/}).check();
  await page.getByRole("checkbox",{name:/Select Wheat/}).check();
  await page.getByRole("button",{name:"Compare after costs",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("same commodity and variety");
  await page.getByRole("checkbox",{name:/Select Wheat/}).uncheck();
  await page.getByRole("checkbox",{name:/Select Onion.*Hansi/}).check();
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException("blocked","SecurityError");};});
  await page.getByRole("button",{name:"Compare after costs",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("could not open");
  expect(page.url()).toContain("#/market");
  await expect(page.locator(".market-comparison-bar")).toContainText("2/5");
});
test("saved searches persist and a refreshed dataset invalidates stale selections", async ({page}) => {
  await page.goto("./#/market");
  await page.getByLabel("Commodity",{exact:true}).fill("Onion");await page.getByRole("button",{name:"Search prices",exact:true}).click();
  await expect(page.locator(".market-table tbody tr")).toHaveCount(3);
  await page.locator(".market-saved summary").click();await page.getByLabel("Saved search name").fill("My onions");
  await page.getByRole("button",{name:"Save current search",exact:true}).click();await expect(page.getByText("Search saved on this device.",{exact:true})).toBeVisible();
  await page.reload();await page.locator(".market-saved summary").click();await page.getByRole("button",{name:"My onions",exact:true}).click();
  await expect(page.getByLabel("Commodity",{exact:true})).toHaveValue("Onion");
  await page.getByRole("checkbox",{name:/Select Onion.*Hisar \/ 26/}).check();
  await page.route("**/api/market?*",r=>r.fulfill({json:{status:"live",source:"AGMARKNET",records:[{...records[0],modal_price:1900}],retrievedAt:"2026-10-26T06:10:00Z"}}));
  await page.getByRole("button",{name:"Search prices",exact:true}).click();
  await expect(page.locator(".market-table tbody tr")).toHaveCount(1);await expect(page.locator(".market-comparison-bar")).toHaveCount(0);
  await page.getByRole("button",{name:"Remove search: My onions",exact:true}).click();await expect(page.locator(".market-presets li")).toHaveCount(0);
});
test("date and text filters, numeric sorting and CSV exports preserve provenance", async ({page}) => {
  await page.goto("./#/market"); await page.getByLabel("Sort prices",{exact:true}).selectOption("high");
  await expect(page.locator(".market-table tbody tr").first()).toContainText("Wheat");
  await page.getByLabel("Arrivals in the last 7 days",{exact:true}).check();await expect(page.locator(".market-table tbody tr")).toHaveCount(3);
  await page.getByLabel("Search loaded records",{exact:true}).fill("Hansi");await expect(page.locator(".market-table tbody tr")).toHaveCount(1);
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export this view",exact:true}).click();
  const stream=await (await download).createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);
  const csv=Buffer.concat(chunks).toString("utf8");expect(csv).toContain("25/10/2026");expect(csv).toContain('"live"');expect(csv).toContain('"Hansi"');expect(csv).not.toContain('"Karnal"');
  await page.getByLabel("Search loaded records",{exact:true}).fill("missing");await expect(page.getByText(/No records match this view/)).toBeVisible();
});
test("a cold market view reads its dated cache offline and rejects an expired sale handoff", async ({page}) => {
  await page.goto("./#/market");await expect(page.locator(".market-table tbody tr")).toHaveCount(4);
  await page.route("**/api/market?*",r=>r.abort());await page.reload();
  await expect(page.locator(".market-feed")).toContainText("cached");await expect(page.locator(".market-feed")).toContainText("26 Oct 2026");
  await page.evaluate(()=>{sessionStorage.setItem("joita-fa-market-sale-draft-v1",JSON.stringify({version:1,createdAt:"2020-01-01T00:00:00Z",crop:"Onion",quantity:"250",offers:[]}));location.hash="#/sales";});
  await expect(page.getByRole("alert")).toContainText("expired");await expect(page.getByLabel("Quantity to sell (kg)",{exact:true})).toHaveValue("");
});
test("Hindi controls fit mobile/tablet/desktop, respect reduced motion, and remain useful without prices", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});await page.goto("./#/market");
  await page.locator(".interface-options button[lang=hi]").click();
  await page.getByLabel("फसल",{exact:true}).fill("प्याज");await page.getByLabel("राज्य",{exact:true}).fill("हरियाणा");await page.getByRole("button",{name:"भाव खोजें",exact:true}).click();
  await expect(page.getByLabel("फसल",{exact:true})).toHaveValue("Onion");await expect(page.getByLabel("राज्य",{exact:true})).toHaveValue("Haryana");
  await expect(page.getByLabel("उपज की इकाई",{exact:true})).toBeVisible();
  await page.getByLabel("आपकी उपज की मात्रा (वैकल्पिक)",{exact:true}).fill("250");
  for(const width of [360,768,1440]) {
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo({top:0,behavior:"instant"});});
    await page.screenshot({path:`test-results/market-hi-${width}.png`,fullPage:true,animations:"disabled"});
  }
  await page.route("**/api/market?*",r=>r.fulfill({status:502,json:{error:"Provider unavailable"}}));
  await page.getByLabel("फसल",{exact:true}).fill("unpublished");await page.getByRole("button",{name:"भाव खोजें",exact:true}).click();
  await expect(page.locator(".market-feed")).toContainText("unavailable");await expect(page.locator(".market-table tbody tr")).toHaveCount(0);
  await page.getByRole("link",{name:"खरीदारों के भाव की तुलना",exact:true}).click();await expect(page.getByLabel("फसल / उपज",{exact:true})).toBeVisible();
});
