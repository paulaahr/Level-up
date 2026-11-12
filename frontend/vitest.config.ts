import type { ViteUserConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// En Vite 5, envDir:false no desactiva loadEnv. El lanzador exige envFile:false.
const config = {
  envDir: false,
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(
      "http://api.level-up.test/api",
    ),
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
} satisfies Omit<ViteUserConfig, "envDir"> & { envDir: false };
export default config;
