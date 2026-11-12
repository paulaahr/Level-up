import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import mongoose, { ClientSession, HydratedDocument, Types } from "mongoose";
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
import { Meta, IMeta } from "../src/modelos/Meta.model";
import { Videojuego } from "../src/modelos/Videojuego.model";

vi.mock("../src/config/env", () => ({
  env: { frontendUrl: "http://localhost:5173" },
}));

// Integracion HTTP con rutas, controladores, servicios y validacion reales.
// Mongoose simulado: NO verifica persistencia, rollback, indice creado,
// timestamps escritos ni concurrencia real en MongoDB.
const juego = "507f1f77bcf86cd799439011";
const otroJuego = "507f1f77bcf86cd799439012";
const idMeta = "607f1f77bcf86cd799439011";
const idAnterior = "607f1f77bcf86cd799439012";
const ausente = "707f1f77bcf86cd799439011";
const instante = new Date("2026-11-11T17:00:00.000Z");
const sesion = {} as ClientSession;
type MetaGuardada = IMeta & { _id: Types.ObjectId; __v: number };
interface MetaPublica {
  _id: string;
  videojuego: string;
  horasSemanales: number;
  diasPorSemana: number;
  activa: boolean;
  hitos: { descripcion: string; porcentajeObjetivo: number }[];
  createdAt: string;
  updatedAt: string;
}
interface CuerpoRespuesta {
  requestId: string;
  error?: string;
  meta: MetaPublica;
  metas: MetaPublica[];
  total: number;
}
const metas = new Map<string, MetaGuardada>();
const documentosLeidos: HydratedDocument<IMeta>[] = [];
const juegos = new Map<string, { _id: Types.ObjectId; estado: string }>();
let falloEscritura: unknown;
let falloConsulta: unknown;
let falloIndice: unknown;
let falloCommit: unknown;
let server: Server;
let base: string;

const objetivos = () => ({
  horasSemanales: 5,
  diasPorSemana: 4,
  hitos: [{ descripcion: "Primer avance", porcentajeObjetivo: 25 }],
});

function sembrarMeta(id = idMeta, activa = true, videojuego = juego): void {
  metas.set(id, {
    _id: new Types.ObjectId(id),
    videojuego: new Types.ObjectId(videojuego),
    ...objetivos(),
    activa,
    createdAt: instante,
    updatedAt: instante,
    __v: 0,
  });
}

function documento(datos: MetaGuardada) {
  const doc = Meta.hydrate({
    ...datos,
    hitos: datos.hitos.map((hito) => ({ ...hito })),
  });
  vi.spyOn(doc, "save").mockImplementation(async () => {
    if (falloEscritura) throw falloEscritura;
    const error = doc.validateSync();
    if (error) throw error;
    metas.set(doc._id.toString(), doc.toObject() as MetaGuardada);
    return doc;
  });
  documentosLeidos.push(doc);
  return doc;
}

function consulta<T>(resultado: () => T) {
  const query = {
    session: vi.fn(() => query),
    maxTimeMS: vi.fn(() => query),
    sort: vi.fn(() => query),
    exec: async () => {
      if (falloConsulta) throw falloConsulta;
      return resultado();
    },
    then: <R1 = T, R2 = never>(
      resuelto?: ((valor: T) => R1 | PromiseLike<R1>) | null,
      rechazado?: ((razon: unknown) => R2 | PromiseLike<R2>) | null,
    ) => query.exec().then(resuelto, rechazado),
  };
  return query;
}

async function pedir(metodo: string, ruta: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers:
      cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const json = (await respuesta.json()) as CuerpoRespuesta;
  expect(json.requestId).toBe(respuesta.headers.get("x-request-id"));
  expect(json.requestId).toEqual(expect.any(String));
  return { status: respuesta.status, json };
}

beforeAll(async () => {
  server = createServer(crearApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
});

beforeEach(() => {
  metas.clear();
  documentosLeidos.length = 0;
  juegos.clear();
  juegos.set(juego, { _id: new Types.ObjectId(juego), estado: "Jugando" });
  juegos.set(otroJuego, {
    _id: new Types.ObjectId(otroJuego),
    estado: "En pausa",
  });
  falloEscritura = undefined;
  falloConsulta = undefined;
  falloIndice = undefined;
  falloCommit = undefined;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(Meta, "init").mockImplementation(async () => {
    if (falloIndice) throw falloIndice;
    return Meta as unknown as Awaited<ReturnType<typeof Meta.init>>;
  });
  vi.spyOn(mongoose.connection, "getClient").mockReturnValue({
    options: {},
  } as unknown as ReturnType<typeof mongoose.connection.getClient>);
  vi.spyOn(mongoose.connection, "transaction").mockImplementation(
    async (operacion) => {
      const resultado = await operacion(sesion);
      if (falloCommit) throw falloCommit;
      return resultado;
    },
  );
  vi.spyOn(Videojuego, "findOneAndUpdate").mockImplementation(
    (filtro: unknown) =>
      consulta(
        () => juegos.get(String((filtro as { _id: unknown })._id)) ?? null,
      ) as unknown as ReturnType<typeof Videojuego.findOneAndUpdate>,
  );
  vi.spyOn(Videojuego, "exists").mockImplementation(
    (filtro: unknown) =>
      consulta(() =>
        juegos.has(String((filtro as { _id: unknown })._id))
          ? {
              _id: new Types.ObjectId(String((filtro as { _id: unknown })._id)),
            }
          : null,
      ) as unknown as ReturnType<typeof Videojuego.exists>,
  );
  vi.spyOn(Meta, "findById").mockImplementation(
    (id) =>
      consulta(() => {
        const datos = metas.get(String(id));
        return datos ? documento(datos) : null;
      }) as unknown as ReturnType<typeof Meta.findById>,
  );
  vi.spyOn(Meta, "find").mockImplementation(
    (filtro: unknown = {}) =>
      consulta(() =>
        Array.from(metas.values())
          .filter(
            (meta) =>
              meta.videojuego.toString() ===
              String((filtro as { videojuego: unknown }).videojuego),
          )
          .sort(
            (a, b) =>
              b.createdAt.getTime() - a.createdAt.getTime() ||
              b._id.toString().localeCompare(a._id.toString()),
          )
          .map(documento),
      ) as unknown as ReturnType<typeof Meta.find>,
  );
  vi.spyOn(Meta, "create").mockImplementation((async (datos: unknown) => {
    if (falloEscritura) throw falloEscritura;
    const entrada = (datos as Record<string, unknown>[])[0];
    const doc = new Meta(entrada);
    doc.createdAt = instante;
    doc.updatedAt = instante;
    const error = doc.validateSync();
    if (error) throw error;
    metas.set(doc._id.toString(), doc.toObject() as MetaGuardada);
    return [doc];
  }) as typeof Meta.create);
});

describe("T-05: API de metas sin MongoDB, adaptador controlado", () => {
  it("CA-E2-01: crea una meta activa valida y permite consultarla", async () => {
    const creada = await pedir("POST", "/api/metas", {
      videojuego: juego,
      ...objetivos(),
    });
    expect(creada.status).toBe(201);
    expect(creada.json.meta).toMatchObject({
      videojuego: juego,
      ...objetivos(),
      activa: true,
    });
    expect(creada.json.meta).not.toHaveProperty("__v");
    expect(creada.json.meta.hitos[0]).not.toHaveProperty("_id");
    expect(creada.json.meta.hitos[0]).not.toHaveProperty("alcanzado");
    const leida = await pedir("GET", `/api/metas/${creada.json.meta._id}`);
    expect(leida.status).toBe(200);
    expect(leida.json.meta).toEqual(creada.json.meta);
    expect(Meta.db.readyState).toBe(0);
    expect(Meta.init).toHaveBeenCalled();
    expect(vi.mocked(Meta.init).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(mongoose.connection.transaction).mock.invocationCallOrder[0],
    );
    expect(Videojuego.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: juego },
      { $inc: { __v: 1 } },
      expect.objectContaining({
        session: sesion,
        new: true,
        timestamps: false,
        projection: { estado: 1 },
      }),
    );
    expect(Meta.create).toHaveBeenCalledWith(
      [expect.objectContaining({ videojuego: juego })],
      expect.objectContaining({ session: sesion }),
    );
  });

  it("CA-E2-07: rechaza creacion con juego inexistente sin intentar crear", async () => {
    const resultado = await pedir("POST", "/api/metas", {
      videojuego: ausente,
      ...objetivos(),
    });
    expect(resultado.status).toBe(404);
    expect(Meta.create).not.toHaveBeenCalled();
    expect(metas.size).toBe(0);
  });

  it("CA-E2-02: consulta individual y lista solo metas del videojuego, incluidas inactivas", async () => {
    sembrarMeta();
    sembrarMeta(idAnterior, false);
    sembrarMeta(ausente, true, otroJuego);
    const individual = await pedir("GET", `/api/metas/${idMeta}`);
    const listado = await pedir("GET", `/api/videojuegos/${juego}/metas`);
    expect(individual.status).toBe(200);
    expect(listado.status).toBe(200);
    expect(listado.json.total).toBe(2);
    expect(Meta.find).toHaveBeenCalledWith({ videojuego: juego });
    expect(
      vi.mocked(Meta.find).mock.results[0].value.sort,
    ).toHaveBeenCalledWith({
      createdAt: -1,
      _id: -1,
    });
    expect(listado.json.metas.map((meta) => meta._id)).toEqual([
      idAnterior,
      idMeta,
    ]);
    expect(listado.json.metas.find((meta) => meta._id === idMeta)).toEqual(
      individual.json.meta,
    );
    expect(
      listado.json.metas.find((meta) => meta._id === idAnterior)?.activa,
    ).toBe(false);
  });

  it("CA-E2-02: devuelve lista vacia para juego existente sin metas", async () => {
    const resultado = await pedir("GET", `/api/videojuegos/${juego}/metas`);
    expect(resultado.status).toBe(200);
    expect(resultado.json).toMatchObject({ total: 0, metas: [] });
  });

  it("CA-E2-12: actualiza objetivos y reemplaza todos los hitos sin alterar la ficha del juego", async () => {
    sembrarMeta();
    const ficha = { ...juegos.get(juego) };
    const cambios = {
      horasSemanales: 0.5,
      diasPorSemana: 7,
      hitos: [{ descripcion: "", porcentajeObjetivo: 50.5 }],
    };
    const resultado = await pedir("PUT", `/api/metas/${idMeta}`, cambios);
    expect(resultado.status).toBe(200);
    expect(resultado.json.meta).toMatchObject({
      ...cambios,
      activa: true,
      videojuego: juego,
    });
    expect(juegos.get(juego)).toEqual(ficha);
    expect(
      vi.mocked(Meta.findById).mock.results[0].value.session,
    ).toHaveBeenCalledWith(sesion);
    expect(documentosLeidos[0].save).toHaveBeenCalledWith({ session: sesion });
    const leida = await pedir("GET", `/api/metas/${idMeta}`);
    expect(leida.json.meta).toEqual(resultado.json.meta);
  });

  it("CA-E2-12: omitir activa al editar conserva una meta inactiva", async () => {
    sembrarMeta(idMeta, false);
    const resultado = await pedir("PUT", `/api/metas/${idMeta}`, objetivos());
    expect(resultado.status).toBe(200);
    expect(resultado.json.meta.activa).toBe(false);
  });

  it("CA-E2-14: desactiva conservando objetivos e hitos y es idempotente", async () => {
    sembrarMeta();
    const desactivada = await pedir("PATCH", `/api/metas/${idMeta}/desactivar`);
    expect(desactivada.status).toBe(200);
    expect(desactivada.json.meta).toMatchObject({
      ...objetivos(),
      activa: false,
    });
    expect(
      vi.mocked(Meta.findById).mock.results[0].value.session,
    ).toHaveBeenCalledWith(sesion);
    expect(documentosLeidos[0].save).toHaveBeenCalledWith({ session: sesion });
    const repetida = await pedir(
      "PATCH",
      `/api/metas/${idMeta}/desactivar`,
      {},
    );
    expect(repetida.status).toBe(200);
    expect(repetida.json.meta.activa).toBe(false);
    expect(
      vi.mocked(Meta.findById).mock.results[1].value.session,
    ).toHaveBeenCalledWith(sesion);
    expect(documentosLeidos[1].save).not.toHaveBeenCalled();
    expect(metas.size).toBe(1);
  });

  it("CA-E2-15: conserva metas anteriores inactivas al crear otra", async () => {
    sembrarMeta(idAnterior, false);
    const anterior = await pedir("GET", `/api/metas/${idAnterior}`);
    const creada = await pedir("POST", "/api/metas", {
      videojuego: juego,
      ...objetivos(),
    });
    expect(creada.status).toBe(201);
    const listado = await pedir("GET", `/api/videojuegos/${juego}/metas`);
    expect(listado.json.total).toBe(2);
    expect(listado.json.metas.find((meta) => meta._id === idAnterior)).toEqual(
      anterior.json.meta,
    );
  });

  const rutasInvalidas: [string, string, unknown?][] = [
    ["GET", "/api/metas/invalido"],
    ["PUT", "/api/metas/invalido", objetivos()],
    ["PATCH", "/api/metas/invalido/desactivar"],
    ["GET", "/api/videojuegos/invalido/metas"],
    ["POST", "/api/metas", { videojuego: "invalido", ...objetivos() }],
  ];
  it.each(rutasInvalidas)(
    "CA-E2-07/08: %s %s rechaza ID invalido con 400 antes de consultar",
    async (metodo, ruta, cuerpo) => {
      const resultado = await pedir(metodo, ruta, cuerpo);
      expect(resultado.status).toBe(400);
      expect(Meta.findById).not.toHaveBeenCalled();
      expect(Meta.create).not.toHaveBeenCalled();
      expect(Videojuego.exists).not.toHaveBeenCalled();
      expect(Videojuego.findOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  const rutasAusentes: [string, string, unknown?][] = [
    ["GET", `/api/metas/${ausente}`],
    ["PUT", `/api/metas/${ausente}`, objetivos()],
    ["PATCH", `/api/metas/${ausente}/desactivar`],
    ["GET", `/api/videojuegos/${ausente}/metas`],
  ];
  it.each(rutasAusentes)(
    "CA-E2-08: %s %s responde 404 para recurso ausente",
    async (metodo, ruta, cuerpo) => {
      const resultado = await pedir(metodo, ruta, cuerpo);
      expect(resultado.status).toBe(404);
      expect(Meta.create).not.toHaveBeenCalled();
    },
  );

  const cambiosInvalidos: [string, Record<string, unknown>][] = [
    ["horasSemanales", { horasSemanales: "5" }],
    ["horasSemanales", { horasSemanales: 0 }],
    ["diasPorSemana", { diasPorSemana: 1.5 }],
    [
      "hitos",
      {
        hitos: Array.from({ length: 6 }, () => ({
          descripcion: "",
          porcentajeObjetivo: 25,
        })),
      },
    ],
    [
      "porcentajeObjetivo",
      { hitos: [{ descripcion: "", porcentajeObjetivo: 101 }] },
    ],
    ["descripcion", { hitos: [{ porcentajeObjetivo: 25 }] }],
    ["updatedAt", { updatedAt: instante.toISOString() }],
    ["videojuego", { videojuego: otroJuego }],
  ];
  it.each(cambiosInvalidos)(
    "CA-E2-03 a 06/12: rechaza %s invalido sin mutar la meta ni iniciar escrituras",
    async (campo, cambios) => {
      sembrarMeta();
      const anterior = await pedir("GET", `/api/metas/${idMeta}`);
      const resultado = await pedir("PUT", `/api/metas/${idMeta}`, {
        ...objetivos(),
        ...cambios,
      });
      expect(resultado.status).toBe(400);
      expect(resultado.json.error).toContain(campo);
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
      expect(Meta.create).not.toHaveBeenCalled();
      const posterior = await pedir("GET", `/api/metas/${idMeta}`);
      expect(posterior.json.meta).toEqual(anterior.json.meta);
    },
  );

  it.each(cambiosInvalidos.filter(([campo]) => campo !== "videojuego"))(
    "CA-E2-03 a 06: crear rechaza %s invalido antes de escribir",
    async (campo, cambios) => {
      const resultado = await pedir("POST", "/api/metas", {
        videojuego: juego,
        ...objetivos(),
        ...cambios,
      });
      expect(resultado.status).toBe(400);
      expect(resultado.json.error).toContain(campo);
      expect(Meta.create).not.toHaveBeenCalled();
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
      expect(metas.size).toBe(0);
    },
  );

  it.each(["POST", "PUT"])(
    "CA-E2-03/04: %s rechaza campos obligatorios ausentes",
    async (metodo) => {
      sembrarMeta();
      const resultado = await pedir(
        metodo,
        metodo === "POST" ? "/api/metas" : `/api/metas/${idMeta}`,
        metodo === "POST" ? { videojuego: juego } : { hitos: [] },
      );
      expect(resultado.status).toBe(400);
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
      expect(metas.get(idMeta)?.horasSemanales).toBe(5);
    },
  );

  it("CA-E2-14: desactivar rechaza cuerpos con cambios adicionales", async () => {
    sembrarMeta();
    const resultado = await pedir("PATCH", `/api/metas/${idMeta}/desactivar`, {
      horasSemanales: 1,
    });
    expect(resultado.status).toBe(400);
    expect(metas.get(idMeta)?.activa).toBe(true);
    expect(mongoose.connection.transaction).not.toHaveBeenCalled();
  });

  it("CA-E2-11/53: E11000 controlado en creacion devuelve 409 sin alterar vigente", async () => {
    sembrarMeta();
    const vigente = await pedir("GET", `/api/metas/${idMeta}`);
    falloEscritura = Object.assign(new Error("secret duplicate key metas"), {
      code: 11000,
    });
    const resultado = await pedir("POST", "/api/metas", {
      videojuego: juego,
      ...objetivos(),
    });
    expect(resultado.status).toBe(409);
    expect(resultado.json.error).not.toContain("secret");
    expect(metas.size).toBe(1);
    const despues = await pedir("GET", `/api/metas/${idMeta}`);
    expect(despues.json.meta).toEqual(vigente.json.meta);
  });

  it("CA-E2-11/53: E11000 controlado en reactivacion devuelve 409", async () => {
    sembrarMeta();
    sembrarMeta(idAnterior, false);
    falloEscritura = Object.assign(new Error("duplicate key"), { code: 11000 });
    const resultado = await pedir("PUT", `/api/metas/${idAnterior}`, {
      ...objetivos(),
      activa: true,
    });
    expect(resultado.status).toBe(409);
    expect(metas.get(idAnterior)?.activa).toBe(false);
    expect(metas.get(idMeta)?.activa).toBe(true);
  });

  it.each(["POST", "PUT"])(
    "CA-E2-34: %s no activa metas para Completado",
    async (metodo) => {
      juegos.get(juego)!.estado = "Completado";
      sembrarMeta(idMeta, false);
      const resultado = await pedir(
        metodo,
        metodo === "POST" ? "/api/metas" : `/api/metas/${idMeta}`,
        {
          ...objetivos(),
          activa: true,
          ...(metodo === "POST" ? { videojuego: juego } : {}),
        },
      );
      expect(resultado.status).toBe(409);
      expect(Meta.create).not.toHaveBeenCalled();
      expect(metas.get(idMeta)?.activa).toBe(false);
    },
  );

  it("CA-E2-34: admite guardar meta inactiva para Completado", async () => {
    juegos.get(juego)!.estado = "Completado";
    const resultado = await pedir("POST", "/api/metas", {
      videojuego: juego,
      ...objetivos(),
      activa: false,
    });
    expect(resultado.status).toBe(201);
    expect(resultado.json.meta.activa).toBe(false);
  });

  it("CA-E2-36: permite meta activa para En pausa", async () => {
    const resultado = await pedir("POST", "/api/metas", {
      videojuego: otroJuego,
      ...objetivos(),
    });
    expect(resultado.status).toBe(201);
    expect(resultado.json.meta.activa).toBe(true);
  });

  it("CA-E2-53: un error inesperado de consulta responde 500 opaco centralizado", async () => {
    falloConsulta = new Error("secret mongo internals");
    const resultado = await pedir("GET", `/api/metas/${idMeta}`);
    expect(resultado.status).toBe(500);
    expect(resultado.json.error).toBe("Error interno del servidor");
    expect(JSON.stringify(resultado.json)).not.toContain("secret");
    expect(console.error).toHaveBeenCalled();
  });

  it("CA-E2-53: no atiende creacion si falla inicializar el indice", async () => {
    falloIndice = new Error("index unavailable");
    const resultado = await pedir("POST", "/api/metas", {
      videojuego: juego,
      ...objetivos(),
    });
    expect(resultado.status).toBe(500);
    expect(Meta.create).not.toHaveBeenCalled();
    expect(metas.size).toBe(0);
  });

  it("CA-E2-53: si el commit falla no responde exito ni reejecuta la operacion", async () => {
    falloCommit = Object.assign(new Error("unknown commit result"), {
      hasErrorLabel: (etiqueta: string) =>
        etiqueta === "UnknownTransactionCommitResult",
    });
    const resultado = await pedir("POST", "/api/metas", {
      videojuego: juego,
      ...objetivos(),
    });
    expect(resultado.status).toBe(500);
    expect(Meta.create).toHaveBeenCalledTimes(1);
    expect(mongoose.connection.transaction).toHaveBeenCalledTimes(1);
    // El mock no simula rollback ni acredita el estado final de MongoDB.
  });

  it("cancelar la peticion HTTP detiene cooperativamente la creacion antes de escribir", async () => {
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
    const cancelacionRegistrada = diferido();
    server.once("request", (_req, res) => {
      res.once("close", respuestaCerrada.resolver);
    });
    vi.mocked(console.error).mockImplementation((...datos: unknown[]) => {
      if (
        datos.some(
          (dato) =>
            dato instanceof Error &&
            dato.name === "ErrorCancelacionTransaccion",
        )
      ) {
        cancelacionRegistrada.resolver();
      }
    });
    vi.mocked(Videojuego.findOneAndUpdate).mockImplementationOnce(
      (filtro: unknown) =>
        consulta(async () => {
          guardaIniciada.resolver();
          await liberarGuarda.promesa;
          return juegos.get(String((filtro as { _id: unknown })._id)) ?? null;
        }) as unknown as ReturnType<typeof Videojuego.findOneAndUpdate>,
    );
    const cancelacion = new AbortController();
    const resultado = fetch(`${base}/api/metas`, {
      method: "POST",
      signal: cancelacion.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videojuego: juego, ...objetivos() }),
    }).then(
      () => {
        throw new Error("La peticion cancelada no debe recibir respuesta");
      },
      (error: unknown) => error,
    );
    try {
      await guardaIniciada.promesa;
      cancelacion.abort();
      expect(await resultado).toMatchObject({ name: "AbortError" });
      await respuestaCerrada.promesa;
    } finally {
      liberarGuarda.resolver();
    }
    await cancelacionRegistrada.promesa;
    expect(Meta.create).not.toHaveBeenCalled();
    expect(documentosLeidos).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: "ErrorCancelacionTransaccion" }),
    );
    // No demuestra interrupcion del comando en vuelo ni rollback en MongoDB.
  });

  it("no incorpora DELETE de metas ni progreso semanal fuera del alcance", async () => {
    const eliminacion = await pedir("DELETE", `/api/metas/${idMeta}`);
    const progreso = await pedir(
      "GET",
      `/api/videojuegos/${juego}/progreso-semanal`,
    );
    expect(eliminacion.status).toBe(404);
    expect(progreso.status).toBe(404);
  });
});

describe("T-05: persistencia real - integracion pendiente con replica set aislado", () => {
  it.todo(
    "CA-E2-01: crear/consultar meta con timestamps persistidos y actualizados",
  );
  it.todo(
    "CA-E2-03: horas invalidas responden 400 y no alteran la meta persistida",
  );
  it.todo(
    "CA-E2-04: dias invalidos responden 400 y no alteran la meta persistida",
  );
  it.todo(
    "CA-E2-05: seis hitos responden 400 sin reemplazo parcial del arreglo",
  );
  it.todo(
    "CA-E2-06: hito invalido responde 400 y conserva todos los campos previos",
  );
});
