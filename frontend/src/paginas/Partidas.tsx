import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eliminarPartida, listarPartidas } from '../api/partidasApi';
import { Partida, Videojuego } from '../tipos';
import {
  Encabezado,
  ErrorVista,
  fecha,
  Loading,
  Vacio,
} from '../componentes/UI';
import './Partidas.css';

export function Partidas() {
  const [datos, setDatos] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setLoading(true);

    listarPartidas()
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [version]);

  async function borrar(id: string) {
    if (!confirm('¿Eliminar esta sesión?')) return;

    try {
      await eliminarPartida(id);
      setVersion((v) => v + 1);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="partidas-page">
      <div className="partidas-hero">
        <span className="partidas-hero-star" aria-hidden="true">✳</span>
        <Encabezado
          eyebrow="SESSION HISTORY"
          titulo="Diario de partidas"
          descripcion="Cada minuto jugado es parte de tu historia."
        >
          <Link className="btn primary" to="/partidas/nueva">
            + Registrar sesión
          </Link>
        </Encabezado>
        <span className="partidas-hero-index" aria-hidden="true">LEVEL UP / 03</span>
      </div>

      <section className="partidas-content" aria-label="Historial de sesiones">
        <div className="partidas-section-header">
          <div>
            <span className="partidas-kicker">✦ YOUR PLAY LOG</span>
            <h2>Sesiones<span className="partidas-dot">.</span></h2>
          </div>
          <span className="partidas-counter">{datos.length.toString().padStart(2, '0')} REGISTROS</span>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorVista
            mensaje={error}
            reintentar={() => {
              setError('');
              setVersion((x) => x + 1);
            }}
          />
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
                  const j = p.videojuego as Videojuego;

                  return (
                    <tr key={p._id}>
                      <td data-label="Videojuego">
                        {j ? (
                          <Link className="partidas-game-link" to={'/videojuegos/' + j._id}>
                            <span aria-hidden="true">✦</span> {j.nombre}
                          </Link>
                        ) : (
                          'Juego eliminado'
                        )}
                      </td>
                      <td data-label="Fecha">{fecha(p.fecha)}</td>
                      <td data-label="Duración">{p.duracionMinutos} min</td>
                      <td data-label="Avance">
                        <span className="partidas-percent">{p.porcentajeAvance}%</span>
                      </td>
                      <td data-label="Notas" className="partidas-notes">
                        {p.notas || '—'}
                      </td>
                      <td className="partidas-action-cell">
                        <button
                          className="partidas-delete"
                          onClick={() => borrar(p._id)}
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
