import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: "./e2e-real",
  outputDir: "./test-results/real",
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/integracion-real.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4175",
    channel: "msedge",
    headless: true,
    locale: "es-EC",
    timezoneId: "America/Los_Angeles",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "real-390", use: { viewport: { width: 390, height: 844 } } },
    { name: "real-1280", use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: [
    {
      command: "npm.cmd run serve:integration",
      cwd: fileURLToPath(new URL("../backend/", import.meta.url)),
      url: "http://127.0.0.1:3187/api/salud",
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: "node scripts/servidor-integracion.mjs",
      cwd: fileURLToPath(new URL("./", import.meta.url)),
      url: "http://127.0.0.1:4175",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
