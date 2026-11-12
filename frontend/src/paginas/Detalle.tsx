import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  eliminarVideojuego,
  marcarLogro,
  obtenerResumen,
  obtenerVideojuego,
  partidasDeVideojuego,
} from "../api/videojuegosApi";
import type { Partida, Resumen, Videojuego } from "../tipos";
import { ErrorVista, fecha, Loading, Portada, Vacio } from "../componentes/UI";
import { ProgresoSemanal } from "../componentes/ProgresoSemanal";
import { HistorialMetas } from "../componentes/HistorialMetas";
import { eliminarPartida } from "../api/partidasApi";
import { obtenerProgresoSemanal } from "../api/metasApi";
import "./Detalle.css";

export function Detalle() {
  const { id = "" } = useParams();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [j, setJ] = useState<Videojuego | null>(null);
  const [r, setR] = useState<Resumen | null>(null);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState("");
  const [revision, setRevision] = useState(0);
  const [errorAccion, setErrorAccion] = useState("");
  const [errorRefresco, setErrorRefresco] = useState("");
  const [borrando, setBorrando] = useState("");
  const ocupado = useRef(false);
  const montado = useRef(true);
  const actual = useRef(id);
  actual.current = id;
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  useEffect(() => {
    setErrorAccion("");
    setErrorRefresco("");
    setBorrando("");
  }, [id]);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    setError("");

    Promise.all([
      obtenerVideojuego(id),
      obtenerResumen(id),
      partidasDeVideojuego(id),
    ])
      .then(([videojuego, resumen, sesiones]) => {
        if (activo) {
          setJ(videojuego);
          setR(resumen);
          setPartidas(sesiones);
        }
      })
      .catch((e) => {
        if (activo) setError(e.message);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [id, revision, ubicacion.key]);

  async function borrarSesion(partidaId: string) {
    if (ocupado.current || !window.confirm("¿Eliminar esta sesión?")) return;
    const juegoId = id;
    const contextoVigente = () => montado.current && actual.current === juegoId;
    ocupado.current = true;
    setBorrando(partidaId);
    setErrorAccion("");
    try {
      try {
        await eliminarPartida(partidaId);
      } catch (e) {
        if (contextoVigente()) setErrorAccion((e as Error).message);
        return;
      }
      if (contextoVigente())
        setPartidas((lista) => lista.filter((p) => p._id !== partidaId));
      // Una escritura confirmada siempre refresca el juego capturado, aunque
      // el usuario ya esté en otra ruta. La guardia solo protege la vista.
      try {
        await obtenerProgresoSemanal(juegoId);
        if (contextoVigente()) setErrorRefresco("");
      } catch {
        if (contextoVigente())
          setErrorRefresco(
            "La partida se eliminó; no se pudo actualizar el progreso",
          );
      }
      if (contextoVigente()) setRevision((v) => v + 1);
    } finally {
      ocupado.current = false;
      if (contextoVigente()) setBorrando("");
    }
  }

  async function reintentarProgreso() {
    if (ocupado.current) return;
    const juegoId = id;
    ocupado.current = true;
    try {
      await obtenerProgresoSemanal(juegoId);
      if (montado.current && actual.current === juegoId) {
        setErrorRefresco("");
        setRevision((v) => v + 1);
      }
    } catch {
      if (montado.current && actual.current === juegoId)
        setErrorRefresco(
          "La partida se eliminó; no se pudo actualizar el progreso",
        );
    } finally {
      ocupado.current = false;
    }
  }

  async function toggle(logroId: string, obtenido: boolean) {
    try {
      setGuardando(logroId);
      setJ(await marcarLogro(id, logroId, obtenido));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setGuardando("");
    }
  }

  async function borrar() {
    if (
      !window.confirm(
        "¿Eliminar este juego, sus partidas y sus metas? Esta acción no se puede deshacer.",
      )
    )
      return;

    try {
      await eliminarVideojuego(id);
      navegar("/biblioteca");
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (loading)
    return (
      <div role="status">
        <Loading />
      </div>
    );
  if (error)
    return (
      <ErrorVista
        mensaje={error}
        reintentar={() => setRevision((v) => v + 1)}
      />
    );
  if (!j || !r) return null;
  if (j._id !== id)
    return (
      <div role="status">
        <Loading />
      </div>
    );

  const logrosObtenidos = j.logros.filter((logro) => logro.obtenido).length;

  return (
    <div className="detalle-page">
      <div className="detalle-topline">
        <Link to="/biblioteca" className="detalle-back">
          ← VOLVER A BIBLIOTECA
        </Link>
        <span>LEVEL UP® &nbsp; / &nbsp; PLAYER FILE — 001</span>
      </div>

      <section className="detalle-hero" aria-label="Información del videojuego">
        <div className="detalle-hero-copy">
          <div className="detalle-hero-top">
            <span className="detalle-micro">[ GAME PROFILE / 01 ]</span>
            <span className="detalle-asterisk" aria-hidden="true">
              ✳
            </span>
          </div>
          <h1>{j.nombre}</h1>
          <div className="detalle-tags">
            <span>{j.genero}</span>
            <span>{j.plataforma}</span>
            <span className="detalle-tag-highlight">{j.estado}</span>
          </div>
          <p className="detalle-description">
            {j.descripcion || "Cada aventura tiene una historia por contar."}
          </p>
          <div className="detalle-actions">
            <Link
              className="detalle-button detalle-button-dark"
              to={`/partidas/nueva?videojuego=${id}`}
            >
              + REGISTRAR PARTIDA <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="detalle-button detalle-button-outline"
              to={`/videojuegos/${id}/editar`}
            >
              EDITAR JUEGO <span aria-hidden="true">↗</span>
            </Link>
            <button type="button" className="detalle-delete" onClick={borrar}>
              ELIMINAR ×
            </button>
          </div>
        </div>
        <div className="detalle-hero-art">
          <span className="detalle-art-label">
            CURRENTLY IN YOUR COLLECTION ↗
          </span>
          <div className="detalle-cover-frame">
            <Portada j={j} clase="detalle-cover" />
          </div>
          <span className="detalle-art-number">
            LVL / UP <b>✴</b> 2026
          </span>
        </div>
        <span className="detalle-hero-stamp" aria-hidden="true">
          NO SKIP / JUST PLAY
        </span>
      </section>

      <section
        className="detalle-stats-section"
        aria-label="Estadísticas del videojuego"
      >
        <div className="detalle-section-title">
          <div>
            <span className="detalle-micro">[ 02 — THE SCOREBOARD ]</span>{" "}
            <h2>
              El juego
              <em>en números.</em>
            </h2>
          </div>
        </div>
        <div className="detalle-stats">
          <article className="detalle-stat">
            <span className="detalle-stat-top">
              01 / TIEMPO JUGADO <b>↗</b>
            </span>
            <strong>
              {r.horasTotales}
              <small>h</small>
            </strong>
            <p>{r.minutosTotales} minutos en total</p>
          </article>
          <article className="detalle-stat">
            <span className="detalle-stat-top">
              02 / SESIONES <b>↗</b>
            </span>
            <strong>{r.totalPartidas}</strong>
            <p>partidas registradas</p>
          </article>
          <article className="detalle-stat detalle-stat-date">
            <span className="detalle-stat-top">
              03 / ÚLTIMA SESIÓN <b>↗</b>
            </span>
            <strong>{r.ultimaSesion ? fecha(r.ultimaSesion) : "—"}</strong>
            <p>{r.ultimaSesion ? "¡Sigue así!" : "Sin partidas todavía"}</p>
          </article>
          <article className="detalle-stat detalle-stat-progress">
            <span className="detalle-stat-top">
              04 / TU AVANCE <b>✳</b>
            </span>
            <strong>
              {r.porcentajeAvanceActual}
              <small>%</small>
            </strong>
            <div
              className="detalle-progress"
              role="progressbar"
              aria-valuenow={r.porcentajeAvanceActual}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Avance actual"
            >
              <div style={{ width: `${r.porcentajeAvanceActual}%` }} />
            </div>
          </article>
        </div>
      </section>

      {errorAccion && (
        <div role="alert">
          <ErrorVista mensaje={errorAccion} />
        </div>
      )}
      {errorRefresco ? (
        <section className="e2-progress" role="alert">
          <p>{errorRefresco}</p>
          <button
            className="e2-boton"
            onClick={() => void reintentarProgreso()}
          >
            Reintentar progreso
          </button>
        </section>
      ) : (
        <ProgresoSemanal
          key={id}
          videojuegoId={id}
          estado={j.estado}
          revision={revision}
          onMetaCambiada={() => setRevision((v) => v + 1)}
        />
      )}
      <HistorialMetas videojuegoId={id} revision={revision} />
      <div className="detalle-bottom-grid">
        <section
          className="detalle-board detalle-achievements-section"
          aria-label="Logros"
        >
          <div className="detalle-board-heading">
            <div>
              <span className="detalle-micro">[ 03 / MILESTONES ]</span>
              <h2>
                Logros
                <span className="detalle-count">
                  {logrosObtenidos}/{j.logros.length}
                </span>
              </h2>
            </div>
            <span className="detalle-board-star" aria-hidden="true">
              ✳
            </span>
          </div>
          {j.logros.length === 0 ? (
            <Vacio
              titulo="Sin logros todavía"
              texto="Añade logros al editar este videojuego."
            />
          ) : (
            <div className="detalle-achievements">
              {j.logros.map((logro) => (
                <label
                  className={`detalle-achievement${logro.obtenido ? " is-unlocked" : ""}`}
                  key={logro._id}
                >
                  <input
                    type="checkbox"
                    disabled={guardando === logro._id}
                    checked={logro.obtenido}
                    onChange={(e) => {
                      if (logro._id) toggle(logro._id, e.target.checked);
                    }}
                  />
                  <span className="detalle-achievement-icon" aria-hidden="true">
                    {logro.obtenido ? "★" : "☆"}
                  </span>
                  <span className="detalle-achievement-copy">
                    <b>{logro.nombre}</b>
                    <small>{logro.descripcion || "Logro personal"}</small>
                  </span>
                  <span className="detalle-achievement-status">
                    {logro.obtenido ? "DESBLOQUEADO" : "PENDIENTE"}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section
          className="detalle-board detalle-sessions-section"
          aria-label="Historial de sesiones"
        >
          <div className="detalle-board-heading">
            <div>
              <span className="detalle-micro">[ 04 / ACTIVITY LOG ]</span>
              <h2>
                Historial<span className="detalle-title-dot">.</span>
              </h2>
            </div>
            <Link
              className="detalle-new-session"
              to={`/partidas/nueva?videojuego=${id}`}
            >
              + NUEVA ↗
            </Link>
          </div>
          {partidas.length === 0 ? (
            <Vacio
              titulo="Sin partidas registradas"
              texto="Registra tu primera sesión para calcular tu progreso."
              accion="Nueva sesión"
              enlace={`/partidas/nueva?videojuego=${id}`}
            />
          ) : (
            <div className="detalle-sessions">
              {partidas.map((partida, index) => (
                <div className="detalle-session" key={partida._id}>
                  <span className="detalle-session-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="detalle-session-description">
                    <b>{fecha(partida.fecha)}</b>
                    <small>{partida.notas || "Sesión de juego"}</small>
                  </div>
                  <div className="detalle-session-meta">
                    <b>{partida.duracionMinutos} MIN</b>
                    <span>{partida.porcentajeAvance}% AVANCE ↗</span>
                  </div>
                  <div className="e2-sesion-acciones">
                    <Link
                      className="e2-boton"
                      to={`/partidas/${partida._id}/editar`}
                      aria-label={`Editar partida del ${fecha(partida.fecha)}`}
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="e2-boton"
                      disabled={!!borrando}
                      onClick={() => void borrarSesion(partida._id)}
                      aria-label={`Eliminar partida del ${fecha(partida.fecha)}`}
                    >
                      {borrando === partida._id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
