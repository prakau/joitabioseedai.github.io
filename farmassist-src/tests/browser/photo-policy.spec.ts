import {test, expect} from "@playwright/test";

test("new users get Hindi answers and provider branding stays in diagnostics", async ({page}) => {
  await page.route("**/api/health", r=>r.fulfill({json:{ok:true,hasGeminiKey:true}}));
  await page.route("**/api/farmassist-chat", async r=>{
    expect(r.request().postDataJSON().language).toBe("Hindi");
    await r.fulfill({json:{ok:true,source:"gemini",model:"test",language:"Hindi",answer:"पत्तियों के नीचे कीट और मिट्टी की नमी जांचें। स्थानीय कृषि विशेषज्ञ से पुष्टि करें।"}});
  });
  await page.goto("./#/ask");
  await expect(page.getByLabel("Answer language")).toHaveValue("Hindi");
  await page.getByLabel("Your question",{exact:true}).fill("Tomato leaf curl");
  await page.getByRole("button",{name:"Ask JOITAFA",exact:true}).click();
  await expect(page.locator(".advisory-result")).toContainText("JOITA Live AI");
  await expect(page.locator(".answer-copy")).toHaveAttribute("lang","hi-IN");
  await expect(page.locator("body")).not.toContainText("Gemini");
  await page.getByLabel("Answer language").selectOption("Auto");
  await page.reload(); await expect(page.getByLabel("Answer language")).toHaveValue("Auto");
});

test("a large phone photo is compressed, image-only advice works, and bad replacement clears the old image", async ({page}) => {
  await page.route("**/api/health", r=>r.fulfill({json:{ok:true,hasGeminiKey:true}}));
  let image="";
  await page.route("**/api/farmassist-chat", async r=>{
    const body=r.request().postDataJSON();image=body.imageUrl;
    expect(body.message.length).toBeGreaterThan(0);expect(image.length).toBeLessThan(2*1024*1024);
    await r.fulfill({json:{ok:true,source:"gemini",language:"Hindi",imageAnalyzed:true,answer:"फोटो में पत्ती पर धब्बे दिख रहे हैं। यह पक्का निदान नहीं है। स्थानीय विशेषज्ञ से जांच कराएं।"}});
  });
  await page.setViewportSize({width:390,height:844});
  await page.goto("./#/diagnose");
  await expect(page.getByLabel("Crop photo (optional)")).toBeHidden();
  await expect(page.getByLabel("Take crop photo",{exact:true})).toBeHidden();
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=","base64");
  await page.getByLabel("Crop photo (optional)").setInputFiles({name:"phone.png",mimeType:"image/png",buffer:Buffer.concat([png,Buffer.alloc(5*1024*1024)])});
  await expect(page.getByAltText("Crop photo to be analyzed")).toBeVisible();
  await page.getByRole("button",{name:"Analyze crop",exact:true}).click();
  await expect(page.locator(".answer-copy")).toContainText("धब्बे");expect(image.startsWith("data:image/jpeg;base64,")).toBe(true);
  await page.getByLabel("Crop photo (optional)").setInputFiles({name:"broken.jpg",mimeType:"image/jpeg",buffer:Buffer.from("not an image")});
  await expect(page.getByAltText("Crop photo to be analyzed")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("photo could not be opened");
});
