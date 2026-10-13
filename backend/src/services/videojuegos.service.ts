import {Videojuego,IVideojuego,estados,generos} from '../modelos/Videojuego.model';
import {Partida} from '../modelos/Partida.model';
import {ApiError} from '../apiError';
import mongoose from 'mongoose';
export function validarId(id:string){if (!mongoose.isValidObjectId(id)) throw new ApiError(400,'ID mal formado');}
export async function listar(filtros:{genero?:string;estado?:string;buscar?:string}){
 const q:any={};
 if(filtros.genero){if(!generos.includes(filtros.genero as any))throw new ApiError(400,'Género inválido');q.genero=filtros.genero;}
 if(filtros.estado){if(!estados.includes(filtros.estado as any))throw new ApiError(400,'Estado inválido');q.estado=filtros.estado;}
 if(filtros.buscar)q.nombre={$regex:filtros.buscar.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ ]/g,''),$options:'i'};
 return Videojuego.find(q).sort({createdAt:-1});
}
export async function obtener(id:string){validarId(id);const x=await Videojuego.findById(id);if(!x)throw new ApiError(404,'Videojuego no encontrado');return x;}
export async function crear(datos:Partial<IVideojuego>){return Videojuego.create(datos);}
export async function actualizar(id:string,datos:Partial<IVideojuego>){validarId(id);const x=await Videojuego.findById(id);if(!x)throw new ApiError(404,'Videojuego no encontrado');
 const permitidos=['nombre','genero','plataforma','estado','portada','descripcion','calificacion','logros'];
 for(const k of permitidos){if(Object.prototype.hasOwnProperty.call(datos,k))(x as any)[k]=(datos as any)[k];}
 await x.save();return x;}
export async function eliminar(id:string){validarId(id);const x=await obtener(id);await Partida.deleteMany({videojuego:x._id});await x.deleteOne();}
export async function marcarLogro(id:string,logroId:string,obtenido:boolean){const x=await obtener(id);validarId(logroId);const logro=x.logros.id(logroId);if(!logro)throw new ApiError(404,'Logro no encontrado');logro.obtenido=obtenido;await x.save();return x;}
export async function resumen(id:string){await obtener(id);const partidas=await Partida.find({videojuego:id}).sort({fecha:-1,createdAt:-1,_id:-1});
 const minutosTotales=partidas.reduce((s,p)=>s+p.duracionMinutos,0);return {videojuego:id,totalPartidas:partidas.length,minutosTotales,horasTotales:Math.round(minutosTotales/60*100)/100,ultimaSesion:partidas[0]?.fecha??null,porcentajeAvanceActual:partidas[0]?.porcentajeAvance??0};}
