import { describe, expect, it } from "vitest";
import { fechaCivilEcuador, semanaEcuador } from "../../src/dominio/fechas";
import {
  actividadSemanal,
  calcularProgreso,
  porcentajeHoras,
  type PartidaDominio,
} from "../../src/dominio/progreso";

const instante = (iso: string): number => Date.parse(iso);
const ahora = instante("2026-11-11T17:00:00Z");

function partida(
  fecha: string,
  minutos: number = 60,
  id: string = "000000000000000000000001",
): PartidaDominio {
  return Object.freeze({
    id,
    fechaInicio: instante(fecha),
    duracionMinutos: minutos,
    porcentajeAvance: 25,
    createdAt: instante(fecha),
  });
}

describe("T-07: fechas civiles y semanas de Ecuador", () => {
  it("CA-E2-16: interpreta el instante en Ecuador, no como fecha UTC", () => {
    const civil = fechaCivilEcuador(instante("2026-11-09T04:59:59.999Z"));

    expect(civil).toEqual({ fecha: "2026-11-08", ordinal: 20765 });
    expect(fechaCivilEcuador(instante("2026-11-09T05:00:00Z")).fecha).toBe(
      "2026-11-09",
    );
  });

  it("CA-E2-16: devuelve lunes incluido y siguiente lunes exclusivo", () => {
    expect(semanaEcuador(ahora)).toEqual({
      inicio: "2026-11-09",
      fin: "2026-11-15",
      inicioMs: instante("2026-11-09T05:00:00Z"),
      finExclusivoMs: instante("2026-11-16T05:00:00Z"),
    });
  });

  it.each([
    ["2026-11-09T04:59:59.999Z", "2026-11-02", "2026-11-08"],
    ["2026-11-09T05:00:00.000Z", "2026-11-09", "2026-11-15"],
    ["2026-11-16T04:59:59.999Z", "2026-11-09", "2026-11-15"],
    ["2026-11-16T05:00:00.000Z", "2026-11-16", "2026-11-22"],
    ["2026-12-01T17:00:00Z", "2026-11-30", "2026-12-06"],
    ["2027-01-01T17:00:00Z", "2026-12-28", "2027-01-03"],
    ["2024-02-29T17:00:00Z", "2024-02-26", "2024-03-03"],
  ])("CA-E2-16: límites de calendario %s", (fecha, inicio, fin) => {
    expect(semanaEcuador(instante(fecha))).toMatchObject({ inicio, fin });
  });

  it("CA-E2-16: respeta el offset histórico IANA de Ecuador en 1992", () => {
    // tzdb/southamerica: el cambio a UTC−04 ocurrió el 28, dentro de esta semana.
    expect(semanaEcuador(instante("1992-11-28T12:00:00Z"))).toEqual({
      inicio: "1992-11-23",
      fin: "1992-11-29",
      inicioMs: instante("1992-11-23T05:00:00Z"),
      finExclusivoMs: instante("1992-11-30T04:00:00Z"),
    });
  });

  it("CA-E2-16: una semana histórica puede tener 169 horas entre sus límites", () => {
    // tzdb/southamerica: el 5 de febrero de 1993 Ecuador volvió a UTC−05.
    expect(semanaEcuador(instante("1993-02-05T17:00:00Z"))).toEqual({
      inicio: "1993-02-01",
      fin: "1993-02-07",
      inicioMs: instante("1993-02-01T04:00:00Z"),
      finExclusivoMs: instante("1993-02-08T05:00:00Z"),
    });
  });

  it("CA-E2-16: no convierte los años de dos cifras en el siglo XX", () => {
    expect(fechaCivilEcuador(instante("0099-06-15T12:00:00Z")).fecha).toBe(
      "0099-06-15",
    );
  });
});

describe("T-07: minutos, horas y días distintos", () => {
  it("CA-E2-17: suma minutos completos antes de redondear", () => {
    const actividad = actividadSemanal(
      [
        partida("2026-11-09T15:00:00Z", 60),
        partida("2026-11-10T15:00:00Z", 90),
        partida("2026-11-11T15:00:00Z", 60),
      ],
      semanaEcuador(ahora),
    );

    expect(actividad).toEqual({ minutos: 210, horas: 3.5, dias: 3 });
    expect(porcentajeHoras(actividad.horas, 5)).toBe(70);
  });

  it("CA-E2-18: 97 minutos son 1,6 horas y 53 % de una meta de 3", () => {
    const actividad = actividadSemanal(
      [partida("2026-11-09T15:00:00Z", 97)],
      semanaEcuador(ahora),
    );

    expect(actividad.horas).toBe(1.6);
    expect(porcentajeHoras(actividad.horas, 3)).toBe(53);
  });

  it("CA-E2-18: no redondea cada partida por separado", () => {
    const actividad = actividadSemanal(
      [partida("2026-11-09T15:00:00Z", 2), partida("2026-11-09T16:00:00Z", 2)],
      semanaEcuador(ahora),
    );

    expect(actividad).toEqual({ minutos: 4, horas: 0.1, dias: 1 });
  });

  it("CA-E2-19: limita el porcentaje, pero conserva las siete horas reales", () => {
    const actividad = actividadSemanal(
      [partida("2026-11-09T15:00:00Z", 420)],
      semanaEcuador(ahora),
    );

    expect(actividad.horas).toBe(7);
    expect(porcentajeHoras(actividad.horas, 5)).toBe(100);
  });

  it("CA-E2-20: varias partidas de lunes y miércoles suman solo dos días", () => {
    const partidas = Object.freeze([
      partida("2026-11-11T15:00:00Z", 60),
      partida("2026-11-09T15:00:00Z", 30),
      partida("2026-11-09T16:00:00Z", 45),
    ]);
    const antes = JSON.stringify(partidas);

    expect(actividadSemanal(partidas, semanaEcuador(ahora))).toEqual({
      minutos: 135,
      horas: 2.3,
      dias: 2,
    });
    expect(JSON.stringify(partidas)).toBe(antes);
  });

  it("CA-E2-16: excluye los instantes externos y conserva ambos bordes internos", () => {
    const actividad = actividadSemanal(
      [
        partida("2026-11-09T04:59:59.999Z", 100),
        partida("2026-11-09T05:00:00.000Z", 10),
        partida("2026-11-16T04:59:59.999Z", 20),
        partida("2026-11-16T05:00:00.000Z", 200),
      ],
      semanaEcuador(instante("2026-11-16T04:59:59.999Z")),
    );

    expect(actividad).toEqual({ minutos: 30, horas: 0.5, dias: 2 });
  });

  it("CA-E2-21: atribuye todos los minutos de una sesión al domingo de inicio", () => {
    const sesiones = [partida("2026-11-09T04:30:00Z", 120)];

    expect(
      actividadSemanal(
        sesiones,
        semanaEcuador(instante("2026-11-08T17:00:00Z")),
      ),
    ).toEqual({ minutos: 120, horas: 2, dias: 1 });
    expect(actividadSemanal(sesiones, semanaEcuador(ahora))).toEqual({
      minutos: 0,
      horas: 0,
      dias: 0,
    });
  });

  it("CA-E2-20: deduplica un día civil aunque las fechas UTC sean diferentes", () => {
    expect(
      actividadSemanal(
        [
          partida("2026-11-10T04:30:00Z", 30),
          partida("2026-11-09T15:00:00Z", 30),
        ],
        semanaEcuador(ahora),
      ),
    ).toEqual({ minutos: 60, horas: 1, dias: 1 });
  });

  it("CA-E2-19: el porcentaje nunca supera 100 con objetivos decimales pequeños", () => {
    expect(porcentajeHoras(0.1, 0.01)).toBe(100);
    expect(porcentajeHoras(0, 5)).toBe(0);
  });
});

describe("coordinación pura de progreso, sin acceso a datos", () => {
  it("CA-E2-13: la meta actual cambia el porcentaje, no las partidas de la semana", () => {
    const sesiones = Object.freeze([
      partida("2026-11-09T15:00:00Z", 90),
      partida("2026-11-10T15:00:00Z", 90),
    ]);
    const anterior = calcularProgreso(
      sesiones,
      { id: "meta-1", horasSemanales: 6, diasPorSemana: 4, hitos: [] },
      ahora,
    );
    const actual = calcularProgreso(
      sesiones,
      { id: "meta-1", horasSemanales: 3, diasPorSemana: 2, hitos: [] },
      ahora,
    );

    expect(anterior.porcentajeHoras).toBe(50);
    expect(anterior.cumplidaSemana).toBe(false);
    expect(actual).toMatchObject({
      horasSemana: 3,
      diasJugadosSemana: 2,
      porcentajeHoras: 100,
      cumplidaSemana: true,
    });
  });

  it("sin meta mantiene actividad y rachas, sin porcentaje ni hitos anteriores", () => {
    expect(
      calcularProgreso([partida("2026-11-10T15:00:00Z")], null, ahora),
    ).toEqual({
      semana: { inicio: "2026-11-09", fin: "2026-11-15" },
      meta: null,
      horasSemana: 1,
      porcentajeHoras: null,
      diasJugadosSemana: 1,
      rachaActual: 1,
      mejorRacha: 1,
      hitos: [],
      cumplidaSemana: null,
    });
  });

  it("sin partidas y con meta devuelve ceros, objetivos e hitos pendientes", () => {
    expect(
      calcularProgreso(
        [],
        {
          id: "meta-1",
          horasSemanales: 5,
          diasPorSemana: 4,
          hitos: [{ descripcion: "Primer avance", porcentajeObjetivo: 1 }],
        },
        ahora,
      ),
    ).toEqual({
      semana: { inicio: "2026-11-09", fin: "2026-11-15" },
      meta: { _id: "meta-1", horasSemanales: 5, diasPorSemana: 4 },
      horasSemana: 0,
      porcentajeHoras: 0,
      diasJugadosSemana: 0,
      rachaActual: 0,
      mejorRacha: 0,
      hitos: [
        {
          descripcion: "Primer avance",
          porcentajeObjetivo: 1,
          alcanzado: false,
        },
      ],
      cumplidaSemana: false,
    });
  });

  it("sin meta ni partidas conserva null frente a cero", () => {
    expect(calcularProgreso([], null, ahora)).toMatchObject({
      meta: null,
      horasSemana: 0,
      diasJugadosSemana: 0,
      rachaActual: 0,
      mejorRacha: 0,
      porcentajeHoras: null,
      cumplidaSemana: null,
      hitos: [],
    });
  });
});
