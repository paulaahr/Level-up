import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { guardarVideojuego, obtenerVideojuego } from '../api/videojuegosApi';
import { ESTADOS, GENEROS, Logro } from '../tipos';
import { Encabezado, ErrorVista, Loading } from '../componentes/UI';
import './FormularioJuego.css';

export function FormularioJuego() {
  const { id } = useParams();
  const navegar = useNavigate();

  const [datos, setDatos] = useState({
    nombre: '',
    genero: 'Indie',
    plataforma: 'PC',
    estado: 'Pendiente',
    portada: '',
    descripcion: '',
    calificacion: '',
  });
  const [logros, setLogros] = useState<Logro[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) return;

    obtenerVideojuego(id)
      .then(j => {
        setDatos({
          nombre: j.nombre,
          genero: j.genero,
          plataforma: j.plataforma,
          estado: j.estado,
          portada: j.portada || '',
          descripcion: j.descripcion || '',
          calificacion: j.calificacion?.toString() || '',
        });
        setLogros(j.logros);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const cambiar = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError('');

    try {
      const payload: any = { ...datos, logros };
      delete payload.calificacion;
      if (datos.calificacion) payload.calificacion = Number(datos.calificacion);
      const j = await guardarVideojuego(payload, id);
      navegar('/videojuegos/' + j._id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  function agregarLogro() {
    if (!nuevo.trim()) return;
    setLogros([...logros, { nombre: nuevo.trim(), obtenido: false }]);
    setNuevo('');
  }

  if (loading) return <Loading />;

  return (
    <div className="formulario-juego-page">
      <section className="formulario-juego-hero">
        <div className="formulario-juego-hero-inner">
          <Link
            className="formulario-juego-back"
            to={id ? '/videojuegos/' + id : '/biblioteca'}
          >
            ← VOLVER
          </Link>
          <span className="formulario-juego-star" aria-hidden="true">✳</span>
          <Encabezado
            eyebrow="[ GAME MANAGEMENT / 04 ]"
            titulo={id ? 'Editar videojuego' : 'Agrega una nueva aventura'}
            descripcion="Completa la ficha de tu videojuego y prepara tus próximos logros."
          />
          <span className="formulario-juego-hero-caption" aria-hidden="true">
            LEVEL UP / YOUR NEXT QUEST ↗
          </span>
        </div>
      </section>

      <main className="formulario-juego-content">
        {error && <ErrorVista mensaje={error} />}

        <form className="formulario-juego-form" onSubmit={enviar}>
          <section className="formulario-juego-section">
            <div className="formulario-juego-section-heading">
              <span className="formulario-juego-number">01</span>
              <div>
                <span className="formulario-juego-eyebrow">YOUR GAME / THE BASICS</span>
                <h2>Información del juego<span className="formulario-juego-period">.</span></h2>
              </div>
            </div>

            <div className="formulario-juego-grid">
              <label>
                Nombre del videojuego *
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  name="nombre"
                  value={datos.nombre}
                  onChange={cambiar}
                  placeholder="Ej. Hollow Knight"
                />
              </label>

              <label>
                Plataforma *
                <input
                  required
                  name="plataforma"
                  value={datos.plataforma}
                  onChange={cambiar}
                  placeholder="PC, PS5, Switch..."
                />
              </label>

              <label>
                Género *
                <select name="genero" value={datos.genero} onChange={cambiar}>
                  {GENEROS.map(x => <option key={x}>{x}</option>)}
                </select>
              </label>

              <label>
                Estado
                <select name="estado" value={datos.estado} onChange={cambiar}>
                  {ESTADOS.map(x => <option key={x}>{x}</option>)}
                </select>
              </label>

              <label className="formulario-juego-full">
                URL de portada (opcional)
                <input
                  type="url"
                  name="portada"
                  value={datos.portada}
                  onChange={cambiar}
                  placeholder="https://.../portada.jpg"
                />
              </label>

              <label className="formulario-juego-full">
                Descripción
                <textarea
                  name="descripcion"
                  rows={3}
                  maxLength={1000}
                  value={datos.descripcion}
                  onChange={cambiar}
                  placeholder="¿De qué trata tu aventura?"
                />
              </label>

              <label>
                Tu calificación (0–10)
                <input
                  name="calificacion"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={datos.calificacion}
                  onChange={cambiar}
                  placeholder="Opcional"
                />
              </label>
            </div>
          </section>

          <section className="formulario-juego-section formulario-juego-achievement-section">
            <div className="formulario-juego-section-heading">
              <span className="formulario-juego-number">02</span>
              <div>
                <span className="formulario-juego-eyebrow">SIDE QUESTS / YOUR MILESTONES</span>
                <h2>Logros personalizados<span className="formulario-juego-period">.</span></h2>
              </div>
            </div>

            <p className="formulario-juego-hint">
              Los logros se guardan dentro del documento Videojuego.
              Márcalos como obtenidos desde el detalle.
            </p>

            <div className="formulario-juego-inline-add">
              <input
                aria-label="Nombre del nuevo logro"
                value={nuevo}
                maxLength={100}
                onChange={e => setNuevo(e.target.value)}
                placeholder="Nombre del nuevo logro..."
              />
              <button type="button" onClick={agregarLogro}>
                + AÑADIR
              </button>
            </div>

            <div className="formulario-juego-achievements">
              {logros.map((l, i) => (
                <div className="formulario-juego-achievement" key={l._id || i}>
                  <span>☆ {l.nombre} {l.obtenido ? '✓' : ''}</span>
                  <button
                    type="button"
                    onClick={() => setLogros(logros.filter((_, ix) => ix !== i))}
                    aria-label={`Eliminar logro ${l.nombre}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="formulario-juego-actions">
            <Link to={id ? '/videojuegos/' + id : '/biblioteca'}>
              CANCELAR
            </Link>
            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : id ? 'Guardar cambios ↗' : 'Crear videojuego ↗'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
