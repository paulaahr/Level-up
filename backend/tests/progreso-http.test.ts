import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose, { type ClientSession, Types } from "mongoose";
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
import type { ProgresoSemanal } from "../src/dominio/progreso";
import { Meta } from "../src/modelos/Meta.model";
import { Partida } from "../src/modelos/Partida.model";
import { Videojuego } from "../src/modelos/Videojuego.model";
import { obtener as obtenerProgreso } from "../src/services/progreso.service";

vi.mock("../src/config/env", () => ({
  env: { frontendUrl: "http://frontend.controlado" },
}));

// HTTP, servicios y dominio reales; solo el limite Mongoose esta simulado.
// Estas pruebas NO acreditan snapshot, persistencia, rollback o concurrencia
// reales. Los datos se mantienen en fixtures y no se abre ninguna conexion DB.
const juego = "507f1f77bcf86cd799439011";
const otroJuego = "507f1f77bcf86cd799439012";
const metaId = "607f1f77bcf86cd799439011";
const inexistente = "707f1f77bcf86cd799439011";
const sesion = {} as ClientSession;

interface PartidaFixture {
  _id: Types.ObjectId;
  videojuego: Types.ObjectId;
  fecha: Date;
  duracionMinutos: number;
  porcentajeAvance: number;
  createdAt: Date;
}

interface MetaFixture {
  _id: Types.ObjectId;
  videojuego: Types.ObjectId;
  activa: boolean;
  horasSemanales: number;
  diasPorSemana: number;
  hitos: { descripcion: string; porcentajeObjetivo: number }[];
}

interface CuerpoRespuesta {
  requestId: string;
  error?: string;
  progreso: ProgresoSemanal;
  resumen: { porcentajeAvanceActual: number; horasTotales: number };
}

type Origen = "videojuego" | "meta" | "partidas";
interface TrazaConsulta {
  origen: Origen;
  filtro: unknown;
  session: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  sort: ReturnType<typeof vi.fn>;
  maxTimeMS: ReturnType<typeof vi.fn>;
  lean: ReturnType<typeof vi.fn>;
}

const partidas: PartidaFixture[] = [];
const metas: MetaFixture[] = [];
const consultas: TrazaConsulta[] = [];
const orden: Origen[] = [];
let existeJuego: boolean;
let ahora: number;
let secuenciaId: number;
let falloConsulta: Origen | undefined;
let falloHelper: unknown;
let activas: number;
let maximoParalelas: number;
let servidor: Server;
let base: string;

function agregarPartida(
  fecha: string,
  minutos = 60,
  avance = 0,
  idJuego = juego,
): PartidaFixture {
  const partida: PartidaFixture = {
    _id: new Types.ObjectId((secuenciaId++).toString(16).padStart(24, "0")),
    videojuego: new Types.ObjectId(idJuego),
    fecha: new Date(fecha.includes("T") ? fecha : `${fecha}T12:00:00-05:00`),
    duracionMinutos: minutos,
    porcentajeAvance: avance,
    createdAt: new Date("2026-11-11T19:00:00.000Z"),
  };
  partidas.push(partida);
  return partida;
}

function agregarMeta(cambios: Partial<MetaFixture> = {}): MetaFixture {
  const meta: MetaFixture = {
    _id: new Types.ObjectId(metaId),
    videojuego: new Types.ObjectId(juego),
    activa: true,
    horasSemanales: 5,
    diasPorSemana: 4,
    hitos: [25, 50, 100].map((porcentajeObjetivo) => ({
      descripcion: `Hito ${porcentajeObjetivo}`,
      porcentajeObjetivo,
    })),
    ...cambios,
  };
  metas.push(meta);
  return meta;
}

function consulta<T>(
  origen: Origen,
  filtro: unknown,
  resolver: () => T | PromiseLike<T>,
) {
  let ordenamiento: Record<string, number> = {};
  const query = {
    session: vi.fn(() => query),
    select: vi.fn(() => query),
    sort: vi.fn((valor: Record<string, number>) => {
      ordenamiento = valor;
      return query;
    }),
    maxTimeMS: vi.fn(() => query),
    lean: vi.fn(() => query),
    exec: async (): Promise<T> => {
      orden.push(origen);
      activas++;
      maximoParalelas = Math.max(maximoParalelas, activas);
      try {
        await Promise.resolve();
        if (falloConsulta === origen)
          throw new Error(`detalle privado ${origen}`);
        const resultado = await resolver();
        if (origen === "partidas" && Array.isArray(resultado)) {
          (resultado as PartidaFixture[]).sort((a, b) => {
            for (const [campo, direccion] of Object.entries(ordenamiento)) {
              const valorA = a[campo as keyof PartidaFixture];
              const valorB = b[campo as keyof PartidaFixture];
              const comparableA =
                valorA instanceof Date ? valorA.getTime() : String(valorA);
              const comparableB =
                valorB instanceof Date ? valorB.getTime() : String(valorB);
              if (comparableA < comparableB) return -direccion;
              if (comparableA > comparableB) return direccion;
            }
            return 0;
          });
        }
        return resultado;
      } finally {
        activas--;
      }
    },
    then: <R1 = T, R2 = never>(
      resuelto?: ((valor: T) => R1 | PromiseLike<R1>) | null,
      rechazado?: ((error: unknown) => R2 | PromiseLike<R2>) | null,
    ) => query.exec().then(resuelto, rechazado),
  };
  consultas.push({ origen, filtro, ...query });
  return query;
}

async function pedir(ruta = `/api/videojuegos/${juego}/progreso-semanal`) {
  const respuesta = await fetch(`${base}${ruta}`);
  const cuerpo = (await respuesta.json()) as CuerpoRespuesta;
  expect(cuerpo.requestId).toBe(respuesta.headers.get("x-request-id"));
  expect(cuerpo.requestId).toEqual(expect.any(String));
  return { estado: respuesta.status, cuerpo };
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
  partidas.length = 0;
  metas.length = 0;
  consultas.length = 0;
  orden.length = 0;
  existeJuego = true;
  secuenciaId = 1;
  ahora = Date.parse("2026-11-11T20:00:00.000Z");
  falloConsulta = undefined;
  falloHelper = undefined;
  activas = 0;
  maximoParalelas = 0;
  vi.spyOn(Date, "now").mockImplementation(() => ahora);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(mongoose.connection, "getClient").mockReturnValue({
    options: {},
  } as unknown as ReturnType<typeof mongoose.connection.getClient>);
  vi.spyOn(mongoose.connection, "transaction").mockImplementation(
    async (operacion) => {
      const resultado = await operacion(sesion);
      if (falloHelper) throw falloHelper;
      return resultado;
    },
  );
  vi.spyOn(Videojuego, "findById").mockImplementation(
    (id) =>
      consulta("videojuego", id, () =>
        existeJuego && String(id) === juego
          ? { _id: new Types.ObjectId(juego) }
          : null,
      ) as unknown as ReturnType<typeof Videojuego.findById>,
  );
  vi.spyOn(Meta, "findOne").mockImplementation((entrada: unknown = {}) => {
    const filtro = entrada as { videojuego?: unknown; activa?: unknown };
    return consulta(
      "meta",
      entrada,
      () =>
        metas.find(
          (meta) =>
            meta.videojuego.toString() === String(filtro.videojuego) &&
            meta.activa === filtro.activa,
        ) ?? null,
    ) as unknown as ReturnType<typeof Meta.findOne>;
  });
  vi.spyOn(Partida, "find").mockImplementation((entrada: unknown = {}) => {
    const filtro = entrada as { videojuego?: unknown };
    return consulta("partidas", entrada, () =>
      partidas.filter(
        (partida) =>
          partida.videojuego.toString() === String(filtro.videojuego),
      ),
    ) as unknown as ReturnType<typeof Partida.find>;
  });
  vi.spyOn(Videojuego, "findOneAndUpdate").mockImplementation(() => {
    throw new Error("La consulta de progreso no debe escribir una guarda");
  });
  vi.spyOn(Meta, "init").mockImplementation(async () => {
    throw new Error(
      "La consulta de progreso no debe inicializar indices de escritura",
    );
  });
  vi.spyOn(Meta, "create").mockImplementation(() => {
    throw new Error("La consulta de progreso no debe crear metas");
  });
});

describe("T-11: progreso semanal HTTP con MongoDB simulado", () => {
  it("CA-E2-17 / CA-E2-26 / CA-E2-56: responde contrato completo con meta activa, 210 minutos y tres dias", async () => {
    agregarMeta();
    agregarPartida("2026-11-09", 60, 25);
    agregarPartida("2026-11-10", 90, 30);
    agregarPartida("2026-11-11", 60, 50);
    const respuesta = await pedir();
    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.progreso).toEqual({
      semana: { inicio: "2026-11-09", fin: "2026-11-15" },
      meta: { _id: metaId, horasSemanales: 5, diasPorSemana: 4 },
      horasSemana: 3.5,
      porcentajeHoras: 70,
      diasJugadosSemana: 3,
      rachaActual: 3,
      mejorRacha: 3,
      cumplidaSemana: false,
      hitos: [
        { descripcion: "Hito 25", porcentajeObjetivo: 25, alcanzado: true },
        { descripcion: "Hito 50", porcentajeObjetivo: 50, alcanzado: true },
        { descripcion: "Hito 100", porcentajeObjetivo: 100, alcanzado: false },
      ],
    });
  });

  it("CA-E2-13: cambiar meta en la semana reutiliza toda la actividad ya registrada", async () => {
    const meta = agregarMeta({ horasSemanales: 6, diasPorSemana: 4 });
    agregarPartida("2026-11-09", 90);
    agregarPartida("2026-11-10", 90);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 3,
      porcentajeHoras: 50,
      diasJugadosSemana: 2,
      cumplidaSemana: false,
    });
    meta.horasSemanales = 3;
    meta.diasPorSemana = 2;
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 3,
      porcentajeHoras: 100,
      diasJugadosSemana: 2,
      cumplidaSemana: true,
    });
  });

  it("CA-E2-18: 97 minutos muestran 1.6 horas y porcentaje 53", async () => {
    agregarMeta({ horasSemanales: 3 });
    agregarPartida("2026-11-11", 97);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 1.6,
      porcentajeHoras: 53,
    });
  });

  it("CA-E2-19 / CA-E2-56: conserva siete horas reales y limita porcentaje sin cumplir dias pendientes", async () => {
    agregarMeta();
    agregarPartida("2026-11-09", 180);
    agregarPartida("2026-11-10", 120);
    agregarPartida("2026-11-11", 120);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 7,
      porcentajeHoras: 100,
      diasJugadosSemana: 3,
      cumplidaSemana: false,
    });
  });

  it("CA-E2-56: redondear 299 minutos a cinco horas no cumple el objetivo real", async () => {
    agregarMeta({ diasPorSemana: 1 });
    agregarPartida("2026-11-11", 299);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 5,
      porcentajeHoras: 100,
      cumplidaSemana: false,
    });
  });

  it("CA-E2-20 / CA-E2-25: varias partidas por dia suman minutos pero no duplican dias ni rachas", async () => {
    agregarMeta();
    agregarPartida("2026-11-09T09:00:00-05:00", 60);
    agregarPartida("2026-11-09T20:00:00-05:00", 90);
    agregarPartida("2026-11-11", 60);
    agregarPartida("2026-11-10", 1440, 100, otroJuego);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 3.5,
      diasJugadosSemana: 2,
      rachaActual: 1,
      mejorRacha: 1,
    });
  });

  it("CA-E2-16: Ecuador incluye lunes exacto y excluye domingo previo y lunes siguiente", async () => {
    ahora = Date.parse("2026-11-15T23:59:59-05:00");
    agregarPartida("2026-11-08T23:59:59.999-05:00", 120);
    agregarPartida("2026-11-09T00:00:00-05:00", 60);
    agregarPartida("2026-11-15T23:59:59-05:00", 90);
    agregarPartida("2026-11-16T00:00:00-05:00", 120);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      semana: { inicio: "2026-11-09", fin: "2026-11-15" },
      horasSemana: 2.5,
      diasJugadosSemana: 2,
    });
  });

  it("CA-E2-21: una partida dominical que cruza medianoche no se reparte en lunes", async () => {
    agregarPartida("2026-11-08T23:30:00-05:00", 120);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 0,
      diasJugadosSemana: 0,
      mejorRacha: 1,
    });
  });

  it("CA-E2-16: un instante UTC del lunes aun puede pertenecer al domingo de Ecuador", async () => {
    ahora = Date.parse("2026-11-09T04:30:00Z");
    agregarPartida("2026-11-09T04:00:00Z", 60);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      semana: { inicio: "2026-11-02", fin: "2026-11-08" },
      horasSemana: 1,
      diasJugadosSemana: 1,
      rachaActual: 1,
    });
  });

  it("CA-E2-22: ocho partidas en dias distintos conservan mejor racha historica fuera de la semana", async () => {
    for (const dia of [1, 2, 3, 4, 5, 9, 10, 11])
      agregarPartida(`2026-11-${String(dia).padStart(2, "0")}`);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 3,
      diasJugadosSemana: 3,
      rachaActual: 3,
      mejorRacha: 5,
    });
  });

  it("CA-E2-23: jugar ayer conserva racha vigente sin sumar hoy ni reiniciar el lunes", async () => {
    for (const dia of [8, 9, 10])
      agregarPartida(`2026-11-${String(dia).padStart(2, "0")}`);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 2,
      diasJugadosSemana: 2,
      rachaActual: 3,
      mejorRacha: 3,
    });
  });

  it("CA-E2-24: racha interrumpida conserva mejor racha historica", async () => {
    for (const dia of [1, 2, 3, 4, 5])
      agregarPartida(`2026-11-${String(dia).padStart(2, "0")}`);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      horasSemana: 0,
      rachaActual: 0,
      mejorRacha: 5,
    });
  });

  it("CA-E2-27: bajar el avance de la partida mas reciente revierte hitos sin escribirlos", async () => {
    agregarMeta();
    const reciente = agregarPartida("2026-11-11", 60, 60);
    expect((await pedir()).cuerpo.progreso.hitos[1].alcanzado).toBe(true);
    reciente.porcentajeAvance = 40;
    expect((await pedir()).cuerpo.progreso.hitos[1].alcanzado).toBe(false);
    expect(metas[0].hitos[1]).not.toHaveProperty("alcanzado");
  });

  it("CA-E2-28: una partida historica registrada despues no sustituye el avance actual de E1", async () => {
    agregarMeta();
    agregarPartida("2026-11-11", 60, 60);
    const historica = agregarPartida("2026-11-10", 60, 20);
    historica.createdAt = new Date("2026-11-12T15:00:00Z");
    const progreso = await pedir();
    const resumen = await pedir(`/api/videojuegos/${juego}/resumen`);
    expect(resumen.estado).toBe(200);
    expect(resumen.cuerpo.resumen.porcentajeAvanceActual).toBe(60);
    expect(
      progreso.cuerpo.progreso.hitos.map((hito) => hito.alcanzado),
    ).toEqual([true, true, false]);
  });

  it("CA-E2-28: empates por inicio y creacion usan el mismo ID descendente del resumen E1", async () => {
    agregarMeta();
    const antigua = agregarPartida("2026-11-11", 1, 90);
    antigua.createdAt = new Date("2026-11-11T18:00:00Z");
    agregarPartida("2026-11-11", 1, 20);
    agregarPartida("2026-11-11", 95, 60);
    const progreso = await pedir();
    const resumen = await pedir(`/api/videojuegos/${juego}/resumen`);
    expect(resumen.cuerpo.resumen).toMatchObject({
      porcentajeAvanceActual: 60,
      horasTotales: 1.62,
    });
    expect(progreso.cuerpo.progreso).toMatchObject({
      horasSemana: 1.6,
      porcentajeHoras: 32,
    });
    expect(
      progreso.cuerpo.progreso.hitos.map((hito) => hito.alcanzado),
    ).toEqual([true, true, false]);
  });

  it("CA-E2-29 / CA-E2-31: meta sin partidas conserva objetivos y muestra ceros e hitos no alcanzados", async () => {
    agregarMeta();
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      meta: { _id: metaId, horasSemanales: 5, diasPorSemana: 4 },
      horasSemana: 0,
      porcentajeHoras: 0,
      diasJugadosSemana: 0,
      rachaActual: 0,
      mejorRacha: 0,
      cumplidaSemana: false,
      hitos: [
        expect.objectContaining({ alcanzado: false }),
        expect.objectContaining({ alcanzado: false }),
        expect.objectContaining({ alcanzado: false }),
      ],
    });
  });

  it("CA-E2-30: solo metas inactivas conserva actividad y rachas sin mostrar hitos antiguos", async () => {
    agregarMeta({ activa: false });
    agregarMeta({ videojuego: new Types.ObjectId(otroJuego) });
    agregarPartida("2026-11-10", 90);
    expect((await pedir()).cuerpo.progreso).toMatchObject({
      meta: null,
      porcentajeHoras: null,
      cumplidaSemana: null,
      hitos: [],
      horasSemana: 1.5,
      diasJugadosSemana: 1,
      rachaActual: 1,
      mejorRacha: 1,
    });
  });

  it("CA-E2-32: sin metas ni partidas devuelve ceros y nulls diferenciados", async () => {
    expect((await pedir()).cuerpo.progreso).toEqual({
      semana: { inicio: "2026-11-09", fin: "2026-11-15" },
      meta: null,
      horasSemana: 0,
      porcentajeHoras: null,
      diasJugadosSemana: 0,
      rachaActual: 0,
      mejorRacha: 0,
      hitos: [],
      cumplidaSemana: null,
    });
  });

  it("CA-E2-33: ID invalido devuelve 400 antes de iniciar consultas o transaccion", async () => {
    const respuesta = await pedir("/api/videojuegos/invalido/progreso-semanal");
    expect(respuesta.estado).toBe(400);
    expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    expect(Videojuego.findById).not.toHaveBeenCalled();
    expect(Meta.findOne).not.toHaveBeenCalled();
    expect(Partida.find).not.toHaveBeenCalled();
  });

  it("CA-E2-33: videojuego inexistente devuelve 404 y no un progreso vacio", async () => {
    const respuesta = await pedir(
      `/api/videojuegos/${inexistente}/progreso-semanal`,
    );
    expect(respuesta.estado).toBe(404);
    expect(respuesta.cuerpo).not.toHaveProperty("progreso");
    expect(Meta.findOne).not.toHaveBeenCalled();
    expect(Partida.find).not.toHaveBeenCalled();
  });

  it.each(["semana=2020-01-01", "ahora=0", "reloj=0"])(
    "no admite semana o reloj del cliente: %s",
    async (consultaCliente) => {
      const respuesta = await pedir(
        `/api/videojuegos/${juego}/progreso-semanal?${consultaCliente}`,
      );
      expect(respuesta.estado).toBe(400);
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    },
  );

  it.each<Origen>(["videojuego", "meta", "partidas"])(
    "CA-E2-53: fallo de consulta %s se propaga como 500 opaco",
    async (origen) => {
      falloConsulta = origen;
      const respuesta = await pedir();
      expect(respuesta.estado).toBe(500);
      expect(respuesta.cuerpo.error).toBe("Error interno del servidor");
      expect(JSON.stringify(respuesta.cuerpo)).not.toContain("privado");
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`id=${respuesta.cuerpo.requestId}`),
        expect.any(Error),
      );
    },
  );

  it("CA-E2-53: fallo del helper no confirma una lectura exitosa ni reintenta la operacion", async () => {
    falloHelper = new Error("detalle privado del helper");
    const respuesta = await pedir();
    expect(respuesta.estado).toBe(500);
    expect(respuesta.cuerpo).not.toHaveProperty("progreso");
    expect(mongoose.connection.transaction).toHaveBeenCalledTimes(1);
  });

  it("T-11: cancelar la lectura HTTP detiene las consultas posteriores en el siguiente control cooperativo", async () => {
    const diferido = () => {
      let resolver!: () => void;
      const promesa = new Promise<void>((resolve) => {
        resolver = resolve;
      });
      return { promesa, resolver };
    };
    const lecturaIniciada = diferido();
    const liberarLectura = diferido();
    const respuestaCerrada = diferido();
    const cancelacionRegistrada = diferido();
    servidor.once("request", (_req, res) => {
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
    vi.mocked(Videojuego.findById).mockImplementationOnce(
      (id) =>
        consulta("videojuego", id, async () => {
          lecturaIniciada.resolver();
          await liberarLectura.promesa;
          return { _id: new Types.ObjectId(juego) };
        }) as unknown as ReturnType<typeof Videojuego.findById>,
    );
    const cancelacion = new AbortController();
    const resultado = fetch(
      `${base}/api/videojuegos/${juego}/progreso-semanal`,
      {
        signal: cancelacion.signal,
      },
    ).then(
      () => {
        throw new Error("La lectura cancelada no debe recibir respuesta");
      },
      (error: unknown) => error,
    );
    try {
      await lecturaIniciada.promesa;
      cancelacion.abort();
      expect(await resultado).toMatchObject({ name: "AbortError" });
      await respuestaCerrada.promesa;
    } finally {
      liberarLectura.resolver();
    }
    await cancelacionRegistrada.promesa;
    expect(Meta.findOne).not.toHaveBeenCalled();
    expect(Partida.find).not.toHaveBeenCalled();
    expect(orden).toEqual(["videojuego"]);
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: "ErrorCancelacionTransaccion" }),
    );
    // No demuestra interrupcion del comando remoto: se libera la lectura
    // simulada y se detecta la cancelacion despues de que esta resuelva.
  });

  it("T-11: comparte una sesion snapshot, consultas secuenciales y todo el historial sin escrituras", async () => {
    agregarMeta();
    agregarPartida("2026-11-01");
    agregarPartida("2026-11-11");
    const respuesta = await pedir();
    expect(respuesta.estado).toBe(200);
    expect(mongoose.connection.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        readConcern: { level: "snapshot" },
        readPreference: "primary",
      }),
    );
    expect(orden).toEqual(["videojuego", "meta", "partidas"]);
    expect(maximoParalelas).toBe(1);
    expect(consultas).toHaveLength(3);
    for (const query of consultas) {
      expect(query.session).toHaveBeenCalledWith(sesion);
      expect(query.select).toHaveBeenCalled();
      expect(query.lean).toHaveBeenCalled();
      expect(query.maxTimeMS).toHaveBeenCalledWith(expect.any(Number));
      const limite = query.maxTimeMS.mock.calls[0][0] as number;
      expect(limite).toBeGreaterThanOrEqual(1);
      expect(limite).toBeLessThanOrEqual(5000);
    }
    expect(Meta.findOne).toHaveBeenCalledWith({
      videojuego: juego,
      activa: true,
    });
    expect(Partida.find).toHaveBeenCalledWith({ videojuego: juego });
    expect(consultas[2].sort).toHaveBeenCalledWith({
      fecha: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(Videojuego.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Meta.create).not.toHaveBeenCalled();
    expect(Meta.init).not.toHaveBeenCalled();
    expect(Meta.db.readyState).toBe(0);
  });
});

describe("T-11: controles unitarios del reloj de consulta con MongoDB simulado", () => {
  it("CA-E2-16: captura una sola vez el reloj aunque el helper repita el callback al cruzar medianoche del domingo", async () => {
    const domingo = Date.parse("2026-11-15T23:59:59-05:00");
    const lunes = Date.parse("2026-11-16T00:00:01-05:00");
    const reloj = vi
      .fn<() => number>()
      .mockReturnValueOnce(domingo)
      .mockReturnValue(lunes);
    const resultados: unknown[] = [];
    agregarPartida("2026-11-15T12:00:00-05:00", 60);
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (operacion) => {
        resultados.push(await operacion(sesion));
        ahora = lunes;
        const resultado = await operacion(sesion);
        resultados.push(resultado);
        return resultado;
      },
    );

    const resultado = await obtenerProgreso(juego, { ahora: reloj });

    expect(reloj).toHaveBeenCalledTimes(1);
    expect(Videojuego.findById).toHaveBeenCalledTimes(2);
    expect(resultados).toHaveLength(2);
    for (const intento of resultados) {
      expect(intento).toMatchObject({
        semana: { inicio: "2026-11-09", fin: "2026-11-15" },
        horasSemana: 1,
      });
    }
    expect(resultado.semana).toEqual({
      inicio: "2026-11-09",
      fin: "2026-11-15",
    });
    // Se simula la repeticion del callback; no verifica reintentos de MongoDB.
  });
});

describe("T-11: integracion real pendiente con replica set aislado", () => {
  it.todo(
    "CA-E2-13 / CA-E2-30: juego, meta e historial se leen desde un snapshot real consistente ante cambios concurrentes",
  );
  it.todo(
    "CA-E2-22 / CA-E2-24: datos persistidos en al menos cinco dias producen racha interrumpida y mejor historica correctas",
  );
});
