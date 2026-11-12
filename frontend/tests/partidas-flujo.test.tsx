import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioPartida } from "../src/paginas/FormularioPartida";
import { Partidas } from "../src/paginas/Partidas";
import * as partidasApi from "../src/api/partidasApi";
import * as juegosApi from "../src/api/videojuegosApi";
import * as metasApi from "../src/api/metasApi";
import type { Videojuego } from "../src/tipos";

vi.mock("../src/api/partidasApi", () => ({
  crearPartida: vi.fn(),
  obtenerPartida: vi.fn(),
  actualizarPartida: vi.fn(),
  listarPartidas: vi.fn(),
  eliminarPartida: vi.fn(),
}));
vi.mock("../src/api/videojuegosApi", () => ({ listarVideojuegos: vi.fn() }));
vi.mock("../src/api/metasApi", () => ({ obtenerProgresoSemanal: vi.fn() }));

const juego: Videojuego = {
  _id: "juego-1",
  nombre: "Celeste",
  genero: "Plataformas",
  plataforma: "PC",
  estado: "Jugando",
  portada: "",
  descripcion: "",
  logros: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};
const partida = {
  _id: "sesion-1",
  videojuego: juego._id,
  fecha: "2026-01-15T23:45:10.123Z",
  duracionMinutos: 60,
  porcentajeAvance: 40,
  notas: "Cumbre",
};
function Destino() {
  const ubicacion = useLocation();
  return (
    <div>
      Destino {ubicacion.pathname}{" "}
      {ubicacion.state?.revision ? "actualizado" : ""}
    </div>
  );
}
function formulario(ruta = "/partidas/nueva?videojuego=juego-1") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Link to="/partidas/sesion-2/editar">Otra partida</Link>
      <Link to="/partidas/nueva">Nueva partida</Link>
      <Routes>
        <Route path="/partidas/nueva" element={<FormularioPartida />} />
        <Route path="/partidas/:id/editar" element={<FormularioPartida />} />
        <Route path="/videojuegos/:id" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function guardar() {
  await userEvent.click(
    await screen.findByRole("button", { name: /GUARDAR (SESIÓN|CAMBIOS)/i }),
  );
}
function diferida<T>() {
  let resolver!: (value: T) => void;
  const promesa = new Promise<T>((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}

beforeEach(() => {
  Object.values(partidasApi).forEach((funcion) =>
    vi.mocked(funcion).mockReset(),
  );
  vi.mocked(juegosApi.listarVideojuegos).mockReset();
  vi.mocked(metasApi.obtenerProgresoSemanal).mockReset();
  vi.mocked(juegosApi.listarVideojuegos).mockResolvedValue([juego]);
  vi.mocked(partidasApi.obtenerPartida).mockResolvedValue(partida);
  vi.mocked(partidasApi.crearPartida).mockResolvedValue({ partida });
  vi.mocked(partidasApi.actualizarPartida).mockResolvedValue(partida);
  vi.mocked(partidasApi.listarPartidas).mockResolvedValue([
    { ...partida, videojuego: juego },
  ]);
  vi.mocked(partidasApi.eliminarPartida).mockResolvedValue(undefined);
  vi.mocked(metasApi.obtenerProgresoSemanal).mockResolvedValue(
    {} as Awaited<ReturnType<typeof metasApi.obtenerProgresoSemanal>>,
  );
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("T-17 formulario de partidas: CA-E2-37 a CA-E2-43", () => {
  it.each(["crear", "editar"])(
    "consulta el progreso después de %s aunque la vista se desmonte durante la escritura",
    async (modo) => {
      const pendiente = diferida<{ partida: typeof partida }>();
      const edicionPendiente = diferida<typeof partida>();
      vi.mocked(partidasApi.crearPartida).mockReturnValueOnce(
        pendiente.promesa,
      );
      vi.mocked(partidasApi.actualizarPartida).mockReturnValueOnce(
        edicionPendiente.promesa,
      );
      const vista = formulario(
        modo === "crear" ? undefined : "/partidas/sesion-1/editar",
      );
      await guardar();
      vista.unmount();
      if (modo === "crear") pendiente.resolver({ partida });
      else edicionPendiente.resolver(partida);
      await waitFor(() =>
        expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledWith("juego-1"),
      );
      expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/Destino/)).not.toBeInTheDocument();
    },
  );
  it("registra en hora de Ecuador y consulta progreso antes de navegar", async () => {
    formulario();
    fireEvent.change(await screen.findByLabelText("Inicio (hora de Ecuador)"), {
      target: { value: "2026-01-15T18:45:10.123" },
    });
    await guardar();
    await screen.findByText(/Destino \/videojuegos\/juego-1 actualizado/);
    expect(partidasApi.crearPartida).toHaveBeenCalledWith(
      expect.objectContaining({ videojuego: "juego-1", fecha: partida.fecha }),
    );
    expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledWith("juego-1");
    expect(
      vi.mocked(partidasApi.crearPartida).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(metasApi.obtenerProgresoSemanal).mock.invocationCallOrder[0],
    );
  });

  it("precarga edición, fija el juego y conserva segundos/milisegundos originales", async () => {
    formulario("/partidas/sesion-1/editar");
    const fecha = await screen.findByLabelText("Inicio (hora de Ecuador)");
    expect(fecha).toHaveValue("2026-01-15T18:45:10.123");
    expect(fecha).toHaveAttribute("step", "0.001");
    expect(screen.getByLabelText("Videojuego")).toBeDisabled();
    await guardar();
    await screen.findByText(/Destino/);
    expect(partidasApi.actualizarPartida).toHaveBeenCalledWith("sesion-1", {
      fecha: partida.fecha,
      duracionMinutos: 60,
      porcentajeAvance: 40,
      notas: "Cumbre",
    });
    expect(partidasApi.crearPartida).not.toHaveBeenCalled();
    expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledWith("juego-1");
  });

  it("bloquea el formulario si falla la precarga y permite reintentar", async () => {
    vi.mocked(partidasApi.obtenerPartida).mockRejectedValueOnce(
      new Error("Partida no encontrada"),
    );
    formulario("/partidas/sesion-1/editar");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Partida no encontrada",
    );
    expect(
      screen.queryByRole("button", { name: /GUARDAR/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByLabelText("Inicio (hora de Ecuador)"),
    ).toHaveValue("2026-01-15T18:45:10.123");
  });

  it("ignora una precarga obsoleta al cambiar el identificador", async () => {
    const anterior = diferida<typeof partida>();
    vi.mocked(partidasApi.obtenerPartida)
      .mockReturnValueOnce(anterior.promesa)
      .mockResolvedValueOnce({
        ...partida,
        _id: "sesion-2",
        notas: "Nueva sesión",
      });
    formulario("/partidas/sesion-1/editar");
    await userEvent.click(screen.getByRole("link", { name: "Otra partida" }));
    expect(
      await screen.findByLabelText("¿Qué pasó en esta sesión?"),
    ).toHaveValue("Nueva sesión");
    anterior.resolver(partida);
    await waitFor(() =>
      expect(screen.getByLabelText("¿Qué pasó en esta sesión?")).toHaveValue(
        "Nueva sesión",
      ),
    );
    await guardar();
    expect(partidasApi.actualizarPartida).toHaveBeenCalledWith(
      "sesion-2",
      expect.objectContaining({ notas: "Nueva sesión" }),
    );
  });

  it("reinicia valores y habilita selección al pasar de editar a crear", async () => {
    formulario("/partidas/sesion-1/editar");
    expect(
      await screen.findByLabelText("¿Qué pasó en esta sesión?"),
    ).toHaveValue("Cumbre");
    await userEvent.click(screen.getByRole("link", { name: "Nueva partida" }));
    expect(
      await screen.findByRole("button", { name: /GUARDAR SESIÓN/ }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Videojuego")).toBeEnabled();
    expect(screen.getByLabelText("¿Qué pasó en esta sesión?")).toHaveValue("");
  });

  it("distingue una biblioteca vacía y no ofrece un formulario imposible", async () => {
    vi.mocked(juegosApi.listarVideojuegos).mockResolvedValue([]);
    formulario();
    expect(
      await screen.findByText("Primero necesitas un videojuego"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /GUARDAR SESIÓN/ }),
    ).not.toBeInTheDocument();
  });

  it.each([1, 1440])(
    "admite la duración límite %i, avance y notas en sus límites",
    async (duracion) => {
      formulario();
      fireEvent.change(await screen.findByLabelText("Duración en minutos"), {
        target: { value: String(duracion) },
      });
      fireEvent.change(screen.getByLabelText("Porcentaje de avance"), {
        target: { value: duracion === 1 ? "0" : "100" },
      });
      fireEvent.change(screen.getByLabelText("¿Qué pasó en esta sesión?"), {
        target: { value: "a".repeat(500) },
      });
      await guardar();
      await screen.findByText(/Destino/);
      expect(partidasApi.crearPartida).toHaveBeenCalledWith(
        expect.objectContaining({
          duracionMinutos: duracion,
          porcentajeAvance: duracion === 1 ? 0 : 100,
          notas: "a".repeat(500),
        }),
      );
    },
  );

  it("rechaza notas que superan el límite sin enviar modificaciones", async () => {
    formulario();
    const notas = await screen.findByLabelText("¿Qué pasó en esta sesión?");
    fireEvent.change(notas, { target: { value: "a".repeat(501) } });
    await guardar();
    expect(notas).toHaveFocus();
    expect(notas).toHaveAccessibleDescription(/hasta 500/);
    expect(partidasApi.crearPartida).not.toHaveBeenCalled();
  });

  it.each(["", "0", "1441", "1.5"])(
    "rechaza duración inválida %s, asocia error y enfoca el campo",
    async (valor) => {
      formulario();
      const duracion = await screen.findByLabelText("Duración en minutos");
      fireEvent.change(duracion, { target: { value: valor } });
      await guardar();
      expect(duracion).toHaveAttribute("aria-invalid", "true");
      expect(duracion).toHaveFocus();
      expect(duracion).toHaveAccessibleDescription(/entero entre 1 y 1440/);
      expect(partidasApi.crearPartida).not.toHaveBeenCalled();
    },
  );

  it("rechaza un inicio futuro conservando los valores", async () => {
    formulario();
    const fecha = await screen.findByLabelText("Inicio (hora de Ecuador)");
    fireEvent.change(fecha, { target: { value: "2099-01-01T00:00" } });
    await guardar();
    expect(fecha).toHaveAttribute("aria-invalid", "true");
    expect(fecha).toHaveFocus();
    expect(fecha).toHaveAccessibleDescription(/futura/);
    expect(partidasApi.crearPartida).not.toHaveBeenCalled();
  });

  it("conserva los datos ante fallo de escritura y no consulta el progreso", async () => {
    vi.mocked(partidasApi.crearPartida).mockRejectedValueOnce(
      new Error("No se pudo guardar"),
    );
    formulario();
    await guardar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo guardar",
    );
    expect(screen.getByLabelText("Duración en minutos")).toHaveValue(60);
    expect(metasApi.obtenerProgresoSemanal).not.toHaveBeenCalled();
  });

  it("reintenta solo GET tras guardar sin poder refrescar, evitando doble POST", async () => {
    vi.mocked(metasApi.obtenerProgresoSemanal).mockRejectedValueOnce(
      new Error("Sin red"),
    );
    formulario();
    await guardar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La partida se guardó; no se pudo actualizar el progreso",
    );
    expect(
      screen.getByRole("button", { name: /GUARDAR SESIÓN/ }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Reintentar actualización" }),
    );
    await screen.findByText(/Destino/);
    expect(partidasApi.crearPartida).toHaveBeenCalledTimes(1);
    expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledTimes(2);
  });

  it("conserva la edición rechazada y no consulta progreso", async () => {
    vi.mocked(partidasApi.actualizarPartida).mockRejectedValueOnce(
      new Error("Datos inválidos"),
    );
    formulario("/partidas/sesion-1/editar");
    await guardar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Datos inválidos",
    );
    expect(screen.getByLabelText("¿Qué pasó en esta sesión?")).toHaveValue(
      "Cumbre",
    );
    expect(metasApi.obtenerProgresoSemanal).not.toHaveBeenCalled();
  });

  it("después de editar reintenta únicamente el progreso si falla su consulta", async () => {
    vi.mocked(metasApi.obtenerProgresoSemanal).mockRejectedValueOnce(
      new Error("Sin red"),
    );
    formulario("/partidas/sesion-1/editar");
    await guardar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La partida se guardó; no se pudo actualizar el progreso",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Reintentar actualización" }),
    );
    await screen.findByText(/Destino/);
    expect(partidasApi.actualizarPartida).toHaveBeenCalledTimes(1);
    expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledTimes(2);
  });

  it("impide envíos repetidos mientras la escritura está pendiente", async () => {
    const pendiente = diferida<{ partida: typeof partida }>();
    vi.mocked(partidasApi.crearPartida).mockReturnValueOnce(pendiente.promesa);
    formulario();
    const boton = await screen.findByRole("button", { name: /GUARDAR SESIÓN/ });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(partidasApi.crearPartida).toHaveBeenCalledTimes(1);
    expect(boton).toBeDisabled();
    pendiente.resolver({ partida });
    await screen.findByText(/Destino/);
  });
});

describe("T-17 historial global: CA-E2-41 a CA-E2-43", () => {
  function historial() {
    return render(
      <MemoryRouter>
        <Partidas />
      </MemoryRouter>,
    );
  }
  it("consulta el progreso del juego capturado si la vista se desmonta durante DELETE", async () => {
    const pendiente = diferida<void>();
    vi.mocked(partidasApi.eliminarPartida).mockReturnValueOnce(
      pendiente.promesa,
    );
    const vista = historial();
    await userEvent.click(
      await screen.findByRole("button", { name: "Eliminar partida" }),
    );
    vista.unmount();
    pendiente.resolver();
    await waitFor(() =>
      expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledWith("juego-1"),
    );
    expect(partidasApi.listarPartidas).toHaveBeenCalledTimes(1);
  });
  it.each(["populado", "referencia"])(
    "conserva el ID %s, elimina y vuelve a consultar progreso e historial",
    async (tipo) => {
      vi.mocked(partidasApi.listarPartidas).mockResolvedValueOnce([
        { ...partida, videojuego: tipo === "populado" ? juego : juego._id },
      ]);
      historial();
      expect(
        await screen.findByRole("link", { name: "Editar partida" }),
      ).toHaveAttribute("href", "/partidas/sesion-1/editar");
      await userEvent.click(
        screen.getByRole("button", { name: "Eliminar partida" }),
      );
      await waitFor(() =>
        expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledWith("juego-1"),
      );
      await waitFor(() =>
        expect(partidasApi.listarPartidas).toHaveBeenCalledTimes(2),
      );
      expect(
        vi.mocked(partidasApi.eliminarPartida).mock.invocationCallOrder[0],
      ).toBeLessThan(
        vi.mocked(metasApi.obtenerProgresoSemanal).mock.invocationCallOrder[0],
      );
    },
  );
  it("no elimina cuando se cancela la confirmación", async () => {
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    historial();
    await userEvent.click(
      await screen.findByRole("button", { name: "Eliminar partida" }),
    );
    expect(partidasApi.eliminarPartida).not.toHaveBeenCalled();
    expect(metasApi.obtenerProgresoSemanal).not.toHaveBeenCalled();
  });
  it("muestra fallo de borrado sin consultar progreso ni simular éxito", async () => {
    vi.mocked(partidasApi.eliminarPartida).mockRejectedValueOnce(
      new Error("Partida no encontrada"),
    );
    historial();
    await userEvent.click(
      await screen.findByRole("button", { name: "Eliminar partida" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Partida no encontrada",
    );
    expect(metasApi.obtenerProgresoSemanal).not.toHaveBeenCalled();
    expect(partidasApi.listarPartidas).toHaveBeenCalledTimes(1);
  });
  it("bloquea borrados repetidos mientras DELETE está pendiente", async () => {
    const pendiente = diferida<void>();
    vi.mocked(partidasApi.eliminarPartida).mockReturnValueOnce(
      pendiente.promesa,
    );
    historial();
    const boton = await screen.findByRole("button", {
      name: "Eliminar partida",
    });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(partidasApi.eliminarPartida).toHaveBeenCalledTimes(1);
    expect(boton).toBeDisabled();
    pendiente.resolver();
    await waitFor(() =>
      expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledTimes(1),
    );
  });
  it("tras DELETE exitoso y GET fallido, refresca el historial y reintenta solo GET", async () => {
    vi.mocked(metasApi.obtenerProgresoSemanal).mockRejectedValueOnce(
      new Error("Sin red"),
    );
    vi.mocked(partidasApi.listarPartidas)
      .mockResolvedValueOnce([{ ...partida, videojuego: juego }])
      .mockResolvedValue([]);
    historial();
    await userEvent.click(
      await screen.findByRole("button", { name: "Eliminar partida" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La partida se eliminó; no se pudo actualizar el progreso",
    );
    expect(
      await screen.findByText("Tu diario está en blanco"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Reintentar actualización" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(partidasApi.eliminarPartida).toHaveBeenCalledTimes(1);
    expect(metasApi.obtenerProgresoSemanal).toHaveBeenCalledTimes(2);
  });
});
