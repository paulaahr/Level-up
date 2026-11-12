import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  test: {
    environment: "node",
    include: [
      "tests/infraestructura.test.ts",
      "tests/dominio/**/*.test.ts",
      "tests/meta-validacion.test.ts",
      "tests/configuracion-db.test.ts",
      "tests/errores-http.test.ts",
      "tests/metas-http.test.ts",
      "tests/metas-concurrencia.test.ts",
    ],
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
