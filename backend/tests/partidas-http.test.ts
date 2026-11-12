import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose, { Types, type ClientSession } from "mongoose";
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
import { Partida } from "../src/modelos/Partida.model";
import { Videojuego } from "../src/modelos/Videojuego.model";
import {
  validarActualizacionPartida,
  validarCreacionPartida,
} from "../src/validaciones/partida";

vi.mock("../src/config/env", () => ({
  env: { frontendUrl: "http://frontend.controlado" },
}));
// HTTP real; persistencia y transacciones simuladas, sin garantía de rollback.
const juego = "507f1f77bcf86cd799439011";
const id = "607f1f77bcf86cd799439011";
const sesion = {} as ClientSession;
const ahora = Date.parse("2026-11-11T17:00:00Z");
const entrada = () => ({
  fecha: "2026-11-10T12:00:00-05:00",
  duracionMinutos: 90,
  porcentajeAvance: 50,
  notas: "Sesión",
});
let existeJuego: boolean;
let datos: Record<string, unknown> | null;
let fallo: boolean;
let servidor: Server;
let base: string;
const documentos: ReturnType<typeof Partida.hydrate>[] = [];
const consultas: { session: ReturnType<typeof vi.fn> }[] = [];
function query<T>(resolver: () => T) {
  const consulta = {
    session: vi.fn(() => consulta),
    maxTimeMS: vi.fn(() => consulta),
    then: <R1 = T, R2 = never>(
      ok?: ((valor: T) => R1 | PromiseLike<R1>) | null,
      error?: ((razon: unknown) => R2 | PromiseLike<R2>) | null,
    ) =>
      Promise.resolve()
        .then(() => {
          if (fallo) throw new Error("detalle privado");
          return resolver();
        })
        .then(ok, error),
  };
  consultas.push(consulta);
  return consulta;
}
function documento(valor: Record<string, unknown>) {
  const doc = Partida.hydrate(valor);
  documentos.push(doc);
  vi.spyOn(doc, "save").mockImplementation(async () => {
    const error = doc.validateSync();
    if (error) throw error;
    datos = doc.toObject() as unknown as Record<string, unknown>;
    return doc;
  });
  return doc;
}
async function pedir(metodo: string, ruta: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (respuesta.status === 204)
    return { estado: respuesta.status, json: undefined };
  const json = (await respuesta.json()) as {
    requestId: string;
    error?: string;
    partida?: Record<string, unknown>;
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
  existeJuego = true;
  fallo = false;
  documentos.length = 0;
  consultas.length = 0;
  datos = {
    _id: new Types.ObjectId(id),
    videojuego: new Types.ObjectId(juego),
    ...entrada(),
    fecha: new Date(entrada().fecha),
    createdAt: new Date(ahora),
    updatedAt: new Date(ahora),
  };
  vi.spyOn(Date, "now").mockReturnValue(ahora);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(mongoose.connection, "getClient").mockReturnValue({
    options: {},
  } as unknown as ReturnType<typeof mongoose.connection.getClient>);
  vi.spyOn(mongoose.connection, "transaction").mockImplementation(
    async (callback) => callback(sesion),
  );
  vi.spyOn(Videojuego, "findOneAndUpdate").mockImplementation(
    () => query(() => (existeJuego ? { estado: "Jugando" } : null)) as never,
  );
  vi.spyOn(Videojuego, "findById").mockImplementation(
    () =>
      query(() =>
        existeJuego ? { _id: new Types.ObjectId(juego) } : null,
      ) as never,
  );
  vi.spyOn(Partida, "findById").mockImplementation(
    () => query(() => (datos ? documento(datos) : null)) as never,
  );
  vi.spyOn(Partida, "create").mockImplementation((async (valores: unknown) => {
    const esArray = Array.isArray(valores);
    const valor = (esArray ? valores[0] : valores) as Record<string, unknown>;
    const doc = documento({
      _id: new Types.ObjectId(id),
      ...valor,
      createdAt: new Date(ahora),
      updatedAt: new Date(ahora),
    });
    const error = doc.validateSync();
    if (error) throw error;
    datos = doc.toObject() as unknown as Record<string, unknown>;
    return esArray ? [doc] : doc;
  }) as never);
  vi.spyOn(Partida, "deleteOne").mockImplementation(
    () =>
      query(() => {
        datos = null;
        return { deletedCount: 1 };
      }) as never,
  );
  vi.spyOn(Partida, "findByIdAndDelete").mockImplementation(
    () =>
      query(() => {
        const previa = datos;
        datos = null;
        return previa;
      }) as never,
  );
});
describe("T-12 / CA-E2-37 a CA-E2-42: contratos HTTP con MongoDB simulado", () => {
  it("CA-E2-39: consulta una partida sin poblar ni cambiar su referencia", async () => {
    const r = await pedir("GET", `/api/partidas/${id}`);
    expect(r.estado).toBe(200);
    expect(r.json?.partida).toMatchObject({
      _id: id,
      videojuego: juego,
      fecha: "2026-11-10T17:00:00.000Z",
    });
  });
  it("CA-E2-37: registra inicio histórico en UTC y acepta igualdad con ahora", async () => {
    const r = await pedir("POST", "/api/partidas", {
      videojuego: juego,
      ...entrada(),
      fecha: new Date(ahora).toISOString(),
    });
    expect(r.estado).toBe(201);
    expect(r.json?.partida?.videojuego).toBe(juego);
    expect(Videojuego.findOneAndUpdate).toHaveBeenCalled();
    expect(Partida.create).toHaveBeenCalledWith(expect.any(Array), {
      session: sesion,
    });
  });
  it("CA-E2-39: edita fecha, minutos, avance y notas con sesión sin cambiar juego", async () => {
    const r = await pedir("PUT", `/api/partidas/${id}`, {
      ...entrada(),
      fecha: "2026-11-09T23:30:00-05:00",
      duracionMinutos: 120,
      porcentajeAvance: 40,
      notas: "  Corregida  ",
    });
    expect(r.estado).toBe(200);
    expect(r.json?.partida).toMatchObject({
      videojuego: juego,
      fecha: "2026-11-10T04:30:00.000Z",
      duracionMinutos: 120,
      porcentajeAvance: 40,
      notas: "Corregida",
    });
    expect(documentos[0].save).toHaveBeenCalledExactlyOnceWith({
      session: sesion,
    });
    expect(consultas[0].session).toHaveBeenCalledWith(sesion);
  });
  it.each(["POST", "PUT"])(
    "CA-E2-38: %s rechaza futuro sin iniciar transacción",
    async (metodo) => {
      const previa = JSON.stringify(datos);
      const cuerpo = {
        ...entrada(),
        fecha: "2026-11-11T17:00:00.001Z",
        ...(metodo === "POST" ? { videojuego: juego } : {}),
      };
      const r = await pedir(
        metodo,
        metodo === "POST" ? "/api/partidas" : `/api/partidas/${id}`,
        cuerpo,
      );
      expect(r.estado).toBe(400);
      expect(r.json?.error).toContain("fecha");
      expect(JSON.stringify(datos)).toBe(previa);
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["fecha", "2026-02-30T12:00:00Z"],
    ["fecha", "2026-11-10T12:00"],
    ["fecha", null],
    ["duracionMinutos", 0],
    ["duracionMinutos", 1441],
    ["duracionMinutos", 1.5],
    ["duracionMinutos", "90"],
    ["porcentajeAvance", -1],
    ["porcentajeAvance", 101],
    ["porcentajeAvance", "50"],
    ["notas", "x".repeat(501)],
    ["videojuego", juego],
  ])(
    "CA-E2-40: edición rechaza %s inválido sin cambios parciales",
    async (campo, valor) => {
      const previa = JSON.stringify(datos);
      const r = await pedir("PUT", `/api/partidas/${id}`, {
        ...entrada(),
        [campo as string]: valor,
      });
      expect(r.estado).toBe(400);
      expect(JSON.stringify(datos)).toBe(previa);
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    },
  );
  it.each([
    [1, 0],
    [1440, 100],
  ])(
    "CA-E2-40: admite límites minutos %s y avance %s",
    async (duracionMinutos, porcentajeAvance) => {
      expect(
        (
          await pedir("PUT", `/api/partidas/${id}`, {
            ...entrada(),
            duracionMinutos,
            porcentajeAvance,
          })
        ).estado,
      ).toBe(200);
    },
  );
  it("CA-E2-40: exige sustitución completa al editar", async () => {
    expect(
      (await pedir("PUT", `/api/partidas/${id}`, { duracionMinutos: 10 }))
        .estado,
    ).toBe(400);
  });
  it.each(["GET", "PUT", "DELETE"])(
    "CA-E2-41: %s rechaza ID inválido",
    async (metodo) => {
      expect(
        (
          await pedir(
            metodo,
            "/api/partidas/invalido",
            metodo === "PUT" ? entrada() : undefined,
          )
        ).estado,
      ).toBe(400);
    },
  );
  it.each(["GET", "PUT", "DELETE"])(
    "CA-E2-41: %s devuelve 404 para recurso ausente",
    async (metodo) => {
      datos = null;
      expect(
        (
          await pedir(
            metodo,
            `/api/partidas/${id}`,
            metodo === "PUT" ? entrada() : undefined,
          )
        ).estado,
      ).toBe(404);
    },
  );
  it("CA-E2-37: no crea una sesión huérfana para juego ausente", async () => {
    existeJuego = false;
    expect(
      (
        await pedir("POST", "/api/partidas", {
          ...entrada(),
          videojuego: juego,
        })
      ).estado,
    ).toBe(404);
    expect(Partida.create).not.toHaveBeenCalled();
  });
  it("CA-E2-42: elimina con guarda y sesión y confirma 204", async () => {
    expect((await pedir("DELETE", `/api/partidas/${id}`)).estado).toBe(204);
    expect(Videojuego.findOneAndUpdate).toHaveBeenCalled();
    expect(Partida.deleteOne).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(id) },
      expect.objectContaining({ session: sesion }),
    );
  });
  it("CA-E2-41: fallo inesperado responde 500 opaco", async () => {
    fallo = true;
    const r = await pedir("GET", `/api/partidas/${id}`);
    expect(r.estado).toBe(500);
    expect(r.json?.error).toBe("Error interno del servidor");
  });
});
describe("T-12: integración real pendiente", () => {
  it.todo(
    "registrar/editar/eliminar y releer progreso persistido con transacciones y sin cambios parciales",
  );
});
describe("T-12: validación de entrada pura, sin HTTP ni MongoDB", () => {
  it.each([
    "2026-02-29T12:00:00Z",
    "1900-02-29T12:00:00Z",
    "2026-04-31T12:00:00Z",
    "2026-00-10T12:00:00Z",
    "2026-11-10T24:00:00Z",
    "2026-11-10T12:00:00+25:00",
  ])("CA-E2-40: rechaza calendario u offset inválido %s", (fecha) => {
    expect(() =>
      validarActualizacionPartida({ ...entrada(), fecha }, ahora),
    ).toThrow(/fecha/);
    expect(mongoose.connection.transaction).not.toHaveBeenCalled();
  });
  it("CA-E2-37: acepta año bisiesto e instantes equivalentes con offset", () => {
    expect(
      validarActualizacionPartida(
        { ...entrada(), fecha: "2000-02-29T12:00:00-05:00" },
        ahora,
      ).fecha.toISOString(),
    ).toBe("2000-02-29T17:00:00.000Z");
    expect(
      validarActualizacionPartida(
        { ...entrada(), fecha: "2026-11-11T12:00:00-05:00" },
        ahora,
      ).fecha.getTime(),
    ).toBe(ahora);
  });
  it.each([NaN, Infinity, true, null])(
    "CA-E2-40: rechaza tipos numéricos inválidos antes de casteo %s",
    (valor) => {
      expect(() =>
        validarActualizacionPartida(
          { ...entrada(), duracionMinutos: valor },
          ahora,
        ),
      ).toThrow(/duracionMinutos/);
      expect(() =>
        validarActualizacionPartida(
          { ...entrada(), porcentajeAvance: valor },
          ahora,
        ),
      ).toThrow(/porcentajeAvance/);
    },
  );
  it("CA-E2-40: copia sin mutar y conserva el valor por defecto de notas al crear", () => {
    const datosEntrada = Object.freeze({ ...entrada(), notas: "  Original  " });
    expect(validarActualizacionPartida(datosEntrada, ahora).notas).toBe(
      "Original",
    );
    expect(datosEntrada.notas).toBe("  Original  ");
    const { notas: _notas, ...sinNotas } = entrada();
    expect(
      validarCreacionPartida({ ...sinNotas, videojuego: juego }, ahora).notas,
    ).toBe("");
  });
});
