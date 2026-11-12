import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { JUEGO_ID, PARTIDA_ID, prepararApi } from "./soporte";

async function comprobarContraste(
  page: Page,
  testInfo: TestInfo,
  objetivos: { selector: string; minimo: number }[],
) {
  const mediciones = await page.evaluate((elementos) => {
    const rgba = (color: string): number[] => {
      const numeros = color.match(/[\d.]+/g)?.map(Number) ?? [];
      return [
        numeros[0] ?? 0,
        numeros[1] ?? 0,
        numeros[2] ?? 0,
        numeros[3] ?? 1,
      ];
    };
    const componer = (frente: number[], fondo: number[]): number[] =>
      frente
        .slice(0, 3)
        .map(
          (canal, indice) =>
            canal * frente[3] + fondo[indice] * (1 - frente[3]),
        );
    const luminosidad = (color: number[]) => {
      const canales = color.map((canal) => {
        const valor = canal / 255;
        return valor <= 0.04045
          ? valor / 12.92
          : ((valor + 0.055) / 1.055) ** 2.4;
      });
      return canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722;
    };
    return elementos.flatMap(({ selector, minimo }) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((elemento) => elemento.getClientRects().length > 0)
        .map((elemento) => {
          const ancestros: Element[] = [];
          for (
            let actual: Element | null = elemento;
            actual;
            actual = actual.parentElement
          )
            ancestros.unshift(actual);
          const fondo = ancestros.reduce(
            (color, actual) =>
              componer(rgba(getComputedStyle(actual).backgroundColor), color),
            [255, 255, 255],
          );
          const texto = componer(rgba(getComputedStyle(elemento).color), fondo);
          const luces = [luminosidad(texto), luminosidad(fondo)].sort(
            (a, b) => b - a,
          );
          return {
            selector,
            texto: texto.map(Math.round),
            fondo: fondo.map(Math.round),
            minimo,
            relacion: (luces[0] + 0.05) / (luces[1] + 0.05),
          };
        }),
    );
  }, objetivos);
  expect(mediciones.length).toBeGreaterThan(0);
  await testInfo.attach("contraste-computado", {
    body: JSON.stringify(mediciones, null, 2),
    contentType: "application/json",
  });
  for (const medicion of mediciones)
    expect(
      medicion.relacion,
      `${medicion.selector}: texto ${medicion.texto} / fondo ${medicion.fondo}`,
    ).toBeGreaterThanOrEqual(medicion.minimo);
}

test.describe("T-18 — revisión acotada de E2", () => {
  test("CA-E2-50/51 formulario con foco, errores asociados y sin desbordamiento", async ({
    page,
  }, testInfo) => {
    await prepararApi(page, { sinMeta: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/videojuegos/${JUEGO_ID}/meta/nueva`);
    const horas = page.getByRole("spinbutton", { name: "Horas semanales" });
    await expect(horas).toBeVisible();
    await page.getByRole("button", { name: "Crear meta", exact: true }).click();
    await expect(horas).toBeFocused();
    await expect(horas).toHaveAttribute("aria-invalid", "true");
    await expect(horas).toHaveAccessibleDescription(
      "Introduce horas mayores que 0 y hasta 100.",
    );
    await expect(horas).toHaveCSS("outline-style", "solid");
    await horas.fill("5");
    await horas.focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("spinbutton", { name: "Días por semana" }),
    ).toBeFocused();
    await page.getByRole("spinbutton", { name: "Días por semana" }).fill("4");
    for (let indice = 1; indice <= 5; indice += 1) {
      await page.getByRole("button", { name: "Añadir hito" }).click();
      await page
        .getByRole("textbox", { name: `Descripción del hito ${indice}` })
        .fill(`Hito ${indice}: avanzar a la siguiente sección de la aventura`);
      await page
        .getByRole("spinbutton", { name: `Objetivo del hito ${indice} (%)` })
        .fill(String(indice * 20));
    }
    await expect(
      page.getByRole("button", { name: "Añadir hito" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Eliminar hito 5" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".formulario-meta-page")
        .evaluate((elemento) =>
          getComputedStyle(elemento).getPropertyValue("--ink").trim(),
        ),
    ).toBe("#23151a");
    expect(
      await horas.evaluate(
        (elemento) => getComputedStyle(elemento).transitionDuration,
      ),
    ).toBe("0s");
    await comprobarContraste(page, testInfo, [
      { selector: ".formulario-meta-page .page-head h1", minimo: 3 },
      { selector: ".formulario-meta-page label", minimo: 4.5 },
      { selector: ".formulario-meta-page input", minimo: 4.5 },
      { selector: ".formulario-meta-page .meta-submit", minimo: 4.5 },
    ]);
    await page.screenshot({
      path: testInfo.outputPath("formulario-metas-responsive.png"),
      fullPage: true,
    });
  });

  test("CA-E2-48/50/51 progreso legible, barra accesible y acciones sin solapamiento", async ({
    page,
  }, testInfo) => {
    await prepararApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/videojuegos/${JUEGO_ID}`);
    const seccion = page.getByRole("region", {
      name: "Progreso semanal",
      exact: true,
    });
    const barra = seccion.getByRole("progressbar", { name: "Horas semanales" });
    await expect(barra).toHaveAttribute("aria-valuemin", "0");
    await expect(barra).toHaveAttribute("aria-valuemax", "100");
    await expect(barra).toHaveAttribute("aria-valuenow", "70");
    await expect(barra).toHaveAttribute("aria-valuetext", /3[,.]5.*5/);
    await expect(seccion).toContainText("Alcanzado");
    await expect(seccion).toContainText("Pendiente");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const limites = await seccion
      .getByRole("link", { name: /Editar meta/i })
      .boundingBox();
    expect(limites).not.toBeNull();
    expect(limites!.x).toBeGreaterThanOrEqual(0);
    expect(limites!.x + limites!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await comprobarContraste(page, testInfo, [
      { selector: ".e2-progress h2", minimo: 3 },
      { selector: ".e2-progress h3", minimo: 4.5 },
      { selector: ".e2-progress .e2-ayuda", minimo: 4.5 },
      { selector: ".e2-progress .e2-boton", minimo: 4.5 },
      { selector: ".e2-hitos li b", minimo: 4.5 },
      { selector: ".historial-meta h3", minimo: 3 },
      { selector: ".historial-meta p", minimo: 4.5 },
      { selector: ".historial-meta-estado", minimo: 4.5 },
    ]);
    await page.screenshot({
      path: testInfo.outputPath("progreso-responsive.png"),
      fullPage: true,
    });
  });

  test("CA-E2-50/51 edición de partidas accesible, responsive y con contraste comprobado", async ({
    page,
  }, testInfo) => {
    await prepararApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/partidas/${PARTIDA_ID}/editar`);
    const fecha = page.getByLabel("Inicio (hora de Ecuador)", { exact: true });
    await expect(fecha).toHaveValue("2026-11-09T18:30:00.123");
    await fecha.focus();
    const duracion = page.getByLabel("Duración en minutos", { exact: true });
    // Chromium recorre con Tab los segmentos nativos de datetime-local.
    for (let paso = 0; paso < 12; paso += 1) {
      await page.keyboard.press("Tab");
      if (
        await duracion.evaluate(
          (elemento) => elemento === document.activeElement,
        )
      )
        break;
    }
    await expect(duracion).toBeFocused();
    await expect(duracion).toHaveCSS("outline-style", "solid");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await duracion.evaluate(
        (elemento) => getComputedStyle(elemento).transitionDuration,
      ),
    ).toBe("0s");
    await comprobarContraste(page, testInfo, [
      { selector: ".partida-hero h1", minimo: 3 },
      { selector: ".partida-form-head h2", minimo: 3 },
      { selector: ".partida-notes-heading h2", minimo: 3 },
      { selector: ".partida-form-grid label", minimo: 4.5 },
      { selector: ".partida-notes label", minimo: 4.5 },
      { selector: ".partida-kicker", minimo: 4.5 },
      { selector: ".partida-submit", minimo: 4.5 },
      { selector: ".partida-label-row strong", minimo: 3 },
      { selector: '.partida-form input:not([type="range"])', minimo: 4.5 },
      { selector: ".partida-form textarea", minimo: 4.5 },
      { selector: ".partida-cancel", minimo: 4.5 },
    ]);
    await page.screenshot({
      path: testInfo.outputPath("edicion-partidas-responsive.png"),
      fullPage: true,
    });
  });
});
