const fs = require("node:fs");
const path = require("node:path");

function isEnvPath(value) {
  return String(value)
    .split(/[\\/]+/)
    .some((part) => /^\.env(?:\.|$)/i.test(part));
}

function targetPath(event) {
  return event.tool_input?.file_path ?? event.tool_input?.notebook_path;
}

function projectFile(value, root) {
  if (typeof value !== "string" || !value || isEnvPath(value)) return null;
  const projectRoot = fs.realpathSync(root);
  const resolved = fs.realpathSync(path.resolve(root, value));
  const relative = path.relative(projectRoot, resolved);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative) ||
    isEnvPath(resolved) ||
    relative
      .split(path.sep)
      .some((part) => ["node_modules", ".git", "dist"].includes(part))
  )
    return null;
  return resolved;
}

module.exports = { isEnvPath, targetPath, projectFile };
