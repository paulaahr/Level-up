import { describe, expect, it } from "vitest";
import {
  cumplimientoSemanal,
  porcentajeHoras,
} from "../../src/dominio/progreso";

const meta = Object.freeze({
  id: "meta-1",
  horasSemanales: 5,
  diasPorSemana: 4,
  hitos: [],
});

describe("T-07 / CA-E2-56: cumplir exige horas reales y días", () => {
  it.each([
    [300, 4, true],
    [420, 3, false],
    [240, 4, false],
    [299, 4, false],
    [420, 5, true],
    [0, 0, false],
  ])("%i minutos y %i días: cumplimiento %s", (minutos, dias, esperado) => {
    expect(cumplimientoSemanal(minutos, dias, meta)).toBe(esperado);
  });

  it("no confunde 100 % redondeado con cinco horas realmente alcanzadas", () => {
    expect(porcentajeHoras(5, meta.horasSemanales)).toBe(100);
    expect(cumplimientoSemanal(299, 4, meta)).toBe(false);
  });

  it("no impone media hora como mínimo ni redondea la meta", () => {
    expect(
      cumplimientoSemanal(1, 1, {
        ...meta,
        horasSemanales: 0.01,
        diasPorSemana: 1,
      }),
    ).toBe(true);
  });

  it("sin meta no atribuye un cumplimiento falso o verdadero", () => {
    expect(cumplimientoSemanal(300, 4, null)).toBeNull();
  });

  it.each([
    [[true, true, true, true], true],
    [[true, true, true, false], true],
    [[true, true, false, false], false],
    [[false, false, false, false], false],
  ])(
    "evalúa tres de cuatro semanas sin construir analítica histórica",
    (semanas, exito) => {
      const resultados = semanas.map((cumple) =>
        cumplimientoSemanal(cumple ? 300 : 240, 4, meta),
      );

      // Evidencia de evaluación de la métrica; no añade un servicio o historial mensual.
      expect(resultados.filter((cumple) => cumple === true).length >= 3).toBe(
        exito,
      );
    },
  );
});
