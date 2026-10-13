import {Router} from 'express';import * as c from '../controllers/partidas.controller';
export const partidasRouter=Router();partidasRouter.get('/',c.listar);partidasRouter.post('/',c.crear);partidasRouter.delete('/:id',c.eliminar);
