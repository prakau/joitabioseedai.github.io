import { test, expect } from "@playwright/test";

test.beforeEach(async ({page}) => {
  await page.route("**/api/health", route => route.fulfill({json:{ok:true,hasGeminiKey:true}}));
});

test("dashboard question starters focus the composer and preserve the question", async ({page}) => {
  await page.route("**/api/farmassist-chat", route => route.abort());
  await page.goto("./");
  await page.getByRole("button",{name:"Irrigation",exact:true}).click();
  const composer=page.locator("#field-question");
  await expect(composer).toBeFocused();
  await expect(composer).toHaveValue("What should I check before irrigating my crop?");
  await page.getByRole("button",{name:"Ask JOITAFA",exact:true}).click();
  await expect(page.getByLabel("Your question",{exact:true})).toHaveValue("What should I check before irrigating my crop?");
});

test("dashboard stays within desktop, tablet and phone widths in both languages", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  for (const width of [360,390,768,1280,1920]) {
    await page.setViewportSize({width,height:900});
    await page.goto("./");
    for (const language of ["en","hi"]) {
      await page.locator(`.interface-options button[lang=${language}]`).click();
      await expect(page.locator("html")).toHaveAttribute("lang",language);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(await page.locator(".field-shortcut").first().evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
      await expect(page.locator("#field-question")).toBeVisible();
    }
  }
});
