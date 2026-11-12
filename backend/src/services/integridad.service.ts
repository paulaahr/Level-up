import { performance } from "node:perf_hooks";
import mongoose, { type ClientSession } from "mongoose";
import { ApiError } from "../apiError";
import { Videojuego, type IVideojuego } from "../modelos/Videojuego.model";

export interface OpcionesTransaccion {
  signal?: AbortSignal;
  ahora?: () => number;
}

export interface ContextoTransaccion {
  session: ClientSession;
  comprobar(): void;
  ejecutar<T>(operacion: (maxTimeMS: number) => PromiseLike<T>): Promise<T>;
}

export class ErrorPresupuestoTransaccion extends Error {
  constructor() {
    super("Presupuesto cooperativo de la transacción agotado");
    this.name = "ErrorPresupuestoTransaccion";
  }
}

export class ErrorCancelacionTransaccion extends Error {
  constructor() {
    super("Cancelación cooperativa de la transacción solicitada");
    this.name = "ErrorCancelacionTransaccion";
  }
}

export class ErrorConfiguracionTransaccion extends Error {
  constructor() {
    super("La transacción requiere un cliente disponible y opciones sin CSOT");
    this.name = "ErrorConfiguracionTransaccion";
  }
}

export class ErrorResultadoTransaccionDesconocido extends Error {
  constructor(public readonly causa: unknown) {
    super("El resultado del commit de la transacción es desconocido");
    this.name = "ErrorResultadoTransaccionDesconocido";
  }
}

function comprobarClienteSinCsot(): void {
  const cliente = mongoose.connection.getClient();
  if (!cliente?.options) throw new ErrorConfiguracionTransaccion();
  const opciones = cliente.options as unknown as Record<string, unknown>;
  if (
    ["timeoutMS", "timeoutMode", "defaultTimeoutMS"].some(
      (campo) => opciones[campo] !== undefined,
    )
  ) {
    throw new ErrorConfiguracionTransaccion();
  }
}

function resultadoDesconocido(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "hasErrorLabel" in error &&
    typeof error.hasErrorLabel === "function" &&
    error.hasErrorLabel("UnknownTransactionCommitResult")
  );
}

/** Los 10 segundos controlan admisión de trabajo, no la duración del commit o HTTP. */
export async function transaccion<T>(
  trabajo: (contexto: ContextoTransaccion) => Promise<T>,
  opciones: OpcionesTransaccion = {},
): Promise<T> {
  comprobarClienteSinCsot();
  const ahora = opciones.ahora ?? (() => performance.now());
  const limite = ahora() + 10000;
  const comprobar = (): void => {
    if (opciones.signal?.aborted) throw new ErrorCancelacionTransaccion();
    if (limite - ahora() < 1) throw new ErrorPresupuestoTransaccion();
  };
  comprobar();

  try {
    return await mongoose.connection.transaction<T>(
      async (session) => {
        if (session.timeoutMS !== undefined && session.timeoutMS !== null) {
          throw new ErrorConfiguracionTransaccion();
        }
        comprobar();
        const contexto: ContextoTransaccion = {
          session,
          comprobar,
          async ejecutar<R>(
            operacion: (maxTimeMS: number) => PromiseLike<R>,
          ): Promise<R> {
            comprobar();
            const maxTimeMS = Math.min(5000, Math.floor(limite - ahora()));
            if (maxTimeMS < 1) throw new ErrorPresupuestoTransaccion();
            const resultado = await operacion(maxTimeMS);
            comprobar();
            return resultado;
          },
        };
        const resultado = await trabajo(contexto);
        comprobar();
        return resultado;
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
        maxCommitTimeMS: 5000,
      },
    );
  } catch (error) {
    if (resultadoDesconocido(error)) {
      throw new ErrorResultadoTransaccionDesconocido(error);
    }
    throw error;
  }
}

/** Escritura efectiva del padre para serializar consumidores de la misma guarda. */
export async function guardarVideojuego(
  id: string,
  contexto: ContextoTransaccion,
): Promise<Pick<IVideojuego, "estado">> {
  const videojuego = await contexto.ejecutar((maxTimeMS) =>
    Videojuego.findOneAndUpdate(
      { _id: id },
      { $inc: { __v: 1 } },
      {
        session: contexto.session,
        new: true,
        timestamps: false,
        projection: { estado: 1 },
        maxTimeMS,
      },
    ),
  );
  if (!videojuego) throw new ApiError(404, "Videojuego no encontrado");
  return videojuego;
}
