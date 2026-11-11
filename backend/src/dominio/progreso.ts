import { fechaCivilEcuador, semanaEcuador, type SemanaEcuador } from "./fechas";

export interface PartidaDominio {
  readonly id: string;
  readonly fechaInicio: number;
  readonly duracionMinutos: number;
  readonly porcentajeAvance: number;
  readonly createdAt: number;
}

export interface HitoObjetivo {
  readonly descripcion: string;
  readonly porcentajeObjetivo: number;
}

export interface HitoProgreso extends HitoObjetivo {
  readonly alcanzado: boolean;
}

export interface MetaDominio {
  readonly id: string;
  readonly horasSemanales: number;
  readonly diasPorSemana: number;
  readonly hitos: readonly HitoObjetivo[];
}

export interface ActividadSemanal {
  readonly minutos: number;
  readonly horas: number;
  readonly dias: number;
}

export interface Rachas {
  readonly rachaActual: number;
  readonly mejorRacha: number;
}

export interface ProgresoSemanal extends Rachas {
  readonly semana: {
    readonly inicio: string;
    readonly fin: string;
  };
  readonly meta: {
    readonly _id: string;
    readonly horasSemanales: number;
    readonly diasPorSemana: number;
  } | null;
  readonly horasSemana: number;
  readonly porcentajeHoras: number | null;
  readonly diasJugadosSemana: number;
  readonly hitos: readonly HitoProgreso[];
  readonly cumplidaSemana: boolean | null;
}

export function actividadSemanal(
  partidas: readonly PartidaDominio[],
  semana: SemanaEcuador,
): ActividadSemanal {
  let minutos = 0;
  const dias = new Set<number>();

  for (const partida of partidas) {
    if (
      partida.fechaInicio >= semana.inicioMs &&
      partida.fechaInicio < semana.finExclusivoMs
    ) {
      minutos += partida.duracionMinutos;
      dias.add(fechaCivilEcuador(partida.fechaInicio).ordinal);
    }
  }

  return {
    minutos,
    horas: Math.round((minutos / 60) * 10) / 10,
    dias: dias.size,
  };
}

export function porcentajeHoras(horas: number, objetivo: number): number {
  return Math.min(100, Math.round((horas / objetivo) * 100));
}

export function rachas(ordinales: readonly number[], hoy: number): Rachas {
  const dias = [...new Set(ordinales)].sort(
    (primero, segundo) => primero - segundo,
  );
  let anterior: number | undefined;
  let consecutivos = 0;
  let mejorRacha = 0;

  for (const dia of dias) {
    consecutivos =
      anterior !== undefined && dia === anterior + 1 ? consecutivos + 1 : 1;
    mejorRacha = Math.max(mejorRacha, consecutivos);
    anterior = dia;
  }

  return {
    rachaActual: anterior === hoy || anterior === hoy - 1 ? consecutivos : 0,
    mejorRacha,
  };
}

export function avanceActual(partidas: readonly PartidaDominio[]): number {
  let ultima: PartidaDominio | undefined;

  for (const partida of partidas) {
    if (
      ultima === undefined ||
      partida.fechaInicio > ultima.fechaInicio ||
      (partida.fechaInicio === ultima.fechaInicio &&
        (partida.createdAt > ultima.createdAt ||
          (partida.createdAt === ultima.createdAt && partida.id > ultima.id)))
    ) {
      ultima = partida;
    }
  }

  return ultima?.porcentajeAvance ?? 0;
}

export function estadoHitos(
  hitos: readonly HitoObjetivo[],
  avance: number,
): HitoProgreso[] {
  return hitos.map((hito) => ({
    descripcion: hito.descripcion,
    porcentajeObjetivo: hito.porcentajeObjetivo,
    alcanzado: avance >= hito.porcentajeObjetivo,
  }));
}

export function cumplimientoSemanal(
  minutos: number,
  dias: number,
  meta: MetaDominio | null,
): boolean | null {
  if (meta === null) return null;

  return minutos / 60 >= meta.horasSemanales && dias >= meta.diasPorSemana;
}

export function calcularProgreso(
  partidas: readonly PartidaDominio[],
  meta: MetaDominio | null,
  ahora: number,
): ProgresoSemanal {
  const semana = semanaEcuador(ahora);
  const actividad = actividadSemanal(partidas, semana);
  const resultadoRachas = rachas(
    partidas.map((partida) => fechaCivilEcuador(partida.fechaInicio).ordinal),
    fechaCivilEcuador(ahora).ordinal,
  );

  return {
    semana: { inicio: semana.inicio, fin: semana.fin },
    meta:
      meta === null
        ? null
        : {
            _id: meta.id,
            horasSemanales: meta.horasSemanales,
            diasPorSemana: meta.diasPorSemana,
          },
    horasSemana: actividad.horas,
    porcentajeHoras:
      meta === null
        ? null
        : porcentajeHoras(actividad.horas, meta.horasSemanales),
    diasJugadosSemana: actividad.dias,
    rachaActual: resultadoRachas.rachaActual,
    mejorRacha: resultadoRachas.mejorRacha,
    hitos: meta === null ? [] : estadoHitos(meta.hitos, avanceActual(partidas)),
    cumplidaSemana: cumplimientoSemanal(
      actividad.minutos,
      actividad.dias,
      meta,
    ),
  };
}
