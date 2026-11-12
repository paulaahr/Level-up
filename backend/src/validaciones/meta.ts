export interface HitoEntradaMeta {
  descripcion: string;
  porcentajeObjetivo: number;
}

export interface DatosActualizacionMeta {
  horasSemanales: number;
  diasPorSemana: number;
  hitos: HitoEntradaMeta[];
  activa?: boolean;
}

export interface DatosCreacionMeta extends DatosActualizacionMeta {
  videojuego: string;
  activa: boolean;
}

export class ErrorValidacionMeta extends Error {
  constructor(
    public readonly campo: string,
    detalle: string,
  ) {
    super(`${campo}: ${detalle}`);
    this.name = "ErrorValidacionMeta";
  }
}

function registro(valor: unknown, campo: string): Record<string, unknown> {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new ErrorValidacionMeta(campo, "debe ser un objeto");
  }
  return valor as Record<string, unknown>;
}

function camposPermitidos(
  datos: Record<string, unknown>,
  permitidos: readonly string[],
  prefijo: string = "",
): void {
  for (const campo of Object.keys(datos)) {
    if (!permitidos.includes(campo)) {
      throw new ErrorValidacionMeta(`${prefijo}${campo}`, "campo no permitido");
    }
  }
}

function tiene(datos: Record<string, unknown>, campo: string): boolean {
  return Object.prototype.hasOwnProperty.call(datos, campo);
}

function numeroFinito(valor: unknown, campo: string): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new ErrorValidacionMeta(
      campo,
      "debe ser un número finito obligatorio",
    );
  }
  return valor;
}

function validarHitos(valor: unknown): HitoEntradaMeta[] {
  if (!Array.isArray(valor) || valor.length > 5) {
    throw new ErrorValidacionMeta(
      "hitos",
      "debe ser un arreglo de hasta cinco hitos",
    );
  }

  return Array.from(valor).map(
    (entrada: unknown, indice: number): HitoEntradaMeta => {
      const prefijo = `hitos.${indice}.`;
      const hito = registro(entrada, `hitos.${indice}`);
      camposPermitidos(hito, ["descripcion", "porcentajeObjetivo"], prefijo);
      if (typeof hito.descripcion !== "string") {
        throw new ErrorValidacionMeta(
          `${prefijo}descripcion`,
          "debe ser un texto obligatorio",
        );
      }
      const porcentaje = numeroFinito(
        hito.porcentajeObjetivo,
        `${prefijo}porcentajeObjetivo`,
      );
      if (porcentaje < 1 || porcentaje > 100) {
        throw new ErrorValidacionMeta(
          `${prefijo}porcentajeObjetivo`,
          "debe estar entre 1 y 100",
        );
      }
      return { descripcion: hito.descripcion, porcentajeObjetivo: porcentaje };
    },
  );
}

function validarObjetivos(
  datos: Record<string, unknown>,
  creacion: boolean,
): DatosActualizacionMeta {
  const horas = numeroFinito(datos.horasSemanales, "horasSemanales");
  if (horas <= 0 || horas > 100) {
    throw new ErrorValidacionMeta(
      "horasSemanales",
      "deben ser mayores que 0 y hasta 100",
    );
  }
  const dias = numeroFinito(datos.diasPorSemana, "diasPorSemana");
  if (!Number.isInteger(dias) || dias < 1 || dias > 7) {
    throw new ErrorValidacionMeta(
      "diasPorSemana",
      "deben ser enteros entre 1 y 7",
    );
  }
  const hitos = validarHitos(
    creacion && !tiene(datos, "hitos") ? [] : datos.hitos,
  );
  const resultado: DatosActualizacionMeta = {
    horasSemanales: horas,
    diasPorSemana: dias,
    hitos,
  };
  if (tiene(datos, "activa")) {
    if (typeof datos.activa !== "boolean") {
      throw new ErrorValidacionMeta("activa", "debe ser booleano");
    }
    resultado.activa = datos.activa;
  }
  return resultado;
}

/** Valida y copia un DTO de creación, sin consultar existencia ni estado del juego. */
export function validarCreacionMeta(entrada: unknown): DatosCreacionMeta {
  const datos = registro(entrada, "meta");
  camposPermitidos(datos, [
    "videojuego",
    "horasSemanales",
    "diasPorSemana",
    "activa",
    "hitos",
  ]);
  if (
    typeof datos.videojuego !== "string" ||
    !/^[a-f\d]{24}$/i.test(datos.videojuego)
  ) {
    throw new ErrorValidacionMeta(
      "videojuego",
      "debe ser un ID hexadecimal de 24 caracteres",
    );
  }
  const objetivos = validarObjetivos(datos, true);
  return {
    ...objetivos,
    videojuego: datos.videojuego,
    activa: objetivos.activa ?? true,
  };
}

/** Valida una sustitución completa; omitir activa preserva el estado anterior. */
export function validarActualizacionMeta(
  entrada: unknown,
): DatosActualizacionMeta {
  const datos = registro(entrada, "meta");
  camposPermitidos(datos, [
    "horasSemanales",
    "diasPorSemana",
    "activa",
    "hitos",
  ]);
  return validarObjetivos(datos, false);
}
