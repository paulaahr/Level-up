import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

// Vite 5 consulta inlineConfig.envFile, no el envDir:false del archivo de config.
// Se usa el mismo bloqueo explícito en tests, build y navegador.
const modo = process.argv[2];
const configuracion = {
  configFile: fileURLToPath(new URL("../vite.e2e.config.ts", import.meta.url)),
  envFile: false,
};

if (modo === "test") {
  const { parseCLI, startVitest } = await import("vitest/node");
  const { filter, options } = parseCLI([
    "vitest",
    "run",
    ...process.argv.slice(3),
  ]);
  const pruebas = await startVitest(
    "test",
    filter,
    {
      ...options,
      config: fileURLToPath(new URL("../vitest.config.ts", import.meta.url)),
      run: true,
      watch: false,
    },
    { envFile: false },
  );
  if (!pruebas) process.exitCode = 1;
  else await pruebas.close();
} else if (modo === "build") {
  const { build } = await import("vite");
  await build(configuracion);
} else if (modo === "serve") {
  const { createServer } = await import("vite");
  const servidor = await createServer(configuracion);
  assert.equal(servidor.config.inlineConfig.envFile, false);
  await servidor.listen();
  servidor.printUrls();
  for (const senal of ["SIGINT", "SIGTERM"]) {
    process.once(senal, async () => {
      await servidor.close();
      process.exit(0);
    });
  }
} else if (modo === "verificar") {
  const { resolveConfig } = await import("vite");
  const resuelta = await resolveConfig(configuracion, "build");
  assert.equal(resuelta.inlineConfig.envFile, false);
  console.log(
    "Vite 5: carga de archivos de entorno desactivada mediante envFile:false.",
  );
} else {
  throw new Error("Usa test, build, serve o verificar.");
}
