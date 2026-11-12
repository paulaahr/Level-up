import { Router } from "express";
import * as c from "../controllers/partidas.controller";
export const partidasRouter = Router();
partidasRouter.get("/", c.listar);
partidasRouter.get("/:id", c.obtener);
partidasRouter.post("/", c.crear);
partidasRouter.put("/:id", c.actualizar);
partidasRouter.delete("/:id", c.eliminar);
