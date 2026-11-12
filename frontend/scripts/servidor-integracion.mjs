import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createServer } from "vite";

// Solo localhost: API real efímera; no carga archivos de entorno.
const servidor = await createServer({
  configFile: fileURLToPath(new URL("../vite.e2e.config.ts", import.meta.url)),
  envFile: false,
  server: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3187" },
  },
});
assert.equal(servidor.config.inlineConfig.envFile, false);
await servidor.listen();
servidor.printUrls();
for (const senal of ["SIGINT", "SIGTERM"]) {
  process.once(senal, async () => {
    await servidor.close();
    process.exit(0);
  });
}
