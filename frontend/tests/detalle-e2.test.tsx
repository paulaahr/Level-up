import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { Detalle } from "../src/paginas/Detalle";
import * as juegos from "../src/api/videojuegosApi";
import * as metas from "../src/api/metasApi";
import * as partidas from "../src/api/partidasApi";

vi.mock("../src/api/videojuegosApi");
vi.mock("../src/api/metasApi");
vi.mock("../src/api/partidasApi");
const juego = {
  _id: "juego",
  nombre: "Celeste",
  genero: "Plataformas",
  plataforma: "PC",
  estado: "Jugando",
  portada: "",
  descripcion: "Escala",
  logros: [],
  createdAt: "2026-01-01T00:00:00Z",
};
const progreso = {
  semana: { inicio: "2026-11-09", fin: "2026-11-15" },
  meta: null,
  horasSemana: 1,
  porcentajeHoras: null,
  diasJugadosSemana: 1,
  rachaActual: 1,
  mejorRacha: 1,
  hitos: [],
  cumplidaSemana: null,
};
beforeEach(() => {
  vi.mocked(juegos.obtenerVideojuego).mockResolvedValue(juego);
  vi.mocked(juegos.obtenerResumen).mockResolvedValue({
    videojuego: "juego",
    totalPartidas: 1,
    minutosTotales: 60,
    horasTotales: 1,
    ultimaSesion: "2026-11-11T16:00:00Z",
    porcentajeAvanceActual: 20,
  });
  vi.mocked(juegos.partidasDeVideojuego).mockResolvedValue([
    {
      _id: "partida",
      videojuego: "juego",
      fecha: "2026-11-11T16:00:00Z",
      duracionMinutos: 60,
      porcentajeAvance: 20,
      notas: "Ruta",
    },
  ]);
  vi.mocked(metas.obtenerProgresoSemanal).mockResolvedValue(progreso);
  vi.mocked(metas.listarMetas).mockResolvedValue([]);
  vi.mocked(partidas.eliminarPartida).mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
const mostrar = () =>
  render(
    <MemoryRouter initialEntries={["/videojuegos/juego"]}>
      <Routes>
        <Route path="/videojuegos/:id" element={<Detalle />} />
      </Routes>
    </MemoryRouter>,
  );
it("T-16/T-17: integra progreso e historial de metas y ofrece editar partidas", async () => {
  mostrar();
  expect(
    await screen.findByRole("heading", { name: /Progreso semanal/ }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: /Editar partida/ })).toHaveAttribute(
    "href",
    "/partidas/partida/editar",
  );
  expect(metas.listarMetas).toHaveBeenCalledWith("juego");
});
it("T-17: borrar desde detalle espera DELETE y vuelve a consultar progreso, resumen e historial", async () => {
  mostrar();
  await screen.findByRole("heading", { name: /Progreso semanal/ });
  const llamadas = vi.mocked(metas.obtenerProgresoSemanal).mock.calls.length;
  await userEvent.click(
    screen.getByRole("button", { name: /Eliminar partida/ }),
  );
  await waitFor(() =>
    expect(partidas.eliminarPartida).toHaveBeenCalledWith("partida"),
  );
  await waitFor(() =>
    expect(
      vi.mocked(metas.obtenerProgresoSemanal).mock.calls.length,
    ).toBeGreaterThan(llamadas),
  );
  await waitFor(() => expect(juegos.obtenerResumen).toHaveBeenCalledTimes(2));
  expect(juegos.partidasDeVideojuego).toHaveBeenCalledTimes(2);
});
it("T-17: si DELETE falla no refresca ni presenta éxito", async () => {
  vi.mocked(partidas.eliminarPartida).mockRejectedValue(
    new Error("No se pudo eliminar"),
  );
  mostrar();
  await screen.findByRole("heading", { name: /Progreso semanal/ });
  await userEvent.click(
    screen.getByRole("button", { name: /Eliminar partida/ }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo eliminar",
  );
  expect(metas.obtenerProgresoSemanal).toHaveBeenCalledTimes(1);
});
it("T-17: tras DELETE exitoso y fallo de progreso, reintenta solo la consulta", async () => {
  vi.mocked(metas.obtenerProgresoSemanal)
    .mockResolvedValueOnce(progreso)
    .mockRejectedValueOnce(new Error("Red"))
    .mockResolvedValue(progreso);
  mostrar();
  await screen.findByRole("heading", { name: /Progreso semanal/ });
  await waitFor(() =>
    expect(metas.obtenerProgresoSemanal).toHaveBeenCalledTimes(1),
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Eliminar partida/ }),
  );
  expect(
    await screen.findByText(
      /La partida se eliminó; no se pudo actualizar el progreso/,
    ),
  ).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: /Reintentar progreso/ }),
  );
  await waitFor(() =>
    expect(
      screen.queryByText(
        /La partida se eliminó; no se pudo actualizar el progreso/,
      ),
    ).not.toBeInTheDocument(),
  );
  expect(partidas.eliminarPartida).toHaveBeenCalledTimes(1);
});
it("CA-E2-42 / T-17: DELETE que termina después de cambiar de juego consulta el progreso del juego original", async () => {
  let terminar!: () => void;
  vi.mocked(partidas.eliminarPartida).mockReturnValue(
    new Promise<void>((resolve) => {
      terminar = resolve;
    }),
  );
  vi.mocked(juegos.obtenerVideojuego).mockImplementation(async (id) => ({
    ...juego,
    _id: id,
    nombre: id === "nuevo" ? "Hollow Knight" : "Celeste",
  }));
  vi.mocked(juegos.partidasDeVideojuego).mockImplementation(async (id) =>
    id === "nuevo"
      ? []
      : [
          {
            _id: "partida",
            videojuego: "juego",
            fecha: "2026-11-11T16:00:00Z",
            duracionMinutos: 60,
            porcentajeAvance: 20,
            notas: "Ruta",
          },
        ],
  );
  render(
    <MemoryRouter initialEntries={["/videojuegos/juego"]}>
      <Link to="/videojuegos/nuevo">Cambiar de videojuego</Link>
      <Routes>
        <Route path="/videojuegos/:id" element={<Detalle />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: /Progreso semanal/ });
  await userEvent.click(
    screen.getByRole("button", { name: /Eliminar partida/ }),
  );
  await waitFor(() =>
    expect(partidas.eliminarPartida).toHaveBeenCalledWith("partida"),
  );
  await userEvent.click(
    screen.getByRole("link", { name: "Cambiar de videojuego" }),
  );
  await screen.findByRole("heading", { name: "Hollow Knight" });
  await waitFor(() =>
    expect(metas.obtenerProgresoSemanal).toHaveBeenCalledWith("nuevo"),
  );
  vi.mocked(metas.obtenerProgresoSemanal).mockClear();
  await act(async () => {
    terminar();
  });
  await waitFor(() =>
    expect(metas.obtenerProgresoSemanal).toHaveBeenCalledWith("juego"),
  );
  expect(screen.getByRole("heading", { name: "Hollow Knight" })).toBeVisible();
  expect(juegos.obtenerResumen).toHaveBeenCalledTimes(2);
  expect(partidas.eliminarPartida).toHaveBeenCalledTimes(1);
});
it("CA-E2-42 / T-17: DELETE que termina tras desmontar todavía consulta progreso", async () => {
  let terminar!: () => void;
  vi.mocked(partidas.eliminarPartida).mockReturnValue(
    new Promise<void>((resolve) => {
      terminar = resolve;
    }),
  );
  const vista = mostrar();
  await screen.findByRole("heading", { name: /Progreso semanal/ });
  await userEvent.click(
    screen.getByRole("button", { name: /Eliminar partida/ }),
  );
  await waitFor(() =>
    expect(partidas.eliminarPartida).toHaveBeenCalledTimes(1),
  );
  vista.unmount();
  vi.mocked(metas.obtenerProgresoSemanal).mockClear();
  await act(async () => {
    terminar();
  });
  await waitFor(() =>
    expect(metas.obtenerProgresoSemanal).toHaveBeenCalledExactlyOnceWith(
      "juego",
    ),
  );
});
