import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioMeta } from "../src/paginas/FormularioMeta";
import { HistorialMetas } from "../src/componentes/HistorialMetas";
import * as metasApi from "../src/api/metasApi";
import * as videojuegosApi from "../src/api/videojuegosApi";
import type { Meta, Videojuego } from "../src/tipos";

vi.mock("../src/api/metasApi");
vi.mock("../src/api/videojuegosApi");

const juego: Videojuego = {
  _id: "juego-1",
  nombre: "Celeste",
  genero: "Plataformas",
  plataforma: "PC",
  estado: "Jugando",
  portada: "",
  descripcion: "",
  logros: [],
  createdAt: "2026-11-01T00:00:00.000Z",
};
const meta: Meta = {
  _id: "meta-1",
  videojuego: juego._id,
  horasSemanales: 5,
  diasPorSemana: 4,
  activa: true,
  hitos: [{ descripcion: "La cumbre", porcentajeObjetivo: 50.5 }],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

function Destino() {
  const ubicacion = useLocation();
  return (
    <p>Detalle actualizado {String(Boolean(ubicacion.state?.revision))}</p>
  );
}

function CambiarJuego() {
  const navegar = useNavigate();
  return (
    <button onClick={() => navegar("/videojuegos/juego-2/meta/nueva")}>
      Cambiar juego de prueba
    </button>
  );
}

function mostrar(ruta = "/videojuegos/juego-1/meta/nueva") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <CambiarJuego />
      <Routes>
        <Route
          path="/videojuegos/:id/meta/nueva"
          element={<FormularioMeta />}
        />
        <Route
          path="/videojuegos/:id/metas/:metaId/editar"
          element={<FormularioMeta />}
        />
        <Route path="/videojuegos/:id" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function cargarFormulario(ruta?: string) {
  mostrar(ruta);
  return screen.findByRole("spinbutton", { name: "Horas semanales" });
}

function completar(horas = "5", dias = "4") {
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Horas semanales" }),
    { target: { value: horas } },
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Días por semana" }),
    { target: { value: dias } },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(videojuegosApi.obtenerVideojuego).mockResolvedValue(juego);
  vi.mocked(metasApi.obtenerMeta).mockResolvedValue(meta);
  vi.mocked(metasApi.crearMeta).mockResolvedValue(meta);
  vi.mocked(metasApi.actualizarMeta).mockResolvedValue(meta);
  vi.mocked(metasApi.desactivarMeta).mockResolvedValue({
    ...meta,
    activa: false,
  });
  vi.mocked(metasApi.listarMetas).mockResolvedValue([]);
  vi.spyOn(window, "confirm").mockReturnValue(false);
});

describe("T-15 formulario de metas", () => {
  it("CA-E2-01/47 crea una meta con dos hitos y números, y navega con revisión", async () => {
    await cargarFormulario();
    completar();
    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole("button", { name: "Añadir hito" }));
    await usuario.type(
      screen.getByRole("textbox", { name: "Descripción del hito 1" }),
      "La cumbre",
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Objetivo del hito 1 (%)" }),
      { target: { value: "50.5" } },
    );
    await usuario.click(screen.getByRole("button", { name: "Añadir hito" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Objetivo del hito 2 (%)" }),
      { target: { value: "100" } },
    );
    await usuario.click(screen.getByRole("button", { name: "Crear meta" }));
    expect(metasApi.crearMeta).toHaveBeenCalledWith({
      videojuego: juego._id,
      horasSemanales: 5,
      diasPorSemana: 4,
      hitos: [
        { descripcion: "La cumbre", porcentajeObjetivo: 50.5 },
        { descripcion: "", porcentajeObjetivo: 100 },
      ],
    });
    expect(
      await screen.findByText("Detalle actualizado true"),
    ).toBeInTheDocument();
  });

  it.each(["0.1", "100"])(
    "CA-E2-03 acepta horas %s sin mínimos añadidos y cero hitos",
    async (horas) => {
      await cargarFormulario();
      completar(horas, "1");
      fireEvent.click(screen.getByRole("button", { name: "Crear meta" }));
      await waitFor(() =>
        expect(metasApi.crearMeta).toHaveBeenCalledWith({
          videojuego: juego._id,
          horasSemanales: Number(horas),
          diasPorSemana: 1,
          hitos: [],
        }),
      );
    },
  );

  it.each(["", "0", "-1", "100.1"])(
    "CA-E2-03 rechaza horas %s, conserva entrada y enfoca el campo",
    async (horas) => {
      const campo = await cargarFormulario();
      completar(horas);
      fireEvent.click(screen.getByRole("button", { name: "Crear meta" }));
      expect(campo).toHaveAttribute("aria-invalid", "true");
      expect(campo).toHaveAccessibleDescription(
        "Introduce horas mayores que 0 y hasta 100.",
      );
      expect(campo).toHaveFocus();
      expect(metasApi.crearMeta).not.toHaveBeenCalled();
      expect(campo).toHaveValue(horas === "" ? null : Number(horas));
    },
  );

  it.each(["", "0", "8", "1.5"])("CA-E2-04 rechaza días %s", async (dias) => {
    await cargarFormulario();
    completar("5", dias);
    fireEvent.click(screen.getByRole("button", { name: "Crear meta" }));
    expect(
      screen.getByRole("spinbutton", { name: "Días por semana" }),
    ).toHaveAccessibleDescription("Introduce un número entero entre 1 y 7.");
    expect(metasApi.crearMeta).not.toHaveBeenCalled();
  });

  it("CA-E2-04/05 acepta siete días y cinco hitos e impide el sexto", async () => {
    await cargarFormulario();
    completar("5", "7");
    const agregar = screen.getByRole("button", { name: "Añadir hito" });
    for (let indice = 1; indice <= 5; indice += 1) {
      fireEvent.click(agregar);
      fireEvent.change(
        screen.getByRole("spinbutton", {
          name: `Objetivo del hito ${indice} (%)`,
        }),
        { target: { value: "1" } },
      );
    }
    expect(agregar).toBeDisabled();
    expect(
      screen.getByText("Puedes definir hasta cinco hitos por meta."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Crear meta" }));
    await waitFor(() => expect(metasApi.crearMeta).toHaveBeenCalled());
    expect(vi.mocked(metasApi.crearMeta).mock.calls[0][0].hitos).toHaveLength(
      5,
    );
  });

  it.each(["", "0", "100.1"])(
    "CA-E2-06 rechaza objetivo %s, sin perder el hito",
    async (valor) => {
      await cargarFormulario();
      completar();
      fireEvent.click(screen.getByRole("button", { name: "Añadir hito" }));
      fireEvent.change(
        screen.getByRole("spinbutton", { name: "Objetivo del hito 1 (%)" }),
        { target: { value: valor } },
      );
      fireEvent.click(screen.getByRole("button", { name: "Crear meta" }));
      expect(
        screen.getByRole("spinbutton", { name: "Objetivo del hito 1 (%)" }),
      ).toHaveAccessibleDescription("Introduce un porcentaje entre 1 y 100.");
      expect(
        screen.getByRole("textbox", { name: "Descripción del hito 1" }),
      ).toBeInTheDocument();
      expect(metasApi.crearMeta).not.toHaveBeenCalled();
    },
  );

  it("CA-E2-05 permite eliminar un hito usando su botón accesible", async () => {
    await cargarFormulario();
    fireEvent.click(screen.getByRole("button", { name: "Añadir hito" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar hito 1" }));
    expect(
      screen.queryByRole("textbox", { name: "Descripción del hito 1" }),
    ).not.toBeInTheDocument();
  });

  it("CA-E2-11 conserva valores y muestra el conflicto del servidor", async () => {
    vi.mocked(metasApi.crearMeta).mockRejectedValue(
      new Error("Ya existe una meta activa"),
    );
    await cargarFormulario();
    completar("3.5", "2");
    fireEvent.click(screen.getByRole("button", { name: "Crear meta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una meta activa",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Horas semanales" }),
    ).toHaveValue(3.5);
    expect(
      screen.queryByText("Detalle actualizado true"),
    ).not.toBeInTheDocument();
  });

  it("CA-E2-12 precarga y edita una meta inactiva sin reactivarla", async () => {
    vi.mocked(metasApi.obtenerMeta).mockResolvedValue({
      ...meta,
      activa: false,
    });
    const campo = await cargarFormulario(
      "/videojuegos/juego-1/metas/meta-1/editar",
    );
    expect(campo).toHaveValue(5);
    expect(
      screen.getByRole("textbox", { name: "Descripción del hito 1" }),
    ).toHaveValue("La cumbre");
    completar("3", "2");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(metasApi.actualizarMeta).toHaveBeenCalledWith("meta-1", {
        horasSemanales: 3,
        diasPorSemana: 2,
        hitos: meta.hitos,
        activa: false,
      }),
    );
  });

  it("CA-E2-08 bloquea precarga fallida y permite reintentar sin mostrar formulario vacío", async () => {
    vi.mocked(metasApi.obtenerMeta).mockRejectedValueOnce(
      new Error("Meta no encontrada"),
    );
    mostrar("/videojuegos/juego-1/metas/meta-1/editar");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Meta no encontrada",
    );
    expect(
      screen.queryByRole("button", { name: "Guardar cambios" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("spinbutton", { name: "Horas semanales" }),
    ).toHaveValue(5);
  });

  it("CA-E2-02 bloquea una meta perteneciente a otro videojuego", async () => {
    vi.mocked(metasApi.obtenerMeta).mockResolvedValue({
      ...meta,
      videojuego: "otro-juego",
    });
    mostrar("/videojuegos/juego-1/metas/meta-1/editar");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La meta no pertenece a este videojuego.",
    );
    expect(
      screen.queryByRole("button", { name: "Guardar cambios" }),
    ).not.toBeInTheDocument();
  });

  it("CA-E2-07 distingue fallo de videojuego de formulario de creación", async () => {
    vi.mocked(videojuegosApi.obtenerVideojuego).mockRejectedValue(
      new Error("Videojuego no encontrado"),
    );
    mostrar();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Videojuego no encontrado",
    );
    expect(
      screen.queryByRole("button", { name: "Crear meta" }),
    ).not.toBeInTheDocument();
  });

  it("CA-E2-34 impide crear una meta activa en un videojuego completado", async () => {
    vi.mocked(videojuegosApi.obtenerVideojuego).mockResolvedValue({
      ...juego,
      estado: "Completado",
    });
    mostrar();
    expect(
      await screen.findByText(
        /no puede tener una meta activa hasta dejar el estado Completado/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Crear meta" }),
    ).not.toBeInTheDocument();
  });

  it("CA-E2-36 permite crear en En pausa", async () => {
    vi.mocked(videojuegosApi.obtenerVideojuego).mockResolvedValue({
      ...juego,
      estado: "En pausa",
    });
    await cargarFormulario();
    completar();
    fireEvent.click(screen.getByRole("button", { name: "Crear meta" }));
    await waitFor(() => expect(metasApi.crearMeta).toHaveBeenCalled());
  });

  it("CA-E2-12/34 permite editar una meta inactiva de un juego completado", async () => {
    vi.mocked(videojuegosApi.obtenerVideojuego).mockResolvedValue({
      ...juego,
      estado: "Completado",
    });
    vi.mocked(metasApi.obtenerMeta).mockResolvedValue({
      ...meta,
      activa: false,
    });
    await cargarFormulario("/videojuegos/juego-1/metas/meta-1/editar");
    completar("2", "1");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(metasApi.actualizarMeta).toHaveBeenCalledWith(
        "meta-1",
        expect.objectContaining({ activa: false }),
      ),
    );
    expect(
      screen.queryByRole("button", { name: "Desactivar meta" }),
    ).not.toBeInTheDocument();
  });

  it("CA-E2-12 conserva los nuevos objetivos e hitos si falla la edición", async () => {
    vi.mocked(metasApi.actualizarMeta).mockRejectedValue(
      new Error("No se pudo actualizar"),
    );
    await cargarFormulario("/videojuegos/juego-1/metas/meta-1/editar");
    completar("3.5", "2");
    fireEvent.change(
      screen.getByRole("textbox", { name: "Descripción del hito 1" }),
      { target: { value: "Nuevo objetivo" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo actualizar",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Horas semanales" }),
    ).toHaveValue(3.5);
    expect(
      screen.getByRole("textbox", { name: "Descripción del hito 1" }),
    ).toHaveValue("Nuevo objetivo");
  });

  it("CA-E2-14 cancelar desactivación no envía PATCH y devuelve foco", async () => {
    await cargarFormulario("/videojuegos/juego-1/metas/meta-1/editar");
    const boton = screen.getByRole("button", { name: "Desactivar meta" });
    await userEvent.click(boton);
    expect(window.confirm).toHaveBeenCalledWith(
      "¿Desactivar esta meta? Se conservará como inactiva",
    );
    expect(metasApi.desactivarMeta).not.toHaveBeenCalled();
    expect(boton).toHaveFocus();
  });

  it("CA-E2-14 confirmar desactiva y navega con revisión", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    await cargarFormulario("/videojuegos/juego-1/metas/meta-1/editar");
    fireEvent.click(screen.getByRole("button", { name: "Desactivar meta" }));
    expect(
      await screen.findByText("Detalle actualizado true"),
    ).toBeInTheDocument();
    expect(metasApi.desactivarMeta).toHaveBeenCalledExactlyOnceWith("meta-1");
  });

  it("CA-E2-14 fallo al desactivar conserva la meta y los valores", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.mocked(metasApi.desactivarMeta).mockRejectedValue(
      new Error("No se pudo desactivar"),
    );
    await cargarFormulario("/videojuegos/juego-1/metas/meta-1/editar");
    fireEvent.click(screen.getByRole("button", { name: "Desactivar meta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo desactivar",
    );
    expect(
      screen.getByRole("button", { name: "Desactivar meta" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("spinbutton", { name: "Horas semanales" }),
    ).toHaveValue(5);
  });

  it("CA-E2-47 bloquea dobles envíos mientras guarda", async () => {
    vi.mocked(metasApi.crearMeta).mockReturnValue(new Promise(() => {}));
    await cargarFormulario();
    completar();
    const boton = screen.getByRole("button", { name: "Crear meta" });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(metasApi.crearMeta).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Guardando meta...");
  });

  it("CA-E2-14/47 bloquea guardar y desactivar mientras la desactivación está pendiente", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.mocked(metasApi.desactivarMeta).mockReturnValue(new Promise(() => {}));
    await cargarFormulario("/videojuegos/juego-1/metas/meta-1/editar");
    const boton = screen.getByRole("button", { name: "Desactivar meta" });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(metasApi.desactivarMeta).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Desactivando..." }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeDisabled();
  });

  it("CA-E2-49 reinicia los valores al cambiar del modo edición a otro juego", async () => {
    await cargarFormulario("/videojuegos/juego-1/metas/meta-1/editar");
    expect(
      screen.getByRole("spinbutton", { name: "Horas semanales" }),
    ).toHaveValue(5);
    vi.mocked(videojuegosApi.obtenerVideojuego).mockResolvedValue({
      ...juego,
      _id: "juego-2",
      nombre: "Hollow Knight",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Cambiar juego de prueba" }),
    );
    expect(await screen.findByText("Hollow Knight")).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Horas semanales" }),
    ).toHaveValue(null);
    expect(
      screen.queryByRole("textbox", { name: "Descripción del hito 1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear meta" }),
    ).toBeInTheDocument();
  });

  it("CA-E2-49 anuncia carga y descarta una respuesta de un juego anterior", async () => {
    let resolver: (valor: Videojuego) => void = () => {};
    vi.mocked(videojuegosApi.obtenerVideojuego).mockImplementation((id) =>
      id === "juego-1"
        ? new Promise((resolve) => {
            resolver = resolve;
          })
        : Promise.resolve({
            ...juego,
            _id: "juego-2",
            nombre: "Hollow Knight",
          }),
    );
    mostrar();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    fireEvent.click(
      screen.getByRole("button", { name: "Cambiar juego de prueba" }),
    );
    expect(await screen.findByText("Hollow Knight")).toBeInTheDocument();
    await act(async () => resolver(juego));
    expect(screen.queryByText("Celeste")).not.toBeInTheDocument();
    completar();
    fireEvent.click(screen.getByRole("button", { name: "Crear meta" }));
    await waitFor(() =>
      expect(metasApi.crearMeta).toHaveBeenCalledWith(
        expect.objectContaining({ videojuego: "juego-2" }),
      ),
    );
  });
});

describe("T-15 historial de metas", () => {
  function historial() {
    return render(
      <MemoryRouter>
        <div className="detalle-page">
          <HistorialMetas videojuegoId={juego._id} />
        </div>
      </MemoryRouter>,
    );
  }

  it("CA-E2-15 presenta objetivos, estado e hitos de activas e inactivas", async () => {
    vi.mocked(metasApi.listarMetas).mockResolvedValue([
      meta,
      { ...meta, _id: "meta-2", activa: false, horasSemanales: 3, hitos: [] },
    ]);
    historial();
    const lista = await screen.findByRole("list", {
      name: "Metas del videojuego",
    });
    expect(within(lista).getByText("Activa")).toBeInTheDocument();
    expect(within(lista).getByText("Inactiva")).toBeInTheDocument();
    expect(within(lista).getByText("La cumbre")).toBeInTheDocument();
    expect(within(lista).getByText("Objetivo: 50,5 %")).toBeInTheDocument();
    expect(
      within(lista).getByRole("link", { name: "Consultar o editar meta 2" }),
    ).toHaveAttribute("href", "/videojuegos/juego-1/metas/meta-2/editar");
  });

  it("CA-E2-49 diferencia carga y lista vacía", async () => {
    historial();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(await screen.findByText("Aún no hay metas")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("CA-E2-49 reintenta solo el listado cuando falla", async () => {
    vi.mocked(metasApi.listarMetas).mockRejectedValueOnce(
      new Error("Listado no disponible"),
    );
    historial();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Listado no disponible",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Aún no hay metas")).toBeInTheDocument();
    expect(metasApi.listarMetas).toHaveBeenCalledTimes(2);
    expect(metasApi.obtenerMeta).not.toHaveBeenCalled();
  });

  it("CA-E2-15 vuelve a consultar al cambiar la revisión sin conservar objetivos anteriores", async () => {
    vi.mocked(metasApi.listarMetas)
      .mockResolvedValueOnce([meta])
      .mockResolvedValueOnce([]);
    const vista = render(
      <MemoryRouter>
        <HistorialMetas videojuegoId={juego._id} revision={0} />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("list", { name: "Metas del videojuego" }),
    ).toBeInTheDocument();
    vista.rerender(
      <MemoryRouter>
        <HistorialMetas videojuegoId={juego._id} revision={1} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("La cumbre")).not.toBeInTheDocument();
    expect(await screen.findByText("Aún no hay metas")).toBeInTheDocument();
    expect(metasApi.listarMetas).toHaveBeenCalledTimes(2);
  });
});
