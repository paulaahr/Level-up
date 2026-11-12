import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { crearApp } from "../../src/app";
import { conectarDB } from "../../src/conexionDB";
import { Videojuego } from "../../src/modelos/Videojuego.model";
import { Partida } from "../../src/modelos/Partida.model";
import { Meta } from "../../src/modelos/Meta.model";
import type { ProgresoSemanal } from "../../src/dominio/progreso";

const configuracion = vi.hoisted(() => ({
  mongodbUri: "",
  mongodbDb: "level_up_integracion",
  frontendUrl: "http://127.0.0.1:4175",
  puerto: 3187,
}));
vi.mock("../../src/config/env", () => ({ env: configuracion }));
const { iniciarReplica } = require("../soporte/replica.cjs") as {
  iniciarReplica(
    nombre?: string,
  ): Promise<{ uri: string; cerrar(): Promise<void> }>;
};
type Cuerpo = {
  error?: string;
  requestId: string;
  meta: { _id: string; activa: boolean; createdAt: string; updatedAt: string };
  partida: { _id: string; videojuego: string };
  progreso: ProgresoSemanal;
  videojuego: { _id: string; estado: string };
};
let replica: Awaited<ReturnType<typeof iniciarReplica>>;
let servidor: Server;
let base: string;
const execOriginal = mongoose.Query.prototype.exec;
type ConsultaInstrumentada = mongoose.Query<unknown, unknown> & {
  readonly op: string;
};
async function pedir(metodo: string, ruta: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${base}/api${ruta}`, {
    method: metodo,
    headers:
      cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await respuesta.text();
  const json = texto ? (JSON.parse(texto) as Cuerpo) : undefined;
  if (json) expect(json.requestId).toBe(respuesta.headers.get("X-Request-Id"));
  return { estado: respuesta.status, json: json!, texto };
}
async function juego(nombre = "Juego sintético") {
  return Videojuego.create({
    nombre,
    genero: "RPG",
    plataforma: "PC",
    estado: "Jugando",
    logros: [{ nombre: "Logro manual", obtenido: true }],
  });
}
const datosMeta = (
  videojuego: string,
  cambios: Record<string, unknown> = {},
) => ({
  videojuego,
  horasSemanales: 5,
  diasPorSemana: 4,
  hitos: [{ descripcion: "Mitad", porcentajeObjetivo: 50 }],
  ...cambios,
});
const datosPartida = (
  videojuego: string,
  cambios: Record<string, unknown> = {},
) => ({
  videojuego,
  fecha: inicioDeHoy().toISOString(),
  duracionMinutos: 60,
  porcentajeAvance: 20,
  notas: "Registro sintético",
  ...cambios,
});
function inicioDeHoy(): Date {
  const fecha = new Date();
  if (fecha.getUTCHours() < 5) fecha.setUTCDate(fecha.getUTCDate() - 1);
  fecha.setUTCHours(5, 0, 0, 0);
  return fecha;
}
async function estadoJuego(id: string) {
  return JSON.stringify({
    juego: await Videojuego.findById(id).lean(),
    partidas: await Partida.find({ videojuego: id }).sort({ _id: 1 }).lean(),
    metas: await Meta.find({ videojuego: id }).sort({ _id: 1 }).lean(),
  });
}
async function failpoint(
  comandos: string[],
  modo: Record<string, number> | "alwaysOn",
  extra: Record<string, unknown> = {},
) {
  await mongoose.connection.db!.admin().command({
    configureFailPoint: "failCommand",
    mode: modo,
    data: { failCommands: comandos, errorCode: 2, errorLabels: [], ...extra },
  });
}
async function desactivarFailpoint() {
  if (mongoose.connection.readyState === 1)
    await mongoose.connection
      .db!.admin()
      .command({ configureFailPoint: "failCommand", mode: "off" });
}
function diferido() {
  let resolver!: () => void;
  const promesa = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}
function interceptarExec(
  interceptar: (
    consulta: ConsultaInstrumentada,
    ejecutar: () => Promise<unknown>,
  ) => Promise<unknown>,
) {
  mongoose.Query.prototype.exec = function (
    this: mongoose.Query<unknown, unknown>,
    ...argumentos: unknown[]
  ) {
    return interceptar(
      this as ConsultaInstrumentada,
      () => Reflect.apply(execOriginal, this, argumentos) as Promise<unknown>,
    );
  } as typeof execOriginal;
}

beforeAll(async () => {
  replica = await iniciarReplica();
  configuracion.mongodbUri = replica.uri;
  await conectarDB();
  await Promise.all([Videojuego.init(), Partida.init(), Meta.init()]);
  servidor = createServer(crearApp());
  await new Promise<void>((resolve) =>
    servidor.listen(0, "127.0.0.1", resolve),
  );
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
}, 240000);
beforeEach(async () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await desactivarFailpoint();
  await Promise.all([
    Partida.deleteMany({}),
    Meta.deleteMany({}),
    Videojuego.deleteMany({}),
  ]);
});
afterEach(async () => {
  mongoose.Query.prototype.exec = execOriginal;
  await desactivarFailpoint();
});
afterAll(async () => {
  if (servidor)
    await new Promise<void>((resolve) => {
      servidor.close(() => resolve());
      servidor.closeAllConnections();
    });
  await mongoose.disconnect();
  if (replica) await replica.cerrar();
});

describe("T-19: verificaciones reales con MongoDB 7.0.24 / replica set aislado", () => {
  it("T-03 / CA-E2-52: JSON mal formado produce 400 correlacionado en cuerpo, cabecera y logger", async () => {
    const respuesta = await fetch(`${base}/api/metas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"videojuego":',
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as {
      error: string;
      requestId: string;
    };
    expect(cuerpo.error).toBe("JSON mal formado");
    expect(cuerpo.requestId).toBe(respuesta.headers.get("X-Request-Id"));
    expect(cuerpo.requestId).toMatch(/^[a-f\d-]{36}$/i);
    expect(
      vi
        .mocked(console.log)
        .mock.calls.some(
          ([mensaje]) =>
            typeof mensaje === "string" &&
            mensaje.includes(`id=${cuerpo.requestId} POST /api/metas -> 400`),
        ),
    ).toBe(true);
  });
  it.each([
    ["mal-formado", 400],
    ["507f1f77bcf86cd799439022", 404],
  ])(
    "T-19 / CA-E2-33: GET meta %s responde %s con middleware real",
    async (id, estado) => {
      expect((await pedir("GET", `/metas/${id}`)).estado).toBe(estado);
    },
  );
  it("T-03 / CA-E2-53: fallo real del servidor Mongo produce 500 sin exponer el detalle", async () => {
    const padre = await juego();
    const meta = await Meta.create(datosMeta(String(padre._id)));
    await failpoint(["find"], "alwaysOn");
    try {
      const respuesta = await pedir("GET", `/metas/${meta._id}`);
      expect(respuesta.estado).toBe(500);
      expect(respuesta.json.error).toBe("Error interno del servidor");
      expect(respuesta.texto).not.toContain("failCommand");
      expect(respuesta.texto).not.toContain("MongoServerError");
      expect(
        vi
          .mocked(console.error)
          .mock.calls.some(
            ([mensaje]) =>
              typeof mensaje === "string" &&
              mensaje.includes(`id=${respuesta.json.requestId} ERROR:`),
          ),
      ).toBe(true);
    } finally {
      await desactivarFailpoint();
    }
  });
  it("T-05 / CA-E2-01: crea, relee y actualiza timestamps persistidos", async () => {
    const padre = await juego();
    const creada = await pedir("POST", "/metas", datosMeta(String(padre._id)));
    expect(creada.estado).toBe(201);
    const id = creada.json.meta._id;
    const leida = await pedir("GET", `/metas/${id}`);
    expect(leida.estado).toBe(200);
    expect(leida.json.meta).toEqual(creada.json.meta);
    const antes = await Meta.findById(id).lean();
    const actualizada = await pedir("PUT", `/metas/${id}`, {
      horasSemanales: 6,
      diasPorSemana: 3,
      hitos: [],
    });
    expect(actualizada.estado).toBe(200);
    const despues = await Meta.findById(id).lean();
    expect(despues!.createdAt).toEqual(antes!.createdAt);
    expect(despues!.updatedAt.getTime()).toBeGreaterThan(
      antes!.updatedAt.getTime(),
    );
    expect(despues!.horasSemanales).toBe(6);
  });
  it.each([
    ["CA-E2-03", { horasSemanales: 0 }],
    ["CA-E2-04", { diasPorSemana: 1.5 }],
    [
      "CA-E2-05",
      {
        hitos: Array.from({ length: 6 }, () => ({
          descripcion: "Hito",
          porcentajeObjetivo: 50,
        })),
      },
    ],
    ["CA-E2-06", { hitos: [{ descripcion: "Hito", porcentajeObjetivo: 101 }] }],
  ])(
    "T-05 / %s: edición inválida 400 conserva el documento persistido completo",
    async (_criterio, cambios) => {
      const padre = await juego();
      const meta = await Meta.create(datosMeta(String(padre._id)));
      const anterior = JSON.stringify(await Meta.findById(meta._id).lean());
      const r = await pedir("PUT", `/metas/${meta._id}`, {
        horasSemanales: 6,
        diasPorSemana: 2,
        hitos: [],
        ...cambios,
      });
      expect(r.estado).toBe(400);
      expect(JSON.stringify(await Meta.findById(meta._id).lean())).toBe(
        anterior,
      );
    },
  );
  it("T-06 / CA-E2-09: dos creaciones concurrentes dejan una activa mediante índice real", async () => {
    const padre = await juego();
    const indices = await Meta.collection.indexes();
    expect(indices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unique: true,
          key: { videojuego: 1 },
          partialFilterExpression: { activa: true },
        }),
      ]),
    );
    const resultados = await Promise.all([
      pedir("POST", "/metas", datosMeta(String(padre._id))),
      pedir("POST", "/metas", datosMeta(String(padre._id))),
    ]);
    expect(resultados.map((r) => r.estado).sort()).toEqual([201, 409]);
    expect(
      await Meta.countDocuments({ videojuego: padre._id, activa: true }),
    ).toBe(1);
  });
  it("T-06 / CA-E2-10: inactivas y meta de otro juego permanecen intactas", async () => {
    const padre = await juego(),
      otro = await juego("Otro juego");
    const anteriores = await Meta.create([
      datosMeta(String(padre._id), { activa: false }),
      datosMeta(String(padre._id), { activa: false }),
      datosMeta(String(otro._id)),
    ]);
    const antes = JSON.stringify(
      await Meta.find({ _id: { $in: anteriores.map((m) => m._id) } })
        .sort({ _id: 1 })
        .lean(),
    );
    expect(
      (await pedir("POST", "/metas", datosMeta(String(padre._id)))).estado,
    ).toBe(201);
    expect(
      JSON.stringify(
        await Meta.find({ _id: { $in: anteriores.map((m) => m._id) } })
          .sort({ _id: 1 })
          .lean(),
      ),
    ).toBe(antes);
    expect(
      await Meta.countDocuments({ videojuego: padre._id, activa: false }),
    ).toBe(2);
  });
  it("T-06 / CA-E2-11: creación o reactivación conflictiva 409 no modifica metas persistidas", async () => {
    const padre = await juego();
    const [activa, anterior] = await Meta.create([
      datosMeta(String(padre._id)),
      datosMeta(String(padre._id), { activa: false }),
    ]);
    const antes = await estadoJuego(String(padre._id));
    expect(
      (await pedir("POST", "/metas", datosMeta(String(padre._id)))).estado,
    ).toBe(409);
    expect(
      (
        await pedir("PUT", `/metas/${anterior._id}`, {
          horasSemanales: 2,
          diasPorSemana: 1,
          hitos: [],
          activa: true,
        })
      ).estado,
    ).toBe(409);
    expect(await estadoJuego(String(padre._id))).toBe(antes);
    expect((await Meta.findById(activa._id))!.activa).toBe(true);
  });
  it("T-06 / CA-E2-35: completar y activar concurrentemente conservan la restricción real", async () => {
    const padre = await juego();
    const respuestas = await Promise.all([
      pedir("POST", "/metas", datosMeta(String(padre._id))),
      pedir("PUT", `/videojuegos/${padre._id}`, { estado: "Completado" }),
    ]);
    expect(
      respuestas.filter((r) => r.estado >= 200 && r.estado < 300),
    ).toHaveLength(1);
    expect(respuestas.filter((r) => r.estado === 409)).toHaveLength(1);
    const estado = (await Videojuego.findById(padre._id))!.estado;
    const metas = await Meta.countDocuments({
      videojuego: padre._id,
      activa: true,
    });
    expect(estado === "Completado" && metas > 0).toBe(false);
  });
  it("T-06 / CA-E2-35: fallo real al guardar revierte la escritura previa de la guarda", async () => {
    const padre = await juego();
    const antes = await estadoJuego(String(padre._id));
    await failpoint(["update"], "alwaysOn");
    try {
      expect(
        (
          await pedir("PUT", `/videojuegos/${padre._id}`, {
            estado: "Completado",
            descripcion: "No debe persistir",
          })
        ).estado,
      ).toBe(500);
    } finally {
      await desactivarFailpoint();
    }
    expect(await estadoJuego(String(padre._id))).toBe(antes);
  });
  it("T-11 / CA-E2-13 / CA-E2-30: el snapshot real no mezcla meta ni historial posteriores", async () => {
    const padre = await juego();
    const meta = await Meta.create(datosMeta(String(padre._id)));
    await Partida.create(datosPartida(String(padre._id)));
    let intercalada = false;
    // Barrera de planificación: se ejecuta la consulta ORIGINAL contra MongoDB;
    // no se sustituye ningún resultado. La escritura concurrente es otro HTTP real.
    interceptarExec(async (consulta, ejecutar) => {
      const resultado = await ejecutar();
      if (
        !intercalada &&
        consulta.model.modelName === "Videojuego" &&
        consulta.op === "findOne" &&
        consulta.getOptions().session
      ) {
        intercalada = true;
        expect(
          (
            await pedir("PUT", `/metas/${meta._id}`, {
              horasSemanales: 1,
              diasPorSemana: 1,
              hitos: [],
            })
          ).estado,
        ).toBe(200);
        expect(
          (
            await pedir(
              "POST",
              "/partidas",
              datosPartida(String(padre._id), { duracionMinutos: 60 }),
            )
          ).estado,
        ).toBe(201);
      }
      return resultado;
    });
    const r = await pedir("GET", `/videojuegos/${padre._id}/progreso-semanal`);
    expect(r.estado).toBe(200);
    expect(intercalada).toBe(true);
    expect(r.json.progreso).toMatchObject({
      horasSemana: 1,
      porcentajeHoras: 20,
      meta: { horasSemanales: 5 },
    });
    mongoose.Query.prototype.exec = execOriginal;
    const actual = await pedir(
      "GET",
      `/videojuegos/${padre._id}/progreso-semanal`,
    );
    expect(actual.json.progreso).toMatchObject({
      horasSemana: 2,
      porcentajeHoras: 100,
      meta: { horasSemanales: 1 },
    });
  });
  it("T-11 / CA-E2-22 / CA-E2-24: historial persistido de seis días prueba racha rota y mejor histórica", async () => {
    const padre = await juego();
    const hoy = new Date();
    const dias = [12, 11, 10, 9, 8, 4];
    for (const anterior of dias)
      await Partida.create(
        datosPartida(String(padre._id), {
          fecha: new Date(hoy.getTime() - anterior * 86400000),
        }),
      );
    const r = await pedir("GET", `/videojuegos/${padre._id}/progreso-semanal`);
    expect(r.estado).toBe(200);
    expect(r.json.progreso).toMatchObject({
      rachaActual: 0,
      mejorRacha: 5,
      meta: null,
      porcentajeHoras: null,
      hitos: [],
    });
    expect(await Partida.countDocuments({ videojuego: padre._id })).toBe(6);
    // CA-E2-23/25: racha vigente desde ayer y deduplicación de ese día.
    const ayer = new Date(hoy.getTime() - 86400000);
    await Partida.create(datosPartida(String(padre._id), { fecha: ayer }));
    expect(
      (await pedir("GET", `/videojuegos/${padre._id}/progreso-semanal`)).json
        .progreso.rachaActual,
    ).toBe(1);
    await Partida.create(datosPartida(String(padre._id), { fecha: ayer }));
    expect(
      (await pedir("GET", `/videojuegos/${padre._id}/progreso-semanal`)).json
        .progreso.rachaActual,
    ).toBe(1);
    await Partida.create(datosPartida(String(padre._id), { fecha: hoy }));
    expect(
      (await pedir("GET", `/videojuegos/${padre._id}/progreso-semanal`)).json
        .progreso,
    ).toMatchObject({ rachaActual: 2, mejorRacha: 5 });
  });
  it("T-12 / CA-E2-37 a CA-E2-42: registrar, editar, borrar y releer progreso con datos persistidos", async () => {
    const padre = await juego();
    const id = String(padre._id);
    const fecha = new Date(Date.now() - 1000).toISOString();
    await Meta.create(datosMeta(id));
    const creada = await pedir(
      "POST",
      "/partidas",
      datosPartida(id, { fecha }),
    );
    expect(creada.estado).toBe(201);
    const progreso = () => pedir("GET", `/videojuegos/${id}/progreso-semanal`);
    expect((await progreso()).json.progreso.horasSemana).toBe(1);
    const partidaId = creada.json.partida._id;
    const original = JSON.stringify(await Partida.findById(partidaId).lean());
    expect(
      (
        await pedir("PUT", `/partidas/${partidaId}`, {
          fecha,
          duracionMinutos: 0,
          porcentajeAvance: 60,
          notas: "Inválida",
        })
      ).estado,
    ).toBe(400);
    expect(JSON.stringify(await Partida.findById(partidaId).lean())).toBe(
      original,
    );
    expect(
      (
        await pedir("PUT", `/partidas/${partidaId}`, {
          fecha,
          duracionMinutos: 120,
          porcentajeAvance: 60,
          notas: "Editada",
        })
      ).estado,
    ).toBe(200);
    expect((await progreso()).json.progreso).toMatchObject({
      horasSemana: 2,
      diasJugadosSemana: 1,
      hitos: [expect.objectContaining({ alcanzado: true })],
    });
    expect((await pedir("DELETE", `/partidas/${partidaId}`)).estado).toBe(204);
    expect((await progreso()).json.progreso).toMatchObject({
      horasSemana: 0,
      diasJugadosSemana: 0,
      rachaActual: 0,
      mejorRacha: 0,
    });
  });
  it("T-13 / CA-E2-45: fallos reales de cada borrado revierten todo y un commit reintentado se confirma completo", async () => {
    for (const omitir of [0, 1, 2]) {
      const padre = await juego();
      const id = String(padre._id);
      await Partida.create(datosPartida(id));
      await Meta.create(datosMeta(id));
      const antes = await estadoJuego(id);
      await failpoint(["delete"], omitir === 0 ? "alwaysOn" : { skip: omitir });
      try {
        expect((await pedir("DELETE", `/videojuegos/${id}`)).estado).toBe(500);
      } finally {
        await desactivarFailpoint();
      }
      expect(await estadoJuego(id)).toBe(antes);
    }
    const padre = await juego();
    const id = String(padre._id);
    await Partida.create(datosPartida(id));
    await Meta.create(datosMeta(id));
    await failpoint(
      ["commitTransaction"],
      { times: 1 },
      { errorCode: 64, errorLabels: ["UnknownTransactionCommitResult"] },
    );
    try {
      expect((await pedir("DELETE", `/videojuegos/${id}`)).estado).toBe(204);
    } finally {
      await desactivarFailpoint();
    }
    expect(await Videojuego.countDocuments({ _id: id })).toBe(0);
    expect(await Meta.countDocuments({ videojuego: id })).toBe(0);
    expect(await Partida.countDocuments({ videojuego: id })).toBe(0);
  });
  it("T-13 / CA-E2-46: creación y eliminación intercaladas en ambos órdenes no dejan hijos huérfanos", async () => {
    for (const tipo of ["partida", "meta"] as const) {
      for (const primero of ["hijo", "borrado"] as const) {
        const padre = await juego();
        const id = String(padre._id);
        const guardaTomada = diferido(),
          segundoIntento = diferido(),
          liberar = diferido();
        let contador = 0;
        interceptarExec(async (consulta, ejecutar) => {
          if (
            consulta.model.modelName !== "Videojuego" ||
            consulta.op !== "findOneAndUpdate"
          )
            return ejecutar();
          contador += 1;
          if (contador === 1) {
            const resultado = await ejecutar();
            guardaTomada.resolver();
            await liberar.promesa;
            return resultado;
          }
          segundoIntento.resolver();
          return ejecutar();
        });
        const crearHijo = () =>
          tipo === "partida"
            ? pedir("POST", "/partidas", datosPartida(id))
            : pedir("POST", "/metas", datosMeta(id));
        const inicial =
          primero === "hijo"
            ? crearHijo()
            : pedir("DELETE", `/videojuegos/${id}`);
        await guardaTomada.promesa;
        const posterior =
          primero === "hijo"
            ? pedir("DELETE", `/videojuegos/${id}`)
            : crearHijo();
        try {
          await segundoIntento.promesa;
        } finally {
          liberar.resolver();
        }
        const resultados = await Promise.all([inicial, posterior]);
        mongoose.Query.prototype.exec = execOriginal;
        expect(resultados.map((r) => r.estado)).toEqual(
          primero === "hijo" ? [201, 204] : [204, 404],
        );
        expect(await Videojuego.countDocuments({ _id: id })).toBe(0);
        expect(await Partida.countDocuments({ videojuego: id })).toBe(0);
        expect(await Meta.countDocuments({ videojuego: id })).toBe(0);
      }
    }
  });
});
