import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { desactivarMeta, obtenerProgresoSemanal } from "../api/metasApi";
import type { ProgresoSemanal as Progreso } from "../tipos";
import { ErrorVista, Loading } from "./UI";
import "./ProgresoSemanal.css";

export interface ProgresoSemanalProps {
  videojuegoId: string;
  estado: string;
  revision?: number;
  onMetaCambiada?: () => void;
}
const numero = (valor: number) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(valor);
const objetivo = (valor: number) =>
  new Intl.NumberFormat("es-EC", { maximumSignificantDigits: 21 }).format(
    valor,
  );
const dia = (civil: string) => civil.split("-").reverse().join("/");

export function ProgresoSemanal({
  videojuegoId,
  estado,
  revision = 0,
  onMetaCambiada,
}: ProgresoSemanalProps) {
  const [datos, setDatos] = useState<Progreso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);
  const version = useRef(0);
  const ocupado = useRef(false);
  const montado = useRef(true);
  const juegoActual = useRef(videojuegoId);
  juegoActual.current = videojuegoId;
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const actual = ++version.current;
    setCargando(true);
    setError("");
    setDatos(null);
    setErrorAccion("");
    obtenerProgresoSemanal(videojuegoId)
      .then((resultado) => {
        if (actual === version.current) setDatos(resultado);
      })
      .catch((e: Error) => {
        if (actual === version.current) setError(e.message);
      })
      .finally(() => {
        if (actual === version.current) setCargando(false);
      });
    return () => {
      version.current++;
    };
  }, [videojuegoId, revision, intento]);

  async function desactivar() {
    if (!datos?.meta || ocupado.current) return;
    if (!window.confirm("¿Desactivar esta meta? Se conservará como inactiva")) {
      boton.current?.focus();
      return;
    }
    const actual = version.current;
    const juegoSolicitud = videojuegoId;
    ocupado.current = true;
    setGuardando(true);
    setErrorAccion("");
    try {
      await desactivarMeta(datos.meta._id);
      if (montado.current && juegoActual.current === juegoSolicitud) {
        if (onMetaCambiada) onMetaCambiada();
        else setIntento((valor) => valor + 1);
      }
    } catch (e) {
      if (actual === version.current) setErrorAccion((e as Error).message);
    } finally {
      ocupado.current = false;
      if (montado.current) setGuardando(false);
    }
  }

  return (
    <section className="e2-progress" aria-labelledby="e2-progreso-titulo">
      <div className="e2-progress-heading">
        <div>
          <span className="detalle-micro">[ WEEKLY GOALS / LEVEL UP ]</span>
          <h2 id="e2-progreso-titulo">
            Progreso semanal<span aria-hidden="true"> ✳</span>
          </h2>
        </div>
        {datos && (
          <p className="e2-periodo">
            {dia(datos.semana.inicio)} — {dia(datos.semana.fin)}
            <br />
            <small>Lunes a domingo · hora de Ecuador</small>
          </p>
        )}
      </div>
      {cargando ? (
        <div role="status">
          <Loading />
        </div>
      ) : error ? (
        <div role="alert">
          <ErrorVista
            mensaje={error}
            reintentar={() => setIntento((v) => v + 1)}
          />
        </div>
      ) : (
        datos && (
          <>
            {errorAccion && (
              <div role="alert">
                <ErrorVista
                  mensaje={errorAccion}
                  reintentar={() => setIntento((v) => v + 1)}
                />
              </div>
            )}
            <div className="e2-contadores">
              <article>
                <h3>Horas jugadas</h3>
                <strong>
                  {numero(datos.horasSemana)}{" "}
                  <small>
                    h
                    {datos.meta
                      ? ` / ${objetivo(datos.meta.horasSemanales)} h`
                      : ""}
                  </small>
                </strong>
              </article>
              <article>
                <h3>Días jugados</h3>
                <strong>
                  {datos.diasJugadosSemana}
                  <small>
                    {datos.meta ? ` / ${datos.meta.diasPorSemana}` : " días"}
                  </small>
                </strong>
              </article>
              <article>
                <h3>Racha actual</h3>
                <strong>
                  {datos.rachaActual}
                  <small> días</small>
                </strong>
              </article>
              <article>
                <h3>Mejor racha</h3>
                <strong>
                  {datos.mejorRacha}
                  <small> días</small>
                </strong>
              </article>
            </div>
            {datos.meta ? (
              <>
                <p className="e2-cumplimiento">
                  {datos.cumplidaSemana
                    ? "Semana cumplida"
                    : "Meta semanal pendiente"}
                </p>
                <div
                  className="e2-barra"
                  role="progressbar"
                  aria-label="Horas semanales"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={datos.porcentajeHoras ?? 0}
                  aria-valuetext={`${numero(datos.horasSemana)} de ${objetivo(datos.meta.horasSemanales)} horas`}
                >
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, datos.porcentajeHoras ?? 0))}%`,
                    }}
                  />
                </div>
                <p className="e2-ayuda">
                  {datos.porcentajeHoras}% de horas · Cumplir la semana requiere
                  alcanzar horas y días.
                </p>
                <h3>Hitos de la meta</h3>
                {datos.hitos.length ? (
                  <ul className="e2-hitos">
                    {datos.hitos.map((hito, i) => (
                      <li key={i}>
                        <span aria-hidden="true">
                          {hito.alcanzado ? "★" : "☆"}
                        </span>
                        <b>{hito.descripcion || "Hito sin descripción"}</b>
                        <span>
                          {objetivo(hito.porcentajeObjetivo)}% de avance
                        </span>
                        <strong>
                          {hito.alcanzado ? "Alcanzado" : "Pendiente"}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No hay hitos definidos para esta meta.</p>
                )}
                <div className="e2-acciones">
                  <Link
                    className="e2-boton"
                    to={`/videojuegos/${videojuegoId}/metas/${datos.meta._id}/editar`}
                  >
                    Editar meta
                  </Link>
                  <button
                    ref={boton}
                    className="e2-boton"
                    type="button"
                    disabled={guardando}
                    onClick={() => void desactivar()}
                  >
                    {guardando ? "Desactivando…" : "Desactivar meta"}
                  </button>
                </div>
              </>
            ) : (
              <div className="e2-sin-meta">
                <h3>Sin meta activa</h3>
                <p>Tu actividad y tus rachas siguen contando.</p>
                {estado === "Completado" ? (
                  <p>
                    Un videojuego completado no puede tener una meta activa.
                    Cambia su estado antes de crear una.
                  </p>
                ) : (
                  <Link
                    className="e2-boton"
                    to={`/videojuegos/${videojuegoId}/meta/nueva`}
                  >
                    Crear meta
                  </Link>
                )}
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}
