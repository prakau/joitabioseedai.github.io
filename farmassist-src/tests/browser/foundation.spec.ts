import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const key = "joita-fa-plans-v3";
const task = {
  id: "legacy",
  crop: "Wheat",
  sowing: "2026-11-10",
  task: "Field scouting",
  due: "2026-09-16",
  done: false,
};
const backup = (rows: object[]) => ({
  version: 3,
  exportedAt: "2026-10-14T10:00:00Z",
  records: { [key]: rows },
});
async function upload(page: Page, rows: object[]) {
  await page
    .getByLabel("Restore a JOITAFA backup", { exact: true })
    .setInputFiles({
      name: "records.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup(rows))),
    });
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (r) =>
    r.fulfill({ json: { ok: true, hasGeminiKey: true } }),
  );
  await page.route("**/api.open-meteo.com/**", (r) => r.abort());
  await page.route("**/power.larc.nasa.gov/**", (r) => r.abort());
});
test("legacy future-planting tasks are reviewed and explicit pre-plant reasons repair them", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(
    ([k, row]) => localStorage.setItem(k, JSON.stringify([row])),
    [key, task] as const,
  );
  await page.reload();
  await expect(page.locator(".dashboard-tasks")).toContainText("Needs review");
  await expect(page.locator(".dashboard-tasks .overdue-note")).toHaveCount(0);
  await page.goto("./#/calendar");
  await expect(page.getByRole("alert")).toContainText("not counted as overdue");
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByRole("button", { name: "Update task", exact: true }).click();
  await expect(page.getByRole("alert").last()).toContainText(
    "Task is before sowing",
  );
  await page.getByLabel("Task", { exact: true }).fill("Prepare field");
  await page
    .getByLabel("Pre-plant activity (only if before sowing)")
    .selectOption("Land preparation");
  await page.getByRole("button", { name: "Update task", exact: true }).click();
  await expect(page.locator(".task-row")).toContainText("Land preparation");
  await expect(page.locator(".task-row .task-status")).toHaveText("Overdue");
  await page.reload();
  await expect(page.locator(".task-row")).toHaveCount(1);
});
test("device checkpoint and file backup recover a deleted task offline without duplication", async ({
  page,
  context,
}) => {
  await page.goto("./#/settings");
  await page.evaluate(
    ([k, row]) => localStorage.setItem(k, JSON.stringify([row])),
    [key, task] as const,
  );
  await page
    .getByRole("button", { name: "Save device checkpoint", exact: true })
    .click();
  await expect(
    page.getByText("Recovery copy saved on this device, not in the cloud.", {
      exact: true,
    }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export all farm records", exact: true })
    .click();
  const data = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(data.version).toBe(4);
  expect(data.records[key][0].id).toBe(task.id);
  await context.setOffline(true);
  await page.evaluate((k) => localStorage.setItem(k, "[]"), key);
  await page
    .getByRole("button", { name: "Preview recovery", exact: true })
    .click();
  await expect(page.locator(".restore-preview")).toContainText("New records");
  await page.getByLabel("Merge new records only.", { exact: false }).check();
  await page.getByRole("button", { name: "Merge backup", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 records restored" }),
  ).toBeVisible();
  await upload(page, [task]);
  await expect(
    page.getByRole("button", { name: "Merge backup", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).length,
      key,
    ),
  ).toBe(1);
  await context.setOffline(false);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download checkpoint", exact: true }),
  ).toHaveCount(3);
});
test("restore previews conflicts, keeps current versions and rejects unknown storage keys", async ({
  page,
}) => {
  await page.goto("./#/settings");
  await page.evaluate(
    ([k, row]) => localStorage.setItem(k, JSON.stringify([row])),
    [key, task] as const,
  );
  await upload(page, [
    { ...task, task: "Changed elsewhere" },
    { ...task, id: "new" },
  ]);
  await expect(page.locator(".restore-preview")).toContainText(
    "will not be overwritten",
  );
  await page.getByLabel("Merge new records only.", { exact: false }).check();
  await page.getByRole("button", { name: "Merge backup", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 conflicts kept" }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    key,
  );
  expect(saved.length).toBe(2);
  expect(saved.find((r: { id: string }) => r.id === task.id).task).toBe(
    task.task,
  );
  await page
    .getByLabel("Restore a JOITAFA backup", { exact: true })
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ ...backup([]), records: { "arbitrary-key": [] } }),
      ),
    });
  await expect(page.getByRole("alert")).toContainText(
    "unsupported storage collection",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("arbitrary-key")),
  ).toBeNull();
});
test("changed records and unavailable IndexedDB never cause an unprotected restore", async ({
  page,
}) => {
  await page.goto("./#/settings");
  await upload(page, [task]);
  await page.evaluate(
    ([k, row]) =>
      localStorage.setItem(k, JSON.stringify([{ ...row, id: "elsewhere" }])),
    [key, task] as const,
  );
  await page.getByLabel("Merge new records only.", { exact: false }).check();
  await page.getByRole("button", { name: "Merge backup", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "changed after the preview",
  );
  await upload(page, [task]);
  await page.evaluate(() =>
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    }),
  );
  await page.getByLabel("Merge new records only.", { exact: false }).check();
  await page.getByRole("button", { name: "Merge backup", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No restore was started");
  expect(
    await page.evaluate(
      (k) =>
        JSON.parse(localStorage.getItem(k)!).map((r: { id: string }) => r.id),
      key,
    ),
  ).toEqual(["elsewhere"]);
});
test("recovery controls fit Hindi phone, tablet and desktop with no overflow", async ({
  page,
}) => {
  await page.goto("./#/settings");
  await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".recovery-panel").scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("heading", { name: "बैकअप और रिकवरी", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/recovery-${width}.png` });
  }
});
