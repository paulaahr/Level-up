import { Request, Response, NextFunction, RequestHandler } from "express";
import * as s from "../services/videojuegos.service";
import * as partidas from "../services/partidas.service";
import * as progreso from "../services/progreso.service";
import { ApiError } from "../apiError";
import type { OpcionesTransaccion } from "../services/integridad.service";
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
const wrapCancelable =
  (
    operacion: (
      req: Request,
      opciones: OpcionesTransaccion,
    ) => Promise<Record<string, unknown>>,
    estado = 200,
  ): RequestHandler =>
  (req, res, next): void => {
    const cancelacion = new AbortController();
    const cancelar = (): void => {
      if (!res.writableEnded) cancelacion.abort();
    };
    req.once("aborted", cancelar);
    res.once("close", cancelar);
    if (req.aborted || res.destroyed) cancelacion.abort();
    operacion(req, { signal: cancelacion.signal })
      .then((datos) => {
        if (!res.destroyed && !res.writableEnded) {
          if (estado === 204) res.status(204).send();
          else res.status(estado).json({ ...datos, requestId: req.id });
        }
      })
      .catch(next)
      .finally(() => {
        req.off("aborted", cancelar);
        res.off("close", cancelar);
      });
  };
export const listar = wrap(async (req, res) => {
  const videojuegos = await s.listar({
    genero: req.query.genero as string,
    estado: req.query.estado as string,
    buscar: req.query.buscar as string,
  });
  res.json({ total: videojuegos.length, videojuegos, requestId: req.id });
});
export const obtener = wrap(async (req, res) => {
  res.json({ videojuego: await s.obtener(req.params.id), requestId: req.id });
});
export const crear = wrap(async (req, res) => {
  res
    .status(201)
    .json({ videojuego: await s.crear(req.body), requestId: req.id });
});
export const actualizar = wrapCancelable(async (req, opciones) => ({
  videojuego: await s.actualizar(req.params.id, req.body, opciones),
}));
export const progresoSemanal = wrapCancelable(async (req, opciones) => {
  if (Object.keys(req.query).length > 0)
    throw new ApiError(400, "La consulta de progreso no admite parámetros");
  return {
    progreso: await progreso.obtener(req.params.id, {
      signal: opciones.signal,
    }),
  };
});
export const eliminar = wrapCancelable(async (req, opciones) => {
  await s.eliminar(req.params.id, opciones);
  return {};
}, 204);
export const marcarLogro = wrap(async (req, res) => {
  if (typeof req.body.obtenido !== "boolean") {
    res
      .status(400)
      .json({ error: "obtenido debe ser booleano", requestId: req.id });
    return;
  }
  res.json({
    videojuego: await s.marcarLogro(
      req.params.id,
      req.params.logroId,
      req.body.obtenido,
    ),
    requestId: req.id,
  });
});
export const resumen = wrap(async (req, res) => {
  res.json({ resumen: await s.resumen(req.params.id), requestId: req.id });
});
export const listarPartidas = wrap(async (req, res) => {
  const resultado = await partidas.deVideojuego(req.params.id);
  res.json({ total: resultado.length, partidas: resultado, requestId: req.id });
});
