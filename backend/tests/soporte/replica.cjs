const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { MongoMemoryReplSet } = require("mongodb-memory-server-core");

// Toda la descarga y los datos efímeros permanecen en el workspace ignorado.
const cache = path.resolve(
  __dirname,
  "../../node_modules/.cache/level-up-mongo",
);
async function iniciarReplica(nombre = "level_up_integracion") {
  assert.match(nombre, /^level_up_[a-z_]+$/);
  await fs.mkdir(cache, { recursive: true });
  const datos = await fs.mkdtemp(path.join(cache, "datos-"));
  process.env.MONGOMS_PREFER_GLOBAL_PATH = "false";
  process.env.MONGOMS_DOWNLOAD_DIR = path.join(cache, "binarios");
  process.env.MONGOMS_DOWNLOAD_MIRROR = "https://fastdl.mongodb.org";
  process.env.MONGOMS_DOWNLOAD_URL = "";
  process.env.MONGOMS_SYSTEM_BINARY = "";
  process.env.MONGOMS_DOWNLOAD_IGNORE_MISSING_HEADER = "true";
  const replica = await MongoMemoryReplSet.create({
    binary: {
      version: "7.0.24",
      downloadDir: path.join(cache, "binarios"),
      checkMD5: true,
    },
    instanceOpts: [{ dbPath: datos, launchTimeout: 60000 }],
    replSet: {
      name: "level_up_pruebas",
      count: 1,
      ip: "127.0.0.1",
      dbName: nombre,
      storageEngine: "wiredTiger",
      args: ["--setParameter", "enableTestCommands=1"],
      spawn: { windowsHide: true },
    },
  });
  const uri = replica.getUri(nombre);
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\//);
  return {
    uri,
    replica,
    async cerrar() {
      await replica.stop({ doCleanup: true, force: true });
    },
  };
}
module.exports = { iniciarReplica };
