import { fileURLToPath } from "node:url";
import { parseCLI, startVitest } from "vitest/node";

const integracion = process.argv[2] === "integration";
const { filter, options } = parseCLI([
  "vitest",
  "run",
  ...process.argv.slice(3),
]);
const contexto = await startVitest(
  "test",
  filter,
  {
    ...options,
    config: fileURLToPath(
      new URL(
        integracion
          ? "../vitest.integration.config.mts"
          : "../vitest.config.mts",
        import.meta.url,
      ),
    ),
    run: true,
    watch: false,
  },
  { envFile: false, envDir: false },
);
if (!contexto) process.exitCode = 1;
else await contexto.close();
