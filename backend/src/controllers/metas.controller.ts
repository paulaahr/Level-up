import type { Request, RequestHandler } from "express";
import * as metas from "../services/metas.service";
import type { OpcionesTransaccion } from "../services/integridad.service";

function accion(
  ejecutar: (
    req: Request,
    opciones: OpcionesTransaccion,
  ) => Promise<Record<string, unknown>>,
  estado = 200,
): RequestHandler {
  return (req, res, next): void => {
    const cancelacion = new AbortController();
    const cancelar = (): void => {
      if (!res.writableEnded) cancelacion.abort();
    };
    req.once("aborted", cancelar);
    res.once("close", cancelar);
    if (req.aborted || res.destroyed) cancelacion.abort();

    ejecutar(req, { signal: cancelacion.signal })
      .then((datos) => {
        if (!res.destroyed && !res.writableEnded) {
          res.status(estado).json({ ...datos, requestId: req.id });
        }
      })
      .catch(next)
      .finally(() => {
        req.off("aborted", cancelar);
        res.off("close", cancelar);
      });
  };
}

export const crear = accion(
  async (req, opciones) => ({ meta: await metas.crear(req.body, opciones) }),
  201,
);

export const obtener = accion(async (req) => ({
  meta: await metas.obtener(req.params.id),
}));

export const listarDeVideojuego = accion(async (req) => {
  const resultado = await metas.deVideojuego(req.params.id);
  return { total: resultado.length, metas: resultado };
});

export const actualizar = accion(async (req, opciones) => ({
  meta: await metas.actualizar(req.params.id, req.body, opciones),
}));

export const desactivar = accion(async (req, opciones) => ({
  meta: await metas.desactivar(req.params.id, req.body, opciones),
}));
