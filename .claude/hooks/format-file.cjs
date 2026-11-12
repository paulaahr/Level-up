const fs = require("node:fs");
const path = require("node:path");
const { isEnvPath, targetPath, projectFile } = require("./paths.cjs");

async function main() {
  const event = JSON.parse(fs.readFileSync(0, "utf8"));
  const target = targetPath(event);
  if (typeof target !== "string" || isEnvPath(target)) return;
  const extensions = new Set([
    ".js",
    ".cjs",
    ".mjs",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".css",
    ".html",
    ".md",
    ".yaml",
    ".yml",
  ]);
  if (!extensions.has(path.extname(target).toLowerCase())) return;
  const root = process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd();
  const file = projectFile(target, root);
  if (!file || !fs.statSync(file).isFile()) return;
  const prettier = require("prettier");
  const original = fs.readFileSync(file, "utf8");
  // API directa: no cargar configuración del proyecto ni archivos de entorno.
  const formatted = await prettier.format(original, { filepath: file });
  if (original !== formatted) fs.writeFileSync(file, formatted, "utf8");
}

main().catch((error) => {
  console.error(
    `Prettier no pudo formatear: ${error.message}. Ejecutar npm ci --ignore-scripts en la raíz si falta la dependencia.`,
  );
  process.exitCode = 1;
});
