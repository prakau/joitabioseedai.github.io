import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/website",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: process.env.SITE_TEST_URL || "http://127.0.0.1:4180/",
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  reporter: "list",
  outputDir: "test-results/website",
  webServer: process.env.CI
    ? {
        command: "python3 -m http.server 4180 --bind 127.0.0.1",
        cwd: "..",
        url: "http://127.0.0.1:4180/",
        reuseExistingServer: false,
      }
    : undefined,
});
