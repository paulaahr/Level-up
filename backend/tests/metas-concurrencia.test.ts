import mongoose, { type ClientSession } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/apiError";
import { Videojuego } from "../src/modelos/Videojuego.model";
import {
  guardarVideojuego,
  transaccion,
  type ContextoTransaccion,
} from "../src/services/integridad.service";

// Solo se construye un cliente para resolver sus opciones; nunca se conecta.
const cliente = new mongoose.mongo.MongoClient(
  "mongodb://127.0.0.1:27017/controlada",
);
const sesion = { timeoutMS: undefined } as unknown as ClientSession;

describe("T-06: controles del adaptador transaccional sin MongoDB", () => {
  beforeEach(() => {
    vi.spyOn(mongoose.connection, "getClient").mockReturnValue(cliente);
    vi.spyOn(mongoose.connection, "transaction").mockImplementation(
      async (trabajo) => trabajo(sesion),
    );
  });

  it("usa el helper, misma sesión y opciones de transacción sin CSOT", async () => {
    const resultado = await transaccion(
      async (contexto) => {
        expect(contexto.session).toBe(sesion);
        return contexto.ejecutar(async (limite) => {
          expect(limite).toBe(5000);
          return "confirmado";
        });
      },
      { ahora: () => 0 },
    );

    expect(resultado).toBe("confirmado");
    expect(mongoose.connection.transaction).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
        maxCommitTimeMS: 5000,
      },
    );
  });

  it.each([9999, 9998.5])(
    "admite trabajo con presupuesto positivo a %s ms y nunca envía cero",
    async (tiempo) => {
      let reloj = 0;
      const operacion = vi.fn(async (limite: number) => limite);
      const resultado = await transaccion(
        async (contexto) => {
          reloj = tiempo;
          return contexto.ejecutar(operacion);
        },
        { ahora: () => reloj },
      );

      expect(resultado).toBe(1);
      expect(operacion).toHaveBeenCalledExactlyOnceWith(1);
    },
  );

  it.each([10000, 9999.5])(
    "rechaza antes de admitir una operación a %s ms",
    async (tiempo) => {
      let reloj = 0;
      const operacion = vi.fn(async () => "no ejecutar");

      await expect(
        transaccion(
          async (contexto) => {
            reloj = tiempo;
            return contexto.ejecutar(operacion);
          },
          { ahora: () => reloj },
        ),
      ).rejects.toMatchObject({ name: "ErrorPresupuestoTransaccion" });
      expect(operacion).not.toHaveBeenCalled();
    },
  );

  it("no renueva el presupuesto cuando el helper vuelve a invocar el callback", async () => {
    let reloj = 0;
    const trabajo = vi.fn(async () => "resultado provisional");
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => {
        await callback(sesion);
        reloj = 10000;
        return callback(sesion);
      },
    );

    await expect(
      transaccion(trabajo, { ahora: () => reloj }),
    ).rejects.toMatchObject({ name: "ErrorPresupuestoTransaccion" });
    expect(trabajo).toHaveBeenCalledTimes(1);
  });

  it("comprueba el presupuesto después de la operación pendiente", async () => {
    let reloj = 0;
    const posterior = vi.fn(async () => "no ejecutar");

    await expect(
      transaccion(
        async (contexto) => {
          await contexto.ejecutar(async () => {
            reloj = 10000;
          });
          return contexto.ejecutar(posterior);
        },
        { ahora: () => reloj },
      ),
    ).rejects.toMatchObject({ name: "ErrorPresupuestoTransaccion" });
    expect(posterior).not.toHaveBeenCalled();
  });

  it("comprueba justo antes de resolver el callback aunque el trabajo no use ejecutar", async () => {
    let reloj = 0;

    await expect(
      transaccion(
        async () => {
          reloj = 10000;
          return "no confirmar";
        },
        { ahora: () => reloj },
      ),
    ).rejects.toMatchObject({ name: "ErrorPresupuestoTransaccion" });
  });

  it("rechaza una señal cancelada sin comenzar trabajo de negocio", async () => {
    const cancelacion = new AbortController();
    cancelacion.abort();
    const trabajo = vi.fn(async () => "no ejecutar");

    await expect(
      transaccion(trabajo, { signal: cancelacion.signal }),
    ).rejects.toMatchObject({ name: "ErrorCancelacionTransaccion" });
    expect(trabajo).not.toHaveBeenCalled();
  });

  it("espera una operación en vuelo al cancelar y no inicia otra ni aborto paralelo", async () => {
    const cancelacion = new AbortController();
    let resolver!: (valor: string) => void;
    const pendiente = new Promise<string>((resolve) => {
      resolver = resolve;
    });
    let comenzar!: () => void;
    const empezada = new Promise<void>((resolve) => {
      comenzar = resolve;
    });
    const posterior = vi.fn(async () => "no ejecutar");
    const abortar = vi.fn();
    const sesionLocal = {
      timeoutMS: undefined,
      abortTransaction: abortar,
    } as unknown as ClientSession;
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => callback(sesionLocal),
    );
    const operacion = transaccion(
      async (contexto) => {
        await contexto.ejecutar(() => {
          comenzar();
          return pendiente;
        });
        return contexto.ejecutar(posterior);
      },
      { signal: cancelacion.signal },
    );
    const rechazo = expect(operacion).rejects.toMatchObject({
      name: "ErrorCancelacionTransaccion",
    });
    let terminada = false;
    void operacion.then(
      () => {
        terminada = true;
      },
      () => {
        terminada = true;
      },
    );
    await empezada;
    cancelacion.abort();
    await Promise.resolve();
    expect(terminada).toBe(false);
    expect(abortar).not.toHaveBeenCalled();
    resolver("terminada");
    await rechazo;
    expect(posterior).not.toHaveBeenCalled();
    expect(abortar).not.toHaveBeenCalled();
    // El helper simulado no prueba aborto o rollback del servidor.
  });

  it("conserva el orden secuencial y no resuelve antes de que termine el helper", async () => {
    const pasos: string[] = [];
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => {
        const resultado = await callback(sesion);
        pasos.push("commit simulado");
        return resultado;
      },
    );

    const resultado = await transaccion(async (contexto) => {
      await contexto.ejecutar(async () => {
        pasos.push("primera");
      });
      return contexto.ejecutar(async () => {
        pasos.push("segunda");
        return 42;
      });
    });
    expect(resultado).toBe(42);
    expect(pasos).toEqual(["primera", "segunda", "commit simulado"]);
  });

  it("admite un commit confirmado fuera de 10 segundos sin volver a ejecutar trabajo", async () => {
    let reloj = 0;
    const trabajo = vi.fn(async () => "confirmado por helper");
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => {
        const resultado = await callback(sesion);
        reloj = 20000;
        return resultado;
      },
    );

    await expect(transaccion(trabajo, { ahora: () => reloj })).resolves.toBe(
      "confirmado por helper",
    );
    expect(trabajo).toHaveBeenCalledTimes(1);
  });

  it("no reejecuta ni convierte en éxito un commit desconocido del helper", async () => {
    const causa = Object.assign(new Error("detalle interno"), {
      code: 11000,
      hasErrorLabel: (etiqueta: string) =>
        etiqueta === "UnknownTransactionCommitResult",
    });
    const trabajo = vi.fn(async () => "resultado provisional");
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => {
        await callback(sesion);
        throw causa;
      },
    );

    let recibido: unknown;
    try {
      await transaccion(trabajo);
    } catch (error) {
      recibido = error;
    }
    expect(recibido).toMatchObject({
      name: "ErrorResultadoTransaccionDesconocido",
      causa,
    });
    expect(recibido).not.toBeInstanceOf(ApiError);
    expect(recibido).not.toHaveProperty("code");
    expect(trabajo).toHaveBeenCalledTimes(1);
  });

  it("conserva la invocación de cierre del wrapper Mongoose sin afirmar limpieza remota", async () => {
    vi.mocked(mongoose.connection.transaction).mockRestore();
    const cerrar = vi.fn().mockResolvedValue(undefined);
    const sesionLocal = {
      timeoutMS: undefined,
      endSession: cerrar,
      withTransaction: async (callback: () => Promise<unknown>) => callback(),
    } as unknown as ClientSession;
    vi.spyOn(mongoose.connection, "startSession").mockResolvedValue(
      sesionLocal,
    );

    await expect(
      transaccion(async (contexto) => {
        expect(contexto.session).toBe(sesionLocal);
        return "confirmado simulado";
      }),
    ).resolves.toBe("confirmado simulado");
    expect(cerrar).toHaveBeenCalledTimes(1);
    // El wrapper real invoca endSession; no hay sesión remota ni prueba de rollback.
  });

  it("propaga el error original de negocio sin envolver ni repetir operaciones", async () => {
    const causa = new ApiError(409, "Conflicto controlado");
    const trabajo = vi.fn(async () => {
      throw causa;
    });
    await expect(transaccion(trabajo)).rejects.toBe(causa);
    expect(trabajo).toHaveBeenCalledTimes(1);
  });

  it.each(["timeoutMS", "timeoutMode", "defaultTimeoutMS"])(
    "rechaza CSOT efectivo del cliente: %s",
    async (opcion) => {
      vi.mocked(mongoose.connection.getClient).mockReturnValue({
        options: { [opcion]: 0 },
      } as unknown as ReturnType<typeof mongoose.connection.getClient>);
      const trabajo = vi.fn(async () => "no ejecutar");

      await expect(transaccion(trabajo)).rejects.toMatchObject({
        name: "ErrorConfiguracionTransaccion",
      });
      expect(trabajo).not.toHaveBeenCalled();
      expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    },
  );

  it("rechaza un cliente no disponible sin intentar conexión o transacción", async () => {
    vi.mocked(mongoose.connection.getClient).mockReturnValue(
      undefined as unknown as ReturnType<typeof mongoose.connection.getClient>,
    );

    await expect(transaccion(async () => "no ejecutar")).rejects.toMatchObject({
      name: "ErrorConfiguracionTransaccion",
    });
    expect(mongoose.connection.transaction).not.toHaveBeenCalled();
  });

  it("rechaza CSOT heredado de sesión antes de ejecutar el callback", async () => {
    const trabajo = vi.fn(async () => "no ejecutar");
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => callback({ timeoutMS: 10000 } as ClientSession),
    );

    await expect(transaccion(trabajo)).rejects.toMatchObject({
      name: "ErrorConfiguracionTransaccion",
    });
    expect(trabajo).not.toHaveBeenCalled();
  });
});

describe("T-06: guarda por videojuego sin MongoDB", () => {
  const id = "507f1f77bcf86cd799439011";
  beforeEach(() => {
    vi.spyOn(mongoose.connection, "getClient").mockReturnValue(cliente);
    vi.spyOn(mongoose.connection, "transaction").mockImplementation(
      async (trabajo) => trabajo(sesion),
    );
  });

  it("escribe __v del padre con sesión, proyección y timestamps desactivados", async () => {
    const juego = { _id: id, estado: "Jugando" };
    const consulta = vi
      .spyOn(Videojuego, "findOneAndUpdate")
      .mockResolvedValue(juego as never);

    await expect(
      transaccion((contexto) => guardarVideojuego(id, contexto), {
        ahora: () => 0,
      }),
    ).resolves.toBe(juego);
    expect(consulta).toHaveBeenCalledExactlyOnceWith(
      { _id: id },
      { $inc: { __v: 1 } },
      {
        session: sesion,
        new: true,
        timestamps: false,
        projection: { estado: 1 },
        maxTimeMS: 5000,
      },
    );
  });

  it("devuelve 404 si el padre ya no existe", async () => {
    vi.spyOn(Videojuego, "findOneAndUpdate").mockResolvedValue(null);

    await expect(
      transaccion((contexto) => guardarVideojuego(id, contexto)),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("no ejecuta la guarda si el contexto rechaza admitir más trabajo", async () => {
    const consulta = vi.spyOn(Videojuego, "findOneAndUpdate");
    const causa = new Error("Presupuesto agotado");
    const contexto = {
      session: sesion,
      comprobar: () => {
        throw causa;
      },
      ejecutar: async () => {
        throw causa;
      },
    } as ContextoTransaccion;

    await expect(guardarVideojuego(id, contexto)).rejects.toBe(causa);
    expect(consulta).not.toHaveBeenCalled();
  });
});

// T-06: índice y concurrencia reales se ejecutan aparte de estos mocks.
// tests/integracion/e2-real.test.ts: "T-06 / CA-E2-09", "T-06 / CA-E2-10"
// y "T-06 / CA-E2-11". Ejecutar test:integration, no test:unit.
