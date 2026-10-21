import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "small-mobile", testMatch: ["**/ux-mobile.spec.ts", "**/guest-cart.spec.ts", "**/cart-merge.spec.ts"], use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
    { name: "tablet", testMatch: ["**/ux-mobile.spec.ts", "**/guest-cart.spec.ts", "**/cart-merge.spec.ts"], use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
  ],
  webServer: {
    command: "node .next/standalone/server.js",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: false,
    timeout: 60_000,
    env: { HOSTNAME: "127.0.0.1", PORT: "3000" },
  },
});
