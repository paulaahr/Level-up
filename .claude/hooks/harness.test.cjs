const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function run(script, event, root) {
  return spawnSync(process.execPath, [path.join(__dirname, script)], {
    input: typeof event === "string" ? event : JSON.stringify(event),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  });
}

test("PreToolUse rechaza rutas de entorno sin crear ni leer esos archivos", () => {
  const root = os.tmpdir();
  for (const file of [
    ".env",
    ".env.local",
    ".env.example",
    "backend/.env.production",
    "frontend\\.env",
    "C:\\proyecto\\.ENV.test",
  ]) {
    const result = run(
      "protect-env.cjs",
      { tool_name: "Write", tool_input: { file_path: file } },
      root,
    );
    assert.equal(result.status, 2, `${file}: ${result.stderr}`);
    assert.match(result.stderr, /Bloqueado/);
  }
});

test("PreToolUse permite un archivo ordinario y rechaza entradas ilegibles", () => {
  const root = os.tmpdir();
  assert.equal(
    run("protect-env.cjs", { tool_input: { file_path: "docs/nota.md" } }, root)
      .status,
    0,
  );
  assert.equal(run("protect-env.cjs", "{", root).status, 2);
  assert.equal(run("protect-env.cjs", { tool_input: {} }, root).status, 2);
  assert.equal(
    run(
      "protect-env.cjs",
      { tool_input: { notebook_path: ".env.ipynb" } },
      root,
    ).status,
    2,
  );
});

test("PostToolUse ejecuta Prettier real sobre un archivo temporal y es idempotente", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "level-up-harness-"));
  try {
    const file = path.join(root, "sample.json");
    fs.writeFileSync(file, '{"answer":42}');
    const event = { tool_name: "Write", tool_input: { file_path: file } };
    const first = run("format-file.cjs", event, root);
    assert.equal(first.status, 0, first.stderr);
    const expected = await require("prettier").format('{"answer":42}', {
      parser: "json",
    });
    assert.equal(fs.readFileSync(file, "utf8"), expected);
    assert.equal(run("format-file.cjs", event, root).status, 0);
    assert.equal(fs.readFileSync(file, "utf8"), expected);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("PostToolUse omite rutas protegidas, extensiones ajenas y archivos fuera del proyecto", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "level-up-harness-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "level-up-outside-"));
  try {
    // Solo rutas simuladas: nunca crear fixtures .env.
    for (const file of [".env", ".env.json", ".env.local", "imagen.png"]) {
      const result = run(
        "format-file.cjs",
        { tool_input: { file_path: file } },
        root,
      );
      assert.equal(result.status, 0, result.stderr);
    }
    const file = path.join(outside, "sample.json");
    fs.writeFileSync(file, '{"unchanged":true}');
    assert.equal(
      run("format-file.cjs", { tool_input: { file_path: file } }, root).status,
      0,
    );
    assert.equal(fs.readFileSync(file, "utf8"), '{"unchanged":true}');
    const dependency = path.join(root, "node_modules");
    fs.mkdirSync(dependency);
    const ignored = path.join(dependency, "sample.json");
    fs.writeFileSync(ignored, '{"unchanged":true}');
    assert.equal(
      run("format-file.cjs", { tool_input: { file_path: ignored } }, root)
        .status,
      0,
    );
    assert.equal(fs.readFileSync(ignored, "utf8"), '{"unchanged":true}');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("PostToolUse informa JSON de archivo inválido sin sobrescribirlo", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "level-up-harness-"));
  try {
    const file = path.join(root, "broken.json");
    fs.writeFileSync(file, "{");
    const result = run(
      "format-file.cjs",
      { tool_input: { file_path: file } },
      root,
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Prettier no pudo formatear/);
    assert.equal(fs.readFileSync(file, "utf8"), "{");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test(
  "Los comandos configurados reciben stdin y ejecutan ambos scripts en PowerShell",
  { skip: process.platform !== "win32" },
  () => {
    const project = path.resolve(__dirname, "../..");
    const root = fs.mkdtempSync(path.join(__dirname, "fixture con espacios-"));
    try {
      const settings = JSON.parse(
        fs.readFileSync(path.join(project, ".claude/settings.json"), "utf8"),
      );
      const execute = (event, file) => {
        const entry = settings.hooks[event][0];
        assert.ok(new RegExp(`^(?:${entry.matcher})$`).test("Write"));
        return spawnSync(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-Command", entry.hooks[0].command],
          {
            input: JSON.stringify({
              tool_name: "Write",
              tool_input: { file_path: file },
            }),
            encoding: "utf8",
            env: { ...process.env, CLAUDE_PROJECT_DIR: project },
          },
        );
      };
      const denied = execute("PreToolUse", ".env.test");
      assert.equal(denied.status, 2, denied.stderr);
      assert.match(denied.stderr, /Bloqueado/);
      // Fixture aislado dentro del harness; nunca tocar código de las aplicaciones.
      const fixture = path.join(root, "sample.json");
      fs.writeFileSync(fixture, '{"answer":42}');
      const command = settings.hooks.PostToolUse[0].hooks[0].command;
      const formatted = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", command],
        {
          input: JSON.stringify({
            tool_name: "Write",
            tool_input: { file_path: fixture },
            cwd: root,
          }),
          encoding: "utf8",
          env: { ...process.env, CLAUDE_PROJECT_DIR: project },
        },
      );
      assert.equal(formatted.status, 0, formatted.stderr);
      assert.equal(fs.readFileSync(fixture, "utf8"), '{ "answer": 42 }\n');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);
