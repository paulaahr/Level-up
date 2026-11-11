import { createServer } from "node:http";
import express, { type Express } from "express";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/apiError";
import { crearApp } from "../src/app";
import { errorHandler } from "../src/middlewares/errorHandler";
import { logger } from "../src/middlewares/logger";
import { requestId } from "../src/middlewares/requestId";
import { ErrorValidacionMeta } from "../src/validaciones/meta";

// Configuración sintética: no importar configuración privada ni iniciar MongoDB.
vi.mock("../src/config/env", () => ({
  env: { frontendUrl: "http://frontend.controlado" },
}));

interface RespuestaHttp {
  estado: number;
  cabeceras: Headers;
  cuerpo: Record<string, unknown>;
}

async function peticion(
  app: Express,
  ruta = "/fallo",
  opciones?: RequestInit,
): Promise<RespuestaHttp> {
  const servidor = createServer(app);
  await new Promise<void>((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", resolve);
  });
  try {
    const direccion = servidor.address();
    if (!direccion || typeof direccion === "string") {
      throw new Error("No se obtuvo el puerto HTTP aislado");
    }
    const respuesta = await fetch(
      `http://127.0.0.1:${direccion.port}${ruta}`,
      opciones,
    );
    return {
      estado: respuesta.status,
      cabeceras: respuesta.headers,
      cuerpo: (await respuesta.json()) as Record<string, unknown>,
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      servidor.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function appConError(error: unknown): Express {
  const app = express();
  app.use(requestId);
  app.use(logger);
  app.get("/fallo", (_req, _res, next) => next(error));
  app.use(errorHandler);
  return app;
}

function comprobarCorrelacion(respuesta: RespuestaHttp): string {
  const id = respuesta.cabeceras.get("X-Request-Id");
  expect(id).toMatch(/^[a-f\d-]{36}$/i);
  expect(respuesta.cuerpo.requestId).toBe(id);
  expect(
    vi.mocked(console.log).mock.calls.some((argumentos) => {
      const registro = argumentos.join(" ");
      return (
        registro.includes(`id=${id}`) &&
        registro.includes(`-> ${respuesta.estado}`)
      );
    }),
  ).toBe(true);
  return id as string;
}

describe("T-03 / D-03: contrato HTTP centralizado sin MongoDB", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("CA-E2-52: JSON mal formado devuelve 400 con cabecera, cuerpo y registro correlacionados", async () => {
    const respuesta = await peticion(crearApp(), "/api/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"horasSemanales":',
    });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error).toBe("JSON mal formado");
    comprobarCorrelacion(respuesta);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("CA-E2-53: CORS expone X-Request-Id al frontend configurado", async () => {
    const respuesta = await peticion(crearApp(), "/api/salud", {
      headers: { Origin: "http://frontend.controlado" },
    });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cabeceras.get("Access-Control-Allow-Origin")).toBe(
      "http://frontend.controlado",
    );
    expect(respuesta.cabeceras.get("Access-Control-Expose-Headers")).toContain(
      "X-Request-Id",
    );
    comprobarCorrelacion(respuesta);
  });

  it.each([400, 404, 409])(
    "CA-E2-53: ApiError conserva estado %s y mensaje de negocio",
    async (estado) => {
      const respuesta = await peticion(
        appConError(new ApiError(estado, "Mensaje de negocio controlado")),
      );

      expect(respuesta.estado).toBe(estado);
      expect(respuesta.cuerpo.error).toBe("Mensaje de negocio controlado");
      comprobarCorrelacion(respuesta);
      expect(console.error).not.toHaveBeenCalled();
    },
  );

  it("CA-E2-53: la validación de entrada Meta devuelve 400 e identifica el campo", async () => {
    const respuesta = await peticion(
      appConError(new ErrorValidacionMeta("horasSemanales", "fuera de rango")),
    );

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error).toBe("horasSemanales: fuera de rango");
    comprobarCorrelacion(respuesta);
  });

  it("CA-E2-53: ValidationError de Mongoose conserva 400", async () => {
    const error = new mongoose.Error.ValidationError();
    error.addError(
      "diasPorSemana",
      new mongoose.Error.ValidatorError({
        path: "diasPorSemana",
        message: "Los días deben estar entre 1 y 7",
      }),
    );
    const respuesta = await peticion(appConError(error));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error).toContain("diasPorSemana");
    comprobarCorrelacion(respuesta);
  });

  it("CA-E2-53: CastError de Mongoose conserva 400", async () => {
    const respuesta = await peticion(
      appConError(new mongoose.Error.CastError("ObjectId", "invalido", "_id")),
    );

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error).toContain("_id");
    comprobarCorrelacion(respuesta);
  });

  it("CA-E2-53: E11000 simulado devuelve 409 sin exponer claves internas", async () => {
    // La clasificación del adaptador no demuestra la exclusión concurrente real.
    const respuesta = await peticion(
      appConError({
        code: 11000,
        message: "detalle interno de índice y colección",
        keyValue: { videojuego: "clave-privada" },
      }),
    );

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error).toBe(
      "Ya existe una meta activa para este videojuego",
    );
    expect(JSON.stringify(respuesta.cuerpo)).not.toContain("clave-privada");
    expect(JSON.stringify(respuesta.cuerpo)).not.toContain(
      "índice y colección",
    );
    comprobarCorrelacion(respuesta);
  });

  it.each([
    new Error("detalle privado de conexión"),
    new SyntaxError("fallo de programación privado"),
    { code: 12345, message: "detalle privado del driver" },
  ])(
    "CA-E2-53: error inesperado devuelve 500 opaco y detalle interno correlacionado %#",
    async (error) => {
      const respuesta = await peticion(appConError(error));

      expect(respuesta.estado).toBe(500);
      expect(respuesta.cuerpo.error).toBe("Error interno del servidor");
      expect(JSON.stringify(respuesta.cuerpo)).not.toContain("privado");
      const id = comprobarCorrelacion(respuesta);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`id=${id}`),
        error,
      );
    },
  );
});
