/**
 * middlewares/logger.ts
 * ------------------------
 * Igual que en la Semana 4: registra método, ruta, id y duración.
 */

import { Request, Response, NextFunction } from "express";

export function logger(req: Request, res: Response, next: NextFunction): void {
  const inicio = Date.now();

  res.on("finish", () => {
    const duracionMs = Date.now() - inicio;
    console.log(
      `[${new Date().toISOString()}] id=${req.id} ${req.method} ${req.originalUrl} ` +
        `-> ${res.statusCode} (${duracionMs}ms)`
    );
  });

  next();
}
