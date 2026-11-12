import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { Temporal } from "@js-temporal/polyfill";

// Ninguna ruta se intercepta. El proceso de prueba solo expone localhost y
// crea su propio replica set. Las lecturas posteriores pasan por HTTP real.
const api = "http://127.0.0.1:3187/api";
const hoy = Temporal.Now.zonedDateTimeISO("America/Guayaquil").startOfDay();
const lunes = hoy.subtract({ days: hoy.dayOfWeek - 1 });
const instante = (dias: number, minutos = 0) =>
  hoy.subtract({ days: dias }).add({ minutes: minutos }).toInstant().toString();

async function juego(request: APIRequestContext, nombre: string) {
  const respuesta = await request.post(`${api}/videojuegos`, {
    data: {
      nombre,
      genero: "Indie",
      plataforma: "PC",
      estado: "Jugando",
      logros: [{ nombre: "Logro manual", obtenido: true }],
    },
  });
  expect(respuesta.status()).toBe(201);
  return (await respuesta.json()).videojuego._id as string;
}
async function meta(request: APIRequestContext, id: string, horas = 5) {
  const respuesta = await request.post(`${api}/metas`, {
    data: {
      videojuego: id,
      horasSemanales: horas,
      diasPorSemana: 4,
      hitos: [{ descripcion: "La mitad", porcentajeObjetivo: 50 }],
    },
  });
  expect(respuesta.status()).toBe(201);
  return (await respuesta.json()).meta;
}
async function partida(
  request: APIRequestContext,
  id: string,
  fecha: string,
  duracionMinutos: number,
  porcentajeAvance: number,
) {
  const respuesta = await request.post(`${api}/partidas`, {
    data: {
      videojuego: id,
      fecha,
      duracionMinutos,
      porcentajeAvance,
      notas: "Fixture T-19",
    },
  });
  expect(respuesta.status()).toBe(201);
  return (await respuesta.json()).partida;
}
async function progreso(request: APIRequestContext, id: string) {
  const respuesta = await request.get(
    `${api}/videojuegos/${id}/progreso-semanal`,
  );
  expect(respuesta.status()).toBe(200);
  return (await respuesta.json()).progreso;
}
async function avance(page: Page, valor: number) {
  const campo = page.getByRole("slider", {
    name: "Porcentaje de avance",
    exact: true,
  });
  await campo.press("Home");
  for (let i = 0; i < valor; i++) await campo.press("ArrowRight");
}
const seccion = (page: Page) => page.locator(".e2-progress");
const contador = (page: Page, nombre: string) =>
  seccion(page)
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: nombre, exact: true }) });

test("T-19 CA-E2-01/10/12/13/14/15/27/28/39/42: meta, partidas y progreso persistidos desde UI", async ({
  page,
  request,
}) => {
  const id = await juego(request, "Diario UI real");
  await page.goto(`/videojuegos/${id}/meta/nueva`);
  await page.getByLabel("Horas semanales", { exact: true }).fill("5");
  await page.getByLabel("Días por semana", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Añadir hito", exact: true }).click();
  await page
    .getByLabel("Descripción del hito 1", { exact: true })
    .fill("La mitad");
  await page.getByLabel("Objetivo del hito 1 (%)", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Crear meta", exact: true }).click();
  await expect(page).toHaveURL(`/videojuegos/${id}`);
  await expect(seccion(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await expect(
    seccion(page).getByText("Pendiente", { exact: true }),
  ).toBeVisible();

  await page.goto(`/partidas/nueva?videojuego=${id}`);
  const fechaCivil = hoy.toPlainDateTime().toString({ smallestUnit: "minute" });
  await page
    .getByLabel("Inicio (hora de Ecuador)", { exact: true })
    .fill(fechaCivil);
  await page.getByLabel("Duración en minutos", { exact: true }).fill("120");
  await avance(page, 60);
  await page.getByRole("button", { name: /GUARDAR SESIÓN/i }).click();
  await expect(page).toHaveURL(`/videojuegos/${id}`);
  await expect(seccion(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "40",
  );
  await expect(
    seccion(page).getByText("Alcanzado", { exact: true }),
  ).toBeVisible();
  const sesiones = (
    await (await request.get(`${api}/videojuegos/${id}/partidas`)).json()
  ).partidas;
  expect(sesiones).toHaveLength(1);
  const sesion = sesiones[0];
  await page.getByRole("link", { name: /Editar partida/ }).click();
  await page.getByLabel("Duración en minutos", { exact: true }).fill("180");
  await avance(page, 40);
  await page.getByRole("button", { name: /GUARDAR CAMBIOS/i }).click();
  await expect(page).toHaveURL(`/videojuegos/${id}`);
  await expect(seccion(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "60",
  );
  await expect(
    seccion(page).getByText("Pendiente", { exact: true }),
  ).toBeVisible();
  const persistida = (
    await (await request.get(`${api}/partidas/${sesion._id}`)).json()
  ).partida;
  expect(persistida).toMatchObject({
    duracionMinutos: 180,
    porcentajeAvance: 40,
  });
  expect(persistida.fecha).toBe(sesion.fecha);

  await partida(request, id, instante(8), 60, 100);
  expect((await progreso(request, id)).hitos[0].alcanzado).toBe(false);
  const ficha = (await (await request.get(`${api}/videojuegos/${id}`)).json())
    .videojuego;
  expect(ficha.logros[0].obtenido).toBe(true);
  await page.getByRole("link", { name: "Editar meta", exact: true }).click();
  await page.getByLabel("Horas semanales", { exact: true }).fill("2");
  await page.getByLabel("Días por semana", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page).toHaveURL(`/videojuegos/${id}`);
  await expect(seccion(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(
    seccion(page).getByText("Semana cumplida", { exact: true }),
  ).toBeVisible();
  expect((await progreso(request, id)).horasSemana).toBe(3);

  page.once("dialog", (dialogo) => dialogo.accept());
  await seccion(page).getByRole("button", { name: "Desactivar meta" }).click();
  await expect(
    seccion(page).getByRole("heading", { name: "Sin meta activa" }),
  ).toBeVisible();
  await expect(seccion(page).getByRole("progressbar")).toHaveCount(0);
  await expect(contador(page, "Horas jugadas")).toContainText("3");
  const listado = (
    await (await request.get(`${api}/videojuegos/${id}/metas`)).json()
  ).metas;
  expect(listado).toHaveLength(1);
  expect(listado[0].activa).toBe(false);
  expect(listado[0].createdAt).toBeTruthy();
  expect(listado[0].updatedAt).toBeTruthy();

  await page.goto("/partidas");
  const fila = page
    .getByRole("row")
    .filter({ hasText: "Diario UI real" })
    .filter({ hasText: "180 min" });
  page.once("dialog", (dialogo) => dialogo.accept());
  const refresco = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/videojuegos/${id}/progreso-semanal`) &&
      r.request().method() === "GET",
  );
  await fila
    .getByRole("button", { name: "Eliminar partida", exact: true })
    .click();
  expect((await refresco).status()).toBe(200);
  expect((await progreso(request, id)).horasSemana).toBe(0);
  expect((await request.get(`${api}/partidas/${sesion._id}`)).status()).toBe(
    404,
  );
  const otro = await juego(request, "Otro juego con meta");
  const ajena = await meta(request, otro);
  await page.goto(`/videojuegos/${id}/meta/nueva`);
  await page.getByLabel("Horas semanales", { exact: true }).fill("2");
  await page.getByLabel("Días por semana", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Crear meta", exact: true }).click();
  await expect(page).toHaveURL(`/videojuegos/${id}`);
  const anteriores = (
    await (await request.get(`${api}/videojuegos/${id}/metas`)).json()
  ).metas;
  expect(anteriores).toHaveLength(2);
  expect(anteriores.filter((m: { activa: boolean }) => m.activa)).toHaveLength(
    1,
  );
  expect(anteriores.filter((m: { activa: boolean }) => !m.activa)).toHaveLength(
    1,
  );
  expect(
    (await (await request.get(`${api}/metas/${ajena._id}`)).json()).meta,
  ).toMatchObject({ activa: true, videojuego: otro });
});

test("T-19 CA-E2-17/18/19/20/25/56: minutos, redondeo, días distintos y cumplimiento observados", async ({
  page,
  request,
}) => {
  const id = await juego(request, "Redondeo real");
  const objetivo = await meta(request, id, 3);
  await partida(request, id, instante(0), 97, 30);
  await page.goto(`/videojuegos/${id}`);
  await expect(seccion(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "53",
  );
  await expect(contador(page, "Horas jugadas")).toContainText("1,6");
  await partida(request, id, instante(0), 113, 35);
  expect(
    (
      await request.put(`${api}/metas/${objetivo._id}`, {
        data: { horasSemanales: 5, diasPorSemana: 4, hitos: objetivo.hitos },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await expect(seccion(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "70",
  );
  await expect(contador(page, "Horas jugadas")).toContainText("3,5");
  await expect(contador(page, "Días jugados")).toContainText("1 / 4");
  await partida(request, id, instante(0), 210, 40);
  await page.reload();
  await expect(contador(page, "Horas jugadas")).toContainText("7");
  await expect(seccion(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(
    seccion(page).getByText("Meta semanal pendiente", { exact: true }),
  ).toBeVisible();
});

test("T-19 CA-E2-29/30/31/32: ceros, hitos pendientes y actividad sin meta", async ({
  page,
  request,
}) => {
  const id = await juego(request, "Vacío real");
  await page.goto(`/videojuegos/${id}`);
  await expect(
    seccion(page).getByRole("heading", { name: "Sin meta activa" }),
  ).toBeVisible();
  await expect(contador(page, "Racha actual")).toContainText("0");
  await expect(
    seccion(page).getByRole("link", { name: "Crear meta" }),
  ).toBeVisible();
  await meta(request, id);
  await page.reload();
  await expect(seccion(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await expect(
    seccion(page).getByText("Pendiente", { exact: true }),
  ).toBeVisible();
  await expect(contador(page, "Días jugados")).toContainText("0 / 4");
});

test("T-19 CA-E2-21/24: cinco días históricos, racha rota y cruce domingo-lunes", async ({
  page,
  request,
}) => {
  const id = await juego(request, "Historial real");
  for (const dias of [15, 14, 13, 12, 11])
    await partida(request, id, instante(dias), 60, 40);
  await page.goto(`/videojuegos/${id}`);
  await expect(contador(page, "Racha actual")).toContainText("0");
  await expect(contador(page, "Mejor racha")).toContainText("5");
  await partida(
    request,
    id,
    lunes.subtract({ minutes: 30 }).toInstant().toString(),
    90,
    45,
  );
  await page.goto(`/videojuegos/${id}`);
  await expect(contador(page, "Racha actual")).toContainText(
    hoy.dayOfWeek === 1 ? "1" : "0",
  );
  await expect(contador(page, "Mejor racha")).toContainText("5");
  await expect(contador(page, "Horas jugadas")).toContainText("0");
  await expect(contador(page, "Días jugados")).toContainText("0 días");
  const resumen = (
    await (await request.get(`${api}/videojuegos/${id}/resumen`)).json()
  ).resumen;
  expect(resumen).toMatchObject({
    totalPartidas: 6,
    minutosTotales: 390,
    horasTotales: 6.5,
    porcentajeAvanceActual: 45,
  });
});

test("T-19 CA-E2-34/35/53: conflictos409 reales, edición de estado conserva Jugando", async ({
  page,
  request,
}) => {
  const id = await juego(request, "Conflicto real");
  await meta(request, id);
  const duplicada = await request.post(`${api}/metas`, {
    data: {
      videojuego: id,
      horasSemanales: 2,
      diasPorSemana: 2,
      hitos: [{ descripcion: "Conflicto", porcentajeObjetivo: 50 }],
    },
  });
  expect(duplicada.status()).toBe(409);
  expect((await duplicada.json()).requestId).toBeTruthy();
  await page.goto(`/videojuegos/${id}/editar`);
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("Completado");
  await page.getByRole("button", { name: /Guardar cambios/i }).click();
  await expect(page.getByText(/meta activa/i)).toBeVisible();
  await expect(page).toHaveURL(`/videojuegos/${id}/editar`);
  expect(
    (await (await request.get(`${api}/videojuegos/${id}`)).json()).videojuego
      .estado,
  ).toBe("Jugando");
});

test("T-19 CA-E2-44: confirmación UI y eliminación real de juego, partidas y metas", async ({
  page,
  request,
}) => {
  const id = await juego(request, "Borrado real");
  const objetivo = await meta(request, id);
  const sesion = await partida(request, id, instante(0), 60, 60);
  await page.goto(`/videojuegos/${id}`);
  await expect(seccion(page).getByRole("progressbar")).toBeVisible();
  page.once("dialog", (dialogo) => dialogo.dismiss());
  await page.locator("button.detalle-delete").click();
  expect((await request.get(`${api}/videojuegos/${id}`)).status()).toBe(200);
  page.once("dialog", (dialogo) => dialogo.accept());
  await page.locator("button.detalle-delete").click();
  await expect(page).toHaveURL("/biblioteca");
  expect((await request.get(`${api}/videojuegos/${id}`)).status()).toBe(404);
  expect((await request.get(`${api}/metas/${objetivo._id}`)).status()).toBe(
    404,
  );
  expect((await request.get(`${api}/partidas/${sesion._id}`)).status()).toBe(
    404,
  );
  expect(
    (await request.get(`${api}/videojuegos/${id}/progreso-semanal`)).status(),
  ).toBe(404);
  expect(
    (
      await request.get(`${api}/videojuegos/invalido/progreso-semanal`)
    ).status(),
  ).toBe(400);
});
