import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { eliminarPartida, listarPartidas } from "../api/partidasApi";
import { obtenerProgresoSemanal } from "../api/metasApi";
import { Partida } from "../tipos";
import { Encabezado, ErrorVista, Loading, Vacio } from "../componentes/UI";
import "./Partidas.css";

export function Partidas() {
  const [datos, setDatos] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [errorAccion, setErrorAccion] = useState("");
  const [refrescoPendiente, setRefrescoPendiente] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    setLoading(true);
    setError("");

    listarPartidas()
      .then((lista) => {
        if (vigente) setDatos(lista);
      })
      .catch((fallo: unknown) => {
        if (vigente)
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar el historial.",
          );
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });
    return () => {
      vigente = false;
    };
  }, [version]);

  async function refrescarProgreso(videojuego: string) {
    try {
      await obtenerProgresoSemanal(videojuego);
      if (montado.current) setRefrescoPendiente("");
    } catch {
      if (montado.current) setRefrescoPendiente(videojuego);
    }
  }

  async function reintentarRefresco() {
    if (bloqueo.current || !refrescoPendiente) return;
    bloqueo.current = true;
    setOcupado(true);
    try {
      await refrescarProgreso(refrescoPendiente);
    } finally {
      bloqueo.current = false;
      if (montado.current) setOcupado(false);
    }
  }

  async function borrar(partida: Partida) {
    if (
      bloqueo.current ||
      refrescoPendiente ||
      !confirm("¿Eliminar esta sesión?")
    )
      return;
    const videojuego =
      typeof partida.videojuego === "string"
        ? partida.videojuego
        : partida.videojuego?._id;
    if (!videojuego) {
      setErrorAccion("No se puede identificar el videojuego de esta partida.");
      return;
    }
    bloqueo.current = true;
    setOcupado(true);
    setErrorAccion("");
    try {
      await eliminarPartida(partida._id);
      if (montado.current) {
        setDatos((anteriores) =>
          anteriores.filter((sesion) => sesion._id !== partida._id),
        );
        setVersion((v) => v + 1);
      }
      await refrescarProgreso(videojuego);
    } catch (fallo) {
      if (montado.current)
        setErrorAccion(
          fallo instanceof Error
            ? fallo.message
            : "No se pudo eliminar la partida.",
        );
    } finally {
      bloqueo.current = false;
      if (montado.current) setOcupado(false);
    }
  }

  return (
    <div className="partidas-page">
      <div className="partidas-hero">
        <span className="partidas-hero-star" aria-hidden="true">
          ✳
        </span>
        <Encabezado
          eyebrow="SESSION HISTORY"
          titulo="Diario de partidas"
          descripcion="Cada minuto jugado es parte de tu historia."
        >
          <Link className="btn primary" to="/partidas/nueva">
            + Registrar sesión
          </Link>
        </Encabezado>
        <span className="partidas-hero-index" aria-hidden="true">
          LEVEL UP / 03
        </span>
      </div>

      <section className="partidas-content" aria-label="Historial de sesiones">
        <div className="partidas-section-header">
          <div>
            <span className="partidas-kicker">✦ YOUR PLAY LOG</span>
            <h2>
              Sesiones<span className="partidas-dot">.</span>
            </h2>
          </div>
          <span className="partidas-counter">
            {datos.length.toString().padStart(2, "0")} REGISTROS
          </span>
        </div>

        {errorAccion && (
          <div className="partidas-action-error" role="alert">
            {errorAccion}
          </div>
        )}
        {refrescoPendiente && (
          <div className="partidas-action-error" role="alert">
            <p>La partida se eliminó; no se pudo actualizar el progreso</p>
            <button
              disabled={ocupado}
              onClick={() => void reintentarRefresco()}
            >
              Reintentar actualización
            </button>
          </div>
        )}
        {ocupado && (
          <p role="status">Actualizando el historial y el progreso…</p>
        )}
        {loading ? (
          <div role="status">
            <Loading />
          </div>
        ) : error ? (
          <div role="alert">
            <ErrorVista
              mensaje={error}
              reintentar={() => {
                setError("");
                setVersion((x) => x + 1);
              }}
            />
          </div>
        ) : datos.length === 0 ? (
          <Vacio
            titulo="Tu diario está en blanco"
            texto="Registra una partida y comienza a crear tu historial."
            accion="Registrar partida"
            enlace="/partidas/nueva"
          />
        ) : (
          <div className="partidas-table-shell">
            <table className="partidas-table">
              <thead>
                <tr>
                  <th>VIDEOJUEGO</th>
                  <th>FECHA</th>
                  <th>DURACIÓN</th>
                  <th>AVANCE</th>
                  <th>NOTAS</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {datos.map((p) => {
                  const j =
                    typeof p.videojuego === "object" ? p.videojuego : null;
                  const juegoId =
                    typeof p.videojuego === "string" ? p.videojuego : j?._id;

                  return (
                    <tr key={p._id}>
                      <td data-label="Videojuego">
                        {juegoId ? (
                          <Link
                            className="partidas-game-link"
                            to={"/videojuegos/" + juegoId}
                          >
                            <span aria-hidden="true">✦</span>{" "}
                            {j?.nombre || "Ver videojuego"}
                          </Link>
                        ) : (
                          "Juego eliminado"
                        )}
                      </td>
                      <td data-label="Fecha">
                        {new Intl.DateTimeFormat("es-EC", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "America/Guayaquil",
                        }).format(new Date(p.fecha))}
                      </td>
                      <td data-label="Duración">{p.duracionMinutos} min</td>
                      <td data-label="Avance">
                        <span className="partidas-percent">
                          {p.porcentajeAvance}%
                        </span>
                      </td>
                      <td data-label="Notas" className="partidas-notes">
                        {p.notas || "—"}
                      </td>
                      <td className="partidas-action-cell">
                        <Link
                          className="partidas-edit"
                          to={"/partidas/" + p._id + "/editar"}
                          aria-label="Editar partida"
                          title="Editar partida"
                        >
                          Editar
                        </Link>
                        <button
                          className="partidas-delete"
                          disabled={ocupado || !!refrescoPendiente}
                          onClick={() => void borrar(p)}
                          aria-label="Eliminar partida"
                          title="Eliminar partida"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
