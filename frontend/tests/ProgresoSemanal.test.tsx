import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ProgresoSemanal } from "../src/componentes/ProgresoSemanal";
import * as api from "../src/api/metasApi";
import type { ProgresoSemanal as Progreso } from "../src/tipos";

vi.mock("../src/api/metasApi");
const dato: Progreso = {
  semana: { inicio: "2026-11-09", fin: "2026-11-15" },
  meta: { _id: "meta", horasSemanales: 5, diasPorSemana: 4 },
  horasSemana: 7,
  porcentajeHoras: 100,
  diasJugadosSemana: 3,
  rachaActual: 3,
  mejorRacha: 5,
  hitos: [
    { descripcion: "Mitad", porcentajeObjetivo: 50, alcanzado: true },
    { descripcion: "Final", porcentajeObjetivo: 100, alcanzado: false },
  ],
  cumplidaSemana: false,
};
beforeEach(() => {
  vi.mocked(api.obtenerProgresoSemanal).mockResolvedValue(dato);
});
const mostrar = (estado = "Jugando", revision = 0) =>
  render(
    <MemoryRouter>
      <ProgresoSemanal
        videojuegoId="juego"
        estado={estado}
        revision={revision}
      />
    </MemoryRouter>,
  );
it("T-16: presenta datos del servidor sin confundir 100% de horas con semana cumplida", async () => {
  mostrar();
  const barra = await screen.findByRole("progressbar", {
    name: "Horas semanales",
  });
  expect(barra).toHaveAttribute("aria-valuenow", "100");
  expect(screen.getByText("Meta semanal pendiente")).toBeVisible();
  expect(screen.getByText(/Racha actual/i)).toBeVisible();
  expect(screen.getByText(/Mejor racha/i)).toBeVisible();
  expect(screen.getByText("Alcanzado")).toBeVisible();
  expect(screen.getByText("Pendiente", { exact: true })).toBeVisible();
});
it("T-16: muestra semana cumplida solo cuando lo indica el servidor", async () => {
  vi.mocked(api.obtenerProgresoSemanal).mockResolvedValue({
    ...dato,
    cumplidaSemana: true,
  });
  mostrar();
  expect(await screen.findByText("Semana cumplida")).toBeVisible();
});
it("T-16: sin meta conserva actividad y rachas, ofrece crear y omite barra e hitos", async () => {
  vi.mocked(api.obtenerProgresoSemanal).mockResolvedValue({
    ...dato,
    meta: null,
    porcentajeHoras: null,
    hitos: [],
    cumplidaSemana: null,
  });
  mostrar();
  expect(await screen.findByText("Sin meta activa")).toBeVisible();
  expect(screen.getByRole("link", { name: /Crear meta/i })).toHaveAttribute(
    "href",
    "/videojuegos/juego/meta/nueva",
  );
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.queryByText("Mitad")).not.toBeInTheDocument();
  expect(screen.getByText(/Mejor racha/i)).toBeVisible();
});
it("T-16: Completado explica restricción sin ofrecer activación", async () => {
  vi.mocked(api.obtenerProgresoSemanal).mockResolvedValue({
    ...dato,
    meta: null,
    porcentajeHoras: null,
    hitos: [],
    cumplidaSemana: null,
  });
  mostrar("Completado");
  expect(
    await screen.findByText(/no puede tener una meta activa/i),
  ).toBeVisible();
  expect(
    screen.queryByRole("link", { name: /Crear meta/i }),
  ).not.toBeInTheDocument();
});
it("T-16: carga anunciada, error y reintento de consulta", async () => {
  vi.mocked(api.obtenerProgresoSemanal).mockRejectedValueOnce(
    new Error("Consulta fallida"),
  );
  mostrar();
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Consulta fallida",
  );
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByRole("progressbar")).toBeVisible();
  expect(api.obtenerProgresoSemanal).toHaveBeenCalledTimes(2);
});
it("T-16: no confunde meta sin hitos con un fallo", async () => {
  vi.mocked(api.obtenerProgresoSemanal).mockResolvedValue({
    ...dato,
    hitos: [],
  });
  mostrar();
  expect(await screen.findByText(/No hay hitos definidos/i)).toBeVisible();
});
it("T-16: confirma desactivación, cancelar no escribe y devuelve el foco", async () => {
  mostrar();
  const boton = await screen.findByRole("button", { name: /Desactivar meta/i });
  vi.spyOn(window, "confirm").mockReturnValue(false);
  await userEvent.click(boton);
  expect(api.desactivarMeta).not.toHaveBeenCalled();
  expect(boton).toHaveFocus();
});
it("T-16: desactivar confirmado vuelve a consultar, nunca borra metas", async () => {
  mostrar();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  await userEvent.click(
    await screen.findByRole("button", { name: /Desactivar meta/i }),
  );
  await waitFor(() => expect(api.desactivarMeta).toHaveBeenCalledWith("meta"));
  await waitFor(() =>
    expect(api.obtenerProgresoSemanal).toHaveBeenCalledTimes(2),
  );
});
it("T-16: cambio de revisión solicita progreso nuevo", async () => {
  const vista = mostrar();
  await screen.findByRole("progressbar");
  vista.rerender(
    <MemoryRouter>
      <ProgresoSemanal videojuegoId="juego" estado="Jugando" revision={1} />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(api.obtenerProgresoSemanal).toHaveBeenCalledTimes(2),
  );
});
it("T-16: respuesta obsoleta de otro juego no sobreescribe el actual", async () => {
  let resolver!: (valor: Progreso) => void;
  vi.mocked(api.obtenerProgresoSemanal).mockReturnValueOnce(
    new Promise((resolve) => (resolver = resolve)),
  );
  const vista = mostrar();
  vista.rerender(
    <MemoryRouter>
      <ProgresoSemanal videojuegoId="otro" estado="Jugando" />
    </MemoryRouter>,
  );
  await screen.findByRole("progressbar");
  resolver({ ...dato, meta: null, hitos: [], porcentajeHoras: null });
  await waitFor(() => expect(screen.getByRole("progressbar")).toBeVisible());
});
it("T-16: objetivos decimales pequeños no se muestran como cero ni se redondean los hitos", async () => {
  vi.mocked(api.obtenerProgresoSemanal).mockResolvedValue({
    ...dato,
    meta: { _id: "meta", horasSemanales: 0.01, diasPorSemana: 1 },
    hitos: [
      { descripcion: "Preciso", porcentajeObjetivo: 50.55, alcanzado: false },
    ],
  });
  mostrar();
  expect(await screen.findByRole("progressbar")).toHaveAttribute(
    "aria-valuetext",
    expect.stringMatching(/0[,.]01/),
  );
  expect(screen.getByText(/50[,.]55% de avance/)).toBeVisible();
});
it("T-16: cambiar revisión con desactivación en vuelo libera el bloqueo al terminar y refresca", async () => {
  let resolver!: () => void;
  vi.mocked(api.desactivarMeta).mockReturnValueOnce(
    new Promise((resolve) => (resolver = () => resolve({} as never))),
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const vista = mostrar();
  await userEvent.click(
    await screen.findByRole("button", { name: /Desactivar meta/i }),
  );
  vi.mocked(api.obtenerProgresoSemanal).mockResolvedValue({
    ...dato,
    meta: { _id: "otra", horasSemanales: 5, diasPorSemana: 4 },
  });
  vista.rerender(
    <MemoryRouter>
      <ProgresoSemanal videojuegoId="juego" estado="Jugando" revision={1} />
    </MemoryRouter>,
  );
  await screen.findByRole("progressbar");
  resolver();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Desactivar meta/i }),
    ).toBeEnabled(),
  );
  expect(api.obtenerProgresoSemanal).toHaveBeenCalledTimes(3);
});
