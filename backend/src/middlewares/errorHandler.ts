/**
 * middlewares/errorHandler.ts
 * ------------------------------
 * NOVEDAD de esta sesión: distinguimos 4 tipos de error, cada uno con
 * su propio status HTTP.
 */

import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ApiError } from "../apiError";
import { ErrorValidacionMeta } from "../validaciones/meta";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  // Solo un error del parser JSON es un 400; un SyntaxError de código es un 500.
  if (
    err instanceof SyntaxError &&
    "type" in err &&
    err.type === "entity.parse.failed" &&
    "status" in err &&
    err.status === 400
  ) {
    res.status(400).json({ error: "JSON mal formado", requestId: req.id });
    return;
  }

  if (err instanceof ErrorValidacionMeta) {
    res.status(400).json({ error: err.message, requestId: req.id });
    return;
  }

  // El índice decide la unicidad; aquí solo se traduce su código público.
  if (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    err.code === 11000
  ) {
    res.status(409).json({
      error: "Ya existe una meta activa para este videojuego",
      requestId: req.id,
    });
    return;
  }

  // 1) Errores de negocio propios.
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, requestId: req.id });
    return;
  }

  // 2) Errores de VALIDACIÓN de Mongoose (enum, required, min, max).
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: err.message, requestId: req.id });
    return;
  }

  // 3) Errores de CAST de Mongoose (id con formato inválido).
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: `"${err.value}" no es un id válido para el campo "${err.path}"`,
      requestId: req.id,
    });
    return;
  }

  // 4) Cualquier otro error (de conexión, de servidor, inesperado).
  console.error(`[${new Date().toISOString()}] id=${req.id} ERROR:`, err);
  res
    .status(500)
    .json({ error: "Error interno del servidor", requestId: req.id });
}
