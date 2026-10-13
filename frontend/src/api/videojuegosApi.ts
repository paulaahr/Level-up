import {peticion} from './cliente';import {Videojuego,Resumen,Partida} from '../tipos';
export async function listarVideojuegos(filtros:{buscar?:string;estado?:string;genero?:string}={}){const q=new URLSearchParams();Object.entries(filtros).forEach(([k,v])=>{if(v)q.set(k,v)});return (await peticion<{videojuegos:Videojuego[]}>(`/videojuegos?${q}`)).videojuegos;}
export async function obtenerVideojuego(id:string){return (await peticion<{videojuego:Videojuego}>(`/videojuegos/${id}`)).videojuego;}
export async function guardarVideojuego(datos:Partial<Videojuego>,id?:string){return (await peticion<{videojuego:Videojuego}>(id?`/videojuegos/${id}`:'/videojuegos',{method:id?'PUT':'POST',body:JSON.stringify(datos)})).videojuego;}
export async function eliminarVideojuego(id:string){return peticion<void>(`/videojuegos/${id}`,{method:'DELETE'});}
export async function obtenerResumen(id:string){return (await peticion<{resumen:Resumen}>(`/videojuegos/${id}/resumen`)).resumen;}
export async function partidasDeVideojuego(id:string){return (await peticion<{partidas:Partida[]}>(`/videojuegos/${id}/partidas`)).partidas;}
export async function marcarLogro(id:string,logroId:string,obtenido:boolean){return (await peticion<{videojuego:Videojuego}>(`/videojuegos/${id}/logros/${logroId}`,{method:'PATCH',body:JSON.stringify({obtenido})})).videojuego;}
