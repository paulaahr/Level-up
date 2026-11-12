import { peticion } from "./cliente";
import type { DatosMeta, Meta, ProgresoSemanal } from "../tipos";

export async function crearMeta(
  datos: DatosMeta & { videojuego: string },
): Promise<Meta> {
  return (
    await peticion<{ meta: Meta }>("/metas", {
      method: "POST",
      body: JSON.stringify(datos),
    })
  ).meta;
}
export async function obtenerMeta(id: string): Promise<Meta> {
  return (await peticion<{ meta: Meta }>(`/metas/${encodeURIComponent(id)}`))
    .meta;
}
export async function listarMetas(videojuegoId: string): Promise<Meta[]> {
  return (
    await peticion<{ total: number; metas: Meta[] }>(
      `/videojuegos/${encodeURIComponent(videojuegoId)}/metas`,
    )
  ).metas;
}
export async function actualizarMeta(
  id: string,
  datos: DatosMeta,
): Promise<Meta> {
  return (
    await peticion<{ meta: Meta }>(`/metas/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    })
  ).meta;
}
export async function desactivarMeta(id: string): Promise<Meta> {
  return (
    await peticion<{ meta: Meta }>(
      `/metas/${encodeURIComponent(id)}/desactivar`,
      { method: "PATCH" },
    )
  ).meta;
}
export async function obtenerProgresoSemanal(
  videojuegoId: string,
): Promise<ProgresoSemanal> {
  return (
    await peticion<{ progreso: ProgresoSemanal }>(
      `/videojuegos/${encodeURIComponent(videojuegoId)}/progreso-semanal`,
    )
  ).progreso;
}
