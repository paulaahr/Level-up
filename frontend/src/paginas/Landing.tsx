import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {listarVideojuegos} from '../api/videojuegosApi';
import {listarPartidas} from '../api/partidasApi';
import type {Videojuego,Partida} from '../tipos';
import {Reveal} from '../componentes/Reveal';
import {useScrollMotion} from '../componentes/ScrollMotion';
import {ErrorVista,Loading} from '../componentes/UI';
export function Landing(){
 const [games,setGames]=useState<Videojuego[]>([]);const [sessions,setSessions]=useState<Partida[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [version,setVersion]=useState(0);const scroll=useScrollMotion();
 useEffect(()=>{let alive=true;setLoading(true);setError('');Promise.all([listarVideojuegos(),listarPartidas()]).then(([a,b])=>{if(alive){setGames(a);setSessions(b)}}).catch(e=>{if(alive)setError((e as Error).message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[version]);
 const minutes=sessions.reduce((sum,s)=>sum+s.duracionMinutos,0);const achieved=games.reduce((sum,g)=>sum+g.logros.filter(l=>l.obtenido).length,0);const featured=games.find(g=>g.portada)||games[0];const secondary=games.filter(g=>g._id!==featured?._id).slice(0,2);
 return <div className="landing-page">
  <section className="landing-hero" aria-label="Presentación LEVEL UP"><div className="hero-grain"/><div className="hero-grid-lines"/>
   <div className="hero-overline"><span>VOL. 01 — PLAYER ARCHIVE</span><span>YOUR GAMES / YOUR RULES</span><span>© LEVEL UP</span></div>
   <div className="hero-copy"><h1><span>Level</span><span className="hero-title-up">up<span className="title-period">.</span></span></h1><p className="hero-subline">NO SOLO JUEGUES.<br/>DEJA TU HUELLA.</p><Link className="hero-enter" to="/biblioteca">ENTRAR A MI BIBLIOTECA <span aria-hidden="true">↗</span></Link></div>
   <div className="hero-visual" style={{'--scroll-shift':`${Math.min(scroll,600)*.16}px`} as React.CSSProperties}><div className="poster-frame"><div className="poster-top">01 / GAME CULTURE <span>PLAYER ONE</span></div>{featured?.portada?<img src={featured.portada} alt={`Portada de ${featured.nombre}`}/>:<div className="hero-placeholder"><span>PLAY</span><span>HARD</span></div>}<div className="poster-bottom"><b>{featured?.nombre||'TU PRÓXIMA AVENTURA'}</b><span>PRESS START ↗</span></div></div><span className="drawn-spark spark-one" aria-hidden="true">✳</span><span className="drawn-spark spark-two" aria-hidden="true">✴</span><span className="scribble-ring" aria-hidden="true"/><span className="drawn-spark spark-three" aria-hidden="true">✴</span></div>
   <div className="hero-bottom"><span>SCROLL TO UNLOCK ↓</span><span>001 — 005</span></div>
  </section>
  <div className="ticker" aria-hidden="true"><div className="ticker-track">PLAY / SAVE / REPEAT ✴ TRACK THE CHAOS ✴ OWN YOUR STORY ✴ PLAY / SAVE / REPEAT ✴ TRACK THE CHAOS ✳ OWN YOUR STORY ✳ </div></div>
  <section className="manifesto"><Reveal><span className="numbers-heading">[ 01 / EL MANIFIESTO ]</span><h2>Jugaste<br/><i>o viviste</i><br/>la partida?</h2></Reveal><Reveal delay={130} className="manifesto-note"><span className="note-spark">✱</span><p>Cada partida cuenta. Cada logro importa. LEVEL UP transforma todas esas horas frente a la pantalla en una historia que puedes ver, medir y recordar.</p><Link to="/partidas/nueva" className="ink-link">REGISTRAR UNA SESIÓN ↗</Link></Reveal>
</section>

<section className="numbers-section">

  <div className="numbers-heading">
    <span>[ 02 / TU UNIVERSO EN DATOS ]</span>
    <strong>THE SCOREBOARD ↗</strong>
  </div>

  {loading ? (
    <Loading />
  ) : error ? (
    <ErrorVista
      mensaje={error}
      reintentar={() => setVersion(v => v + 1)}
    />
  ) : (
    <div className="numbers-editorial">

      <Reveal>
        <div className="score-intro">
          <span className="score-label">PLAYER STATS / 001</span>

          <h2>
            Tus números.
            <br />
            <span>Tu historia.</span>
          </h2>

          <span className="score-spark" aria-hidden="true">✳</span>

          <p>
            CADA HORA CUENTA.
            <br />
            CADA PARTIDA DEJA HUELLA.
          </p>
        </div>
      </Reveal>

      <div className="score-cards">

        <Reveal>
          <div className="score-card score-games">
            <span className="score-card-index">01 / COLLECTION</span>
            <span className="score-card-spark">✳</span>

            <strong>
              {String(games.length).padStart(2, '0')}
            </strong>

            <div className="score-card-bottom">
              <h3>Juegos en tu universo</h3>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="score-card score-hours">
            <span className="score-card-index">02 / PLAYTIME</span>
            <span className="score-card-circle" aria-hidden="true" />

            <strong>
              {Math.round(minutes / 60 * 10) / 10}
              <em>h</em>
            </strong>

            <div className="score-card-bottom">
              <h3>Horas invertidas</h3>
            </div>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="score-card score-sessions">
            <span className="score-card-index">03 / SESSIONS</span>
            <span className="score-card-spark">✷</span>

            <strong>
              {String(sessions.length).padStart(2, '0')}
            </strong>

            <div className="score-card-bottom">
              <h3>Sesiones registradas</h3>
            </div>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <div className="score-card score-achievements">
            <span className="score-card-index">04 / ACHIEVEMENTS</span>
            <span className="score-card-spark">✦</span>

            <strong>
              {String(achieved).padStart(2, '0')}
            </strong>

            <div className="score-card-bottom">
              <h3>Logros desbloqueados</h3>
            </div>
          </div>
        </Reveal>

      </div>

      <div className="score-footer">
        <span>LEVEL UP © 2026</span>
        <span>KEEP PLAYING. KEEP GROWING. ↗</span>
      </div>

    </div>
  )}
</section>

<section className="spotlight-section">

  <Reveal>
    <span className="numbers-heading">
      [ 03 / EN TU RADAR ]
    </span>

    <h2>
      El juego
      <br />
      <i>del momento.</i>
    </h2>
  </Reveal>

  <div className="spotlight-layout">


    <Reveal className="spotlight-art">

      {featured?.portada ? (
        <img
          src={featured.portada}
          alt={`Arte de ${featured.nombre}`}
        />
      ) : (
        <div className="no-cover-art">
          YOUR NEXT
          <br />
          OBSESSION.
        </div>
      )}

      <span className="art-stamp">
        ★ PLAYER'S PICK
      </span>

    </Reveal>


    <Reveal
      delay={130}
      className="spotlight-description"
    >

      <div className="spotlight-cross">
        ✳
      </div>

      <span>
        EDITORIAL SELECT / 001
      </span>

      <h3>
        {featured?.nombre || 'TU BIBLIOTECA ESTÁ ESPERANDO'}
      </h3>

      <p>
        {featured?.descripcion ||
          'Aquí aparecerá el juego que marques en tu colección. Dale play a tu archivo personal.'}
      </p>


      <div className="spotlight-tags">

        <span>
          {featured?.genero || 'NUEVO JUEGO'}
        </span>

        <span>
          {featured?.estado || 'POR DESCUBRIR'}
        </span>

      </div>


      <Link
        className="editorial-cta"
        to={
          featured
            ? `/videojuegos/${featured._id}`
            : '/videojuegos/nuevo'
        }
      >
        {featured
          ? 'VER MI PROGRESO'
          : 'AÑADIR PRIMER JUEGO'}

        <b>↗</b>
      </Link>

    </Reveal>

  </div>

  {secondary.length > 0 && (
    <div className="mini-game-row">

      {secondary.map((g, i) => (

        <Reveal
          key={g._id}
          delay={i * 100}
        >

          <Link
            to={`/videojuegos/${g._id}`}
            className="mini-game"
          >

            <span>
              0{i + 2}
            </span>

            {g.portada && (
              <img
                src={g.portada}
                alt=""
              />
            )}

            <b>
              {g.nombre}
            </b>

            <span>
              ↗
            </span>

          </Link>

        </Reveal>

      ))}

    </div>
  )}

</section>

<section className="break-section">

  <Reveal>

    <p>
      PRESS START.
    </p>

    <h2>
      Stay a<em> while.</em>
    </h2>

  </Reveal>

  <div
    className="break-doodle"
    aria-hidden="true"
  >
    ✴
  </div>

</section>


<section className="final-section">

  <Reveal>
    <span className="score-spark" aria-hidden="true">✳</span>
    <span className="section-index">
      [ 04 / SIGUIENTE NIVEL ]
    </span>

    <h2>
      Ready
      <br />
      player ONE?
    </h2>

    <div className="final-actions">

      <Link
        to="/videojuegos/nuevo"
        className="final-primary"
      >
        + AGREGAR VIDEOJUEGO

        <span>↗</span>
      </Link>

      <Link
        to="/partidas/nueva"
        className="final-secondary"
      >
        + REGISTRAR PARTIDA

        <span>↗</span>
      </Link>

    </div>

  </Reveal>

  <div className="final-foot">

    <span>
      LEVEL UP / 2026
    </span>

    <span>
      DESIGNED TO PLAY. BUILT TO REMEMBER.
    </span>

    <span>
      END OF FILE ↗
    </span>

  </div>

</section>

 </div>
}
