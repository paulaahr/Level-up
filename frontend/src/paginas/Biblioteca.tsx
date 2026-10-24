
import { useEffect, useState } from 'react';
import './Biblioteca.css';
import { Link } from 'react-router-dom';
import { listarVideojuegos } from '../api/videojuegosApi';
import { Videojuego, ESTADOS, GENEROS } from '../tipos';
import {
  Encabezado,
  ErrorVista,
  Loading,
  Tarjeta,
  Vacio
} from '../componentes/UI';

export function Biblioteca() {
  const [juegos, setJuegos] = useState<Videojuego[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [genero, setGenero] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let activo = true;

    setCargando(true);
    setError('');

    listarVideojuegos({ buscar, estado, genero })
      .then(x => {
        if (activo) setJuegos(x);
      })
      .catch(e => {
        if (activo) setError(e.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [buscar, estado, genero, revision]);

  return (
    <div className="biblioteca-page">
      <div className="biblioteca-head">
      <span className="biblioteca-decoration" aria-hidden="true">✳</span>
      <Encabezado
        eyebrow="[ 01 / GAME COLLECTION ]"
        titulo="The game archive"
        descripcion="Un archivo para cada aventura. Tu colección, sin reglas."
      >
        <Link className="btn primary" to="/videojuegos/nuevo">
          + Agregar juego
        </Link>
      </Encabezado>
      <span className="biblioteca-serial" aria-hidden="true">LVL—001 / ARCHIVE SYSTEM</span>
      </div>

      <div className="biblioteca-body">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            ✦ YOUR COLLECTION
          </span>

          <h2>
            Mis videojuegos <span className="count">{juegos.length}</span>
          </h2>
        </div>

        <span className="muted">
          ORGANIZA. JUEGA. REPITE.
        </span>
      </div>

      <div className="filter-bar">
        <label className="search">
          ⌕

          <input
            placeholder="Buscar por nombre..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </label>

        <select
          value={estado}
          onChange={e => setEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>

          {ESTADOS.map(e => (
            <option key={e}>{e}</option>
          ))}
        </select>

        <select
          value={genero}
          onChange={e => setGenero(e.target.value)}
        >
          <option value="">Todos los géneros</option>

          {GENEROS.map(e => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <Loading />
      ) : error ? (
        <ErrorVista
          mensaje={error}
          reintentar={() => setRevision(v => v + 1)}
        />
      ) : juegos.length === 0 ? (
        <Vacio
          titulo="Todavía no hay juegos aquí"
          texto="Agrega tu primer videojuego o cambia los filtros para encontrarlo."
          accion="Agregar videojuego"
          enlace="/videojuegos/nuevo"
        />
      ) : (
        <div className="games-grid">
          {juegos.map(j => (
            <Tarjeta key={j._id} j={j} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

