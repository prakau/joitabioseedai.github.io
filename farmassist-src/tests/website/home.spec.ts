import { test, expect } from "@playwright/test";

test("task finder switches destinations and product search resets accurately", async ({page}) => {
  await page.goto("/");
  await page.getByRole("radio",{name:"Field records",exact:true}).check();
  await expect(page.locator("#task-links a").first()).toHaveAttribute("href","/farmassist/#/diary");
  await page.getByRole("radio",{name:"Selling my crop",exact:true}).check();
  await expect(page.locator("#task-links a").first()).toHaveAttribute("href","/farmassist/#/sales");
  await page.getByRole("radio",{name:"Research & pilots",exact:true}).check();
  await expect(page.locator("#task-links a").first()).toHaveAttribute("href","/data-validation.html");
  await page.getByRole("combobox",{name:"Focus area",exact:true}).selectOption("digital");
  await expect(page.locator(".home-product-card:visible")).toHaveCount(2);
  await page.getByLabel("Find a product",{exact:true}).fill("JOITAFA");
  await expect(page.locator(".home-product-card:visible")).toHaveCount(1);
  await page.getByLabel("Find a product",{exact:true}).fill("missing-crop-widget");
  await expect(page.locator("#products-empty")).toBeVisible();
  await page.getByRole("button",{name:"Reset filters",exact:true}).click();
  await expect(page.locator(".home-product-card:visible")).toHaveCount(7);
  await expect(page.getByLabel("Find a product",{exact:true})).toBeFocused();
});
test("comparison caps selection, preserves it during filters, and restores keyboard focus", async ({page}) => {
  await page.goto("/");
  for (const name of ["BioSynth Prime","BioSynth Nano","JOITAFA"]) await page.getByRole("checkbox",{name:`Compare ${name}`,exact:true}).check();
  const fourth=page.getByRole("checkbox",{name:"Compare SmartSeedMat",exact:true});
  await fourth.click(); await expect(fourth).not.toBeChecked();
  await expect(page.locator("#comparison-error")).toContainText("up to three");
  await page.getByRole("combobox",{name:"Focus area",exact:true}).selectOption("digital");
  await page.getByRole("button",{name:"Compare products",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Research sample; supervised evaluation");
  await expect(page.getByRole("dialog")).toContainText("BioSynth Prime");
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button",{name:"Compare products",exact:true})).toBeFocused();
  await page.getByRole("button",{name:"Clear selection",exact:true}).click();
  await expect(page.locator(".comparison-bar")).not.toBeVisible();
  await expect(page.locator(".product-actions input:checked")).toHaveCount(0);
});
test("homepage asks once, matches Roman Hindi, and keeps question text out of the URL", async ({page}) => {
  let requests=0;
  await page.route("**/api/health",r=>r.fulfill({json:{ok:true,hasGeminiKey:true}}));
  await page.route("**/api/farmassist-chat",r=>{
    requests++; expect(r.request().postDataJSON().language).toBe("Hindi");
    return r.fulfill({json:{ok:true,source:"gemini",language:"Hindi",answer:"पत्तियों के नीचे कीट और मिट्टी की नमी जांचें।"}});
  });
  await page.goto("/");
  await page.getByLabel("Ask JOITAFA",{exact:true}).fill("tamatar ke patte peele hain kya karu");
  await page.locator("#home-question").getByRole("button",{name:"Ask JOITAFA",exact:true}).click();
  await expect(page.locator(".answer-copy")).toContainText("मिट्टी की नमी");
  expect(requests).toBe(1); expect(page.url()).not.toContain("tamatar");
  expect(await page.evaluate(()=>sessionStorage.getItem("joita-fa-launch-question"))).toBeNull();
  await page.reload(); await expect(page.getByLabel("Your question",{exact:true})).toBeVisible(); expect(requests).toBe(1);
});
test("storage failure leaves the question intact and does not navigate", async ({page}) => {
  await page.goto("/");
  await page.evaluate(()=>{ Storage.prototype.setItem=function(){throw new DOMException("blocked","SecurityError");}; });
  await page.getByLabel("Ask JOITAFA",{exact:true}).fill("How should I inspect wheat?");
  await page.locator("#home-question").getByRole("button",{name:"Ask JOITAFA",exact:true}).click();
  await expect(page.locator("#home-question-error")).toContainText("blocked");
  await expect(page.getByLabel("Ask JOITAFA",{exact:true})).toHaveValue("How should I inspect wheat?");
});
test("phone, tablet and desktop controls fit with reduced motion and valid detail links", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  for (const width of [360,768,1440]) {
    await page.setViewportSize({width,height:900}); await page.goto("/");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator(".task-finder").scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/website-tools-${width}.png`});
    await page.getByRole("checkbox",{name:"Compare BioSynth Prime",exact:true}).check();
    await page.getByRole("checkbox",{name:"Compare BioSynth Nano",exact:true}).check();
    await page.locator(".product-controls").scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/website-products-${width}.png`});
    await page.getByRole("button",{name:"Compare products",exact:true}).click();
    expect(await page.getByRole("dialog").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/website-comparison-${width}.png`});
    await page.getByRole("button",{name:"Close comparison",exact:true}).click();
  }
  for(const href of await page.locator(".product-actions a").evaluateAll(links=>links.map(a=>(a as HTMLAnchorElement).href))) {
    const response=await page.request.get(href); expect(response.ok()).toBe(true);
    const hash=new URL(href).hash.slice(1); if(hash)expect(await response.text()).toContain(`id="${hash}"`);
  }
});
