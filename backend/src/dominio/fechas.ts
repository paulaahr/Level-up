export interface FechaCivilEcuador {
  readonly fecha: string;
  readonly ordinal: number;
}

export interface SemanaEcuador {
  readonly inicio: string;
  readonly fin: string;
  readonly inicioMs: number;
  readonly finExclusivoMs: number;
}

const MILISEGUNDOS_DIA = 86_400_000;
const formatoEcuador = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Guayaquil",
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  era: "short",
});

function fechaDeOrdinal(ordinal: number): string {
  return new Date(ordinal * MILISEGUNDOS_DIA).toISOString().split("T")[0];
}

/** Convierte un instante UTC (epoch ms) a su día civil de Ecuador. */
export function fechaCivilEcuador(instante: number): FechaCivilEcuador {
  if (
    !Number.isFinite(instante) ||
    !Number.isFinite(new Date(instante).getTime())
  ) {
    throw new RangeError(
      "El instante debe ser una fecha válida en milisegundos",
    );
  }

  const partes = formatoEcuador.formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes): string => {
    const parte = partes.find((elemento) => elemento.type === tipo);
    if (!parte) throw new RangeError("No se pudo resolver la fecha de Ecuador");
    return parte.value;
  };

  const anioEra = Number(valor("year"));
  const anio = valor("era") === "BC" ? 1 - anioEra : anioEra;
  const fechaNominal = new Date(0);
  // Date.UTC interpreta 0–99 como 1900–1999; setUTCFullYear conserva el año civil.
  fechaNominal.setUTCFullYear(
    anio,
    Number(valor("month")) - 1,
    Number(valor("day")),
  );
  const ordinal = fechaNominal.getTime() / MILISEGUNDOS_DIA;

  return { fecha: fechaDeOrdinal(ordinal), ordinal };
}

/** Resuelve un límite civil con IANA, incluidos offsets históricos de Ecuador. */
function inicioDelDia(ordinal: number): number {
  const nominal = ordinal * MILISEGUNDOS_DIA;
  let inferior = nominal - 2 * MILISEGUNDOS_DIA;
  let superior = nominal + 2 * MILISEGUNDOS_DIA;

  // Busca el primer milisegundo de ese día; no presupone UTC−05 ni días de 24 h.
  while (inferior < superior) {
    const medio = inferior + Math.floor((superior - inferior) / 2);
    if (fechaCivilEcuador(medio).ordinal < ordinal) inferior = medio + 1;
    else superior = medio;
  }

  return inferior;
}

/** Semana lunes–domingo, con límite de instante superior exclusivo. */
export function semanaEcuador(ahora: number): SemanaEcuador {
  const hoy = fechaCivilEcuador(ahora);
  const diaSemana = new Date(hoy.ordinal * MILISEGUNDOS_DIA).getUTCDay();
  const lunes = hoy.ordinal - ((diaSemana + 6) % 7);

  return {
    inicio: fechaDeOrdinal(lunes),
    fin: fechaDeOrdinal(lunes + 6),
    inicioMs: inicioDelDia(lunes),
    finExclusivoMs: inicioDelDia(lunes + 7),
  };
}
