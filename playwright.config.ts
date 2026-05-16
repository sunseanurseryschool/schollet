import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3003";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share a single admin user + live DB; serial is safer
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "on",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      slowMo: process.env.E2E_FAST
        ? 0
        : Number(process.env.E2E_SLOW_MO) || 250,
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
