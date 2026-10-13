import {Router} from 'express';
import * as c from '../controllers/videojuegos.controller';
export const videojuegosRouter=Router();
videojuegosRouter.get('/',c.listar);videojuegosRouter.get('/:id/resumen',c.resumen);videojuegosRouter.get('/:id/partidas',c.listarPartidas);videojuegosRouter.patch('/:id/logros/:logroId',c.marcarLogro);
videojuegosRouter.get('/:id',c.obtener);videojuegosRouter.post('/',c.crear);videojuegosRouter.put('/:id',c.actualizar);videojuegosRouter.delete('/:id',c.eliminar);
