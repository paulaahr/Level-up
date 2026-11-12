import { expect, test } from "@playwright/test";
import {
  JUEGO_ID,
  PARTIDA_ID,
  escrituras,
  prepararApi,
  seConsultoDespues,
} from "./soporte";

test.describe("T-17 — flujos con API interceptada, sin persistencia real", () => {
  test("CA-E2-37/42 registra en hora de Ecuador y consulta progreso tras POST", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto(`/partidas/nueva?videojuego=${JUEGO_ID}`);
    await page
      .getByLabel("Inicio (hora de Ecuador)", { exact: true })
      .fill("2026-11-09T18:30");
    await page.getByLabel("Duración en minutos", { exact: true }).fill("60");
    await page.getByRole("button", { name: /GUARDAR SESIÓN/i }).click();
    await expect(page).toHaveURL(`/videojuegos/${JUEGO_ID}`);
    await expect(
      page.getByRole("progressbar", { name: "Horas semanales" }),
    ).toHaveAttribute("aria-valuenow", "100");
    const registro = escrituras(api.solicitudes, "POST", "/partidas");
    expect(registro).toHaveLength(1);
    expect(registro[0].cuerpo).toMatchObject({
      videojuego: JUEGO_ID,
      fecha: "2026-11-09T23:30:00.000Z",
      duracionMinutos: 60,
    });
    expect(seConsultoDespues(api.solicitudes, "POST", "/partidas")).toBe(true);
  });

  test("CA-E2-39 precarga y edita conservando el instante original", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto(`/partidas/${PARTIDA_ID}/editar`);
    await expect(
      page.getByLabel("Inicio (hora de Ecuador)", { exact: true }),
    ).toHaveValue("2026-11-09T18:30:00.123");
    await expect(page.getByLabel("Videojuego", { exact: true })).toBeDisabled();
    await page.getByLabel("Duración en minutos", { exact: true }).fill("120");
    await page.getByRole("button", { name: /GUARDAR CAMBIOS/i }).click();
    await expect(page).toHaveURL(`/videojuegos/${JUEGO_ID}`);
    const actualizaciones = escrituras(
      api.solicitudes,
      "PUT",
      `/partidas/${PARTIDA_ID}`,
    );
    expect(actualizaciones).toHaveLength(1);
    expect(actualizaciones[0].cuerpo).toMatchObject({
      fecha: "2026-11-09T23:30:00.123Z",
      duracionMinutos: 120,
    });
    expect(
      seConsultoDespues(api.solicitudes, "PUT", `/partidas/${PARTIDA_ID}`),
    ).toBe(true);
  });

  test("CA-E2-38 una fecha futura se rechaza antes de enviar", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto(`/partidas/nueva?videojuego=${JUEGO_ID}`);
    await page
      .getByLabel("Inicio (hora de Ecuador)", { exact: true })
      .fill("2099-11-09T18:30");
    await page.getByRole("button", { name: /GUARDAR SESIÓN/i }).click();
    await expect(
      page.getByLabel("Inicio (hora de Ecuador)", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText("La fecha de inicio no puede ser futura.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(escrituras(api.solicitudes, "POST", "/partidas")).toHaveLength(0);
  });

  test("CA-E2-42 borrar desde historial global consulta progreso sin abrir detalle", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto("/partidas");
    page.once("dialog", (dialogo) => dialogo.accept());
    await page
      .getByRole("button", { name: "Eliminar partida", exact: true })
      .click();
    await expect(
      page.getByText("Tu diario está en blanco", { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL("/partidas");
    await expect
      .poll(() =>
        seConsultoDespues(api.solicitudes, "DELETE", `/partidas/${PARTIDA_ID}`),
      )
      .toBe(true);
    expect(
      escrituras(api.solicitudes, "DELETE", `/partidas/${PARTIDA_ID}`),
    ).toHaveLength(1);
  });

  test("CA-E2-42 borrar desde detalle refresca la sección y el historial", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto(`/videojuegos/${JUEGO_ID}`);
    await expect(
      page.getByRole("progressbar", { name: "Horas semanales" }),
    ).toHaveAttribute("aria-valuenow", "70");
    page.once("dialog", (dialogo) => dialogo.accept());
    await page.getByRole("button", { name: /Eliminar partida del/ }).click();
    await expect(
      page.getByRole("progressbar", { name: "Horas semanales" }),
    ).toHaveAttribute("aria-valuenow", "0");
    await expect(
      page.getByText("Sin partidas registradas", { exact: true }),
    ).toBeVisible();
    expect(
      escrituras(api.solicitudes, "DELETE", `/partidas/${PARTIDA_ID}`),
    ).toHaveLength(1);
    expect(
      seConsultoDespues(api.solicitudes, "DELETE", `/partidas/${PARTIDA_ID}`),
    ).toBe(true);
  });

  test("CA-E2-43 el fallo de GET tras guardar reintenta únicamente la consulta", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto(`/partidas/${PARTIDA_ID}/editar`);
    await page.getByLabel("Duración en minutos", { exact: true }).fill("120");
    api.fallosProgreso = 1;
    await page.getByRole("button", { name: /GUARDAR CAMBIOS/i }).click();
    await expect(page.getByRole("alert")).toContainText(
      "La partida se guardó; no se pudo actualizar el progreso",
    );
    await expect(page).toHaveURL(`/partidas/${PARTIDA_ID}/editar`);
    await page
      .getByRole("button", { name: "Reintentar actualización" })
      .click();
    await expect(page).toHaveURL(`/videojuegos/${JUEGO_ID}`);
    expect(
      escrituras(api.solicitudes, "PUT", `/partidas/${PARTIDA_ID}`),
    ).toHaveLength(1);
    expect(escrituras(api.solicitudes, "POST", "/partidas")).toHaveLength(0);
  });

  test("CA-E2-43 el fallo de GET tras borrar globalmente no repite DELETE", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    await page.goto("/partidas");
    api.fallosProgreso = 1;
    page.once("dialog", (dialogo) => dialogo.accept());
    await page
      .getByRole("button", { name: "Eliminar partida", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "La partida se eliminó; no se pudo actualizar el progreso",
    );
    await page
      .getByRole("button", { name: "Reintentar actualización" })
      .click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(
      escrituras(api.solicitudes, "DELETE", `/partidas/${PARTIDA_ID}`),
    ).toHaveLength(1);
  });

  test("CA-E2-41 un error de escritura conserva los campos y no consulta progreso", async ({
    page,
  }) => {
    const api = await prepararApi(page);
    api.errorEscritura = "No se pudo actualizar la partida";
    await page.goto(`/partidas/${PARTIDA_ID}/editar`);
    await page.getByLabel("Duración en minutos", { exact: true }).fill("120");
    await page.getByRole("button", { name: /GUARDAR CAMBIOS/i }).click();
    await expect(page.getByRole("alert")).toContainText(
      "No se pudo actualizar la partida",
    );
    await expect(
      page.getByLabel("Duración en minutos", { exact: true }),
    ).toHaveValue("120");
    expect(
      seConsultoDespues(api.solicitudes, "PUT", `/partidas/${PARTIDA_ID}`),
    ).toBe(false);
  });
});
