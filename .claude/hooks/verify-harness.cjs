const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function verify() {
  const root = path.resolve(__dirname, "../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const agents = read("AGENTS.md");
  const lines = agents.trimEnd().split(/\r?\n/).length;
  assert.ok(lines <= 60, `AGENTS.md: ${lines} líneas (máximo 60)`);
  assert.match(read("CLAUDE.md"), /^@AGENTS\.md\r?\n?$/);
  const settings = JSON.parse(read(".claude/settings.json"));
  for (const [event, script] of [
    ["PreToolUse", "protect-env.cjs"],
    ["PostToolUse", "format-file.cjs"],
  ]) {
    const entries = settings.hooks[event];
    assert.ok(Array.isArray(entries) && entries.length === 1);
    assert.ok(new RegExp(`^(?:${entries[0].matcher})$`).test("Edit"));
    assert.ok(new RegExp(`^(?:${entries[0].matcher})$`).test("Write"));
    const hook = entries[0].hooks[0];
    assert.equal(hook.type, "command");
    assert.equal(hook.shell, "powershell");
    assert.ok(
      hook.command.includes(`$env:CLAUDE_PROJECT_DIR/.claude/hooks/${script}`),
    );
    assert.ok(hook.timeout > 0);
    assert.ok(fs.existsSync(path.join(__dirname, script)));
  }
  const skill = read(".claude/skills/nueva-spec/SKILL.md");
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)/.exec(skill);
  assert.ok(match, "Falta frontmatter de la skill");
  const prettier = require("prettier");
  await prettier.format(match[1], { parser: "yaml" });
  assert.match(match[1], /^name: nueva-spec$/m);
  assert.match(match[1], /^description: .+$/m);
  assert.match(match[1], /^disable-model-invocation: true$/m);
  assert.match(match[1], /^argument-hint: .+$/m);
  assert.ok(skill.includes("| Criterio (ID y fuente) |"));
  assert.ok(skill.includes("| Ticket (ID y enlace) |"));
  for (const document of ["DESIGN.md", "docs/harness.md"])
    assert.ok(read(document).trim());
  console.log(
    `Harness válido: AGENTS.md ${lines}/60 líneas; CLAUDE.md 1 línea; JSON y frontmatter YAML válidos; referencias y tablas presentes.`,
  );
  console.log(
    "La validación local no acredita carga o ejecución automática en Claude Code ni fidelidad visual en navegador.",
  );
}

verify().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
