import type { Types } from "mongoose";
import { ApiError } from "../apiError";
import {
  calcularProgreso,
  type MetaDominio,
  type PartidaDominio,
  type ProgresoSemanal,
} from "../dominio/progreso";
import { Meta, type IMeta } from "../modelos/Meta.model";
import { Partida, type IPartida } from "../modelos/Partida.model";
import { Videojuego } from "../modelos/Videojuego.model";
import { transaccion } from "./integridad.service";

export interface OpcionesProgreso {
  ahora?: () => number;
  signal?: AbortSignal;
}

type MetaLeida = Pick<IMeta, "horasSemanales" | "diasPorSemana" | "hitos"> & {
  _id: Types.ObjectId;
};
type PartidaLeida = Pick<
  IPartida,
  "fecha" | "duracionMinutos" | "porcentajeAvance" | "createdAt"
> & { _id: Types.ObjectId };

export async function obtener(
  id: string,
  opciones: OpcionesProgreso = {},
): Promise<ProgresoSemanal> {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, "ID mal formado");
  // Capturar el instante una sola vez; el reloj cooperativo del adaptador es
  // independiente y monotónico. Un reintento conserva esta semana de consulta.
  const ahora = (opciones.ahora ?? Date.now)();
  return transaccion(
    async (contexto) => {
      const videojuego = await contexto.ejecutar((maxTimeMS) =>
        Videojuego.findById(id)
          .select("_id")
          .session(contexto.session)
          .maxTimeMS(maxTimeMS)
          .lean<{ _id: Types.ObjectId } | null>(),
      );
      if (!videojuego) throw new ApiError(404, "Videojuego no encontrado");

      // Las tres lecturas comparten el snapshot. Los helpers de E1 sin sesión
      // no se invocan aquí para evitar mezclar datos de instantes diferentes.
      const meta = await contexto.ejecutar((maxTimeMS) =>
        Meta.findOne({ videojuego: id, activa: true })
          .select("_id horasSemanales diasPorSemana hitos")
          .session(contexto.session)
          .maxTimeMS(maxTimeMS)
          .lean<MetaLeida | null>(),
      );
      const partidas = await contexto.ejecutar((maxTimeMS) =>
        Partida.find({ videojuego: id })
          .select("_id fecha duracionMinutos porcentajeAvance createdAt")
          .sort({ fecha: -1, createdAt: -1, _id: -1 })
          .session(contexto.session)
          .maxTimeMS(maxTimeMS)
          .lean<PartidaLeida[]>(),
      );

      const metaDominio: MetaDominio | null =
        meta === null
          ? null
          : {
              id: meta._id.toString(),
              horasSemanales: meta.horasSemanales,
              diasPorSemana: meta.diasPorSemana,
              hitos: meta.hitos.map(({ descripcion, porcentajeObjetivo }) => ({
                descripcion,
                porcentajeObjetivo,
              })),
            };
      const historial: PartidaDominio[] = partidas.map((partida) => ({
        id: partida._id.toString(),
        fechaInicio: partida.fecha.getTime(),
        duracionMinutos: partida.duracionMinutos,
        porcentajeAvance: partida.porcentajeAvance,
        createdAt: partida.createdAt.getTime(),
      }));
      return calcularProgreso(historial, metaDominio, ahora);
    },
    { signal: opciones.signal },
  );
}
