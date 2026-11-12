import { describe, expect, it } from "vitest";
import {
  avanceActual,
  calcularProgreso,
  estadoHitos,
  rachas,
  type PartidaDominio,
} from "../../src/dominio/progreso";

const dia = (fecha: string): number =>
  Date.parse(`${fecha}T00:00:00.000Z`) / 86_400_000;

const crearPartida = (cambios: Partial<PartidaDominio> = {}): PartidaDominio =>
  Object.freeze({
    id: "000000000000000000000001",
    fechaInicio: Date.parse("2026-11-11T12:00:00-05:00"),
    duracionMinutos: 60,
    porcentajeAvance: 0,
    createdAt: Date.parse("2026-11-11T18:00:00.000Z"),
    ...cambios,
  });

describe("T-09 / T-10: rachas por días civiles", () => {
  it("CA-E2-22: distingue la racha actual de la mejor histórica", () => {
    const fechas = [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ].map(dia);

    expect(rachas(fechas, dia("2026-11-11"))).toEqual({
      rachaActual: 3,
      mejorRacha: 5,
    });
  });

  it("CA-E2-23: ayer mantiene vigente la racha sin sumar hoy ni reiniciar el lunes", () => {
    const fechas = ["2026-11-08", "2026-11-09", "2026-11-10"].map(dia);

    expect(rachas(fechas, dia("2026-11-11"))).toEqual({
      rachaActual: 3,
      mejorRacha: 3,
    });
  });

  it("CA-E2-24: sin partidas hoy ni ayer la actual es cero y conserva la mejor", () => {
    const fechas = [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ].map(dia);

    expect(rachas(fechas, dia("2026-11-11"))).toEqual({
      rachaActual: 0,
      mejorRacha: 5,
    });
  });

  it("CA-E2-25: deduplica fechas desordenadas sin mutar la entrada", () => {
    const fechas = Object.freeze(
      [
        "2026-11-10",
        "2026-11-08",
        "2026-11-10",
        "2026-11-09",
        "2026-11-08",
      ].map(dia),
    );
    const original = [...fechas];

    expect(rachas(fechas, dia("2026-11-11"))).toEqual({
      rachaActual: 3,
      mejorRacha: 3,
    });
    expect(fechas).toEqual(original);
  });

  it("CA-E2-25: no rellena un día que no está en el historial recibido", () => {
    const fechas = ["2026-11-08", "2026-11-10", "2026-11-11"].map(dia);

    expect(rachas(fechas, dia("2026-11-11"))).toEqual({
      rachaActual: 2,
      mejorRacha: 2,
    });
  });

  it("CA-E2-22: una partida hoy inicia una racha de un día", () => {
    expect(rachas([dia("2026-11-11")], dia("2026-11-11"))).toEqual({
      rachaActual: 1,
      mejorRacha: 1,
    });
  });

  it("CA-E2-23: una partida ayer conserva una racha de un día", () => {
    expect(rachas([dia("2026-11-10")], dia("2026-11-11"))).toEqual({
      rachaActual: 1,
      mejorRacha: 1,
    });
  });

  it("CA-E2-22: una secuencia con hoy puede cruzar la semana", () => {
    const fechas = [
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ].map(dia);

    expect(rachas(fechas, dia("2026-11-11"))).toEqual({
      rachaActual: 5,
      mejorRacha: 5,
    });
  });

  it("CA-E2-24: un historial vacío no produce ninguna racha", () => {
    expect(rachas([], dia("2026-11-11"))).toEqual({
      rachaActual: 0,
      mejorRacha: 0,
    });
  });
});

describe("T-09 / T-10: avance actual compatible con E1", () => {
  it("CA-E2-28: usa el inicio más reciente, no el máximo ni el último registro", () => {
    const reciente = crearPartida({
      fechaInicio: Date.parse("2026-11-11T12:00:00-05:00"),
      porcentajeAvance: 40,
      createdAt: Date.parse("2026-11-11T18:00:00.000Z"),
    });
    const historicaRegistradaDespues = crearPartida({
      id: "000000000000000000000002",
      fechaInicio: Date.parse("2026-11-10T12:00:00-05:00"),
      porcentajeAvance: 90,
      createdAt: Date.parse("2026-11-12T18:00:00.000Z"),
    });

    expect(avanceActual([reciente, historicaRegistradaDespues])).toBe(40);
    expect(avanceActual([historicaRegistradaDespues, reciente])).toBe(40);
  });

  it("CA-E2-28: desempata inicios iguales por creación más reciente", () => {
    const primera = crearPartida({
      porcentajeAvance: 70,
      createdAt: Date.parse("2026-11-11T18:00:00.000Z"),
    });
    const segunda = crearPartida({
      id: "000000000000000000000002",
      porcentajeAvance: 30,
      createdAt: Date.parse("2026-11-11T19:00:00.000Z"),
    });

    expect(avanceActual([segunda, primera])).toBe(30);
    expect(avanceActual([primera, segunda])).toBe(30);
  });

  it("CA-E2-28: desempata inicio y creación iguales por ID hexadecimal descendente", () => {
    const menor = crearPartida({
      id: "00000000000000000000000f",
      porcentajeAvance: 20,
    });
    const mayor = crearPartida({
      id: "000000000000000000000010",
      porcentajeAvance: 75,
    });

    expect(avanceActual([menor, mayor])).toBe(75);
    expect(avanceActual([mayor, menor])).toBe(75);
  });

  it("CA-E2-28: no reordena ni altera las partidas recibidas", () => {
    const partidas = Object.freeze([
      crearPartida({
        fechaInicio: Date.parse("2026-11-09T12:00:00-05:00"),
        porcentajeAvance: 80,
      }),
      crearPartida({
        id: "000000000000000000000002",
        fechaInicio: Date.parse("2026-11-11T12:00:00-05:00"),
        porcentajeAvance: 35,
      }),
    ]);
    const original = partidas.map((partida) => ({ ...partida }));

    expect(avanceActual(partidas)).toBe(35);
    expect(partidas).toEqual(original);
  });

  it("CA-E2-29: sin partidas el avance actual es cero", () => {
    expect(avanceActual([])).toBe(0);
  });
});

describe("T-09 / T-10: hitos calculados y reversibles", () => {
  it("CA-E2-26: distingue igualdad, objetivo superado y objetivo pendiente", () => {
    const hitos = [
      { descripcion: "Primer tramo", porcentajeObjetivo: 25 },
      { descripcion: "Mitad", porcentajeObjetivo: 50 },
      { descripcion: "Final", porcentajeObjetivo: 100 },
    ];

    expect(estadoHitos(hitos, 50)).toEqual([
      {
        descripcion: "Primer tramo",
        porcentajeObjetivo: 25,
        alcanzado: true,
      },
      { descripcion: "Mitad", porcentajeObjetivo: 50, alcanzado: true },
      { descripcion: "Final", porcentajeObjetivo: 100, alcanzado: false },
    ]);
  });

  it("CA-E2-26: admite umbrales decimales y exige alcanzarlos sin redondear", () => {
    const hitos = [
      { descripcion: "Mitad y un poco", porcentajeObjetivo: 50.5 },
    ];

    expect(estadoHitos(hitos, 50.49)).toEqual([
      {
        descripcion: "Mitad y un poco",
        porcentajeObjetivo: 50.5,
        alcanzado: false,
      },
    ]);
    expect(estadoHitos(hitos, 50.5)).toEqual([
      {
        descripcion: "Mitad y un poco",
        porcentajeObjetivo: 50.5,
        alcanzado: true,
      },
    ]);
  });

  it("CA-E2-26: alcanza exactamente los extremos válidos 1 y 100", () => {
    expect(
      estadoHitos(
        [
          { descripcion: "Comienzo", porcentajeObjetivo: 1 },
          { descripcion: "Final", porcentajeObjetivo: 100 },
        ],
        100,
      ),
    ).toEqual([
      { descripcion: "Comienzo", porcentajeObjetivo: 1, alcanzado: true },
      { descripcion: "Final", porcentajeObjetivo: 100, alcanzado: true },
    ]);
  });

  it("CA-E2-27: un avance actual menor revierte el hito sin persistir el estado previo", () => {
    const hitos = Object.freeze([
      Object.freeze({ descripcion: "Mitad", porcentajeObjetivo: 50 }),
    ]);
    const antes = estadoHitos(hitos, 60);
    const despues = estadoHitos(hitos, 40);

    expect(antes).toEqual([
      { descripcion: "Mitad", porcentajeObjetivo: 50, alcanzado: true },
    ]);
    expect(despues).toEqual([
      { descripcion: "Mitad", porcentajeObjetivo: 50, alcanzado: false },
    ]);
    expect(hitos).toEqual([{ descripcion: "Mitad", porcentajeObjetivo: 50 }]);
    expect(despues[0]).not.toBe(hitos[0]);
  });

  it("CA-E2-27: integrar la sesión más reciente con menor avance revierte el hito", () => {
    const partidas = [
      crearPartida({
        fechaInicio: Date.parse("2026-11-10T12:00:00-05:00"),
        porcentajeAvance: 60,
      }),
      crearPartida({
        id: "000000000000000000000002",
        fechaInicio: Date.parse("2026-11-11T12:00:00-05:00"),
        porcentajeAvance: 40,
      }),
    ];

    expect(
      estadoHitos(
        [{ descripcion: "Mitad", porcentajeObjetivo: 50 }],
        avanceActual(partidas),
      ),
    ).toEqual([
      { descripcion: "Mitad", porcentajeObjetivo: 50, alcanzado: false },
    ]);
  });

  it("CA-E2-29: un historial vacío no alcanza ni el umbral mínimo", () => {
    expect(
      estadoHitos(
        [
          { descripcion: "Comienzo", porcentajeObjetivo: 1 },
          { descripcion: "Final", porcentajeObjetivo: 100 },
        ],
        avanceActual([]),
      ),
    ).toEqual([
      { descripcion: "Comienzo", porcentajeObjetivo: 1, alcanzado: false },
      { descripcion: "Final", porcentajeObjetivo: 100, alcanzado: false },
    ]);
  });

  it("CA-E2-26: una meta sin hitos devuelve una lista vacía", () => {
    expect(estadoHitos([], 100)).toEqual([]);
  });
});

describe("T-09 / T-10: coherencia de hitos en el coordinador", () => {
  it("CA-E2-26: los hitos usan el avance del juego aunque las horas lleguen a 100 %", () => {
    const sesiones = Object.freeze([
      Object.freeze({
        ...crearPartida({
          fechaInicio: Date.parse("2026-11-11T15:00:00Z"),
          duracionMinutos: 300,
        }),
        porcentajeAvance: 40,
      }),
    ]);
    const meta = Object.freeze({
      id: "meta-1",
      horasSemanales: 5,
      diasPorSemana: 1,
      hitos: Object.freeze([
        Object.freeze({
          descripcion: "Mitad del juego",
          porcentajeObjetivo: 50,
        }),
      ]),
    });
    const antes = JSON.stringify({ sesiones, meta });

    expect(
      calcularProgreso(sesiones, meta, Date.parse("2026-11-11T17:00:00Z")),
    ).toMatchObject({
      porcentajeHoras: 100,
      cumplidaSemana: true,
      hitos: [
        {
          descripcion: "Mitad del juego",
          porcentajeObjetivo: 50,
          alcanzado: false,
        },
      ],
    });
    expect(JSON.stringify({ sesiones, meta })).toBe(antes);
  });
});
