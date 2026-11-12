import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: false,
  test: {
    environment: "node",
    include: ["tests/integracion/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 240000,
    testTimeout: 30000,
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
