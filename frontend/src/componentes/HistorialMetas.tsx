import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarMetas } from "../api/metasApi";
import type { Meta } from "../tipos";
import { ErrorVista, Loading, Vacio } from "./UI";
import "../paginas/FormularioMeta.css";

export function HistorialMetas({
  videojuegoId,
  revision = 0,
}: {
  videojuegoId: string;
  revision?: number;
}) {
  const [intento, setIntento] = useState(0);
  const clave = `${videojuegoId}/${revision}/${intento}`;
  const [estado, setEstado] = useState<{
    clave: string;
    cargando: boolean;
    error: string;
    metas: Meta[];
  }>({ clave: "", cargando: true, error: "", metas: [] });
  useEffect(() => {
    let vigente = true;
    setEstado({ clave, cargando: true, error: "", metas: [] });
    listarMetas(videojuegoId)
      .then((metas) => {
        if (vigente) setEstado({ clave, cargando: false, error: "", metas });
      })
      .catch((error: unknown) => {
        if (vigente)
          setEstado({
            clave,
            cargando: false,
            error:
              error instanceof Error
                ? error.message
                : "No se pudieron consultar las metas.",
            metas: [],
          });
      });
    return () => {
      vigente = false;
    };
  }, [videojuegoId, revision, intento, clave]);

  return (
    <section
      className="historial-metas"
      aria-labelledby="historial-metas-titulo"
    >
      <div className="historial-metas-heading">
        <span className="detalle-micro">TU RECORRIDO / OBJETIVOS</span>
        <h2 id="historial-metas-titulo">Tus metas.</h2>
        <p>Consulta los objetivos actuales y los que conservas inactivos.</p>
      </div>
      {estado.clave !== clave || estado.cargando ? (
        <div role="status">
          <Loading />
        </div>
      ) : estado.error ? (
        <div role="alert">
          <ErrorVista
            mensaje={estado.error}
            reintentar={() => setIntento((valor) => valor + 1)}
          />
        </div>
      ) : estado.metas.length === 0 ? (
        <Vacio
          titulo="Aún no hay metas"
          texto="Tus objetivos se conservarán aquí cuando crees tu primera meta."
        />
      ) : (
        <ul className="historial-metas-lista" aria-label="Metas del videojuego">
          {estado.metas.map((meta, indice) => (
            <li className="historial-meta" key={meta._id}>
              <div className="historial-meta-titulo">
                <h3>Meta {indice + 1}</h3>
                <span className="historial-meta-estado">
                  {meta.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <p>
                {meta.horasSemanales.toLocaleString("es-EC", {
                  maximumSignificantDigits: 21,
                })}{" "}
                horas semanales · {meta.diasPorSemana} días por semana
              </p>
              {meta.hitos.length === 0 ? (
                <p>Sin hitos definidos.</p>
              ) : (
                <ul
                  className="historial-meta-hitos"
                  aria-label={`Hitos de la meta ${indice + 1}`}
                >
                  {meta.hitos.map((hito, numero) => (
                    <li key={numero}>
                      <span>{hito.descripcion || "Hito sin descripción"}</span>
                      <span>
                        Objetivo:{" "}
                        {hito.porcentajeObjetivo.toLocaleString("es-EC")} %
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                className="meta-secondary"
                to={`/videojuegos/${videojuegoId}/metas/${meta._id}/editar`}
                aria-label={`Consultar o editar meta ${indice + 1}`}
              >
                Consultar / editar <span aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
