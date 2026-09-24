import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, hasGeminiKey: true } }));
  await page.route("https://api.open-meteo.com/**", route => route.abort());
});

test("Hindi dashboard persists independently of the answer language", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => localStorage.setItem("joita-fa-preferences", JSON.stringify({ language: "Punjabi" })));
  await page.getByRole("group", { name: "Dashboard language" }).getByRole("button", { name: "हिन्दी", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { name: "बेहतर खेती। सही अगला कदम।" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "आपके खेती के उपकरण" })).toBeVisible();
  await expect(page.locator(".dashboard-tasks")).toContainText("खेत के अगले काम");
  await expect(page.getByRole("status")).toHaveText("सर्वर से जुड़ा है");
  await page.reload();
  await expect(page.getByRole("button", { name: "हिन्दी", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("joita-fa-preferences")!).language)).toBe("Punjabi");
  await page.locator(".app-sidebar").getByRole("link", { name: "पूछें", exact: true }).click();
  await expect(page.getByLabel("Answer language")).toHaveValue("Punjabi");
  await page.getByRole("link", { name: "JOITAFA होम", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Good farming. Clear next steps." })).toBeVisible();
});

test("Hindi dashboard fits small screens and opens the prepared question", async ({ page }) => {
  await page.route("**/api/farmassist-chat", route => route.abort());
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("./");
  await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Quick access" }).getByRole("link", { name: "होम", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/hindi-dashboard-mobile.png", fullPage: true, animations: "disabled" });
  await page.getByLabel("आज आप क्या जानना चाहते हैं?").fill("टमाटर की पत्तियां मुड़ रही हैं");
  await page.getByRole("button", { name: "JOITAFA से पूछें", exact: true }).click();
  await expect(page.getByLabel("Your question", { exact: true })).toHaveValue("टमाटर की पत्तियां मुड़ रही हैं");
  await expect(page.locator(".advisory-result")).toContainText("Offline KB");
  await page.getByRole("link", { name: "JOITAFA होम", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/hindi-dashboard-desktop.png", fullPage: true, animations: "disabled" });
});
