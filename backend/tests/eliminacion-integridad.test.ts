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
import { Videojuego } from "../src/modelos/Videojuego.model";
import { Partida } from "../src/modelos/Partida.model";
import { Meta } from "../src/modelos/Meta.model";
vi.mock("../src/config/env", () => ({
  env: { frontendUrl: "http://frontend.controlado" },
}));
const id = "507f1f77bcf86cd799439011";
const sesion = {} as ClientSession;
let existe: boolean;
let fallo: string;
const orden: string[] = [];
let servidor: Server;
let base: string;
function query<T>(nombre: string, resultado: T) {
  const q = {
    then: <R1 = T, R2 = never>(
      ok?: ((valor: T) => R1 | PromiseLike<R1>) | null,
      error?: ((razon: unknown) => R2 | PromiseLike<R2>) | null,
    ) =>
      Promise.resolve()
        .then(() => {
          orden.push(nombre);
          if (fallo === nombre) throw new Error("detalle privado controlado");
          return resultado;
        })
        .then(ok, error),
  };
  return q;
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
  existe = true;
  fallo = "";
  orden.length = 0;
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(mongoose.connection, "getClient").mockReturnValue({
    options: {},
  } as unknown as ReturnType<typeof mongoose.connection.getClient>);
  vi.spyOn(mongoose.connection, "transaction").mockImplementation(
    async (callback) => {
      const r = await callback(sesion);
      if (fallo === "commit") throw new Error("detalle privado commit");
      return r;
    },
  );
  vi.spyOn(Videojuego, "findOneAndUpdate").mockImplementation(
    () => query("guarda", existe ? { estado: "Jugando" } : null) as never,
  );
  vi.spyOn(Videojuego, "findById").mockImplementation(() => {
    const doc = Videojuego.hydrate({ _id: new Types.ObjectId(id) });
    vi.spyOn(doc, "deleteOne").mockImplementation(
      () => query("juego", { deletedCount: 1 }) as never,
    );
    return query("lectura", existe ? doc : null) as never;
  });
  vi.spyOn(Partida, "deleteMany").mockImplementation(
    () => query("partidas", { deletedCount: 3 }) as never,
  );
  vi.spyOn(Meta, "deleteMany").mockImplementation(
    () => query("metas", { deletedCount: 2 }) as never,
  );
  vi.spyOn(Videojuego, "deleteOne").mockImplementation(
    () => query("juego", { deletedCount: 1 }) as never,
  );
});
async function eliminar(referencia = id) {
  return fetch(`${base}/api/videojuegos/${referencia}`, { method: "DELETE" });
}
describe("T-13 / CA-E2-44 a CA-E2-46: contrato controlado sin MongoDB", () => {
  it("CA-E2-44: elimina partidas, todas las metas y juego dentro de una sesión", async () => {
    const r = await eliminar();
    expect(r.status).toBe(204);
    expect(await r.text()).toBe("");
    expect(orden).toEqual(["guarda", "partidas", "metas", "juego"]);
    for (const operacion of [
      Partida.deleteMany,
      Meta.deleteMany,
      Videojuego.deleteOne,
    ])
      expect(operacion).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ session: sesion }),
      );
    expect(Partida.deleteMany).toHaveBeenCalledWith(
      { videojuego: id },
      expect.any(Object),
    );
    expect(Meta.deleteMany).toHaveBeenCalledWith(
      { videojuego: id },
      expect.any(Object),
    );
  });
  it.each(["guarda", "partidas", "metas", "juego", "commit"])(
    "CA-E2-45: un fallo de %s impide confirmar éxito",
    async (paso) => {
      fallo = paso;
      const r = await eliminar();
      expect(r.status).toBe(500);
      const body = await r.json();
      expect(body.error).toBe("Error interno del servidor");
      expect(body.requestId).toBe(r.headers.get("X-Request-Id"));
      // Estos spies no acreditan rollback real de las escrituras previas.
    },
  );
  it("devuelve 404 sin eliminar hijos si no existe el juego", async () => {
    existe = false;
    expect((await eliminar()).status).toBe(404);
    expect(Partida.deleteMany).not.toHaveBeenCalled();
  });
  it("rechaza referencia inválida antes de abrir la transacción", async () => {
    expect((await eliminar("invalido")).status).toBe(400);
    expect(mongoose.connection.transaction).not.toHaveBeenCalled();
  });
  it("cancelar el cliente durante la guarda impide empezar los borrados", async () => {
    const diferido = () => {
      let resolver!: () => void;
      const promesa = new Promise<void>((resolve) => {
        resolver = resolve;
      });
      return { promesa, resolver };
    };
    const guardaIniciada = diferido(),
      liberarGuarda = diferido(),
      respuestaCerrada = diferido(),
      helperFinalizado = diferido();
    let errorFinal: unknown;
    servidor.once("request", (_req, res) =>
      res.once("close", respuestaCerrada.resolver),
    );
    vi.mocked(mongoose.connection.transaction).mockImplementation(
      async (callback) => {
        try {
          return await callback(sesion);
        } catch (error) {
          errorFinal = error;
          throw error;
        } finally {
          helperFinalizado.resolver();
        }
      },
    );
    vi.mocked(Videojuego.findOneAndUpdate).mockImplementationOnce(() => {
      guardaIniciada.resolver();
      return query(
        "guarda",
        liberarGuarda.promesa.then(() => ({ estado: "Jugando" })),
      ) as never;
    });
    const cancelacion = new AbortController();
    const peticion = fetch(`${base}/api/videojuegos/${id}`, {
      method: "DELETE",
      signal: cancelacion.signal,
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
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(Partida.deleteMany).not.toHaveBeenCalled();
    expect(Meta.deleteMany).not.toHaveBeenCalled();
    expect(Videojuego.deleteOne).not.toHaveBeenCalled();
    expect(errorFinal).toMatchObject({ name: "ErrorCancelacionTransaccion" });
    // Solo cancelación cooperativa; no afirma interrupción de comandos ni rollback real.
  });
});
// Rollback, confirmación recuperada de commit y carreras reales de T-13:
// tests/integracion/e2-real.test.ts, "T-13 / CA-E2-45" y "T-13 / CA-E2-46".
// Ejecutar test:integration; estos mocks no acreditan rollback del servidor.
