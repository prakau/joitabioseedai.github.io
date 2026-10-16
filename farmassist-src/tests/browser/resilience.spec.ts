import { test, expect } from "@playwright/test";

// Fault injection must reach the network rather than a precached tool.
// Real service-worker behavior is covered by verify-offline.mjs.
test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, hasGeminiKey: true } }));
  await page.route("**/api.open-meteo.com/**", route => route.abort());
  await page.route("**/power.larc.nasa.gov/**", route => route.abort());
});

test("Hindi and English tool search finds useful destinations and recovers from no results", async ({ page }) => {
  await page.goto("./");
  const search = page.getByRole("searchbox", { name: "Find a farm tool", exact: true });
  await search.fill("water");
  await expect(page.locator(".tool-grid a")).toHaveCount(1);
  await expect(page.locator(".tool-grid a")).toHaveAttribute("href", "#/calculators");
  await search.fill("मिट्टी");
  await expect(page.locator(".tool-grid a")).toHaveAttribute("href", "#/soil");
  await search.fill("mandi");
  await expect(page.locator(".tool-grid a")).toHaveAttribute("href", "#/market");
  await search.fill("backup");
  await expect(page.locator(".tool-grid a")).toHaveAttribute("href", "#/settings");
  await search.fill("मिट्टी");
  await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "खेती का उपकरण खोजें" })).toHaveValue("मिट्टी");
  await expect(page.locator(".tool-grid")).toContainText("मिट्टी की जांच समझें");
  await page.getByRole("searchbox").fill("nothing-matches");
  await expect(page.locator(".tool-empty")).toBeVisible();
  await page.getByRole("button", { name: "खोज हटाएं", exact: true }).click();
  await expect(page.locator(".tool-grid a")).toHaveCount(14);
});

test("a saved Hindi answer reopens directly without sending a new AI request", async ({ page }) => {
  let sent = 0;
  await page.route("**/api/farmassist-chat", route => { sent++; return route.abort(); });
  await page.goto("./");
  await page.evaluate(() => {
    localStorage.setItem("joita-fa-questions", JSON.stringify([{
      id: "saved-hindi", question: "सरसों में माहू दिखे तो क्या जांचें?", answer: "पौधों की कोमल शाखाओं पर माहू की गिनती करें और स्थानीय KVK से पुष्टि करें।",
      date: "2026-10-15T05:00:00Z", source: "gemini", answerLanguage: "Hindi",
    }]));
  });
  await page.reload();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/saved-work-${width}.png`, fullPage: true, animations: "disabled" });
  }
  await page.locator(".recent-answer-list a").click();
  await expect(page.locator(".answer-copy")).toContainText("माहू की गिनती");
  await expect(page.locator(".answer-copy")).toHaveAttribute("lang", "hi-IN");
  await expect(page.locator(".answer-anchor")).toContainText("सहेजा हुआ जवाब");
  await expect(page.getByLabel("Your question", { exact: true })).toHaveValue("सरसों में माहू दिखे तो क्या जांचें?");
  expect(sent).toBe(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-questions")!).length)).toBe(1);
});

test("a failed tool download keeps navigation and saved records available", async ({ page }) => {
  await page.route(/(?:\/assets\/FarmPlot-[^/]+\.js|\/src\/components\/FarmPlot\.tsx)/, route => route.abort());
  await page.goto("./");
  await page.evaluate(() => localStorage.setItem("joita-fa-diary-v1", JSON.stringify([{ id: "keep-me" }])));
  await page.locator(".tool-grid a[href='#/visualizer']").click();
  await expect(page.getByRole("alert")).toContainText("This farm tool could not open");
  await expect(page.locator(".app-header")).toBeVisible();
  await page.getByRole("button", { name: "Back to dashboard", exact: true }).click();
  await expect(page.locator("#field-question")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-diary-v1")!)[0].id)).toBe("keep-me");
  await page.locator(".tool-grid a[href='#/calculators']").click();
  await expect(page.getByLabel("Field area", { exact: true })).toBeVisible();
});

test("dashboard does not execute the 3D engine before the tool is opened", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#field-question")).toBeVisible();
  const plotLoaded = () => page.evaluate(() => performance.getEntriesByType("resource").some(entry => /FarmPlot[^/]*\.(?:js|tsx)/.test(entry.name)));
  expect(await plotLoaded()).toBe(false);
  await page.locator(".tool-grid a[href='#/visualizer']").click();
  await expect(page.locator("canvas")).toBeVisible();
  expect(await plotLoaded()).toBe(true);
});
