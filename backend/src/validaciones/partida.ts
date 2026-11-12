import { ApiError } from "../apiError";

export interface DatosPartida {
  fecha: Date;
  duracionMinutos: number;
  porcentajeAvance: number;
  notas: string;
}
export interface DatosCreacionPartida extends DatosPartida {
  videojuego: string;
}
function invalido(campo: string, detalle: string): never {
  throw new ApiError(400, `${campo}: ${detalle}`);
}
function registro(entrada: unknown): Record<string, unknown> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada))
    invalido("partida", "debe ser un objeto");
  return entrada as Record<string, unknown>;
}
function fechaInicio(valor: unknown, ahora: number): Date {
  if (typeof valor !== "string")
    invalido("fecha", "debe incluir fecha, hora y zona explícita");
  const partes =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(
      valor,
    );
  if (!partes) invalido("fecha", "debe ser ISO 8601 con offset o Z");
  const [
    ,
    anioTexto,
    mesTexto,
    diaTexto,
    horaTexto,
    minutoTexto,
    segundoTexto,
    ,
    zona,
  ] = partes;
  const anio = Number(anioTexto),
    mes = Number(mesTexto),
    dia = Number(diaTexto);
  const dias = [
    31,
    anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > dias[mes - 1] ||
    Number(horaTexto) > 23 ||
    Number(minutoTexto) > 59 ||
    Number(segundoTexto ?? 0) > 59 ||
    (zona !== "Z" &&
      (Number(zona.slice(1, 3)) > 23 || Number(zona.slice(4)) > 59))
  )
    invalido("fecha", "no es una fecha válida");
  const instante = Date.parse(valor);
  if (!Number.isFinite(instante)) invalido("fecha", "no es una fecha válida");
  if (instante > ahora) invalido("fecha", "no se permiten fechas futuras");
  return new Date(instante);
}
function validar(
  entrada: unknown,
  ahora: number,
  creacion: boolean,
): DatosPartida & { videojuego?: string } {
  const datos = registro(entrada);
  const campos = [
    "fecha",
    "duracionMinutos",
    "porcentajeAvance",
    "notas",
    ...(creacion ? ["videojuego"] : []),
  ];
  for (const campo of Object.keys(datos))
    if (!campos.includes(campo)) invalido(campo, "campo no permitido");
  const fecha = fechaInicio(datos.fecha, ahora);
  const duracion = datos.duracionMinutos;
  if (
    typeof duracion !== "number" ||
    !Number.isInteger(duracion) ||
    duracion < 1 ||
    duracion > 1440
  )
    invalido("duracionMinutos", "debe ser un entero entre 1 y 1440");
  const avance = datos.porcentajeAvance;
  if (
    typeof avance !== "number" ||
    !Number.isFinite(avance) ||
    avance < 0 ||
    avance > 100
  )
    invalido("porcentajeAvance", "debe ser un número entre 0 y 100");
  const notas =
    creacion && !Object.prototype.hasOwnProperty.call(datos, "notas")
      ? ""
      : datos.notas;
  if (typeof notas !== "string" || notas.trim().length > 500)
    invalido("notas", "debe ser texto de hasta 500 caracteres");
  const resultado: DatosPartida & { videojuego?: string } = {
    fecha,
    duracionMinutos: duracion,
    porcentajeAvance: avance,
    notas: notas.trim(),
  };
  if (creacion) {
    if (
      typeof datos.videojuego !== "string" ||
      !/^[a-f\d]{24}$/i.test(datos.videojuego)
    )
      invalido("videojuego", "debe ser un ID válido");
    resultado.videojuego = datos.videojuego;
  }
  return resultado;
}
export function validarCreacionPartida(
  entrada: unknown,
  ahora: number,
): DatosCreacionPartida {
  return validar(entrada, ahora, true) as DatosCreacionPartida;
}
export function validarActualizacionPartida(
  entrada: unknown,
  ahora: number,
): DatosPartida {
  return validar(entrada, ahora, false);
}
