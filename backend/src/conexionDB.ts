import mongoose from "mongoose";
import { env } from "./config/env";

function comprobarConexionSinCsot(uri: string): void {
  const consulta = uri.indexOf("?");
  if (consulta === -1) return;

  const opciones = new URLSearchParams(uri.slice(consulta + 1));
  const csot = new Set(["timeoutms", "timeoutmode", "defaulttimeoutms"]);
  for (const nombre of opciones.keys()) {
    if (csot.has(nombre.toLowerCase())) {
      throw new Error("La conexión no admite opciones CSOT en la URI");
    }
  }
}

export async function conectarDB(): Promise<void> {
  // Inspeccionar solo opciones resueltas en memoria, sin registrar credenciales.
  comprobarConexionSinCsot(env.mongodbUri);
  try {
    await mongoose.connect(env.mongodbUri, {
      dbName: env.mongodbDb,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      waitQueueTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });

    console.log("MongoDB conectado correctamente");
    console.log("Base de datos:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error);
    throw error;
  }
  const colecciones = await mongoose.connection.db!.listCollections().toArray();

  console.log(
    "Colecciones encontradas:",
    colecciones.map((coleccion) => coleccion.name),
  );
}
