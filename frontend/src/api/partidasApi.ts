import { peticion } from "./cliente";
import { Partida } from "../tipos";
import type { DatosPartida, PartidaIndividual } from "../tipos";
export async function listarPartidas() {
  return (await peticion<{ partidas: Partida[] }>("/partidas")).partidas;
}
export async function crearPartida(datos: {
  videojuego: string;
  fecha: string;
  duracionMinutos: number;
  porcentajeAvance: number;
  notas: string;
}) {
  return peticion<{ partida: Partida }>("/partidas", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}
export async function eliminarPartida(id: string) {
  return peticion<void>(`/partidas/${id}`, { method: "DELETE" });
}
export async function obtenerPartida(id: string): Promise<PartidaIndividual> {
  return (
    await peticion<{ partida: PartidaIndividual }>(
      `/partidas/${encodeURIComponent(id)}`,
    )
  ).partida;
}
export async function actualizarPartida(
  id: string,
  datos: DatosPartida,
): Promise<PartidaIndividual> {
  return (
    await peticion<{ partida: PartidaIndividual }>(
      `/partidas/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify(datos) },
    )
  ).partida;
}
