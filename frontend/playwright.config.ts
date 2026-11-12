import { defineConfig } from "@playwright/test";

// Navegador real con API interceptada: no verifica backend ni MongoDB.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/resultados.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "msedge",
    headless: true,
    locale: "es-EC",
    timezoneId: "America/Los_Angeles",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "movil-390", use: { viewport: { width: 390, height: 844 } } },
    {
      name: "escritorio-1280",
      use: { viewport: { width: 1280, height: 900 } },
    },
    {
      name: "responsive-360",
      testMatch: /diseno-accesibilidad\.spec\.ts/,
      use: { viewport: { width: 360, height: 800 } },
    },
    {
      name: "responsive-768",
      testMatch: /diseno-accesibilidad\.spec\.ts/,
      use: { viewport: { width: 768, height: 1024 } },
    },
  ],
  webServer: {
    command: "npm.cmd run dev:aislado",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
