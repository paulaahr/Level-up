import type { Page } from "@playwright/test";
import type {
  Meta,
  Partida,
  ProgresoSemanal,
  Resumen,
  Videojuego,
} from "../src/tipos";

export const JUEGO_ID = "507f1f77bcf86cd799439001";
export const META_ID = "507f1f77bcf86cd799439011";
export const PARTIDA_ID = "507f1f77bcf86cd799439021";
export const juego: Videojuego = {
  _id: JUEGO_ID,
  nombre: "Celeste",
  genero: "Plataformas",
  plataforma: "PC",
  estado: "Jugando",
  portada: "",
  descripcion: "Cada paso acerca la cumbre.",
  logros: [],
  createdAt: "2026-01-01T15:00:00.000Z",
};
export const meta: Meta = {
  _id: META_ID,
  videojuego: JUEGO_ID,
  horasSemanales: 5,
  diasPorSemana: 4,
  activa: true,
  hitos: [
    { descripcion: "Primer tramo", porcentajeObjetivo: 25 },
    { descripcion: "La cumbre", porcentajeObjetivo: 100 },
  ],
  createdAt: "2026-11-09T15:00:00.000Z",
  updatedAt: "2026-11-09T15:00:00.000Z",
};
export const partida: Partida = {
  _id: PARTIDA_ID,
  videojuego: JUEGO_ID,
  fecha: "2026-11-09T23:30:00.123Z",
  duracionMinutos: 90,
  porcentajeAvance: 60,
  notas: "Sesión antes de la cumbre",
};
export const resumen: Resumen = {
  videojuego: JUEGO_ID,
  totalPartidas: 5,
  minutosTotales: 900,
  horasTotales: 15,
  ultimaSesion: partida.fecha,
  porcentajeAvanceActual: 60,
};
// Respuestas estáticas preparadas: estas pruebas no vuelven a calcular el dominio.
export const progreso: ProgresoSemanal = {
  semana: { inicio: "2026-11-09", fin: "2026-11-15" },
  meta: { _id: META_ID, horasSemanales: 5, diasPorSemana: 4 },
  horasSemana: 3.5,
  porcentajeHoras: 70,
  diasJugadosSemana: 2,
  rachaActual: 3,
  mejorRacha: 5,
  cumplidaSemana: false,
  hitos: [
    { descripcion: "Primer tramo", porcentajeObjetivo: 25, alcanzado: true },
    { descripcion: "La cumbre", porcentajeObjetivo: 100, alcanzado: false },
  ],
};
export const progresoSinMeta: ProgresoSemanal = {
  ...progreso,
  meta: null,
  porcentajeHoras: null,
  cumplidaSemana: null,
  hitos: [],
};
const progresoTrasCrearMeta: ProgresoSemanal = {
  ...progreso,
  hitos: [
    { descripcion: "Primer tramo", porcentajeObjetivo: 25, alcanzado: true },
  ],
};
export const progresoVacio: ProgresoSemanal = {
  ...progresoSinMeta,
  horasSemana: 0,
  diasJugadosSemana: 0,
  rachaActual: 0,
  mejorRacha: 0,
};
export const progresoTrasPartida: ProgresoSemanal = {
  ...progreso,
  horasSemana: 5,
  porcentajeHoras: 100,
  diasJugadosSemana: 4,
  rachaActual: 4,
  cumplidaSemana: true,
};
const progresoTrasEditarMeta: ProgresoSemanal = {
  ...progreso,
  meta: { _id: META_ID, horasSemanales: 3, diasPorSemana: 2 },
  porcentajeHoras: 100,
  cumplidaSemana: true,
  hitos: [
    {
      descripcion: "Primer tramo editado",
      porcentajeObjetivo: 25,
      alcanzado: true,
    },
    { descripcion: "La cumbre", porcentajeObjetivo: 100, alcanzado: false },
  ],
};
export const progresoTrasBorrar: ProgresoSemanal = {
  ...progreso,
  horasSemana: 0,
  porcentajeHoras: 0,
  diasJugadosSemana: 0,
  rachaActual: 0,
  mejorRacha: 0,
  hitos: progreso.hitos.map((hito) => ({ ...hito, alcanzado: false })),
};

type Solicitud = { metodo: string; ruta: string; cuerpo?: unknown };
type Opciones = {
  sinMeta?: boolean;
  sinPartidas?: boolean;
  estado?: string;
  progreso?: ProgresoSemanal;
  demoraProgreso?: number;
};

export async function prepararApi(page: Page, opciones: Opciones = {}) {
  const estado = {
    juego: { ...juego, estado: opciones.estado ?? juego.estado },
    metas: opciones.sinMeta ? ([] as Meta[]) : [structuredClone(meta)],
    partidas: opciones.sinPartidas
      ? ([] as Partida[])
      : [structuredClone(partida)],
    progreso: structuredClone(
      opciones.progreso ?? (opciones.sinMeta ? progresoSinMeta : progreso),
    ),
    solicitudes: [] as Solicitud[],
    fallosProgreso: 0,
    errorEscritura: "",
    demoraProgreso: opciones.demoraProgreso ?? 0,
  };
  await page.route("https://fonts.googleapis.com/**", (ruta) => ruta.abort());
  await page.route("https://fonts.gstatic.com/**", (ruta) => ruta.abort());
  await page.route("**/api/**", async (ruta) => {
    const solicitud = ruta.request();
    const metodo = solicitud.method();
    const direccion = new URL(solicitud.url());
    // Vite también sirve módulos bajo /src/api/: no son solicitudes al backend.
    if (!direccion.pathname.startsWith("/api/")) return ruta.continue();
    const camino = direccion.pathname.replace(/^\/api/, "");
    const cuerpo: unknown = solicitud.postData()
      ? solicitud.postDataJSON()
      : undefined;
    estado.solicitudes.push({ metodo, ruta: camino, cuerpo });
    const responder = (datos: unknown, status = 200) =>
      ruta.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(datos),
      });
    if (
      estado.errorEscritura &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(metodo)
    )
      return responder(
        { error: estado.errorEscritura, requestId: "e2e-error" },
        409,
      );
    if (metodo === "GET" && camino === "/videojuegos")
      return responder({ total: 1, videojuegos: [estado.juego] });
    if (metodo === "GET" && camino === `/videojuegos/${JUEGO_ID}`)
      return responder({ videojuego: estado.juego });
    if (metodo === "GET" && camino === `/videojuegos/${JUEGO_ID}/resumen`)
      return responder({ resumen });
    if (metodo === "GET" && camino === `/videojuegos/${JUEGO_ID}/partidas`)
      return responder({ partidas: estado.partidas });
    if (metodo === "GET" && camino === `/videojuegos/${JUEGO_ID}/metas`)
      return responder({
        total: estado.metas.length,
        metas: estado.metas,
        requestId: "e2e-lista",
      });
    if (
      metodo === "GET" &&
      camino === `/videojuegos/${JUEGO_ID}/progreso-semanal`
    ) {
      if (estado.demoraProgreso)
        await new Promise((resolve) =>
          setTimeout(resolve, estado.demoraProgreso),
        );
      if (estado.fallosProgreso > 0) {
        estado.fallosProgreso -= 1;
        return responder(
          {
            error: "Progreso temporalmente no disponible",
            requestId: "e2e-progreso-error",
          },
          500,
        );
      }
      return responder({
        progreso: estado.progreso,
        requestId: "e2e-progreso",
      });
    }
    if (metodo === "GET" && camino === `/metas/${META_ID}`) {
      const encontrada = estado.metas.find(
        (objetivo) => objetivo._id === META_ID,
      );
      return encontrada
        ? responder({ meta: encontrada, requestId: "e2e-meta" })
        : responder({ error: "Meta no encontrada" }, 404);
    }
    if (metodo === "POST" && camino === "/metas") {
      const datos = cuerpo as Omit<Meta, "_id" | "createdAt" | "updatedAt">;
      const nueva: Meta = { ...meta, ...datos, activa: datos.activa ?? true };
      estado.metas.push(nueva);
      estado.progreso = {
        ...progresoTrasCrearMeta,
        meta: {
          _id: nueva._id,
          horasSemanales: nueva.horasSemanales,
          diasPorSemana: nueva.diasPorSemana,
        },
      };
      return responder({ meta: nueva, requestId: "e2e-creada" }, 201);
    }
    if (metodo === "PUT" && camino === `/metas/${META_ID}`) {
      const actual = estado.metas.find((objetivo) => objetivo._id === META_ID);
      if (!actual) return responder({ error: "Meta no encontrada" }, 404);
      Object.assign(actual, cuerpo);
      estado.progreso = structuredClone(progresoTrasEditarMeta);
      return responder({ meta: actual, requestId: "e2e-editada" });
    }
    if (metodo === "PATCH" && camino === `/metas/${META_ID}/desactivar`) {
      const actual = estado.metas.find((objetivo) => objetivo._id === META_ID);
      if (!actual) return responder({ error: "Meta no encontrada" }, 404);
      actual.activa = false;
      estado.progreso = structuredClone(progresoSinMeta);
      return responder({ meta: actual, requestId: "e2e-inactiva" });
    }
    if (metodo === "GET" && camino === "/partidas")
      return responder({
        total: estado.partidas.length,
        partidas: estado.partidas.map((sesion) => ({
          ...sesion,
          videojuego: estado.juego,
        })),
      });
    if (metodo === "GET" && camino === `/partidas/${PARTIDA_ID}`)
      return estado.partidas[0]
        ? responder({ partida: estado.partidas[0] })
        : responder({ error: "Partida no encontrada" }, 404);
    if (metodo === "POST" && camino === "/partidas") {
      const nueva = {
        ...partida,
        ...(cuerpo as Partial<Partida>),
        _id: "507f1f77bcf86cd799439022",
      };
      estado.partidas.push(nueva);
      estado.progreso = structuredClone(progresoTrasPartida);
      return responder({ partida: nueva }, 201);
    }
    if (metodo === "PUT" && camino === `/partidas/${PARTIDA_ID}`) {
      const nueva = { ...partida, ...(cuerpo as Partial<Partida>) };
      estado.partidas[0] = nueva;
      estado.progreso = structuredClone(progresoTrasPartida);
      return responder({ partida: nueva });
    }
    if (metodo === "DELETE" && camino === `/partidas/${PARTIDA_ID}`) {
      estado.partidas = [];
      estado.progreso = structuredClone(progresoTrasBorrar);
      return ruta.fulfill({ status: 204 });
    }
    return responder(
      { error: `Contrato de prueba no definido: ${metodo} ${camino}` },
      500,
    );
  });
  return estado;
}

export function escrituras(
  solicitudes: Solicitud[],
  metodo: string,
  ruta: string,
) {
  return solicitudes.filter(
    (solicitud) => solicitud.metodo === metodo && solicitud.ruta === ruta,
  );
}

export function seConsultoDespues(
  solicitudes: Solicitud[],
  metodo: string,
  ruta: string,
) {
  const posicion = solicitudes.findIndex(
    (solicitud) => solicitud.metodo === metodo && solicitud.ruta === ruta,
  );
  return (
    posicion >= 0 &&
    solicitudes
      .slice(posicion + 1)
      .some(
        (solicitud) =>
          solicitud.metodo === "GET" &&
          solicitud.ruta === `/videojuegos/${JUEGO_ID}/progreso-semanal`,
      )
  );
}
