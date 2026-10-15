import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL:
      process.env.FARMASSIST_TEST_URL || "http://localhost:5173/farmassist/",
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  reporter: "list",
  outputDir: "test-results",
  webServer: process.env.CI
    ? {
        command: "python3 -m http.server 4180 --bind 127.0.0.1",
        cwd: "..",
        url: "http://127.0.0.1:4180/farmassist/",
        reuseExistingServer: false,
      }
    : undefined,
});
