import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  actualizarPartida,
  crearPartida,
  obtenerPartida,
} from "../api/partidasApi";
import { obtenerProgresoSemanal } from "../api/metasApi";
import { listarVideojuegos } from "../api/videojuegosApi";
import { Videojuego } from "../tipos";
import { ErrorVista, Loading, Vacio } from "../componentes/UI";
import {
  convertirFechaEcuador,
  formatearFechaEcuador,
} from "../utilidades/fechasEcuador";
import "./FormularioPartida.css";

type Campos = {
  videojuego: string;
  fecha: string;
  duracionMinutos: string;
  porcentajeAvance: string;
  notas: string;
};
type Errores = Partial<Record<keyof Campos, string>>;
const iniciales = (videojuego = ""): Campos => ({
  videojuego,
  fecha: formatearFechaEcuador(Date.now()),
  duracionMinutos: "60",
  porcentajeAvance: "0",
  notas: "",
});
const mensaje = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la solicitud.";

export function FormularioPartida() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const juegoSolicitado = params.get("videojuego") || "";
  const contexto = `${id || "nueva"}:${juegoSolicitado}`;
  const navegar = useNavigate();
  const [juegos, setJuegos] = useState<Videojuego[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargado, setCargado] = useState("");
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [guardadaPara, setGuardadaPara] = useState("");
  const [falloRefresco, setFalloRefresco] = useState(false);
  const [intento, setIntento] = useState(0);
  const [datos, setDatos] = useState<Campos>(() => iniciales(juegoSolicitado));
  const original = useRef<{ civil: string; iso: string }>();
  const formularioRef = useRef<HTMLFormElement>(null);
  const ocupado = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    const actual = ++revision.current;
    setLoading(true);
    setErrorCarga("");
    setError("");
    setErrores({});
    setGuardando(false);
    setGuardadaPara("");
    setFalloRefresco(false);
    setDatos(iniciales(juegoSolicitado));
    setJuegos([]);
    original.current = undefined;
    ocupado.current = false;
    async function cargar() {
      try {
        const [lista, partida] = await Promise.all([
          listarVideojuegos(),
          id ? obtenerPartida(id) : Promise.resolve(null),
        ]);
        if (revision.current !== actual) return;
        setJuegos(lista);
        if (partida) {
          const civil = formatearFechaEcuador(partida.fecha);
          original.current = { civil, iso: partida.fecha };
          setDatos({
            videojuego: partida.videojuego,
            fecha: civil,
            duracionMinutos: String(partida.duracionMinutos),
            porcentajeAvance: String(partida.porcentajeAvance),
            notas: partida.notas || "",
          });
        } else
          setDatos((anteriores) => ({
            ...anteriores,
            videojuego: juegoSolicitado || lista[0]?._id || "",
          }));
      } catch (fallo) {
        if (revision.current === actual) setErrorCarga(mensaje(fallo));
      } finally {
        if (revision.current === actual) {
          setLoading(false);
          setCargado(contexto);
        }
      }
    }
    void cargar();
    return () => {
      if (revision.current === actual) revision.current += 1;
    };
  }, [id, juegoSolicitado, contexto, intento]);

  function cambiar(campo: keyof Campos, valor: string) {
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  }
  async function refrescar(videojuego: string, actual: number) {
    try {
      await obtenerProgresoSemanal(videojuego);
      if (revision.current === actual)
        navegar("/videojuegos/" + videojuego, {
          state: { revision: Date.now() },
        });
    } catch {
      if (revision.current === actual) setFalloRefresco(true);
    }
  }
  async function reintentarRefresco() {
    if (ocupado.current || !guardadaPara) return;
    ocupado.current = true;
    setGuardando(true);
    const actual = revision.current;
    try {
      await refrescar(guardadaPara, actual);
    } finally {
      if (revision.current === actual) {
        ocupado.current = false;
        setGuardando(false);
      }
    }
  }
  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (ocupado.current || guardadaPara || errorCarga || loading) return;
    const nuevos: Errores = {};
    let fecha = "";
    if (
      !datos.videojuego ||
      (!id && !juegos.some((juego) => juego._id === datos.videojuego))
    )
      nuevos.videojuego = "Selecciona un videojuego disponible.";
    try {
      fecha =
        original.current?.civil === datos.fecha
          ? original.current.iso
          : convertirFechaEcuador(datos.fecha);
      if (Date.parse(fecha) > Date.now())
        nuevos.fecha = "La fecha de inicio no puede ser futura.";
    } catch {
      nuevos.fecha = "Introduce una fecha de inicio válida en hora de Ecuador.";
    }
    const duracion = Number(datos.duracionMinutos);
    if (
      !datos.duracionMinutos.trim() ||
      !Number.isInteger(duracion) ||
      duracion < 1 ||
      duracion > 1440
    )
      nuevos.duracionMinutos =
        "La duración debe ser un entero entre 1 y 1440 minutos.";
    const avance = Number(datos.porcentajeAvance);
    if (
      !datos.porcentajeAvance.trim() ||
      !Number.isFinite(avance) ||
      avance < 0 ||
      avance > 100
    )
      nuevos.porcentajeAvance = "El avance debe estar entre 0 y 100.";
    if (datos.notas.length > 500)
      nuevos.notas = "Las notas admiten hasta 500 caracteres.";
    setErrores(nuevos);
    setError("");
    const primerCampo = (Object.keys(nuevos) as (keyof Campos)[])[0];
    if (primerCampo) {
      formularioRef.current
        ?.querySelector<HTMLElement>(`[name="${primerCampo}"]`)
        ?.focus();
      return;
    }
    ocupado.current = true;
    setGuardando(true);
    const actual = revision.current;
    try {
      const entrada = {
        fecha,
        duracionMinutos: duracion,
        porcentajeAvance: avance,
        notas: datos.notas,
      };
      if (id) await actualizarPartida(id, entrada);
      else await crearPartida({ videojuego: datos.videojuego, ...entrada });
      if (revision.current === actual) setGuardadaPara(datos.videojuego);
      await refrescar(datos.videojuego, actual);
    } catch (fallo) {
      if (revision.current === actual) setError(mensaje(fallo));
    } finally {
      if (revision.current === actual) {
        ocupado.current = false;
        setGuardando(false);
      }
    }
  }

  const bloqueado = guardando || !!guardadaPara;
  const atributos = (campo: keyof Campos) => ({
    name: campo,
    "aria-invalid": errores[campo] ? (true as const) : undefined,
    "aria-describedby": errores[campo] ? `partida-error-${campo}` : undefined,
  });
  const errorCampo = (campo: keyof Campos) =>
    errores[campo] && (
      <span className="partida-field-error" id={`partida-error-${campo}`}>
        {errores[campo]}
      </span>
    );
  if (loading || cargado !== contexto)
    return (
      <div role="status">
        <Loading />
      </div>
    );
  return (
    <div className="formulario-partida-page">
      <header className="partida-hero">
        <div className="partida-hero-copy">
          <span className="partida-kicker">LEVEL UP / SESSION 02</span>
          <h1>
            {id ? "Editar" : "Registrar"}
            <br />
            <em>una partida.</em>
          </h1>
          <span className="partida-hero-serial">SAVE YOUR PROGRESS — 001</span>
        </div>
        <div className="partida-hero-art" aria-hidden="true">
          <div className="partida-art-disc" />
          <svg className="partida-star" viewBox="0 0 200 200" fill="none">
            <g stroke="currentColor" strokeWidth="10" strokeLinecap="square">
              <path d="M100 13 V187" />
              <path d="M13 100 H187" />
              <path d="M38 38 L162 162" />
              <path d="M162 38 L38 162" />
            </g>
          </svg>
          <span className="partida-art-label">✳ SESSION LOG</span>
        </div>
      </header>
      <main className="partida-body">
        <div className="partida-toolbar">
          <span>02 / {id ? "EDITAR SESIÓN" : "NUEVA SESIÓN"}</span>
          <span>YOUR PROGRESS MATTERS ↗</span>
        </div>
        {errorCarga ? (
          <div role="alert">
            <ErrorVista
              mensaje={errorCarga}
              reintentar={() => setIntento((valor) => valor + 1)}
            />
          </div>
        ) : (
          <>
            {error && (
              <div role="alert">
                <ErrorVista mensaje={error} />
              </div>
            )}
            {falloRefresco && (
              <div className="partida-refresh-error" role="alert">
                <p>La partida se guardó; no se pudo actualizar el progreso</p>
                <button
                  type="button"
                  onClick={() => void reintentarRefresco()}
                  disabled={guardando}
                >
                  Reintentar actualización
                </button>
              </div>
            )}
            {!id && juegos.length === 0 ? (
              <div className="partida-empty">
                <Vacio
                  titulo="Primero necesitas un videojuego"
                  texto="Agrega un título a tu biblioteca antes de registrar una sesión."
                  accion="Agregar videojuego"
                  enlace="/videojuegos/nuevo"
                />
              </div>
            ) : (
              <form
                className="partida-form"
                ref={formularioRef}
                onSubmit={enviar}
                noValidate
                aria-busy={guardando}
              >
                <div className="partida-form-head">
                  <div>
                    <span className="partida-kicker">
                      01 — DATOS PRINCIPALES
                    </span>
                    <h2>
                      Tu sesión<span className="partida-period">.</span>
                    </h2>
                  </div>
                  <span className="partida-form-counter">01 / 02</span>
                </div>
                {Object.values(errores).some(Boolean) && (
                  <p role="alert" className="partida-validation-summary">
                    Revisa los campos indicados.
                  </p>
                )}
                <div className="partida-form-grid">
                  <label className="full">
                    Videojuego
                    <select
                      {...atributos("videojuego")}
                      aria-label="Videojuego"
                      required
                      disabled={!!id || bloqueado}
                      value={datos.videojuego}
                      onChange={(evento) =>
                        cambiar("videojuego", evento.target.value)
                      }
                    >
                      {!juegos.some(
                        (juego) => juego._id === datos.videojuego,
                      ) && (
                        <option value={datos.videojuego}>
                          {id
                            ? "Videojuego asociado"
                            : "Selecciona un videojuego"}
                        </option>
                      )}
                      {juegos.map((juego) => (
                        <option key={juego._id} value={juego._id}>
                          {juego.nombre}
                        </option>
                      ))}
                    </select>
                    {errorCampo("videojuego")}
                  </label>
                  <label>
                    Inicio (hora de Ecuador)
                    <input
                      {...atributos("fecha")}
                      aria-label="Inicio (hora de Ecuador)"
                      required
                      type="datetime-local"
                      step="0.001"
                      disabled={bloqueado}
                      value={datos.fecha}
                      onChange={(evento) =>
                        cambiar("fecha", evento.target.value)
                      }
                    />
                    {errorCampo("fecha")}
                  </label>
                  <label>
                    Duración en minutos
                    <input
                      {...atributos("duracionMinutos")}
                      aria-label="Duración en minutos"
                      required
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      disabled={bloqueado}
                      value={datos.duracionMinutos}
                      onChange={(evento) =>
                        cambiar("duracionMinutos", evento.target.value)
                      }
                    />
                    {errorCampo("duracionMinutos")}
                  </label>
                  <label className="full partida-progress-label">
                    <span className="partida-label-row">
                      Porcentaje de avance{" "}
                      <strong>{datos.porcentajeAvance}%</strong>
                    </span>
                    <input
                      {...atributos("porcentajeAvance")}
                      aria-label="Porcentaje de avance"
                      type="range"
                      min="0"
                      max="100"
                      disabled={bloqueado}
                      value={datos.porcentajeAvance}
                      style={
                        {
                          "--progress": `${datos.porcentajeAvance}%`,
                        } as CSSProperties
                      }
                      onChange={(evento) =>
                        cambiar("porcentajeAvance", evento.target.value)
                      }
                    />
                    <span className="partida-range-ends">
                      <span>0%</span>
                      <span>100%</span>
                    </span>
                    {errorCampo("porcentajeAvance")}
                  </label>
                </div>
                <div className="partida-notes">
                  <div className="partida-notes-heading">
                    <span className="partida-kicker">02 — MEMORY CARD</span>
                    <h2>
                      Notas de
                      <br />
                      <em>la partida.</em>
                    </h2>
                  </div>
                  <label>
                    ¿Qué pasó en esta sesión?
                    <textarea
                      {...atributos("notas")}
                      aria-label="¿Qué pasó en esta sesión?"
                      rows={5}
                      maxLength={500}
                      disabled={bloqueado}
                      value={datos.notas}
                      onChange={(evento) =>
                        cambiar("notas", evento.target.value)
                      }
                      placeholder="¿Qué lograste hoy? ¿Algún boss difícil?"
                    />
                    {errorCampo("notas")}
                  </label>
                  <span className="partida-character-counter">
                    {datos.notas.length} / 500 CARACTERES
                  </span>
                </div>
                <div className="partida-actions">
                  <Link
                    className="partida-cancel"
                    to={id ? "/videojuegos/" + datos.videojuego : "/partidas"}
                  >
                    CANCELAR ↗
                  </Link>
                  <button
                    disabled={bloqueado}
                    type="submit"
                    className="partida-submit"
                  >
                    {guardando
                      ? "GUARDANDO..."
                      : id
                        ? "GUARDAR CAMBIOS ↗"
                        : "GUARDAR SESIÓN ↗"}
                  </button>
                </div>
                {guardando && (
                  <p role="status">Guardando sesión y actualizando progreso…</p>
                )}
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
