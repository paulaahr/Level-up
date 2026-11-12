import { Types } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { Meta } from "../src/modelos/Meta.model";
import {
  ErrorValidacionMeta,
  validarActualizacionMeta,
  validarCreacionMeta,
} from "../src/validaciones/meta";

const videojuego = "507f1f77bcf86cd799439011";
const hito = (porcentajeObjetivo = 50.5) => ({
  descripcion: "Avance semanal",
  porcentajeObjetivo,
});
const datosCreacion = () => ({
  videojuego,
  horasSemanales: 5,
  diasPorSemana: 4,
  hitos: [hito()],
});
const datosActualizacion = () => ({
  horasSemanales: 5,
  diasPorSemana: 4,
  hitos: [hito()],
});
const nuevaMeta = (cambios: Record<string, unknown> = {}) =>
  new Meta({ ...datosCreacion(), ...cambios });

it("T-06: el hito embebido no registra una version inexistente al abortar", () => {
  const esquemaHito = Meta.schema.path("hitos").schema;
  if (!esquemaHito) throw new Error("Falta el esquema de hitos embebidos");
  expect(esquemaHito.options.versionKey).toBe(false);
  expect(esquemaHito.options.strict).toBe("throw");
  expect(esquemaHito.path("__v")).toBeUndefined();
  expect(Meta.schema.options.versionKey).toBe("__v");
});
const casosDeValores = (...valores: unknown[]): [unknown][] =>
  valores.map((valor): [unknown] => [valor]);

function esperarErrorEntrada(operacion: () => unknown, campo?: string): void {
  let error: unknown;
  try {
    operacion();
  } catch (capturado) {
    error = capturado;
  }
  expect(error).toBeInstanceOf(ErrorValidacionMeta);
  if (!(error instanceof ErrorValidacionMeta)) {
    throw new Error("Se esperaba ErrorValidacionMeta");
  }
  expect(error.message.trim().length).toBeGreaterThan(0);
  expect(typeof error.campo).toBe("string");
  if (campo !== undefined) expect(error.campo).toBe(campo);
}

const numerosInvalidos: [string, unknown][] = [
  ["ausente", undefined],
  ["string numérico", "5"],
  ["null", null],
  ["booleano", true],
  ["arreglo", [5]],
  ["objeto", { valor: 5 }],
  ["NaN", Number.NaN],
  ["Infinity", Number.POSITIVE_INFINITY],
  ["-Infinity", Number.NEGATIVE_INFINITY],
];
const horasInvalidas: [string, unknown][] = [
  ...numerosInvalidos,
  ["cero", 0],
  ["negativo", -0.5],
  ["superior a cien", 100.01],
];
const diasInvalidos: [string, unknown][] = [
  ...numerosInvalidos,
  ["cero", 0],
  ["negativo", -1],
  ["ocho", 8],
  ["fracción", 1.5],
];
const objetivosInvalidos: [string, unknown][] = [
  ...numerosInvalidos,
  ["inferior a uno", 0.99],
  ["superior a cien", 100.01],
];
const hitosInvalidos: [string, unknown][] = [
  ["seis hitos", Array.from({ length: 6 }, () => hito())],
  ["null", null],
  ["objeto en vez de arreglo", hito()],
  ["string", "hito"],
  ["booleano", false],
  ["número", 0],
  ["elemento null", [null]],
  ["elemento booleano", [false]],
  ["elemento número", [0]],
  ["elemento string", ["hito"]],
  ["elemento arreglo", [[]]],
  ["arreglo con posición vacía", new Array(1)],
];

describe("T-04 / CA-E2-01: estructura de Meta sin MongoDB", () => {
  it("declara colección, referencia obligatoria e inmutable a Videojuego", () => {
    const referencia = Meta.schema.path("videojuego");
    expect(Meta.collection.name).toBe("metas");
    expect(referencia.instance).toBe("ObjectId");
    expect(referencia.options.ref).toBe("Videojuego");
    expect(referencia.options.immutable).toBe(true);
    expect(
      nuevaMeta({ videojuego: undefined }).validateSync()?.errors.videojuego,
    ).toBeDefined();
  });

  it("acepta ObjectId y su representación hexadecimal sin comprobar existencia", () => {
    // La existencia del padre corresponde a T-05 y requiere integración.
    const porObjeto = nuevaMeta({ videojuego: new Types.ObjectId(videojuego) });
    const porTexto = nuevaMeta();
    expect(porObjeto.validateSync()).toBeUndefined();
    expect(porTexto.validateSync()).toBeUndefined();
    expect(porTexto.videojuego.toString()).toBe(videojuego);
  });

  it.each(casosDeValores(null, true, 42, "identificador-inválido", [], {}))(
    "rechaza referencia inválida %j",
    (valor) => {
      expect(
        nuevaMeta({ videojuego: valor }).validateSync()?.errors.videojuego,
      ).toBeDefined();
    },
  );

  it("crea activa por defecto y permite conservar metas inactivas", () => {
    expect(nuevaMeta().activa).toBe(true);
    const inactiva = nuevaMeta({ activa: false });
    expect(inactiva.activa).toBe(false);
    expect(inactiva.validateSync()).toBeUndefined();
  });

  it.each(casosDeValores(null, "true", "false", 0, 1, [], {}))(
    "rechaza activa de tipo incorrecto %j",
    (activa) => {
      expect(nuevaMeta({ activa }).validateSync()?.errors.activa).toBeDefined();
    },
  );

  it("declara timestamps Date e inicializa sus valores en memoria", () => {
    expect(Meta.schema.options.timestamps).toBe(true);
    expect(Meta.schema.path("createdAt").instance).toBe("Date");
    expect(Meta.schema.path("updatedAt").instance).toBe("Date");
    vi.useFakeTimers();
    const ahora = new Date("2026-11-11T17:00:00.000Z");
    vi.setSystemTime(ahora);
    const meta = nuevaMeta() as ReturnType<typeof nuevaMeta> & {
      initializeTimestamps(): unknown;
    };
    meta.initializeTimestamps();
    expect(meta.createdAt).toEqual(ahora);
    expect(meta.updatedAt).toEqual(ahora);
    // Esto no verifica timestamps escritos o actualizados en una base real.
  });

  it("declara el índice único parcial sin afirmar que esté creado en MongoDB", () => {
    expect(Meta.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { videojuego: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: { activa: true },
          }),
        ],
      ]),
    );
    expect(Meta.db.readyState).toBe(0);
    // CA-E2-09 a CA-E2-11: concurrencia y persistencia son integración de T-06.
  });

  it("no define ni almacena el estado calculado alcanzado en los hitos", () => {
    expect(Meta.schema.path("hitos.alcanzado")).toBeUndefined();
    expect(nuevaMeta().toObject().hitos[0]).not.toHaveProperty("alcanzado");
  });
});

describe("T-04 / CA-E2-03 a CA-E2-06: validadores del modelo sin persistencia", () => {
  it.each([0.01, 0.5, 100])("acepta %s horas sin imponer enteros", (horas) => {
    expect(nuevaMeta({ horasSemanales: horas }).validateSync()).toBeUndefined();
  });
  it.each(horasInvalidas)("rechaza horas: %s", (_nombre, valor) => {
    expect(
      nuevaMeta({ horasSemanales: valor }).validateSync()?.errors
        .horasSemanales,
    ).toBeDefined();
  });
  it.each([1, 7])("acepta %s días", (dias) => {
    expect(nuevaMeta({ diasPorSemana: dias }).validateSync()).toBeUndefined();
  });
  it.each(diasInvalidos)("rechaza días: %s", (_nombre, valor) => {
    expect(
      nuevaMeta({ diasPorSemana: valor }).validateSync()?.errors.diasPorSemana,
    ).toBeDefined();
  });
  it.each([0, 5])(
    "acepta %s hitos, incluidos objetivos repetidos",
    (cantidad) => {
      const hitos = Array.from({ length: cantidad }, () => hito());
      expect(nuevaMeta({ hitos }).validateSync()).toBeUndefined();
    },
  );
  it("asigna arreglo vacío cuando se omiten los hitos", () => {
    const { hitos: _hitos, ...datos } = datosCreacion();
    const meta = new Meta(datos);
    expect(meta.hitos).toHaveLength(0);
    expect(meta.validateSync()).toBeUndefined();
  });
  it.each(hitosInvalidos)("rechaza hitos: %s", (_nombre, hitos) => {
    expect(nuevaMeta({ hitos }).validateSync()).toBeDefined();
  });
  it("CA-E2-05: rechaza elementos nulos añadidos a un array mutable", () => {
    const meta = nuevaMeta();
    meta.hitos.push(null as never);

    expect(meta.validateSync()?.errors.hitos).toBeDefined();
  });
  it("CA-E2-05: rechaza eliminar el arreglo de hitos de una meta", () => {
    const meta = nuevaMeta();
    meta.set("hitos", undefined);

    expect(meta.validateSync()?.errors.hitos).toBeDefined();
  });
  it.each(["", "Avance", "   "])(
    "acepta descripción string %j",
    (descripcion) => {
      expect(
        nuevaMeta({
          hitos: [{ descripcion, porcentajeObjetivo: 1 }],
        }).validateSync(),
      ).toBeUndefined();
    },
  );
  it.each(casosDeValores(undefined, null, 1, true, [], {}))(
    "rechaza descripción ausente o no string %j",
    (descripcion) => {
      expect(
        nuevaMeta({
          hitos: [{ descripcion, porcentajeObjetivo: 1 }],
        }).validateSync()?.errors["hitos.0.descripcion"],
      ).toBeDefined();
    },
  );
  it.each([1, 50.5, 100])(
    "acepta objetivo %s sin exigir entero",
    (objetivo) => {
      expect(
        nuevaMeta({ hitos: [hito(objetivo)] }).validateSync(),
      ).toBeUndefined();
    },
  );
  it.each(objetivosInvalidos)(
    "rechaza objetivo: %s",
    (_nombre, porcentajeObjetivo) => {
      expect(
        nuevaMeta({
          hitos: [{ descripcion: "", porcentajeObjetivo }],
        }).validateSync()?.errors["hitos.0.porcentajeObjetivo"],
      ).toBeDefined();
    },
  );

  it.each(["creación", "edición"])(
    "rechaza %s inválida antes de llamar a escrituras de la colección",
    async (operacion) => {
      const insertar = vi
        .spyOn(Meta.collection, "insertOne")
        .mockRejectedValue(new Error("No se debe intentar escribir"));
      const actualizar = vi
        .spyOn(Meta.collection, "updateOne")
        .mockRejectedValue(new Error("No se debe intentar escribir"));
      const meta =
        operacion === "creación"
          ? nuevaMeta()
          : Meta.hydrate({
              ...datosCreacion(),
              _id: new Types.ObjectId(),
              activa: true,
            });
      meta.horasSemanales = 0;
      await expect(meta.save()).rejects.toMatchObject({
        name: "ValidationError",
      });
      expect(insertar).not.toHaveBeenCalled();
      expect(actualizar).not.toHaveBeenCalled();
      // La conservación de un documento persistido se verificará en T-05.
    },
  );
});

describe.each([
  ["creación", validarCreacionMeta, datosCreacion],
  ["actualización", validarActualizacionMeta, datosActualizacion],
] as const)(
  "T-05 parcial / CA-E2-03 a CA-E2-06: entrada de %s",
  (_nombre, validar, datos) => {
    it.each(casosDeValores(null, undefined, true, 5, "meta", []))(
      "rechaza un cuerpo que no sea objeto: %j",
      (valor) => esperarErrorEntrada(() => validar(valor), "meta"),
    );
    it.each(horasInvalidas)(
      "rechaza horas antes del casteo: %s",
      (_caso, valor) => {
        esperarErrorEntrada(
          () => validar({ ...datos(), horasSemanales: valor }),
          "horasSemanales",
        );
      },
    );
    it.each(diasInvalidos)(
      "rechaza días antes del casteo: %s",
      (_caso, valor) => {
        esperarErrorEntrada(
          () => validar({ ...datos(), diasPorSemana: valor }),
          "diasPorSemana",
        );
      },
    );
    it.each(objetivosInvalidos)(
      "rechaza objetivo antes del casteo: %s",
      (_caso, valor) => {
        esperarErrorEntrada(
          () =>
            validar({
              ...datos(),
              hitos: [{ descripcion: "", porcentajeObjetivo: valor }],
            }),
          "hitos.0.porcentajeObjetivo",
        );
      },
    );
    it.each(hitosInvalidos)("rechaza hitos inválidos: %s", (_caso, hitos) => {
      // Para elementos inválidos puede señalarse el arreglo o su índice.
      esperarErrorEntrada(() => validar({ ...datos(), hitos }));
    });
    it.each(casosDeValores(undefined, null, 1, false, [], {}))(
      "exige descripción string: %j",
      (descripcion) => {
        esperarErrorEntrada(
          () =>
            validar({
              ...datos(),
              hitos: [{ descripcion, porcentajeObjetivo: 1 }],
            }),
          "hitos.0.descripcion",
        );
      },
    );
    it.each(casosDeValores(null, "true", "false", 0, 1, [], {}))(
      "rechaza activa de tipo incorrecto %j",
      (activa) =>
        esperarErrorEntrada(() => validar({ ...datos(), activa }), "activa"),
    );
    it.each([
      "_id",
      "createdAt",
      "updatedAt",
      "alcanzado",
      "cumplidaSemana",
      "otro",
    ])("rechaza campo no autorizado %s", (campo) =>
      esperarErrorEntrada(() => validar({ ...datos(), [campo]: true }), campo),
    );
    it("rechaza campos calculados dentro de hitos", () => {
      esperarErrorEntrada(
        () => validar({ ...datos(), hitos: [{ ...hito(), alcanzado: true }] }),
        "hitos.0.alcanzado",
      );
    });
    it.each([0.01, 0.5, 100])("acepta horas %s", (horasSemanales) => {
      expect(validar({ ...datos(), horasSemanales }).horasSemanales).toBe(
        horasSemanales,
      );
    });
    it.each([1, 7])("acepta días %s", (diasPorSemana) => {
      expect(validar({ ...datos(), diasPorSemana }).diasPorSemana).toBe(
        diasPorSemana,
      );
    });
    it.each([1, 50.5, 100])(
      "acepta objetivo %s y descripción vacía",
      (porcentajeObjetivo) => {
        const hitos = [{ descripcion: "", porcentajeObjetivo }];
        expect(validar({ ...datos(), hitos }).hitos).toEqual(hitos);
      },
    );
    it.each([0, 5])(
      "acepta %s hitos sin exigir objetivos únicos",
      (cantidad) => {
        const hitos = Array.from({ length: cantidad }, () => hito());
        expect(validar({ ...datos(), hitos }).hitos).toEqual(hitos);
      },
    );
    it.each([true, false])("conserva activa explícita %s", (activa) => {
      expect(validar({ ...datos(), activa }).activa).toBe(activa);
    });
    it("devuelve copias independientes sin mutar el objeto ni sus hitos", () => {
      const entrada = datos();
      const copia = structuredClone(entrada);
      const resultado = validar(entrada);
      expect(entrada).toEqual(copia);
      expect(resultado).not.toBe(entrada);
      expect(resultado.hitos).not.toBe(entrada.hitos);
      expect(resultado.hitos[0]).not.toBe(entrada.hitos[0]);
      entrada.hitos[0].descripcion = "Cambio externo";
      expect(resultado.hitos[0].descripcion).toBe(copia.hitos[0].descripcion);
    });
  },
);

describe("T-05 parcial / CA-E2-01, CA-E2-03 a CA-E2-06: diferencias entre crear y editar", () => {
  it.each(
    casosDeValores(
      undefined,
      null,
      4,
      true,
      [],
      {},
      "no-es-objectid",
      "g".repeat(24),
    ),
  )("crear exige referencia hexadecimal de 24 caracteres: %j", (valor) => {
    esperarErrorEntrada(
      () => validarCreacionMeta({ ...datosCreacion(), videojuego: valor }),
      "videojuego",
    );
  });
  it("crear conserva la referencia y asigna activa por defecto", () => {
    expect(validarCreacionMeta(datosCreacion())).toEqual({
      ...datosCreacion(),
      activa: true,
    });
  });
  it("crear permite omitir hitos y devuelve un arreglo vacío", () => {
    const { hitos: _hitos, ...entrada } = datosCreacion();
    expect(validarCreacionMeta(entrada).hitos).toEqual([]);
    expect(entrada).not.toHaveProperty("hitos");
  });
  it("crear rechaza hitos explícitamente undefined", () => {
    esperarErrorEntrada(
      () => validarCreacionMeta({ ...datosCreacion(), hitos: undefined }),
      "hitos",
    );
  });
  it("editar exige hitos para la sustitución completa", () => {
    const { hitos: _hitos, ...entrada } = datosActualizacion();
    esperarErrorEntrada(() => validarActualizacionMeta(entrada), "hitos");
  });
  it("editar no añade activa cuando se omite, para preservar su estado", () => {
    expect(validarActualizacionMeta(datosActualizacion())).not.toHaveProperty(
      "activa",
    );
  });
  it("editar no permite sustituir la referencia del videojuego", () => {
    esperarErrorEntrada(
      () => validarActualizacionMeta({ ...datosActualizacion(), videojuego }),
      "videojuego",
    );
  });
  it("una edición inválida no muta la entrada ni los datos anteriores preparados", () => {
    const anterior = Object.freeze({
      ...datosActualizacion(),
      activa: false,
      hitos: Object.freeze([Object.freeze(hito())]),
    });
    const copiaAnterior = structuredClone(anterior);
    const entrada = { ...anterior, horasSemanales: 0 };
    const copiaEntrada = structuredClone(entrada);
    esperarErrorEntrada(
      () => validarActualizacionMeta(entrada),
      "horasSemanales",
    );
    expect(anterior).toEqual(copiaAnterior);
    expect(entrada).toEqual(copiaEntrada);
    // No sustituye el test HTTP/transaccional de ausencia de cambios parciales.
  });
});
