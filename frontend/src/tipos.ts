export type Logro = {
  _id?: string;
  nombre: string;
  descripcion?: string;
  obtenido: boolean;
};
export type Videojuego = {
  _id: string;
  nombre: string;
  genero: string;
  plataforma: string;
  estado: string;
  portada: string;
  descripcion: string;
  calificacion?: number;
  logros: Logro[];
  createdAt: string;
};
export type Partida = {
  _id: string;
  videojuego: string | Videojuego;
  fecha: string;
  duracionMinutos: number;
  porcentajeAvance: number;
  notas: string;
};
export type Resumen = {
  videojuego: string;
  totalPartidas: number;
  minutosTotales: number;
  horasTotales: number;
  ultimaSesion: string | null;
  porcentajeAvanceActual: number;
};
export const GENEROS = [
  "Acción",
  "Aventura",
  "RPG",
  "Indie",
  "Estrategia",
  "Simulación",
  "Deportes",
  "Terror",
  "Plataformas",
  "Otro",
];
export const ESTADOS = ["Pendiente", "Jugando", "Completado", "En pausa"];
export interface HitoObjetivo {
  descripcion: string;
  porcentajeObjetivo: number;
}
export interface HitoProgreso extends HitoObjetivo {
  alcanzado: boolean;
}
export interface DatosMeta {
  horasSemanales: number;
  diasPorSemana: number;
  hitos: HitoObjetivo[];
  activa?: boolean;
}
export interface Meta extends DatosMeta {
  _id: string;
  videojuego: string;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface ProgresoSemanal {
  semana: { inicio: string; fin: string };
  meta: { _id: string; horasSemanales: number; diasPorSemana: number } | null;
  horasSemana: number;
  porcentajeHoras: number | null;
  diasJugadosSemana: number;
  rachaActual: number;
  mejorRacha: number;
  hitos: HitoProgreso[];
  cumplidaSemana: boolean | null;
}
export interface DatosPartida {
  fecha: string;
  duracionMinutos: number;
  porcentajeAvance: number;
  notas: string;
}
export type PartidaIndividual = Omit<Partida, "videojuego"> & {
  videojuego: string;
  createdAt?: string;
  updatedAt?: string;
};
