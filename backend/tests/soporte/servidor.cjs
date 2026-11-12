const assert = require("node:assert/strict");
const { register } = require("tsx/cjs/api");
register();
const { iniciarReplica } = require("./replica.cjs");
const mongoose = require("mongoose");

// Defensa adicional del ejecutor: ninguna importación puede cargar dotenv ni
// conectar a un destino ajeno al replica efímero de loopback.
const dotenvPath = require.resolve("dotenv/config");
require.cache[dotenvPath] = {
  id: dotenvPath,
  filename: dotenvPath,
  loaded: true,
  exports: {},
};
const conectarOriginal = mongoose.connect.bind(mongoose);
mongoose.connect = (uri, ...opciones) => {
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\//);
  return conectarOriginal(uri, ...opciones);
};

// Sustituye únicamente la configuración de este proceso de pruebas antes de
// importar app/conexión: config/env.ts y dotenv/config nunca se ejecutan aquí.
const configPath = require.resolve("../../src/config/env.ts");
const env = {
  mongodbUri: "",
  mongodbDb: "level_up_navegador",
  puerto: 3187,
  frontendUrl: "http://127.0.0.1:4175",
};
require.cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: { env },
};
const { crearApp } = require("../../src/app.ts");
const { conectarDB } = require("../../src/conexionDB.ts");
const { Meta } = require("../../src/modelos/Meta.model.ts");
const { Partida } = require("../../src/modelos/Partida.model.ts");
const { Videojuego } = require("../../src/modelos/Videojuego.model.ts");

let recurso;
let servidor;
let cerrando = false;
async function cerrar() {
  if (cerrando) return;
  cerrando = true;
  if (servidor)
    await new Promise((resolve) => {
      servidor.close(resolve);
      servidor.closeAllConnections();
    });
  await mongoose.disconnect();
  if (recurso) await recurso.cerrar();
}
for (const senal of ["SIGINT", "SIGTERM"])
  process.once(senal, () => {
    cerrar().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
(async () => {
  recurso = await iniciarReplica("level_up_navegador");
  assert.match(recurso.uri, /^mongodb:\/\/127\.0\.0\.1:/);
  env.mongodbUri = recurso.uri;
  await conectarDB();
  await Promise.all([Videojuego.init(), Partida.init(), Meta.init()]);
  servidor = crearApp().listen(3187, "127.0.0.1", async () => {
    console.log("LEVEL UP: API y replica aislados listos en localhost:3187");
    if (process.argv.includes("--comprobar")) {
      try {
        const respuesta = await fetch("http://127.0.0.1:3187/api/salud");
        assert.equal(respuesta.status, 200);
        await cerrar();
      } catch (error) {
        console.error(
          "Falló la comprobación del servidor aislado:",
          error.message,
        );
        await cerrar();
        process.exitCode = 1;
      }
    }
  });
})().catch(async (error) => {
  console.error("No se pudo iniciar el entorno aislado:", error.message);
  await cerrar();
  process.exitCode = 1;
});
