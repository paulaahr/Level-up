import { beforeEach, expect, it, vi } from "vitest";
import {
  crearMeta,
  obtenerMeta,
  listarMetas,
  actualizarMeta,
  desactivarMeta,
  obtenerProgresoSemanal,
} from "../src/api/metasApi";
import { obtenerPartida, actualizarPartida } from "../src/api/partidasApi";

const meta = {
  _id: "meta",
  videojuego: "juego",
  horasSemanales: 5,
  diasPorSemana: 4,
  activa: true,
  hitos: [],
  createdAt: "2026-11-11T00:00:00Z",
  updatedAt: "2026-11-11T00:00:00Z",
};
const progreso = {
  semana: { inicio: "2026-11-09", fin: "2026-11-15" },
  meta: null,
  horasSemana: 3,
  porcentajeHoras: null,
  diasJugadosSemana: 2,
  rachaActual: 2,
  mejorRacha: 5,
  hitos: [],
  cumplidaSemana: null,
};
const datos = { horasSemanales: 5, diasPorSemana: 4, hitos: [] };
beforeEach(() => {
  vi.mocked(fetch).mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          meta,
          metas: [meta],
          progreso,
          partida: { _id: "p", videojuego: "juego" },
          requestId: "controlado",
        }),
        { status: 200 },
      ),
  );
});
it("T-14: crea con POST y datos numéricos, sin cálculos en el cliente", async () => {
  expect(await crearMeta({ ...datos, videojuego: "juego" })).toEqual(meta);
  expect(fetch).toHaveBeenCalledWith(
    "http://api.level-up.test/api/metas",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ ...datos, videojuego: "juego" }),
    }),
  );
});
it("T-14: consulta individual y listado conservando inactivas", async () => {
  expect(await obtenerMeta("meta")).toEqual(meta);
  expect(await listarMetas("juego")).toEqual([meta]);
  expect(fetch).toHaveBeenLastCalledWith(
    "http://api.level-up.test/api/videojuegos/juego/metas",
    expect.any(Object),
  );
});
it("T-14: PUT completo y PATCH de desactivación usan contratos existentes", async () => {
  await actualizarMeta("meta", datos);
  expect(fetch).toHaveBeenLastCalledWith(
    "http://api.level-up.test/api/metas/meta",
    expect.objectContaining({ method: "PUT", body: JSON.stringify(datos) }),
  );
  await desactivarMeta("meta");
  expect(fetch).toHaveBeenLastCalledWith(
    "http://api.level-up.test/api/metas/meta/desactivar",
    expect.objectContaining({ method: "PATCH" }),
  );
});
it("T-14: progreso sin meta conserva nulls y actividad del servidor", async () => {
  expect(await obtenerProgresoSemanal("juego")).toEqual(progreso);
  expect(fetch).toHaveBeenLastCalledWith(
    "http://api.level-up.test/api/videojuegos/juego/progreso-semanal",
    expect.any(Object),
  );
});
it.each([400, 404, 409, 500])(
  "T-14: comunica rechazo HTTP %s sin tratarlo como vacío",
  async (status) => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Mensaje del servidor", requestId: "id" }),
        { status },
      ),
    );
    await expect(obtenerProgresoSemanal("juego")).rejects.toThrow(
      "Mensaje del servidor",
    );
  },
);
it("T-14: lectura y edición de partidas no reasignan el videojuego", async () => {
  expect(await obtenerPartida("p")).toMatchObject({ videojuego: "juego" });
  const edicion = {
    fecha: "2026-11-11T16:00:00Z",
    duracionMinutos: 60,
    porcentajeAvance: 20,
    notas: "",
  };
  await actualizarPartida("p", edicion);
  expect(fetch).toHaveBeenLastCalledWith(
    "http://api.level-up.test/api/partidas/p",
    expect.objectContaining({ method: "PUT", body: JSON.stringify(edicion) }),
  );
});
