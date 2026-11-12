import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  actualizarMeta,
  crearMeta,
  desactivarMeta,
  obtenerMeta,
} from "../api/metasApi";
import { obtenerVideojuego } from "../api/videojuegosApi";
import { Encabezado, ErrorVista, Loading } from "../componentes/UI";
import type { DatosMeta, Meta, Videojuego } from "../tipos";
import "./Detalle.css";
import "./FormularioMeta.css";

type HitoEditable = {
  clave: number;
  descripcion: string;
  porcentajeObjetivo: string;
};
type Campos = { horas: string; dias: string; hitos: HitoEditable[] };
type Carga = {
  clave: string;
  cargando: boolean;
  error: string;
  juego: Videojuego | null;
  meta: Meta | null;
};

const camposVacios = (): Campos => ({ horas: "", dias: "", hitos: [] });
const mensajeError = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación.";

export function FormularioMeta() {
  const { id, metaId } = useParams();
  const navegar = useNavigate();
  const [revision, setRevision] = useState(0);
  const clave = `${id ?? ""}/${metaId ?? "nueva"}/${revision}`;
  const claveActual = useRef(clave);
  claveActual.current = clave;
  const [carga, setCarga] = useState<Carga>({
    clave: "",
    cargando: true,
    error: "",
    juego: null,
    meta: null,
  });
  const [campos, setCampos] = useState<Campos>(camposVacios);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorAccion, setErrorAccion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [accion, setAccion] = useState<"guardar" | "desactivar">("guardar");
  const pendiente = useRef(false);
  const siguienteHito = useRef(0);
  const formulario = useRef<HTMLFormElement>(null);
  const botonDesactivar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let vigente = true;
    claveActual.current = clave;
    pendiente.current = false;
    setGuardando(false);
    setErrorAccion("");
    setErrores({});
    setCampos(camposVacios());
    setCarga({ clave, cargando: true, error: "", juego: null, meta: null });
    async function cargar() {
      try {
        if (!id) throw new Error("No se ha indicado un videojuego.");
        const [juego, meta] = await Promise.all([
          obtenerVideojuego(id),
          metaId ? obtenerMeta(metaId) : Promise.resolve(null),
        ]);
        if (!vigente) return;
        if (meta && meta.videojuego !== id)
          throw new Error("La meta no pertenece a este videojuego.");
        siguienteHito.current = meta?.hitos.length ?? 0;
        setCampos(
          meta
            ? {
                horas: String(meta.horasSemanales),
                dias: String(meta.diasPorSemana),
                hitos: meta.hitos.map((hito, indice) => ({
                  clave: indice,
                  descripcion: hito.descripcion,
                  porcentajeObjetivo: String(hito.porcentajeObjetivo),
                })),
              }
            : camposVacios(),
        );
        setCarga({ clave, cargando: false, error: "", juego, meta });
      } catch (error) {
        if (vigente)
          setCarga({
            clave,
            cargando: false,
            error: mensajeError(error),
            juego: null,
            meta: null,
          });
      }
    }
    void cargar();
    return () => {
      vigente = false;
      if (claveActual.current === clave) claveActual.current = "";
    };
  }, [id, metaId, clave]);

  function validar(): DatosMeta | null {
    const nuevos: Record<string, string> = {};
    const horas = Number(campos.horas);
    const dias = Number(campos.dias);
    if (
      !campos.horas.trim() ||
      !Number.isFinite(horas) ||
      horas <= 0 ||
      horas > 100
    )
      nuevos["meta-horas"] = "Introduce horas mayores que 0 y hasta 100.";
    if (!campos.dias.trim() || !Number.isInteger(dias) || dias < 1 || dias > 7)
      nuevos["meta-dias"] = "Introduce un número entero entre 1 y 7.";
    campos.hitos.forEach((hito) => {
      const porcentaje = Number(hito.porcentajeObjetivo);
      if (
        !hito.porcentajeObjetivo.trim() ||
        !Number.isFinite(porcentaje) ||
        porcentaje < 1 ||
        porcentaje > 100
      )
        nuevos[`meta-hito-${hito.clave}-objetivo`] =
          "Introduce un porcentaje entre 1 y 100.";
    });
    setErrores(nuevos);
    const primero = Object.keys(nuevos)[0];
    if (primero) {
      setErrorAccion("Revisa los campos indicados antes de guardar.");
      formulario.current
        ?.querySelector<HTMLInputElement>(`#${primero}`)
        ?.focus();
      return null;
    }
    return {
      horasSemanales: horas,
      diasPorSemana: dias,
      hitos: campos.hitos.map((hito) => ({
        descripcion: hito.descripcion,
        porcentajeObjetivo: Number(hito.porcentajeObjetivo),
      })),
    };
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (pendiente.current || !id || !carga.juego || carga.clave !== clave)
      return;
    if (
      carga.juego.estado === "Completado" &&
      (!carga.meta || carga.meta.activa)
    )
      return;
    setErrorAccion("");
    const datos = validar();
    if (!datos) return;
    pendiente.current = true;
    setGuardando(true);
    setAccion("guardar");
    const claveSolicitud = clave;
    try {
      if (metaId && carga.meta)
        await actualizarMeta(metaId, { ...datos, activa: carga.meta.activa });
      else await crearMeta({ videojuego: id, ...datos });
      if (claveActual.current === claveSolicitud)
        navegar(`/videojuegos/${id}`, { state: { revision: Date.now() } });
    } catch (error) {
      if (claveActual.current === claveSolicitud)
        setErrorAccion(mensajeError(error));
    } finally {
      if (claveActual.current === claveSolicitud) {
        pendiente.current = false;
        setGuardando(false);
      }
    }
  }

  async function desactivar() {
    if (
      pendiente.current ||
      !metaId ||
      !id ||
      !carga.meta?.activa ||
      carga.clave !== clave
    )
      return;
    if (!window.confirm("¿Desactivar esta meta? Se conservará como inactiva")) {
      botonDesactivar.current?.focus();
      return;
    }
    pendiente.current = true;
    setGuardando(true);
    setAccion("desactivar");
    setErrorAccion("");
    const claveSolicitud = clave;
    try {
      await desactivarMeta(metaId);
      if (claveActual.current === claveSolicitud)
        navegar(`/videojuegos/${id}`, { state: { revision: Date.now() } });
    } catch (error) {
      if (claveActual.current === claveSolicitud)
        setErrorAccion(mensajeError(error));
    } finally {
      if (claveActual.current === claveSolicitud) {
        pendiente.current = false;
        setGuardando(false);
      }
    }
  }

  function cambiarHito(
    claveHito: number,
    campo: "descripcion" | "porcentajeObjetivo",
    valor: string,
  ) {
    setCampos((anteriores) => ({
      ...anteriores,
      hitos: anteriores.hitos.map((hito) =>
        hito.clave === claveHito ? { ...hito, [campo]: valor } : hito,
      ),
    }));
  }

  function atributoError(campo: string) {
    return {
      "aria-invalid": Boolean(errores[campo]),
      "aria-describedby": errores[campo] ? `${campo}-error` : undefined,
    };
  }

  const completado = carga.juego?.estado === "Completado";
  const bloquearActiva = completado && (!carga.meta || carga.meta.activa);
  const avisoCompletado =
    "Este videojuego no puede tener una meta activa hasta dejar el estado Completado.";

  return (
    <div className="detalle-page formulario-meta-page">
      <div className="detalle-topline">
        <Link className="detalle-back" to={`/videojuegos/${id ?? ""}`}>
          ← VOLVER AL VIDEOJUEGO
        </Link>
        <span>LEVEL UP / METAS</span>
      </div>
      <header className="meta-hero">
        <Encabezado
          eyebrow="TU PRÓXIMO NIVEL"
          titulo={metaId ? "Editar tu meta." : "Una nueva meta."}
          descripcion="Organiza tus horas, tus días y tus próximos hitos."
        />
      </header>
      <div className="meta-body">
        {carga.clave !== clave || carga.cargando ? (
          <div role="status">
            <Loading />
          </div>
        ) : carga.error ? (
          <div role="alert">
            <ErrorVista
              mensaje={carga.error}
              reintentar={() => setRevision((valor) => valor + 1)}
            />
          </div>
        ) : (
          <>
            <p className="meta-juego">
              <span>VIDEOJUEGO</span>
              <strong>{carga.juego?.nombre}</strong>
            </p>
            {bloquearActiva && <p className="meta-aviso">{avisoCompletado}</p>}
            {(!bloquearActiva || metaId) && (
              <form
                ref={formulario}
                className="meta-form"
                onSubmit={enviar}
                noValidate
                aria-label={metaId ? "Editar meta" : "Crear meta"}
              >
                {errorAccion && (
                  <div role="alert">
                    <ErrorVista mensaje={errorAccion} />
                  </div>
                )}
                {guardando && (
                  <p role="status">
                    {accion === "desactivar"
                      ? "Desactivando meta..."
                      : "Guardando meta..."}
                  </p>
                )}
                {carga.meta && (
                  <p className="meta-estado">
                    Estado:{" "}
                    <strong>{carga.meta.activa ? "Activa" : "Inactiva"}</strong>
                    {!carga.meta.activa &&
                      " · Editar conservará la meta inactiva."}
                  </p>
                )}
                <fieldset disabled={guardando}>
                  <legend>
                    <span>01 — OBJETIVOS DE LA SEMANA</span>Tu ritmo de juego
                  </legend>
                  <div className="meta-form-grid">
                    <div className="meta-campo">
                      <label htmlFor="meta-horas">Horas semanales</label>
                      <input
                        id="meta-horas"
                        type="number"
                        step="any"
                        max="100"
                        required
                        value={campos.horas}
                        onChange={(evento) =>
                          setCampos({ ...campos, horas: evento.target.value })
                        }
                        {...atributoError("meta-horas")}
                      />
                      {errores["meta-horas"] && (
                        <p id="meta-horas-error" className="meta-error-campo">
                          {errores["meta-horas"]}
                        </p>
                      )}
                    </div>
                    <div className="meta-campo">
                      <label htmlFor="meta-dias">Días por semana</label>
                      <input
                        id="meta-dias"
                        type="number"
                        min="1"
                        max="7"
                        step="1"
                        required
                        value={campos.dias}
                        onChange={(evento) =>
                          setCampos({ ...campos, dias: evento.target.value })
                        }
                        {...atributoError("meta-dias")}
                      />
                      {errores["meta-dias"] && (
                        <p id="meta-dias-error" className="meta-error-campo">
                          {errores["meta-dias"]}
                        </p>
                      )}
                    </div>
                  </div>
                </fieldset>
                <fieldset disabled={guardando}>
                  <legend>
                    <span>02 — PASO A PASO</span>Hitos de avance
                  </legend>
                  <p id="meta-limite-hitos">
                    Puedes definir hasta cinco hitos por meta.
                  </p>
                  <div className="meta-hitos">
                    {campos.hitos.map((hito, indice) => (
                      <div className="meta-hito" key={hito.clave}>
                        <span className="meta-hito-numero" aria-hidden="true">
                          {String(indice + 1).padStart(2, "0")}
                        </span>
                        <div className="meta-campo">
                          <label
                            htmlFor={`meta-hito-${hito.clave}-descripcion`}
                          >
                            Descripción del hito {indice + 1}
                          </label>
                          <input
                            id={`meta-hito-${hito.clave}-descripcion`}
                            type="text"
                            value={hito.descripcion}
                            onChange={(evento) =>
                              cambiarHito(
                                hito.clave,
                                "descripcion",
                                evento.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="meta-campo">
                          <label htmlFor={`meta-hito-${hito.clave}-objetivo`}>
                            Objetivo del hito {indice + 1} (%)
                          </label>
                          <input
                            id={`meta-hito-${hito.clave}-objetivo`}
                            type="number"
                            min="1"
                            max="100"
                            step="any"
                            required
                            value={hito.porcentajeObjetivo}
                            onChange={(evento) =>
                              cambiarHito(
                                hito.clave,
                                "porcentajeObjetivo",
                                evento.target.value,
                              )
                            }
                            {...atributoError(
                              `meta-hito-${hito.clave}-objetivo`,
                            )}
                          />
                          {errores[`meta-hito-${hito.clave}-objetivo`] && (
                            <p
                              id={`meta-hito-${hito.clave}-objetivo-error`}
                              className="meta-error-campo"
                            >
                              {errores[`meta-hito-${hito.clave}-objetivo`]}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="meta-link-button"
                          aria-label={`Eliminar hito ${indice + 1}`}
                          onClick={() =>
                            setCampos((anteriores) => ({
                              ...anteriores,
                              hitos: anteriores.hitos.filter(
                                (actual) => actual.clave !== hito.clave,
                              ),
                            }))
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="meta-secondary"
                    disabled={campos.hitos.length >= 5}
                    aria-describedby="meta-limite-hitos"
                    onClick={() => {
                      const nuevaClave = siguienteHito.current++;
                      setCampos((anteriores) =>
                        anteriores.hitos.length < 5
                          ? {
                              ...anteriores,
                              hitos: [
                                ...anteriores.hitos,
                                {
                                  clave: nuevaClave,
                                  descripcion: "",
                                  porcentajeObjetivo: "",
                                },
                              ],
                            }
                          : anteriores,
                      );
                    }}
                  >
                    Añadir hito
                  </button>
                </fieldset>
                <div className="meta-actions">
                  <Link to={`/videojuegos/${id}`}>Cancelar</Link>
                  <button
                    className="meta-submit"
                    type="submit"
                    disabled={guardando || bloquearActiva}
                  >
                    {guardando && accion === "guardar"
                      ? "Guardando..."
                      : metaId
                        ? "Guardar cambios"
                        : "Crear meta"}
                  </button>
                </div>
                {carga.meta?.activa && (
                  <div className="meta-desactivar">
                    <p>
                      Desactivar conserva los objetivos y sus hitos en tu
                      historial.
                    </p>
                    <button
                      ref={botonDesactivar}
                      className="meta-secondary"
                      type="button"
                      disabled={guardando}
                      onClick={() => void desactivar()}
                    >
                      {guardando && accion === "desactivar"
                        ? "Desactivando..."
                        : "Desactivar meta"}
                    </button>
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
