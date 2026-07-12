import { defineConfig } from "@playwright/test";

const viewports = [
  { width: 360, height: 800 },
  { width: 393, height: 873 },
  { width: 412, height: 915 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

const browsers = ["chromium", "firefox", "webkit"] as const;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [["line"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { animations: "disabled" },
  },
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: browsers.flatMap((browserName) =>
    viewports.map((viewport) => ({
      name: `${browserName}-${viewport.width}x${viewport.height}`,
      use: { browserName, viewport },
    })),
  ),
  webServer: {
    command: "npm run dev",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://localhost:3000",
  },
});
