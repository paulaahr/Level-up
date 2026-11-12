import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose, {
  type ClientSession,
  type HydratedDocument,
  Types,
} from "mongoose";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { crearApp } from "../src/app";
import { Meta } from "../src/modelos/Meta.model";
import { Videojuego, type IVideojuego } from "../src/modelos/Videojuego.model";

vi.mock("../src/config/env", () => ({
  env: { frontendUrl: "http://frontend.controlado" },
}));

// HTTP y servicios reales con el límite de Mongoose simulado. Estos fixtures
// no demuestran persistencia, rollback ni exclusión concurrente en MongoDB.
const id = "507f1f77bcf86cd799439011";
const sesion = {} as ClientSession;
const instante = new Date("2026-11-11T17:00:00Z");
const inicial = () => ({
  _id: new Types.ObjectId(id),
  nombre: "Juego de prueba",
  genero: "RPG",
  plataforma: "PC",
  estado: "Jugando",
  portada: "",
  descripcion: "Original",
  logros: [],
  createdAt: instante,
  updatedAt: instante,
  __v: 0,
});
let guardado: Record<string, unknown> | null;
let activa: boolean;
let fallo: "guarda" | "lectura" | "meta" | "guardado" | "commit" | undefined;
const documentos: HydratedDocument<IVideojuego>[] = [];
const orden: string[] = [];
const sesionesConsulta: unknown[] = [];
let servidor: Server;
let base: string;

function consulta<T>(paso: string, resolver: () => T) {
  const query = {
    session: vi.fn((valor: unknown) => {
      sesionesConsulta.push(valor);
      return query;
    }),
    maxTimeMS: vi.fn(() => query),
    exec: async () => {
      orden.push(paso);
      if (fallo === paso) throw new Error("Detalle privado controlado");
      return resolver();
    },
    then: <R1 = T, R2 = never>(
      ok?: ((valor: T) => R1 | PromiseLike<R1>) | null,
      error?: ((razon: unknown) => R2 | PromiseLike<R2>) | null,
    ) => query.exec().then(ok, error),
  };
  return query;
}

async function actualizar(datos: unknown, referencia = id) {
  const respuesta = await fetch(`${base}/api/videojuegos/${referencia}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const json = (await respuesta.json()) as {
    error?: string;
    requestId: string;
    videojuego?: Record<string, unknown>;
  };
  expect(json.requestId).toBe(respuesta.headers.get("X-Request-Id"));
  return { estado: respuesta.status, json };
}

beforeAll(async () => {
  servidor = createServer(crearApp());
  await new Promise<void>((resolve) =>
    servidor.listen(0, "127.0.0.1", resolve),
  );
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    servidor.close((error) => (error ? reject(error) : resolve()));
    servidor.closeAllConnections();
  });
});
beforeEach(() => {
  guardado = inicial();
  activa = false;
  fallo = undefined;
  documentos.length = 0;
  orden.length = 0;
  sesionesConsulta.length = 0;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(mongoose.connection, "getClient").mockReturnValue({
    options: {},
  } as unknown as ReturnType<typeof mongoose.connection.getClient>);
  vi.spyOn(mongoose.connection, "transaction").mockImplementation(
    async (callback) => {
      const resultado = await callback(sesion);
      if (fallo === "commit") throw new Error("Detalle privado de commit");
      return resultado;
    },
  );
  vi.spyOn(Meta, "init").mockResolvedValue(
    Meta as unknown as Awaited<ReturnType<typeof Meta.init>>,
  );
  vi.spyOn(Meta, "exists").mockImplementation(
    () =>
      consulta("meta", () =>
        activa ? { _id: new Types.ObjectId() } : null,
      ) as unknown as ReturnType<typeof Meta.exists>,
  );
  vi.spyOn(Videojuego, "findOneAndUpdate").mockImplementation(
    () =>
      consulta("guarda", () =>
        guardado ? { estado: guardado.estado } : null,
      ) as unknown as ReturnType<typeof Videojuego.findOneAndUpdate>,
  );
  vi.spyOn(Videojuego, "findById").mockImplementation(
    () =>
      consulta("lectura", () => {
        if (!guardado) return null;
        const doc = Videojuego.hydrate({ ...guardado });
        documentos.push(doc);
        vi.spyOn(doc, "save").mockImplementation(async () => {
          orden.push("guardado");
          if (fallo === "guardado")
            throw new Error("Detalle privado al guardar");
          const error = doc.validateSync();
          if (error) throw error;
          guardado = doc.toObject() as unknown as Record<string, unknown>;
          return doc;
        });
        return doc;
      }) as unknown as ReturnType<typeof Videojuego.findById>,
  );
});

describe("T-06 / CA-E2-35: transición protegida con HTTP y persistencia simulada", () => {
  it("rechaza Completado con meta activa y conserva estado, campos y objetivos", async () => {
    activa = true;
    const anterior = JSON.stringify(guardado);
    const respuesta = await actualizar({
      estado: "Completado",
      descripcion: "No debe guardarse",
    });
    expect(respuesta.estado).toBe(409);
    expect(respuesta.json.error).toContain("meta activa");
    expect(JSON.stringify(guardado)).toBe(anterior);
    expect(Meta.exists).toHaveBeenCalledExactlyOnceWith({
      videojuego: id,
      activa: true,
    });
    expect(
      documentos.every((doc) => vi.mocked(doc.save).mock.calls.length === 0),
    ).toBe(true);
  });

  it("permite Completado cuando no existe meta activa", async () => {
    const respuesta = await actualizar({ estado: "Completado" });
    expect(respuesta.estado).toBe(200);
    expect(respuesta.json.videojuego?.estado).toBe("Completado");
    expect(orden).toEqual(["guarda", "lectura", "meta", "guardado"]);
    expect(sesionesConsulta).toEqual([sesion, sesion]);
    expect(documentos[0].save).toHaveBeenCalledExactlyOnceWith({
      session: sesion,
    });
    expect(Videojuego.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id },
      { $inc: { __v: 1 } },
      expect.objectContaining({ session: sesion, timestamps: false }),
    );
  });

  it.each(["Pendiente", "Jugando", "En pausa"])(
    "preserva la transición permitida a %s con una meta activa",
    async (estado) => {
      activa = true;
      const respuesta = await actualizar({ estado });
      expect(respuesta.estado).toBe(200);
      expect(guardado?.estado).toBe(estado);
      expect(Meta.exists).not.toHaveBeenCalled();
    },
  );

  it("preserva edición parcial, campos permitidos y descarte de campos ajenos de E1", async () => {
    activa = true;
    const respuesta = await actualizar({
      nombre: "Nombre actualizado",
      descripcion: "Texto",
      calificacion: 9,
      ajeno: true,
    });
    expect(respuesta.estado).toBe(200);
    expect(guardado).toMatchObject({
      nombre: "Nombre actualizado",
      descripcion: "Texto",
      calificacion: 9,
      estado: "Jugando",
    });
    expect(guardado).not.toHaveProperty("ajeno");
  });

  it("comprueba estado resultante aunque el cuerpo omita estado", async () => {
    guardado!.estado = "Completado";
    activa = true;
    const respuesta = await actualizar({ descripcion: "No permitido" });
    expect(respuesta.estado).toBe(409);
    expect(guardado!.descripcion).toBe("Original");
  });

  it("rechaza ID inválido antes de abrir una transacción", async () => {
    const respuesta = await actualizar({ estado: "Completado" }, "invalido");
    expect(respuesta.estado).toBe(400);
    expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    expect(Videojuego.findById).not.toHaveBeenCalled();
  });

  it("devuelve 404 si el juego no existe, sin consultar metas ni guardar", async () => {
    guardado = null;
    const respuesta = await actualizar({ estado: "Completado" });
    expect(respuesta.estado).toBe(404);
    expect(Meta.exists).not.toHaveBeenCalled();
    expect(documentos).toHaveLength(0);
  });

  it("conserva errores de validación E1 sin guardar datos inválidos", async () => {
    const anterior = JSON.stringify(guardado);
    const respuesta = await actualizar({ estado: "Inventado" });
    expect(respuesta.estado).toBe(400);
    expect(JSON.stringify(guardado)).toBe(anterior);
  });

  it.each(["guarda", "lectura", "meta", "guardado", "commit"] as const)(
    "propaga fallo de %s como 500 centralizado y opaco",
    async (paso) => {
      fallo = paso;
      const respuesta = await actualizar({ estado: "Completado" });
      expect(respuesta.estado).toBe(500);
      expect(respuesta.json.error).toBe("Error interno del servidor");
      expect(JSON.stringify(respuesta.json)).not.toContain("privado");
      expect(console.error).toHaveBeenCalled();
      // Ante commit desconocido, este mock no determina el resultado de MongoDB.
    },
  );

  it("relee documentos dentro de cada intento del helper", async () => {
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => {
        await callback(sesion);
        guardado!.nombre = "Otro cambio ya confirmado";
        return callback(sesion);
      },
    );
    const respuesta = await actualizar({ estado: "Completado" });
    expect(respuesta.estado).toBe(200);
    expect(Videojuego.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(Videojuego.findById).toHaveBeenCalledTimes(2);
    expect(documentos).toHaveLength(2);
    expect(documentos[0]).not.toBe(documentos[1]);
    expect(guardado!.nombre).toBe("Otro cambio ya confirmado");
  });

  it("cancelar PUT durante la guarda impide nuevas lecturas y guardados", async () => {
    const diferido = () => {
      let resolver!: () => void;
      const promesa = new Promise<void>((resolve) => {
        resolver = resolve;
      });
      return { promesa, resolver };
    };
    const guardaIniciada = diferido();
    const liberarGuarda = diferido();
    const respuestaCerrada = diferido();
    const helperFinalizado = diferido();
    servidor.once("request", (_req, res) => {
      res.once("close", respuestaCerrada.resolver);
    });
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => {
        try {
          return await callback(sesion);
        } finally {
          helperFinalizado.resolver();
        }
      },
    );
    vi.mocked(Videojuego.findOneAndUpdate).mockImplementationOnce(
      () =>
        consulta("guarda", async () => {
          guardaIniciada.resolver();
          await liberarGuarda.promesa;
          return { estado: guardado!.estado };
        }) as unknown as ReturnType<typeof Videojuego.findOneAndUpdate>,
    );
    const cancelacion = new AbortController();
    const peticion = fetch(`${base}/api/videojuegos/${id}`, {
      method: "PUT",
      signal: cancelacion.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "Completado" }),
    }).then(
      () => {
        throw new Error("El cliente cancelado no debe recibir respuesta");
      },
      (error: unknown) => error,
    );
    try {
      await guardaIniciada.promesa;
      cancelacion.abort();
      expect(await peticion).toMatchObject({ name: "AbortError" });
      await respuestaCerrada.promesa;
    } finally {
      liberarGuarda.resolver();
    }
    await helperFinalizado.promesa;
    // Permitir que terminen los encadenamientos async del servicio/controlador.
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(Videojuego.findById).not.toHaveBeenCalled();
    expect(Meta.exists).not.toHaveBeenCalled();
    expect(documentos).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: "ErrorCancelacionTransaccion" }),
    );
    // No prueba interrupción de la operación en vuelo ni rollback del servidor.
  });
});

// Las dos verificaciones reales de T-06 / CA-E2-35 (carrera y rollback)
// están en tests/integracion/e2-real.test.ts, bajo esos IDs.
// Ejecutar test:integration; estos mocks no prueban atomicidad del servidor.
