import type { HydratedDocument } from "mongoose";
import { ApiError } from "../apiError";
import { Meta, type IMeta, type IHitoMeta } from "../modelos/Meta.model";
import { Videojuego } from "../modelos/Videojuego.model";
import {
  ErrorValidacionMeta,
  validarActualizacionMeta,
  validarCreacionMeta,
} from "../validaciones/meta";
import {
  guardarVideojuego,
  transaccion,
  type ContextoTransaccion,
  type OpcionesTransaccion,
} from "./integridad.service";

export interface MetaPublica {
  _id: string;
  videojuego: string;
  horasSemanales: number;
  diasPorSemana: number;
  activa: boolean;
  hitos: IHitoMeta[];
  createdAt: string;
  updatedAt: string;
}

function validarId(id: string): void {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, "ID mal formado");
}

function serializar(meta: HydratedDocument<IMeta>): MetaPublica {
  return {
    _id: meta._id.toString(),
    videojuego: meta.videojuego.toString(),
    horasSemanales: meta.horasSemanales,
    diasPorSemana: meta.diasPorSemana,
    activa: meta.activa,
    hitos: meta.hitos.map(({ descripcion, porcentajeObjetivo }) => ({
      descripcion,
      porcentajeObjetivo,
    })),
    createdAt: meta.createdAt.toISOString(),
    updatedAt: meta.updatedAt.toISOString(),
  };
}

function comprobarEstado(estado: string, activa: boolean): void {
  if (activa && estado === "Completado") {
    throw new ApiError(
      409,
      "Un videojuego completado no puede tener una meta activa",
    );
  }
}

async function obtenerEnTransaccion(
  id: string,
  contexto: ContextoTransaccion,
): Promise<HydratedDocument<IMeta>> {
  const meta = await contexto.ejecutar((maxTimeMS) =>
    Meta.findById(id).session(contexto.session).maxTimeMS(maxTimeMS),
  );
  if (!meta) throw new ApiError(404, "Meta no encontrada");
  return meta;
}

export async function crear(
  entrada: unknown,
  opciones?: OpcionesTransaccion,
): Promise<MetaPublica> {
  const datos = validarCreacionMeta(entrada);
  // El índice debe estar disponible antes de admitir escrituras; E11000 se
  // propaga al middleware. Una consulta previa no sustituye el índice único.
  await Meta.init();
  return transaccion(async (contexto) => {
    const videojuego = await guardarVideojuego(datos.videojuego, contexto);
    comprobarEstado(videojuego.estado, datos.activa);
    const [meta] = await contexto.ejecutar(() =>
      Meta.create([datos], { session: contexto.session }),
    );
    return serializar(meta);
  }, opciones);
}

export async function obtener(id: string): Promise<MetaPublica> {
  validarId(id);
  const meta = await Meta.findById(id).maxTimeMS(5000);
  if (!meta) throw new ApiError(404, "Meta no encontrada");
  return serializar(meta);
}

export async function deVideojuego(id: string): Promise<MetaPublica[]> {
  validarId(id);
  const existe = await Videojuego.exists({ _id: id }).maxTimeMS(5000);
  if (!existe) throw new ApiError(404, "Videojuego no encontrado");
  const metas = await Meta.find({ videojuego: id })
    .sort({ createdAt: -1, _id: -1 })
    .maxTimeMS(5000);
  return metas.map(serializar);
}

export async function actualizar(
  id: string,
  entrada: unknown,
  opciones?: OpcionesTransaccion,
): Promise<MetaPublica> {
  validarId(id);
  // Validar todo antes de consultar o mutar documentos: una entrada rechazada
  // no llega a una escritura ni reemplaza parcialmente los hitos.
  const datos = validarActualizacionMeta(entrada);
  await Meta.init();
  return transaccion(async (contexto) => {
    const meta = await obtenerEnTransaccion(id, contexto);
    const videojuego = await guardarVideojuego(
      meta.videojuego.toString(),
      contexto,
    );
    comprobarEstado(videojuego.estado, datos.activa ?? meta.activa);
    contexto.comprobar();
    meta.set(datos);
    await contexto.ejecutar(() => meta.save({ session: contexto.session }));
    return serializar(meta);
  }, opciones);
}

export async function desactivar(
  id: string,
  entrada: unknown,
  opciones?: OpcionesTransaccion,
): Promise<MetaPublica> {
  validarId(id);
  if (
    entrada !== undefined &&
    (entrada === null ||
      typeof entrada !== "object" ||
      Array.isArray(entrada) ||
      Object.keys(entrada).length !== 0)
  ) {
    throw new ErrorValidacionMeta("meta", "la desactivación no admite campos");
  }
  await Meta.init();
  return transaccion(async (contexto) => {
    const meta = await obtenerEnTransaccion(id, contexto);
    await guardarVideojuego(meta.videojuego.toString(), contexto);
    if (meta.activa) {
      contexto.comprobar();
      meta.activa = false;
      await contexto.ejecutar(() => meta.save({ session: contexto.session }));
    }
    return serializar(meta);
  }, opciones);
}
