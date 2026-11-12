import { Router } from "express";
import * as metas from "../controllers/metas.controller";

export const metasRouter = Router();
metasRouter.post("/", metas.crear);
metasRouter.get("/:id", metas.obtener);
metasRouter.put("/:id", metas.actualizar);
metasRouter.patch("/:id/desactivar", metas.desactivar);
