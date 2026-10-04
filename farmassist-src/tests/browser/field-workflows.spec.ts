import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (r) =>
    r.fulfill({ json: { ok: true, hasGeminiKey: true } }),
  );
  await page.route("**/api.open-meteo.com/**", (r) => r.abort());
});
async function observation(page: Page, date: string, affected: string) {
  await page.getByLabel("Crop name", { exact: true }).fill("Tomato");
  await page.getByLabel("Plot name", { exact: true }).fill("North");
  await page.getByLabel("Observation date", { exact: true }).fill(date);
  await page
    .getByLabel("Symptoms observed", { exact: true })
    .fill("Yellow lower leaves");
  await page
    .getByLabel("Plants checked (optional)", { exact: true })
    .fill("20");
  await page
    .getByLabel("Plants with symptoms (optional)", { exact: true })
    .fill(affected);
  await page
    .getByRole("button", { name: "Save observation", exact: true })
    .click();
}
test("crop diary persists, validates counts, compares samples, schedules once, and exports reviewed records", async ({
  page,
}) => {
  await page.goto("./#/diary");
  await observation(page, "2026-09-01", "21");
  await expect(page.getByRole("alert")).toContainText("cannot exceed");
  await page.getByLabel("Plants with symptoms (optional)").fill("4");
  await page
    .getByRole("button", { name: "Save observation", exact: true })
    .click();
  await observation(page, "2026-09-03", "2");
  await expect(page.locator(".field-trend")).toContainText(
    "-10.0 percentage points",
  );
  await expect(page.locator(".observation-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Schedule recheck", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Recheck scheduled", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("joita-fa-plans-v3")!).length,
    ),
  ).toBe(1);
  await page
    .getByRole("button", { name: "Expert report", exact: true })
    .click();
  await expect(page.locator(".report-preview")).toContainText(
    "not a confirmed diagnosis",
  );
  const file = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download report", exact: true })
    .click();
  const text = await readFile((await (await file).path())!, "utf8");
  expect(text).toContain("4/20 (20.0%)");
  expect(text.indexOf("2026-09-01")).toBeLessThan(text.indexOf("2026-09-03"));
  await page
    .getByRole("button", { name: "Delete observation", exact: true })
    .first()
    .click();
  await expect(page.locator(".observation-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Undo deletion", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".observation-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Edit observation", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Symptoms observed", { exact: true })
    .fill("Checked again with expert");
  await page
    .getByRole("button", { name: "Save observation", exact: true })
    .click();
  await expect(page.locator(".observation-row")).toHaveCount(2);
  await expect(page.locator(".observation-row").first()).toContainText(
    "Checked again",
  );
  await page.goto("./#/calendar");
  await expect(page.locator(".task-row")).toContainText(
    "Recheck symptoms: North",
  );
});
test("diary failure never claims success and advisory handoff prefills without saving", async ({
  page,
}) => {
  await page.goto("./#/diary?crop=Tomato&symptoms=Yellow%20leaves");
  await expect(page.getByLabel("Crop name", { exact: true })).toHaveValue(
    "Tomato",
  );
  await expect(
    page.getByLabel("Symptoms observed", { exact: true }),
  ).toHaveValue("Yellow leaves");
  await expect(page.locator(".observation-row")).toHaveCount(0);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "joita-fa-diary-v1")
        throw new DOMException("full", "QuotaExceededError");
      original.call(this, k, v);
    };
  });
  await observation(page, "2026-09-01", "2");
  await expect(page.getByRole("alert")).toContainText("storage is full");
  await expect(page.locator(".observation-row")).toHaveCount(0);
  await expect(
    page.getByText("Observation saved on this device.", { exact: true }),
  ).toHaveCount(0);
});
test("sale planner deducts costs, persists, exports, and invalidates results when a quote changes", async ({
  page,
}) => {
  await page.goto("./#/sales");
  await page.getByLabel("Crop / produce", { exact: true }).fill("Wheat");
  await page.getByLabel("Quantity to sell (kg)", { exact: true }).fill("100");
  const a = page.locator(".buyer-offer").nth(0),
    b = page.locator(".buyer-offer").nth(1);
  await a.getByLabel("Buyer / mandi name").fill("Local");
  await a.getByLabel("Quoted price (INR)").fill("2000");
  await a.getByLabel("Total transport cost (INR)").fill("100");
  await a.getByLabel("Other total fees (INR)").fill("50");
  await a.getByLabel("Commission (%)").fill("2");
  await b.getByLabel("Buyer / mandi name").fill("Distant");
  await b.getByLabel("Quoted price (INR)").fill("21");
  await b.getByLabel("Price unit").selectOption("kg");
  await b.getByLabel("Total transport cost (INR)").fill("300");
  await page
    .getByRole("button", { name: "Compare net proceeds", exact: true })
    .click();
  await expect(page.locator("tbody tr").first()).toContainText("Local");
  await expect(page.locator("tbody tr").first()).toContainText("1,810");
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save comparison", exact: true }),
  ).toBeDisabled();
  const file = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download comparison", exact: true })
    .click();
  expect(
    JSON.parse(await readFile((await (await file).path())!, "utf8")).results[0]
      .net,
  ).toBe(1810);
  await a.getByLabel("Total transport cost (INR)").fill("200");
  await expect(page.locator(".sale-results")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /Wheat · 100 kg/ }).click();
  await expect(page.locator(".sale-results")).toBeVisible();
  await page.getByRole("button", { name: "Add buyer", exact: true }).click();
  await expect(page.locator(".buyer-offer")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Remove buyer", exact: true })
    .last()
    .click();
  await expect(page.locator(".buyer-offer")).toHaveCount(2);
});
test("new tools fit phone and desktop in Hindi and respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["diary", "sales"]) {
      await page.goto(`./#/${route}`);
      await page.locator(".interface-options button[lang=hi]").click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("heading", {
          name: route === "diary" ? "फसल डायरी" : "बिक्री की योजना",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/${route}-hi-${width}.png`,
        fullPage: true,
      });
    }
  }
});
