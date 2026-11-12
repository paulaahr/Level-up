import { Temporal } from "@js-temporal/polyfill";

const ZONA = "America/Guayaquil";

/** Entrada datetime-local en Ecuador, sin depender de la zona del navegador. */
export function formatearFechaEcuador(instante: string | number): string {
  const fecha =
    typeof instante === "number"
      ? Temporal.Instant.fromEpochMilliseconds(instante)
      : Temporal.Instant.from(instante);
  return fecha
    .toZonedDateTimeISO(ZONA)
    .toPlainDateTime()
    .toString({ smallestUnit: "millisecond" });
}

/** Rechaza fechas imposibles, huecos y horas históricas ambiguas de la zona IANA. */
export function convertirFechaEcuador(civil: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(civil)) {
    throw new RangeError("Introduce un inicio válido en hora de Ecuador");
  }
  return Temporal.PlainDateTime.from(civil, { overflow: "reject" })
    .toZonedDateTime(ZONA, { disambiguation: "reject" })
    .toInstant()
    .toString({ smallestUnit: "millisecond" });
}
