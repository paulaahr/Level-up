import type { Request, Response, NextFunction } from "express";
import * as s from "../services/partidas.service";
import type { OpcionesTransaccion } from "../services/integridad.service";
const wrap =
  (
    fn: (
      req: Request,
      res: Response,
      opciones: OpcionesTransaccion,
    ) => Promise<void>,
  ) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const cancelacion = new AbortController();
    const cancelar = (): void => {
      if (!res.writableEnded) cancelacion.abort();
    };
    req.once("aborted", cancelar);
    res.once("close", cancelar);
    if (req.aborted || res.destroyed) cancelacion.abort();
    fn(req, res, { signal: cancelacion.signal })
      .catch(next)
      .finally(() => {
        req.off("aborted", cancelar);
        res.off("close", cancelar);
      });
  };
export const listar = wrap(async (req, res) => {
  const partidas = await s.listar();
  if (!res.destroyed)
    res.json({ total: partidas.length, partidas, requestId: req.id });
});
export const obtener = wrap(async (req, res) => {
  const partida = await s.obtener(req.params.id);
  if (!res.destroyed) res.json({ partida, requestId: req.id });
});
export const crear = wrap(async (req, res, opciones) => {
  const partida = await s.crear(req.body, opciones);
  if (!res.destroyed) res.status(201).json({ partida, requestId: req.id });
});
export const actualizar = wrap(async (req, res, opciones) => {
  const partida = await s.actualizar(req.params.id, req.body, opciones);
  if (!res.destroyed) res.json({ partida, requestId: req.id });
});
export const eliminar = wrap(async (req, res, opciones) => {
  await s.eliminar(req.params.id, opciones);
  if (!res.destroyed) res.status(204).send();
});
