import { expect, it } from "vitest";
import {
  formatearFechaEcuador,
  convertirFechaEcuador,
} from "../src/utilidades/fechasEcuador";

it("T-17: convierte un instante a fecha civil de Ecuador conservando milisegundos", () => {
  expect(formatearFechaEcuador("2026-11-11T04:30:12.123Z")).toBe(
    "2026-11-10T23:30:12.123",
  );
});
it("T-17: convierte civil a instante por IANA", () => {
  expect(convertirFechaEcuador("2026-11-10T23:30:12.123")).toBe(
    "2026-11-11T04:30:12.123Z",
  );
});
it.each(["", "2026-02-30T10:00", "no-es-fecha", "1993-02-04T23:30"])(
  "T-17: rechaza fecha civil inválida o ambigua %s",
  (civil) => {
    expect(() => convertirFechaEcuador(civil)).toThrow();
  },
);
it("T-17: admite fechas históricas sin fijar un offset universal", () => {
  const civil = "1900-01-01T12:00:00";
  expect(formatearFechaEcuador(convertirFechaEcuador(civil))).toBe(
    "1900-01-01T12:00:00.000",
  );
});
