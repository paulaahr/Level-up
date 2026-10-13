import {Request,Response,NextFunction} from 'express';
import * as s from '../services/partidas.service';
const wrap=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>{fn(req,res).catch(next)};
export const listar=wrap(async(req,res)=>{const partidas=await s.listar();res.json({total:partidas.length,partidas,requestId:req.id});});
export const crear=wrap(async(req,res)=>{res.status(201).json({partida:await s.crear(req.body),requestId:req.id});});
export const eliminar=wrap(async(req,res)=>{await s.eliminar(req.params.id);res.status(204).send();});
