const fs = require("node:fs");
const path = require("node:path");
const { isEnvPath, targetPath } = require("./paths.cjs");

try {
  const event = JSON.parse(fs.readFileSync(0, "utf8"));
  const target = targetPath(event);
  if (typeof target !== "string" || !target) {
    throw new Error("No se pudo identificar el archivo de edición.");
  }
  const resolved = path.resolve(
    process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd(),
    target,
  );
  // Solo metadatos: nunca leer el contenido del archivo protegido.
  const physical = fs.existsSync(resolved)
    ? fs.realpathSync(resolved)
    : resolved;
  if (isEnvPath(target) || isEnvPath(resolved) || isEnvPath(physical)) {
    console.error(
      "Bloqueado: nunca editar .env ni variantes .env.* (incluidos ejemplos).",
    );
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`Protección de .env: ${error.message}`);
  process.exitCode = 2;
}
