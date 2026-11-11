# E2 — Spec de backend: metas y progreso

**Estado: Borrador — pendiente de aprobación.** Crear este documento no autoriza implementar. No hay código E2 ni tests E2 ejecutados como parte de esta entrega.

## Fuentes y trazabilidad

Fuentes normativas: [PRD](../prd/level-up.md), [backlog E2](../backlog/E2-metas-y-rachas.md), [épicas](../backlog/epicas.md), [enunciado](../referencias/enunciado-E4.md), [diagnóstico](../diagnostico.md), [AGENTS.md](../../AGENTS.md) y [DESIGN.md](../../DESIGN.md). Contrato consumidor: [spec frontend](E2-frontend-metas-rachas.md).

Aplica a T-01 a T-13, T-19 y T-20 en su parte backend. Usa los IDs existentes, sin crear historias, criterios o tickets nuevos. La tabla de aceptación cubre **50 criterios**: CA-E2-01 a CA-E2-42, CA-E2-44 a CA-E2-46 y CA-E2-52 a CA-E2-56. Cuando el criterio también exige interacción visual, esta spec cubre su parte de servidor y la spec frontend completa la verificación.

## Objetivo, alcance y exclusiones

El backend DEBE gestionar metas y calcular progreso por videojuego respetando las trece decisiones del PRD. DEBE añadir edición de partidas, corregir fechas en el alcance D-01, pagar D-03 y D-04 y resolver la integridad de D-05. NO DEBE incorporar notificaciones, rankings, metas compartidas, gráficos históricos, estado Abandonado o nuevas reglas sobre logros manuales.

DEBE mantener modelos Videojuego y Partida, capas y contratos E1 salvo los puntos expresamente afectados por diagnóstico/E2. NO DEBE pagar D-06 a D-11 ni migrar fechas históricas por suposición. NO DEBE leer ni modificar `.env` o variantes, tampoco durante pruebas. Esta spec NO DEBE considerarse aprobada por silencio ni implementarse antes de aprobación explícita.

## Arquitectura y responsabilidades

- Rutas y controladores DEBEN validar el formato del contrato y delegar en servicios; el middleware central DEBE producir errores.
- Servicios DEBEN consultar y convertir documentos a datos simples, coordinar sesiones/transacciones y llamar al dominio. NO DEBEN contener el algoritmo de semana, días, rachas o hitos.
- `src/dominio/progreso.ts` DEBE recibir datos simples y un instante de referencia explícito. NO DEBE importar Mongoose, Express, conexión, configuración, reloj global ni hacer I/O; NO DEBE mutar sus entradas.
- `src/dominio/fechas.ts` DEBE convertir instantes a fechas civiles de America/Guayaquil sin depender de la zona del servidor. Los instantes de producción proceden de un reloj en el límite del servicio, capturado una vez por operación; los tests lo sustituyen.
- Una consulta de progreso DEBE leer juego, meta activa e historial dentro de una sesión de lectura con snapshot consistente. DEBE ordenar/proyectar solo lo necesario. No se añade paginación al historial usado para rachas, que requiere todo el historial.

## Modelo Meta y validación

Nueva colección `metas`; no se crean colecciones de hitos ni de cierres semanales.

| Campo                    | Contrato y validación                                                                                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`                    | Generado por MongoDB; serializado como string. No se acepta en escritura del cliente.                                                                                                                                                   |
| `videojuego`             | ObjectId obligatorio, referencia a Videojuego existente. Inmutable una vez creada la meta.                                                                                                                                              |
| `horasSemanales`         | Número finito obligatorio, mayor que 0 y hasta 100. Admite decimales, sin mínimo adicional ni obligación de entero.                                                                                                                     |
| `diasPorSemana`          | Número obligatorio entero entre 1 y 7.                                                                                                                                                                                                  |
| `activa`                 | Booleano, por defecto true en creación si se omite. false permite conservar una meta inactiva; activarla exige las mismas comprobaciones de unicidad/estado.                                                                            |
| `hitos`                  | Arreglo embebido, por defecto vacío, máximo cinco. Cada elemento tiene `descripcion` string y `porcentajeObjetivo` número finito entre 1 y 100; admite decimales. No se añaden límites de texto o unicidad de porcentajes no aprobados. |
| `createdAt`, `updatedAt` | Timestamps del servidor; creación estable y actualización refleja guardados. No editables por el cliente.                                                                                                                               |

El contrato HTTP DEBE comprobar tipos antes del casteo de Mongoose: strings numéricos, null, booleanos o arreglos NO DEBEN aceptarse como números. Ausencia de horas/días en creación o sustitución completa DEBE ser 400. Un hito DEBE incluir sus dos campos; una descripción vacía sigue siendo string, sin imponer un requisito de texto no vacío que el PRD no aprobó. Campos desconocidos o calculados (`alcanzado`, `cumplidaSemana`, timestamps) DEBEN rechazarse con 400. Un fallo NO DEBE guardar parte de una edición.

Meta se referencia porque tiene ciclo de vida e historial independientes de la ficha del juego. Los hitos se embeben porque son hasta cinco y solo tienen sentido dentro de su meta. `alcanzado` NO DEBE persistirse: depende del avance actual, incluso si retrocede. Los IDs internos de subdocumentos, si Mongoose los genera, NO DEBEN formar parte del contrato público de hito; el arreglo se reemplaza en conjunto.

## Unicidad, estado y concurrencia

La colección DEBE tener un índice único parcial sobre `videojuego` con filtro `activa: true`. NO DEBE usarse solo una consulta previa como garantía. `Meta.init()` o inicialización equivalente DEBE completar el índice antes de atender escrituras; el índice NO DEBE eliminar metas o resolver duplicados silenciosamente. Un error E11000 del índice DEBE traducirse a 409.

Crear/activar una meta DEBE comprobar la existencia y el estado del juego en la misma transacción que la escritura. Un juego Completado DEBE rechazar la activación con 409. Pendiente, Jugando y En pausa NO DEBEN tratarse como abandono; no se añade un estado. Modificar un juego para dejarlo Completado con una meta activa DEBE responder 409 y conservar el estado previo. El usuario puede desactivar la meta y después completar el juego. Esta secuencia concreta CA-E2-35 sin cambiar el invariante ni desactivar objetivos sin confirmación.

Crear/activar/editar metas, crear/editar/eliminar partidas, cambiar estado y eliminar el juego DEBEN compartir una guarda transaccional por videojuego. La guarda DEBE efectuar una escritura efectiva sobre el padre existente, mediante incremento de su `__v` interno, con sesión y timestamps automáticos desactivados para esa escritura interna; no altera campos descriptivos ni el `updatedAt` de la ficha por editar una meta. NO DEBE ser un `$set` sin cambios que no provoque conflicto. El resto de actualizaciones sobre el mismo juego DEBE evitar guardar una versión obsoleta del documento. Así las operaciones concurrentes se serializan por conflicto de escritura y releen existencia/estado al reintentar.

DEBE usarse `Connection#transaction` o `withTransaction`, pasando la sesión a todas las operaciones y ejecutándolas secuencialmente dentro de ella. NO DEBE usarse Promise.all dentro de una transacción. Los callbacks reintentables NO DEBEN enviar respuestas HTTP ni emitir confirmaciones externas. El helper del driver gestiona errores transitorios; el adaptador DEBE imponer un presupuesto de operación de 10 segundos y `maxCommitTimeMS` de 5 segundos, sin bucles propios ilimitados. Si no se confirma el resultado, NO DEBE responder éxito.

## Contratos HTTP

Base `/api`. IDs: strings ObjectId de 24 caracteres hexadecimales. Formato inválido: 400 antes de consultar. Recurso válido pero ausente: 404. Respuestas JSON DEBEN incluir `requestId` y cabecera `X-Request-Id`; 204 solo incluye la cabecera, sin cuerpo. Las respuestas existentes de E1 NO DEBEN cambiar de envoltorio.

| Método y ruta                           | Entrada                                                                           | Salida de éxito                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| POST `/metas`                           | `videojuego`, `horasSemanales`, `diasPorSemana`, `activa?`, `hitos?`              | 201, `{meta, requestId}`.                                                                                                       |
| GET `/metas/:id`                        | ID                                                                                | 200, `{meta, requestId}`.                                                                                                       |
| GET `/videojuegos/:id/metas`            | ID de juego existente                                                             | 200, `{total, metas, requestId}`; activas e inactivas, orden `createdAt` descendente y `_id` descendente; vacío es lista vacía. |
| PUT `/metas/:id`                        | `horasSemanales`, `diasPorSemana`, `hitos`; `activa?` conserva estado si se omite | 200, `{meta, requestId}`; `videojuego` no se admite como cambio.                                                                |
| PATCH `/metas/:id/desactivar`           | Sin cuerpo o `{}`                                                                 | 200, `{meta, requestId}`, `activa: false`; si ya era inactiva sigue inactiva sin borrar.                                        |
| GET `/videojuegos/:id/progreso-semanal` | ID; no se acepta una semana o reloj del cliente                                   | 200, `{progreso, requestId}` con el objeto descrito abajo.                                                                      |
| GET `/partidas/:id`                     | ID                                                                                | 200, `{partida, requestId}` con `videojuego` como string; lectura necesaria para precargar edición.                             |
| PUT `/partidas/:id`                     | `fecha`, `duracionMinutos`, `porcentajeAvance`, `notas`                           | 200, `{partida, requestId}`; no cambia el videojuego.                                                                           |
| POST `/partidas`                        | Campos existentes, con `fecha` inequívoca                                         | Mantiene 201 y `{partida, requestId}`.                                                                                          |
| DELETE `/partidas/:id`                  | ID                                                                                | Mantiene 204 sin cuerpo.                                                                                                        |
| PUT `/videojuegos/:id`                  | Contrato E1 existente                                                             | Mantiene 200; añade rechazo 409 de transición incompatible, sin corregir otros defectos del formulario.                         |
| DELETE `/videojuegos/:id`               | ID                                                                                | Mantiene 204 después del commit de eliminación conjunta.                                                                        |

`meta` DEBE serializar `_id`, `videojuego`, `horasSemanales`, `diasPorSemana`, `activa`, `hitos`, `createdAt`, `updatedAt`; fechas ISO UTC. Cada hito público solo lleva descripción y objetivo. NO DEBE existir DELETE independiente de Meta: la operación del producto es desactivar, conservando anteriores. Reactivar mediante PUT DEBE respetar CA-E2-11 y RN-11.

`progreso` DEBE contener exactamente estos campos de dominio, además de poder conservar el envoltorio descrito:

| Campo                       | Tipo y significado                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `semana`                    | `{inicio, fin}` strings `YYYY-MM-DD`, lunes y domingo inclusivos en Ecuador; el filtro interno usa lunes siguiente exclusivo. |
| `meta`                      | null o `{_id, horasSemanales, diasPorSemana}` de la activa. El ID permite acceder a su edición.                               |
| `horasSemana`               | Número a un decimal, sin límite al objetivo.                                                                                  |
| `porcentajeHoras`           | Entero de 0 a 100, o null sin meta.                                                                                           |
| `diasJugadosSemana`         | Entero de 0 a 7.                                                                                                              |
| `rachaActual`, `mejorRacha` | Enteros no negativos, sobre todo el historial del juego.                                                                      |
| `hitos`                     | Arreglo de `{descripcion, porcentajeObjetivo, alcanzado}` de la activa, o `[]` sin ella.                                      |
| `cumplidaSemana`            | Booleano con meta o null sin meta: ambos objetivos alcanzados. No confundir con porcentaje.                                   |

Ejemplo contractual: con 210 minutos en tres días, meta de 5 horas y 4 días, se devuelven `horasSemana: 3.5`, `porcentajeHoras: 70`, `diasJugadosSemana: 3`, `cumplidaSemana: false`. Con 7 horas y solo 3 días, el porcentaje es 100 y el cumplimiento sigue siendo false. El envoltorio `{progreso, requestId}` sigue el patrón de `{resumen, requestId}` de E1; los campos del ejemplo del profesor se conservan dentro de `progreso`.

## Validación de partidas y fechas (D-01)

`fecha` DEBE representar el inicio como ISO 8601 con hora y offset explícito o Z; se aceptan instantes equivalentes y se almacenan como Date UTC. Strings sin zona, fechas imposibles, números y null DEBEN rechazarse con 400, sin normalizar fechas inexistentes como 30 de febrero. NO DEBE interpretarse una cadena local con la zona del servidor. El frontend enviará el instante convertido desde la fecha civil de Ecuador.

DEBE capturarse `ahora` una vez antes de validar la operación. Se acepta `fecha <= ahora`, incluida igualdad; `fecha > ahora` DEBE ser 400 en registro y edición, incluso en el mismo día. Se valida el inicio, no el fin estimado: una sesión ya iniciada puede cruzar medianoche. Los registros antiguos DEBEN leerse por el instante guardado convertido a America/Guayaquil; NO DEBE reescribirse su fecha ni suponerse que se conoce la intención original de un registro ambiguo. Cualquier dato futuro preexistente requiere revisión de calidad separada, no una migración silenciosa.

La edición DEBE conservar el juego referenciado y las validaciones de Partida: minutos enteros 1–1440, avance finito 0–100 y notas de hasta 500 caracteres con trim existente. La entrada de PUT DEBE estar completa, comprobar tipos y guardarse de forma atómica. IDs/recursos ausentes: 400/404. Los 60 minutos y 0 % existentes como valores iniciales de la UI NO DEBEN sustituir un dato inválido recibido.

## Diseño del dominio puro

Los nombres siguientes son funciones propuestas, no código implementado. Entradas: DTOs readonly de partidas (`id`, `fechaInicio` como instante, `duracionMinutos`, `porcentajeAvance`, `createdAt`), meta activa o null y `ahora` explícito. Las fechas deben estar validadas por el límite de entrada.

| Función propuesta     | Entrada → salida                                            | Reglas                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fechaCivilEcuador`   | Instante → `YYYY-MM-DD` y ordinal de día                    | IANA America/Guayaquil mediante conversión explícita. No usar `getDay`/medianoche local del host.                                                                     |
| `semanaEcuador`       | `ahora` → inicio/fin civil y límites de instante            | Lunes 00:00 incluido; lunes siguiente 00:00 excluido; fin público domingo. Aritmética de calendario para cambios de mes/año y años bisiestos.                         |
| `actividadSemanal`    | Partidas, semana → minutos, horas y días únicos             | Filtrar por inicio; sumar minutos completos; deduplicar fechas civiles. Una sesión del domingo que acaba lunes no se divide.                                          |
| `porcentajeHoras`     | Horas redondeadas, objetivo → entero                        | `min(100, round(horasSemana / horasSemanales × 100))`; sin meta devuelve null desde el coordinador.                                                                   |
| `rachas`              | Fechas civiles únicas y `hoy` → actual/mejor                | Ordenar ordinales; calcular mayor secuencia. Actual termina hoy si hay actividad hoy, o ayer si solo ayer; si ninguno, 0. No reiniciar por semana ni sumar hoy vacío. |
| `avanceActual`        | Partidas → porcentaje o 0                                   | Orden `fechaInicio` descendente, `createdAt` descendente y ID descendente, como resumen E1. No usar orden de inserción ni máximo.                                     |
| `estadoHitos`         | Hitos, avance actual → hitos con booleano                   | `avanceActual >= objetivo`; sin partidas avance 0 y ninguno alcanzado por umbral mínimo 1. Sin meta no se reciben hitos anteriores.                                   |
| `cumplimientoSemanal` | Minutos sin redondear, días distintos, meta → booleano/null | Comprobar duración real frente al objetivo y días frente al objetivo. El redondeo visual o un 100 % redondeado NO DEBE sustituir alcanzar las horas reales.           |
| `calcularProgreso`    | Partidas, meta, `ahora` → objeto `progreso`                 | Coordina las funciones anteriores sin I/O ni mutación.                                                                                                                |

Las horas DEBEN redondearse una vez tras sumar todos los minutos: `round(minutos / 60 × 10) / 10`. El porcentaje usa esas horas conforme al enunciado: 97 minutos → 1,6 h → 53 % para objetivo 3. El cumplimiento compara tiempo real y días, por lo que un porcentaje visual redondeado a 100 no demuestra por sí solo haber alcanzado la duración ni los días. No se añade una precisión mínima al objetivo de horas.

DEBE verificarse también el límite de redondeo: 299 minutos y objetivo de 5 horas pueden mostrarse como 5,0 h y 100 %, pero aún no alcanzan las 5 horas reales para `cumplidaSemana`. Un objetivo decimal muy pequeño sigue siendo válido aunque las horas visibles se redondeen a 0,0; NO DEBE alterarse el objetivo para acomodar el formato visual. Estas pruebas distinguen redondeo de presentación y consecución real de ambos objetivos.

La métrica mensual de CA-E2-56 DEBE verificarse con cuatro resultados de semanas evaluadas: al menos tres true. NO DEBE añadirse endpoint, colección o pantalla de analítica mensual ni decidir una política de cierres históricos que no existe en el alcance.

## Integración con E1 y casos límite

`GET /videojuegos/:id/resumen` DEBE mantener su contrato, horas a dos decimales, valores sin partidas y desempate existente. Progreso semanal DEBE usar el mismo resultado lógico de avance actual. Se permite extraer la selección pura a `avanceActual` y reutilizarla desde ambos servicios, sin cambiar el resumen ni corregir listados/estadísticas diferidos.

DEBEN probarse semana que cruza mes/año, 29 de febrero, lunes exacto, domingo antes de lunes, UTC y Ecuador en días diferentes, consulta desde zonas distintas y duplicados diarios. Las rachas DEBEN usar ordinales de días civiles, no división de diferencias entre instantes de sesión por 24 horas. Partidas no ordenadas NO DEBEN cambiar el resultado.

Sin meta activa: `meta: null`, `porcentajeHoras: null`, `cumplidaSemana: null`, `hitos: []`; horas, días y ambas rachas sí se calculan. Sin partidas: horas/días/rachas 0 y hitos false; con meta porcentaje 0 y cumplimiento false, sin ella null. Juego inexistente NO DEBE confundirse con historial vacío.

## Eliminación segura (D-05)

La política DEBE ser transaccional y de todo o nada: dentro de la guarda del juego, eliminar sus partidas, todas sus metas activas/inactivas (con sus hitos embebidos) y el juego en una única transacción. Solo DEBE responder 204 después del commit. En fallo previo al commit se aborta y conserva el conjunto anterior; una pérdida de confirmación de commit NO DEBE anunciar éxito sin confirmación y se verifica el estado final en la prueba inducida.

Todas las vías de creación de hijos y cambios de estado DEBEN participar en la guarda descrita, para que la creación concurrente o bien preceda a la eliminación y sea eliminada con ella, o relea un padre ausente y responda 404/409. Una mera transacción que lee el padre sin escribirlo NO DEBE considerarse prueba suficiente contra la carrera. NO DEBE haber borrado de un juego distinto.

El entorno de integración DEBE soportar transacciones (replica set). NO DEBE existir fallback a borrado secuencial si no hay soporte: se informa fallo y no se inicia un borrado parcial. El mecanismo también se aplica a guardados de partidas/meta que referencian al padre, sin convertir E1 en un sistema multiusuario ni añadir una entidad nueva de bloqueo.

## Errores y deudas seleccionadas

| Estado | Casos y respuesta                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | JSON mal formado, tipos/campos/rangos inválidos, IDs mal formados, fecha inválida/sin zona/futura. `{error, requestId}`.                                           |
| 404    | Juego, meta o partida no existentes, incluida referencia válida de juego ausente al crear.                                                                         |
| 409    | Otra meta activa, índice único, activar en Completado, completar conservando activa o conflicto de operación que no puede confirmarse como escritura válida.       |
| 500    | Fallo inesperado de servicio/conexión/commit no clasificable como conflicto de negocio. Mensaje público genérico, detalle solo en registro interno correlacionado. |

Para D-03, el orden DEBE asignar `requestId` y registrar la petición antes de `express.json`; CORS DEBE permitir el frontend y exponer `X-Request-Id` si se consulta desde navegador. El error del parser DEBE reconocerse por su naturaleza y estado, sin clasificar todo SyntaxError de aplicación como error del cliente. Los handlers async DEBEN propagar al middleware central. No se modifica el cliente compartido para pagar D-11.

Para D-04, `conectarDB` DEBE pasar `env.mongodbDb` como `dbName` y no el literal `levelup`; el fallback resuelto en la configuración sigue siendo `level_up`. Se probarán nombre explícito y defecto. Se revisa el código de configuración, NO sus archivos privados ni ejemplos.

## Estrategia automatizada y evidencias

En T-01 se DEBE añadir Vitest compatible con el Vite 5/TypeScript del proyecto, Supertest para HTTP y un replica set local efímero con `mongodb-memory-server-core` compatible o binario local controlado. Se DEBEN fijar versiones compatibles en lockfile; no instalar ciegamente la última versión ni actualizar librerías productivas fuera del ticket. El replica set DEBE ser exclusivo de pruebas, no Atlas personal; las pruebas de transacción/concurrencia NO DEBEN sustituirse por mocks.

Los tests DEBEN vivir fuera de `src` en `backend/tests/` y usar `backend/vitest.config.mts` independiente, con carga de archivos de entorno desactivada (`envDir: false`). El setup DEBE interceptar `dotenv/config` antes de importar aplicación/configuración y proporcionar valores ficticios controlados. Para D-04 se prueba el resolver real de configuración con variables de proceso aisladas y `dotenv/config` neutralizado; se restaura el estado después. NO DEBE importarse `index.ts` ni abrir el puerto de producción.

Comandos propuestos, aún inexistentes: `npm.cmd --prefix backend run test:unit`, `test:integration` y `test` (suite completa). T-07 y T-09 escriben primero tests identificados con CA reales; T-08 y T-10 los hacen pasar. Cada criterio verificable sin base DEBE tener al menos un test puro. La tabla siguiente especifica también las pruebas HTTP/persistencia que completan criterios compartidos. Los tests de CA-E2-56 DEBEN separar porcentaje y ambos objetivos e incluir tres/cuatro semanas cumplidas y dos/cero.

T-19 DEBE verificar regresión del resumen E1, logros manuales y flujos afectados, y aportar la tabla HTTP del profesor: juego sin partidas, juego con cinco o más días y racha rota, 400/404/409. T-20 enlaza evidencia real y auditoría; NO DEBE marcar criterios pagados por tener solamente una prueba escrita. Red/descarga de binario/replica set no disponible es una limitación, no una prueba aprobada.

## Criterio de aceptación → verificación

Cada fila usa el criterio original completo; no lo reemplaza. **P**: función pura sin DB; **I**: integración HTTP/persistencia real aislada; **R**: regresión E1; **F**: la interacción restante está en la spec frontend. Todas las verificaciones están pendientes.

| Criterio | Verificación prevista y resultado exigido                                                                   | Tickets          |
| -------- | ----------------------------------------------------------------------------------------------------------- | ---------------- |
| CA-E2-01 | I crear 5 h/4 días/2 hitos, leer activa por defecto y mismo juego; F envío.                                 | T-04, T-05       |
| CA-E2-02 | I GET individual y listado de juego: misma identidad, activos/inactivos aislados.                           | T-05             |
| CA-E2-03 | I matriz de horas 0,5/100 válidas; 0/negativo/>100/ausente/tipo inválido 400; edición fallida conserva.     | T-04, T-05       |
| CA-E2-04 | I días 1/7 válidos y 0/8/fracción/ausente/tipo inválido 400.                                                | T-04, T-05       |
| CA-E2-05 | I arreglos de 0/5 admitidos, 6 rechazados y sin cambio parcial.                                             | T-04, T-05       |
| CA-E2-06 | I umbrales 1/50,5/100 válidos; fuera de rango y tipos ausentes/incorrectos 400.                             | T-04, T-05       |
| CA-E2-07 | I juego mal formado 400 y válido ausente 404; colección Meta sin huérfano.                                  | T-05             |
| CA-E2-08 | I meta mal formada 400/ausente 404 en consulta, PUT y desactivación.                                        | T-05             |
| CA-E2-09 | I dos creaciones concurrentes contra índice inicializado: una activa, otra 409.                             | T-06             |
| CA-E2-10 | I metas inactivas no bloquean y juego ajeno no cambia.                                                      | T-06             |
| CA-E2-11 | I segunda activa y reactivación por PUT fallan 409 sin cambios en vigente.                                  | T-06             |
| CA-E2-12 | I edición de objetivos/hitos completa o rollback; ficha descriptiva inalterada.                             | T-05             |
| CA-E2-13 | P e I cambiar 6 h/4 días a 3 h/2 días: misma actividad, 50→100 %, cumplimiento true.                        | T-07, T-08, T-11 |
| CA-E2-14 | I PATCH conserva datos e inactiva, repetición segura; F cancelación/confirmación.                           | T-05             |
| CA-E2-15 | I listado conserva anterior inactiva y actual activa; progreso solo usa actual.                             | T-05, T-11       |
| CA-E2-16 | P semana 9–15/11/2026 y límites UTC equivalentes, mes/año/bisiesto y zonas del host distintas.              | T-07, T-08, T-11 |
| CA-E2-17 | P 210 min→3,5 h y 70 % con 5 h, sin peso de días.                                                           | T-07, T-08       |
| CA-E2-18 | P 97 min→1,6 y 53 % con objetivo 3.                                                                         | T-07, T-08       |
| CA-E2-19 | P 7 h frente a 5: horas 7, porcentaje 100.                                                                  | T-07, T-08       |
| CA-E2-20 | P e I dos lunes/un miércoles: dos fechas y todas sus duraciones, otro juego excluido.                       | T-07, T-08, T-11 |
| CA-E2-21 | P domingo 23:30 de 120 min: duración/día solo en semana de inicio; límites de instante.                     | T-07, T-08       |
| CA-E2-22 | P historial 1–5 y 9–11 con hoy 11: actual 3, mejor 5.                                                       | T-09, T-10       |
| CA-E2-23 | P historial 8–10 con hoy 11: actual 3, sin sumar hoy y sin reset de lunes.                                  | T-09, T-10       |
| CA-E2-24 | P hoy y ayer vacíos, secuencia 1–5: actual 0, mejor 5.                                                      | T-09, T-10       |
| CA-E2-25 | P e I deduplicación e independencia por juego, sin rellenar huecos con juego ajeno.                         | T-09, T-10, T-11 |
| CA-E2-26 | P hitos 25/50/100, avance 50: true/true/false aunque horas cambien.                                         | T-09, T-10       |
| CA-E2-27 | P e I 60→40 revierte hito 50; R logros manuales intactos.                                                   | T-09, T-10, T-19 |
| CA-E2-28 | P e I registro histórico posterior no cambia última sesión lógica; R empate por creación/ID.                | T-09, T-10, T-19 |
| CA-E2-29 | P sin partidas, hitos 1 y superiores false.                                                                 | T-09, T-10       |
| CA-E2-30 | I solo metas inactivas: meta/porcentaje/cumplimiento null, hitos [], actividad calculada; F invitación.     | T-11             |
| CA-E2-31 | P e I meta sin sesiones: ceros, objetivos presentes e hitos false.                                          | T-10, T-11       |
| CA-E2-32 | P e I sin metas/sesiones: ceros, nulls e hitos []; F invitación.                                            | T-11             |
| CA-E2-33 | I progreso: 400 ID mal formado y 404 juego ausente, nunca ceros de éxito.                                   | T-11             |
| CA-E2-34 | I Completado rechaza crear/activar con 409 y no persiste activa.                                            | T-06             |
| CA-E2-35 | I transición Completado con activa devuelve 409 y conserva juego/meta; prueba concurrente.                  | T-06             |
| CA-E2-36 | I catálogo original y En pausa permite activa si no hay conflicto, sin Abandonado.                          | T-06             |
| CA-E2-37 | P e I inicio pasado/igual a ahora aceptado, ordinal por Ecuador y efecto en mejor racha.                    | T-08, T-12       |
| CA-E2-38 | P validador con reloj e I POST/PUT: futuro hoy/otro día 400, ningún cambio.                                 | T-12             |
| CA-E2-39 | I PUT fecha/minutos/avance/notas y GET posterior recalcula; F refresco sin recarga.                         | T-12             |
| CA-E2-40 | I límites 1/1440, 0/100, inválidos/500 notas, datos completos o rechazo sin cambios.                        | T-12             |
| CA-E2-41 | I PUT/DELETE mal formado 400 y ausente 404 sin afectar otras partidas.                                      | T-12             |
| CA-E2-42 | I consulta después de POST/DELETE y última sesión borrada; F nueva consulta automática.                     | T-12             |
| CA-E2-44 | I borrar juego con meta activa/inactivas e hijos; otro juego intacto.                                       | T-13             |
| CA-E2-45 | I inducir fallo tras cada paso y durante commit: rollback o borrado completo verificado, nunca éxito falso. | T-13             |
| CA-E2-46 | I carrera real crear hijo/eliminar padre, con ambas intercalaciones y sesiones reales.                      | T-13             |
| CA-E2-52 | I JSON mal formado 400, cabecera/cuerpo/log con mismo requestId.                                            | T-03             |
| CA-E2-53 | I cuatro estados diferenciados, 409 real de unicidad, 500 sin detalles; no modificar vigente.               | T-03, T-06, T-19 |
| CA-E2-54 | I adaptador de conexión con config real controlada: dbName level_up_pruebas.                                | T-02             |
| CA-E2-55 | I configuración sin nombre explícito: dbName level_up, dotenv neutralizado.                                 | T-02             |
| CA-E2-56 | P horas+días, excesos y cuatro resultados: 3/4 o 4/4 éxito, 0/4–2/4 no; I expone cumplimiento.              | T-07, T-08, T-11 |

CA-E2-43 y CA-E2-47 a CA-E2-51 son de interacción y se verifican en frontend; esta exclusión de responsabilidad NO DEBE interpretarse como falta de cobertura global.

## Ticket → archivos afectados

**E:** existe y se modifica solo en el alcance indicado. **N:** nuevo propuesto, no se crea en Fase 5. Rutas relativas a la raíz. Las pruebas se separan de `src` para no emitir tests en `dist`. No se listan archivos privados de entorno como destino.

| Ticket | Archivos afectados y estado                                                                                                                                                                                                                                                                 | Límite y evidencia                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| T-01   | E `backend/package.json`, `backend/package-lock.json`; N `backend/vitest.config.mts`, `backend/tests/setup.ts`, `backend/tests/infraestructura.test.ts`, `backend/tests/soporte/replica.ts`                                                                                                 | Configuración aislada y comandos; no implementar reglas. Parte frontend en su spec.   |
| T-02   | E `backend/src/conexionDB.ts`; N `backend/tests/configuracion-db.test.ts`                                                                                                                                                                                                                   | D-04, resolver existente observado sin cambiar sus defaults.                          |
| T-03   | E `backend/src/app.ts`, `backend/src/middlewares/errorHandler.ts`; N `backend/tests/errores-http.test.ts`                                                                                                                                                                                   | D-03/contrato; requestId/logger existentes se reutilizan sin refactor ajeno.          |
| T-04   | N `backend/src/modelos/Meta.model.ts`, `backend/tests/meta-validacion.test.ts`                                                                                                                                                                                                              | Referencia, hitos, timestamps, índice.                                                |
| T-05   | N `backend/src/services/metas.service.ts`, `backend/src/controllers/metas.controller.ts`, `backend/src/routes/metas.routes.ts`, `backend/tests/metas-http.test.ts`; E `backend/src/app.ts`, `backend/src/routes/videojuegos.routes.ts`, `backend/src/controllers/videojuegos.controller.ts` | CRUD y listado anidado, sin borrar anteriores.                                        |
| T-06   | N `backend/src/services/integridad.service.ts`, `backend/tests/metas-concurrencia.test.ts`, `backend/tests/estados-meta.test.ts`; N inicialmente en T-04/T-05 `backend/src/modelos/Meta.model.ts`, `backend/src/services/metas.service.ts`; E `backend/src/services/videojuegos.service.ts` | Índice, guarda y transición; no tocar enum de estados.                                |
| T-07   | N `backend/tests/dominio/semana-actividad.test.ts`, `backend/tests/dominio/cumplimiento.test.ts`                                                                                                                                                                                            | Tests primero.                                                                        |
| T-08   | N `backend/src/dominio/fechas.ts`, `backend/src/dominio/progreso.ts`; N inicialmente T-07 `backend/tests/dominio/semana-actividad.test.ts`, `backend/tests/dominio/cumplimiento.test.ts`                                                                                                    | Cálculo puro de semana/actividad/porcentaje/cumplimiento.                             |
| T-09   | N `backend/tests/dominio/rachas-hitos.test.ts`, `backend/tests/resumen-regresion.test.ts`                                                                                                                                                                                                   | Tests primero de selección de avance y resultados.                                    |
| T-10   | N inicialmente T-08 `backend/src/dominio/progreso.ts`; E `backend/src/services/videojuegos.service.ts`; N inicialmente T-09 `backend/tests/dominio/rachas-hitos.test.ts`, `backend/tests/resumen-regresion.test.ts`                                                                         | Rachas/hitos y extracción de avance compatible; no cambiar resumen público.           |
| T-11   | N `backend/src/services/progreso.service.ts`, `backend/tests/progreso-http.test.ts`; E `backend/src/controllers/videojuegos.controller.ts`, `backend/src/routes/videojuegos.routes.ts`                                                                                                      | Orquestación y snapshot; dominio en T-08/T-10.                                        |
| T-12   | E `backend/src/services/partidas.service.ts`, `backend/src/controllers/partidas.controller.ts`, `backend/src/routes/partidas.routes.ts`; N `backend/src/validaciones/partida.ts`, `backend/tests/partidas-http.test.ts`; N inicialmente T-06 `backend/src/services/integridad.service.ts`   | GET/PUT de edición, futuro y validación de entrada sin cambiar esquema de Partida.    |
| T-13   | E `backend/src/services/videojuegos.service.ts`, `backend/src/services/partidas.service.ts`; N inicialmente T-05/T-06 `backend/src/services/metas.service.ts`, `backend/src/services/integridad.service.ts`; N `backend/tests/eliminacion-integridad.test.ts`                               | Transacción conjunta y carreras de hijos/estado.                                      |
| T-19   | N `backend/tests/e2-regresion.test.ts`                                                                                                                                                                                                                                                      | Integración, HTTP e integridad, sin sustituir dominio por mocks.                      |
| T-20   | E `docs/backlog/E2-metas-y-rachas.md`; N `docs/AUDITORIA.md`, `docs/bitacora-agente.md`                                                                                                                                                                                                     | Solo fase futura, resultados y referencias reales; no modificar estos archivos ahora. |

Los tickets T-14 a T-18 y su parte de T-01/T-19/T-20 están en la spec frontend. «N inicialmente» sigue significando archivo nuevo respecto al repositorio observado; se edita después de que su ticket creador lo incorpore. Ningún archivo de aplicación de la tabla se crea con esta spec.

## Referencias técnicas y limitaciones de aprobación

La elección de transacción y operaciones secuenciales se apoya en [Mongoose 8: transacciones](https://mongoosejs.com/docs/8.x/docs/transactions.html); la garantía del filtro único se apoya en [MongoDB: índices parciales](https://www.mongodb.com/docs/manual/core/index-partial/). La solución de guarda por escritura del padre es el diseño propuesto de esta spec y DEBE demostrarse con las pruebas de concurrencia, no asumirse por esas referencias.

[Vitest 3](https://v3.vitest.dev/guide/) documenta compatibilidad con Vite 5; [mongodb-memory-server](https://typegoose.github.io/mongodb-memory-server/docs/guides/quick-start-guide/) documenta replica sets y requisitos que varían por versión. La versión concreta compatible, el binario disponible y el soporte de transacciones del entorno real NO se han comprobado aquí. No se afirma que la instalación o esas pruebas hayan funcionado. Los límites de entorno no autorizan degradar la integridad aprobada.

**Registro de aprobación:** pendiente. Tras aprobar, ejecutar por dependencias del backlog y conservar la spec anterior al código en el historial cuando el usuario autorice commits.

## Comprobaciones de esta entrega documental

Se comprobó que esta tabla contiene 50 criterios reales del backlog y la de frontend 49; la unión cubre los 56, con 43 compartidos y ninguno sin verificación prevista. Las tablas de ambas specs vinculan los 20 tickets. Se verificó mediante existencia de rutas la clasificación de archivos E/N y los enlaces locales; los archivos N de aplicación siguen sin crearse. Se revisó la coherencia de contratos entre ambas specs y el mantenimiento de las trece decisiones del PRD.

Los seis tests existentes del harness pasaron y `check:harness` finalizó correctamente; los documentos se revisaron con Prettier. Esos resultados NO acreditan las pruebas de dominio, persistencia, concurrencia, HTTP o navegador descritas aquí. No se conectó a MongoDB ni se instalaron dependencias nuevas en esta fase.
