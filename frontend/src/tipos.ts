export type Logro={_id?:string;nombre:string;descripcion?:string;obtenido:boolean};
export type Videojuego={_id:string;nombre:string;genero:string;plataforma:string;estado:string;portada:string;descripcion:string;calificacion?:number;logros:Logro[];createdAt:string};
export type Partida={_id:string;videojuego:string|Videojuego;fecha:string;duracionMinutos:number;porcentajeAvance:number;notas:string};
export type Resumen={videojuego:string;totalPartidas:number;minutosTotales:number;horasTotales:number;ultimaSesion:string|null;porcentajeAvanceActual:number};
export const GENEROS=['Acción','Aventura','RPG','Indie','Estrategia','Simulación','Deportes','Terror','Plataformas','Otro'];
export const ESTADOS=['Pendiente','Jugando','Completado','En pausa'];
