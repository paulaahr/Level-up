import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { crearPartida } from '../api/partidasApi';
import { listarVideojuegos } from '../api/videojuegosApi';
import { Videojuego } from '../tipos';
import { ErrorVista, Loading, Vacio } from '../componentes/UI';
import './FormularioPartida.css';

export function FormularioPartida() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const [juegos, setJuegos] = useState<Videojuego[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [datos, setDatos] = useState({
    videojuego: params.get('videojuego') || '',
    fecha: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16),
    duracionMinutos: 60,
    porcentajeAvance: 0,
    notas: '',
  });

  useEffect(() => {
    listarVideojuegos()
      .then((x) => {
        setJuegos(x);
        setDatos((d) => ({ ...d, videojuego: d.videojuego || x[0]?._id || '' }));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await crearPartida(datos);
      navegar('/videojuegos/' + datos.videojuego);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="formulario-partida-page">
      <header className="partida-hero">
        <div className="partida-hero-copy">
          <span className="partida-kicker">LEVEL UP / SESSION 02</span>
          <h1>Registrar<br /><em>una partida.</em></h1>
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
          <span>02 / NUEVA SESIÓN</span>
          <span>YOUR PROGRESS MATTERS ↗</span>
        </div>
        {error && <ErrorVista mensaje={error} />}
        {juegos.length === 0 ? (
          <div className="partida-empty">
            <Vacio
              titulo="Primero necesitas un videojuego"
              texto="Agrega un título a tu biblioteca antes de registrar una sesión."
              accion="Agregar videojuego"
              enlace="/videojuegos/nuevo"
            />
          </div>
        ) : (
          <form className="partida-form" onSubmit={enviar}>
            <div className="partida-form-head">
              <div>
                <span className="partida-kicker">01 — DATOS PRINCIPALES</span>
                <h2>Tu sesión<span className="partida-period">.</span></h2>
              </div>
              <span className="partida-form-counter">01 / 02</span>
            </div>
            <div className="partida-form-grid">
              <label className="full">Videojuego
                <select required value={datos.videojuego} onChange={(e) => setDatos({ ...datos, videojuego: e.target.value })}>
                  {juegos.map((j) => <option key={j._id} value={j._id}>{j.nombre}</option>)}
                </select>
              </label>
              <label>Fecha y hora
                <input required type="datetime-local" value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} />
              </label>
              <label>Duración en minutos
                <input required type="number" min="1" max="1440" value={datos.duracionMinutos} onChange={(e) => setDatos({ ...datos, duracionMinutos: Number(e.target.value) })} />
              </label>
              <label className="full partida-progress-label">
                <span className="partida-label-row">Porcentaje de avance <strong>{datos.porcentajeAvance}%</strong></span>
                <input type="range" min="0" max="100" value={datos.porcentajeAvance} style={{ '--progress': `${datos.porcentajeAvance}%` } as React.CSSProperties} onChange={(e) => setDatos({ ...datos, porcentajeAvance: Number(e.target.value) })} />
                <span className="partida-range-ends"><span>0%</span><span>100%</span></span>
              </label>
            </div>

            <div className="partida-notes">
              <div className="partida-notes-heading">
                <span className="partida-kicker">02 — MEMORY CARD</span>
                <h2>Notas de<br /><em>la partida.</em></h2>
              </div>
              <label>¿Qué pasó en esta sesión?
                <textarea rows={5} maxLength={500} value={datos.notas} onChange={(e) => setDatos({ ...datos, notas: e.target.value })} placeholder="¿Qué lograste hoy? ¿Algún boss difícil?" />
              </label>
              <span className="partida-character-counter">{datos.notas.length} / 500 CARACTERES</span>
            </div>

            <div className="partida-actions">
              <Link className="partida-cancel" to="/partidas">CANCELAR ↗</Link>
              <button disabled={guardando} type="submit" className="partida-submit">
                {guardando ? 'GUARDANDO...' : 'GUARDAR SESIÓN ↗'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
