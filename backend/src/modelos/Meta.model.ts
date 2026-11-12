import { Error as MongooseError, Schema, Types, model } from "mongoose";

export interface IHitoMeta {
  descripcion: string;
  porcentajeObjetivo: number;
}

export interface IMeta {
  videojuego: Types.ObjectId;
  horasSemanales: number;
  diasPorSemana: number;
  activa: boolean;
  hitos: IHitoMeta[];
  createdAt: Date;
  updatedAt: Date;
}

const HitoSchema = new Schema<IHitoMeta>(
  {
    descripcion: {
      type: String,
      cast: false,
      // La descripción debe existir, pero el contrato permite el string vacío.
      required: [
        function (this: IHitoMeta): boolean {
          return this.descripcion !== "";
        },
        "La descripción del hito es obligatoria",
      ],
    },
    porcentajeObjetivo: {
      type: Number,
      cast: false,
      required: [true, "El porcentaje objetivo es obligatorio"],
      min: [1, "El porcentaje objetivo mínimo es 1"],
      max: [100, "El porcentaje objetivo máximo es 100"],
      validate: {
        validator: Number.isFinite,
        message: "El porcentaje objetivo debe ser un número finito",
      },
    },
  },
  { _id: false, versionKey: false, strict: "throw" },
);

function referenciaVideojuego(valor: unknown): Types.ObjectId {
  if (valor instanceof Types.ObjectId) return valor;
  if (typeof valor === "string" && /^[a-f\d]{24}$/i.test(valor)) {
    return new Types.ObjectId(valor);
  }
  throw new MongooseError.CastError("ObjectId", valor, "videojuego");
}

function arregloDeHitos(valor: unknown): unknown {
  if (valor === undefined) return valor;
  if (
    !Array.isArray(valor) ||
    Array.from(valor).some(
      (hito) =>
        hito === null || typeof hito !== "object" || Array.isArray(hito),
    )
  ) {
    throw new MongooseError.CastError("Array", valor, "hitos");
  }
  return valor;
}

const MetaSchema = new Schema<IMeta>(
  {
    videojuego: {
      type: Schema.Types.ObjectId,
      ref: "Videojuego",
      required: [true, "Selecciona un videojuego"],
      immutable: true,
      cast: referenciaVideojuego,
    },
    horasSemanales: {
      type: Number,
      cast: false,
      required: [true, "Las horas semanales son obligatorias"],
      validate: {
        validator: (valor: number): boolean =>
          Number.isFinite(valor) && valor > 0 && valor <= 100,
        message: "Las horas semanales deben ser mayores que 0 y hasta 100",
      },
    },
    diasPorSemana: {
      type: Number,
      cast: false,
      required: [true, "Los días por semana son obligatorios"],
      min: [1, "El mínimo es un día por semana"],
      max: [7, "El máximo es siete días por semana"],
      validate: {
        validator: Number.isInteger,
        message: "Los días por semana deben ser enteros",
      },
    },
    activa: {
      type: Boolean,
      cast: false,
      default: true,
      required: [true, "El estado activo debe ser booleano"],
    },
    hitos: {
      type: [HitoSchema],
      default: () => [],
      required: [true, "Los hitos deben ser un arreglo"],
      // Evita que Mongoose envuelva objetos o ignore elementos primitivos.
      set: arregloDeHitos,
      validate: {
        validator: (valor: unknown): boolean =>
          Array.isArray(valor) &&
          valor.length <= 5 &&
          Array.from(valor).every(
            (hito) =>
              hito !== null && typeof hito === "object" && !Array.isArray(hito),
          ),
        message:
          "Los hitos deben ser un arreglo de hasta cinco objetos válidos",
      },
    },
  },
  { collection: "metas", timestamps: true, strict: "throw" },
);

// Solo las activas participan: las metas anteriores inactivas se conservan.
// Declararlo no acredita su creación ni la exclusión concurrente en MongoDB.
MetaSchema.index(
  { videojuego: 1 },
  {
    name: "meta_activa_por_videojuego",
    unique: true,
    partialFilterExpression: { activa: true },
  },
);

export const Meta = model<IMeta>("Meta", MetaSchema);
