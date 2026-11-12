const assert = require("node:assert/strict");
const { createServer } = require("node:http");
// Evita la caché de compilación global de tsx en el runner efímero.
process.env.TSX_DISABLE_CACHE = "true";
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
let cierreDatos;
let cierreHttp;
let cierreTotal;
function cerrarDatos() {
  return (cierreDatos ??= (async () => {
    try {
      await mongoose.disconnect();
    } finally {
      if (recurso) await recurso.cerrar();
    }
  })());
}
function cerrarHttp(forzar = true) {
  if (cierreHttp) return cierreHttp;
  if (!servidor?.listening) return Promise.resolve();
  cierreHttp = new Promise((resolve, reject) => {
    servidor.close((error) => (error ? reject(error) : resolve()));
    if (forzar) servidor.closeAllConnections();
    else servidor.closeIdleConnections();
  });
  return cierreHttp;
}
function cerrar() {
  return (cierreTotal ??= (async () => {
    cerrando = true;
    await cerrarHttp();
    await cerrarDatos();
  })());
}

async function atenderCierre(solicitud, respuesta) {
  const local = ["127.0.0.1", "::ffff:127.0.0.1", "::1"].includes(
    solicitud.socket.remoteAddress,
  );
  if (!local) {
    respuesta.writeHead(403).end();
    return;
  }
  cerrando = true;
  try {
    // replica.cerrar() rechaza si MongoMemoryReplSet no confirma stop/cleanup.
    // No se responde éxito hasta desconectar MongoDB y eliminar sus datos.
    await cerrarDatos();
    respuesta.once("finish", () => {
      cerrarHttp(false).then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
    respuesta.writeHead(200, { "Content-Type": "application/json" });
    respuesta.end(JSON.stringify({ cerrado: true }));
  } catch (error) {
    console.error(
      "No se confirmó el cierre del entorno aislado:",
      error.message,
    );
    respuesta.writeHead(500, { "Content-Type": "application/json" });
    respuesta.end(JSON.stringify({ cerrado: false }));
  }
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
  const app = crearApp();
  // Ruta exclusiva del ejecutor efímero, antes de Express: no existe en la API.
  servidor = createServer((solicitud, respuesta) => {
    if (
      solicitud.method === "POST" &&
      solicitud.url === "/__pruebas__/cerrar"
    ) {
      void atenderCierre(solicitud, respuesta);
    } else if (cerrando) {
      respuesta.writeHead(503).end();
    } else {
      app(solicitud, respuesta);
    }
  });
  await new Promise((resolve, reject) => {
    const fallar = (error) => {
      servidor.off("listening", listo);
      reject(error);
    };
    const listo = () => {
      servidor.off("error", fallar);
      resolve();
    };
    servidor.once("error", fallar);
    servidor.once("listening", listo);
    servidor.listen(3187, "127.0.0.1");
  });
  console.log("LEVEL UP: API y replica aislados listos en localhost:3187");
  if (process.argv.includes("--comprobar")) {
    const respuesta = await fetch("http://127.0.0.1:3187/api/salud");
    assert.equal(respuesta.status, 200);
    await cerrar();
  }
})().catch(async (error) => {
  console.error("No se pudo iniciar el entorno aislado:", error.message);
  try {
    await cerrar();
  } catch (errorCierre) {
    console.error("Falló el cierre del entorno aislado:", errorCierre.message);
  }
  process.exitCode = 1;
});
