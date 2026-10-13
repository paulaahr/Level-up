import {Partida,IPartida} from '../modelos/Partida.model';
import {obtener,validarId} from './videojuegos.service';
import {ApiError} from '../apiError';
export async function listar(){return Partida.find().populate('videojuego').sort({fecha:-1,createdAt:-1});}
export async function deVideojuego(id:string){await obtener(id);return Partida.find({videojuego:id}).sort({fecha:-1,createdAt:-1});}
export async function crear(datos:Partial<IPartida>){if(!datos.videojuego)throw new ApiError(400,'Selecciona un videojuego');await obtener(String(datos.videojuego));return Partida.create(datos);}
export async function eliminar(id:string){validarId(id);const x=await Partida.findByIdAndDelete(id);if(!x)throw new ApiError(404,'Partida no encontrada');}
