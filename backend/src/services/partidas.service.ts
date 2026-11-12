import { Partida } from "../modelos/Partida.model";
import { obtener as obtenerVideojuego, validarId } from "./videojuegos.service";
import { ApiError } from "../apiError";
import {
  guardarVideojuego,
  transaccion,
  type ContextoTransaccion,
  type OpcionesTransaccion,
} from "./integridad.service";
import {
  validarActualizacionPartida,
  validarCreacionPartida,
} from "../validaciones/partida";

export async function listar() {
  return Partida.find()
    .populate("videojuego")
    .sort({ fecha: -1, createdAt: -1 });
}
export async function deVideojuego(id: string) {
  await obtenerVideojuego(id);
  return Partida.find({ videojuego: id }).sort({ fecha: -1, createdAt: -1 });
}
export async function obtener(id: string) {
  validarId(id);
  const partida = await Partida.findById(id).maxTimeMS(5000);
  if (!partida) throw new ApiError(404, "Partida no encontrada");
  return partida;
}
async function dentroDeTransaccion(id: string, contexto: ContextoTransaccion) {
  const partida = await contexto.ejecutar((maxTimeMS) =>
    Partida.findById(id).session(contexto.session).maxTimeMS(maxTimeMS),
  );
  if (!partida) throw new ApiError(404, "Partida no encontrada");
  await guardarVideojuego(partida.videojuego.toString(), contexto);
  return partida;
}
export async function crear(entrada: unknown, opciones?: OpcionesTransaccion) {
  const datos = validarCreacionPartida(entrada, Date.now());
  return transaccion(async (contexto) => {
    await guardarVideojuego(datos.videojuego, contexto);
    const [partida] = await contexto.ejecutar(() =>
      Partida.create([datos], { session: contexto.session }),
    );
    return partida;
  }, opciones);
}
export async function actualizar(
  id: string,
  entrada: unknown,
  opciones?: OpcionesTransaccion,
) {
  validarId(id);
  const datos = validarActualizacionPartida(entrada, Date.now());
  return transaccion(async (contexto) => {
    const partida = await dentroDeTransaccion(id, contexto);
    contexto.comprobar();
    partida.set(datos);
    await contexto.ejecutar(() => partida.save({ session: contexto.session }));
    return partida;
  }, opciones);
}
export async function eliminar(id: string, opciones?: OpcionesTransaccion) {
  validarId(id);
  return transaccion(async (contexto) => {
    const partida = await dentroDeTransaccion(id, contexto);
    const borrado = await contexto.ejecutar((maxTimeMS) =>
      Partida.deleteOne(
        { _id: partida._id },
        { session: contexto.session, maxTimeMS },
      ),
    );
    if (borrado.deletedCount !== 1)
      throw new ApiError(404, "Partida no encontrada");
  }, opciones);
}
