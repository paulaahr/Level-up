import { expect, test } from "@playwright/test";
import {
  JUEGO_ID,
  META_ID,
  escrituras,
  prepararApi,
  progresoVacio,
  seConsultoDespues,
} from "./soporte";

test.describe("T-15/T-16 — navegador con contratos simulados", () => {
  test("CA-E2-01/47 crea una meta y consulta nuevamente progreso e historial", async ({
    page,
  }, testInfo) => {
    const api = await prepararApi(page, { sinMeta: true });
    await page.goto(`/videojuegos/${JUEGO_ID}`);
    await page.getByRole("link", { name: /Crear meta/i }).click();
    await page.getByRole("spinbutton", { name: "Horas semanales" }).fill("5");
    await page.getByRole("spinbutton", { name: "Días por semana" }).fill("4");
    await page.getByRole("button", { name: "Añadir hito" }).click();
    await page
      .getByRole("textbox", { name: "Descripción del hito 1" })
      .fill("Primer tramo");
    await page
      .getByRole("spinbutton", { name: "Objetivo del hito 1 (%)" })
      .fill("25");
    await page.getByRole("button", { name: "Crear meta", exact: true }).click();
    await expect(page).toHaveURL(`/videojuegos/${JUEGO_ID}`);
    await expect(
      page.getByRole("progressbar", { name: "Horas semanales" }),
    ).toHaveAttribute("aria-valuenow", "70");
    const solicitud = escrituras(api.solicitudes, "POST", "/metas");
    expect(solicitud).toHaveLength(1);
    expect(solicitud[0].cuerpo).toEqual({
      videojuego: JUEGO_ID,
      horasSemanales: 5,
      diasPorSemana: 4,
      hitos: [{ descripcion: "Primer tramo", porcentajeObjetivo: 25 }],
    });
    expect(seConsultoDespues(api.solicitudes, "POST", "/metas")).toBe(true);
    await expect(
      page.getByRole("list", { name: "Metas del videojuego" }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("meta-creada.png"),
      fullPage: true,
    });
  });

  test("CA-E2-12/13 edita objetivos e hitos y vuelve al detalle", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto(`/videojuegos/${JUEGO_ID}/metas/${META_ID}/editar`);
    await expect(
      page.getByRole("spinbutton", { name: "Horas semanales" }),
    ).toHaveValue("5");
    await page.getByRole("spinbutton", { name: "Horas semanales" }).fill("3");
    await page.getByRole("spinbutton", { name: "Días por semana" }).fill("2");
    await page
      .getByRole("textbox", { name: "Descripción del hito 1" })
      .fill("Primer tramo editado");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page).toHaveURL(`/videojuegos/${JUEGO_ID}`);
    await expect(
      page.getByRole("heading", { name: "Progreso semanal", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Horas semanales" }),
    ).toHaveAttribute("aria-valuenow", "100");
    await expect(
      page.getByText("Semana cumplida", { exact: true }),
    ).toBeVisible();
    expect(
      escrituras(api.solicitudes, "PUT", `/metas/${META_ID}`),
    ).toHaveLength(1);
    expect(
      escrituras(api.solicitudes, "PUT", `/metas/${META_ID}`)[0].cuerpo,
    ).toMatchObject({
      horasSemanales: 3,
      diasPorSemana: 2,
      activa: true,
      hitos: [
        { descripcion: "Primer tramo editado", porcentajeObjetivo: 25 },
        { descripcion: "La cumbre", porcentajeObjetivo: 100 },
      ],
    });
    expect(seConsultoDespues(api.solicitudes, "PUT", `/metas/${META_ID}`)).toBe(
      true,
    );
  });

  test("CA-E2-14 cancela y confirma la desactivación conservando historial", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto(`/videojuegos/${JUEGO_ID}/metas/${META_ID}/editar`);
    const desactivar = page.getByRole("button", { name: "Desactivar meta" });
    page.once("dialog", async (dialogo) => {
      expect(dialogo.message()).toBe(
        "¿Desactivar esta meta? Se conservará como inactiva",
      );
      await dialogo.dismiss();
    });
    await desactivar.click();
    await expect(desactivar).toBeFocused();
    expect(
      escrituras(api.solicitudes, "PATCH", `/metas/${META_ID}/desactivar`),
    ).toHaveLength(0);
    page.once("dialog", async (dialogo) => {
      await dialogo.accept();
    });
    await desactivar.click();
    await expect(page).toHaveURL(`/videojuegos/${JUEGO_ID}`);
    await expect(
      page.getByText("Sin meta activa", { exact: true }),
    ).toBeVisible();
    expect(
      escrituras(api.solicitudes, "PATCH", `/metas/${META_ID}/desactivar`),
    ).toHaveLength(1);
    await expect(
      page
        .getByRole("list", { name: "Metas del videojuego" })
        .getByText("Inactiva", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Horas semanales" }),
    ).toHaveCount(0);
  });

  test("CA-E2-11 un conflicto conserva los datos sin navegar", async ({
    page,
  }, testInfo) => {
    const api = await prepararApi(page, { sinMeta: true });
    api.errorEscritura = "Ya existe una meta activa para este videojuego";
    await page.goto(`/videojuegos/${JUEGO_ID}/meta/nueva`);
    await page.getByRole("spinbutton", { name: "Horas semanales" }).fill("3.5");
    await page.getByRole("spinbutton", { name: "Días por semana" }).fill("2");
    await page.getByRole("button", { name: "Crear meta", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Ya existe una meta activa",
    );
    await expect(
      page.getByRole("spinbutton", { name: "Horas semanales" }),
    ).toHaveValue("3.5");
    await expect(page).toHaveURL(`/videojuegos/${JUEGO_ID}/meta/nueva`);
    await page.screenshot({
      path: testInfo.outputPath("meta-conflicto.png"),
      fullPage: true,
    });
  });

  test("CA-E2-49 muestra carga, error recuperable y vacío real", async ({
    page,
  }, testInfo) => {
    const api = await prepararApi(page, {
      sinMeta: true,
      sinPartidas: true,
      progreso: progresoVacio,
      demoraProgreso: 800,
    });
    api.fallosProgreso = 2; // StrictMode puede emitir una consulta adicional de montaje.
    await page.goto(`/videojuegos/${JUEGO_ID}`);
    const seccion = page.getByRole("region", {
      name: "Progreso semanal",
      exact: true,
    });
    await expect(seccion.getByRole("status")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("progreso-cargando.png"),
      fullPage: true,
    });
    await expect(seccion.getByRole("alert")).toContainText(
      "Progreso temporalmente no disponible",
    );
    api.fallosProgreso = 0;
    api.demoraProgreso = 0;
    await seccion.getByRole("button", { name: "Reintentar" }).click();
    await expect(
      seccion.getByText("Sin meta activa", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Aún no hay metas", { exact: true }),
    ).toBeVisible();
    await expect(seccion.getByRole("progressbar")).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("progreso-vacio.png"),
      fullPage: true,
    });
  });

  test("CA-E2-48/56 presenta los indicadores y no confunde horas con cumplimiento", async ({
    page,
  }) => {
    await prepararApi(page, {
      progreso: {
        semana: { inicio: "2026-11-09", fin: "2026-11-15" },
        meta: { _id: META_ID, horasSemanales: 5, diasPorSemana: 4 },
        horasSemana: 7,
        porcentajeHoras: 100,
        diasJugadosSemana: 3,
        rachaActual: 3,
        mejorRacha: 5,
        cumplidaSemana: false,
        hitos: [
          {
            descripcion: "Primer tramo",
            porcentajeObjetivo: 25,
            alcanzado: true,
          },
          {
            descripcion: "La cumbre",
            porcentajeObjetivo: 100,
            alcanzado: false,
          },
        ],
      },
    });
    await page.goto(`/videojuegos/${JUEGO_ID}`);
    const seccion = page.getByRole("region", {
      name: "Progreso semanal",
      exact: true,
    });
    await expect(
      seccion.getByRole("progressbar", { name: "Horas semanales" }),
    ).toHaveAttribute("aria-valuenow", "100");
    await expect(seccion).toContainText("Meta semanal pendiente");
    await expect(seccion).toContainText("Racha actual");
    await expect(seccion).toContainText("Mejor racha");
    await expect(seccion).toContainText("Alcanzado");
    await expect(seccion).toContainText("Pendiente");
    await expect(seccion.getByRole("checkbox")).toHaveCount(0);
  });
});
