# Diagnóstico del Proyecto 3 — LEVEL UP

## Propósito y alcance

Fase 1 del Entregable 4, como preparación de la épica E2: Metas y rachas mediante Spec-Driven Development (SDD). Este documento registra el diagnóstico y las decisiones aprobadas; no implementa correcciones ni define todavía el PRD, las especificaciones o el harness.

La documentación se realiza en la rama `feature/e2-metas-rachas`, comprobada antes de crear este archivo. Las rutas de evidencia son relativas a la raíz del repositorio.

No se encontró un enunciado formal del Proyecto 3. La evaluación se basa en el README y el código disponible. Una funcionalidad «implementada» tiene recorrido identificable en código, pero no se considera validada en ejecución contra MongoDB.

## Estructura y estado del Proyecto 3

El backend utiliza Express, TypeScript y Mongoose. Separa modelos, servicios, controladores y rutas para videojuegos y partidas. Incluye conexión a MongoDB, configuración y middleware de identificación de solicitudes, registro y errores.

`Videojuego` contiene información del juego y logros embebidos. `Partida` referencia un videojuego y registra fecha, duración, avance y notas. Ambos modelos tienen timestamps; las partidas cuentan con un índice por videojuego y fecha.

El frontend utiliza React, TypeScript y Vite. Contiene seis páginas, un cliente HTTP centralizado, módulos API, componentes compartidos y estilos globales y por página. Incluye navegación, animaciones y reglas responsive, de foco y movimiento reducido. No se realizó una evaluación visual en navegador.

| Funcionalidad existente | Estado observado |
| --- | --- |
| CRUD de videojuegos | Implementado en API e interfaz. La edición presenta los problemas D-06 y D-08. |
| Biblioteca y filtros por nombre, género y estado | Implementados; la búsqueda presenta D-07. |
| Registro y eliminación de partidas | Implementados. El servicio comprueba que el videojuego existe antes de crear una partida; fechas e integridad requieren las decisiones D-01 y D-05. |
| Historial global y por videojuego | Implementado. El listado global utiliza `populate` para el videojuego. |
| Logros personalizados | Se añaden y eliminan desde el formulario del juego y se marcan desde el detalle. |
| Resumen por videojuego | Calculado en servidor: cantidad de partidas, minutos, horas, última sesión y avance de la última partida. Contempla historial vacío y desempata por fecha, creación e ID. |
| Eliminación de videojuego y sus partidas | Implementada mediante operaciones secuenciales; no garantiza atomicidad. |
| Inicio y estadísticas globales | Implementados mediante consultas de juegos y partidas y cálculos en el cliente. |
| Estados de interfaz | Hay carga, error, vacío, reintentos en varias vistas y página 404. Los estados de edición requieren D-08. |
| Validaciones y errores | Los modelos validan campos requeridos, enums, rangos y longitudes. Hay manejo centralizado de errores propios y de Mongoose; presenta D-03 y D-11. |
| Metas y rachas | No se encontraron modelos, servicios, rutas o pantallas específicos. Corresponden al trabajo futuro de E2. |

## Hallazgos y decisiones aprobadas

Los impactos de concurrencia y crecimiento describen riesgos derivados del código; no son incidentes observados en producción. Las decisiones de esta tabla sustituyen las propuestas del diagnóstico inicial.

| ID | Problema | Evidencia concreta | Impacto | Decisión aprobada | Justificación |
| --- | --- | --- | --- | --- | --- |
| D-01 | Fechas enviadas sin zona horaria. | `frontend/src/paginas/FormularioPartida.tsx:18–19,40,104` genera una fecha local y la envía directamente; `backend/src/modelos/Partida.model.ts:20–23` la recibe como `Date`. | La interpretación depende de la zona del servidor y puede cambiar el día atribuido a una sesión. | Priorizar definición y corrección para E2. | Las rachas necesitan una regla explícita de zona horaria y límites del día. Debe evaluarse el tratamiento de datos históricos sin asumir su interpretación. |
| D-02 | Ausencia de pruebas automatizadas. | `backend/package.json` y `frontend/package.json` no tienen script ni dependencias de tests; no se encontraron archivos o configuración de pruebas. | No hay protección automática frente a regresiones en reglas, resumen, validaciones o errores. | Priorizar la incorporación de pruebas automatizadas. | E2 necesita evidencia verificable y trazabilidad entre criterios, tickets, pruebas y código. |
| D-03 | Los errores del parser JSON quedan fuera de la identificación y terminan como 500. | `backend/src/app.ts:22–24` coloca `express.json()` antes de `requestId` y `logger`; `backend/src/middlewares/errorHandler.ts:40–42` responde 500 para errores no contemplados. | Un JSON mal formado puede responder sin `requestId`, sin registro del logger y con clasificación HTTP incorrecta. | Pagar como primera deuda técnica mediante criterio de aceptación, test y corrección. | El contrato de errores debe ser consistente antes de ampliar la API. |
| D-04 | Se ignora el nombre de base de datos configurado. | `backend/src/config/env.ts:4` declara `mongodbDb`; `backend/src/conexionDB.ts:6–8` fija `dbName: 'levelup'`. | `MONGODB_DB` no selecciona la base esperada y dificulta separar entornos y pruebas. | Pagar como segunda deuda técnica mediante criterio de aceptación, test y corrección. | Existe una discrepancia directa entre configuración y comportamiento. |
| D-05 | Borrado en cascada y validación de referencias sin operación atómica. | `backend/src/services/videojuegos.service.ts:19` elimina partidas y luego el juego; `backend/src/services/partidas.service.ts:6` consulta el juego y después crea la partida. | Un fallo parcial puede eliminar sesiones conservando el juego; una creación concurrente puede dejar una partida huérfana. | Definir y comprobar durante E2 una política segura de eliminación de videojuegos, partidas y metas. | La integridad del historial afecta a metas y rachas. La solución debe considerar el entorno MongoDB; las metas aún no existen. |
| D-06 | Vaciar la calificación no elimina el valor persistido. | `frontend/src/paginas/FormularioJuego.tsx:59–61` omite la calificación vacía; `backend/src/services/videojuegos.service.ts:16–17` solo actualiza campos presentes. | La edición puede aparentar quitar una calificación y conservar el valor anterior. | Diferir. | Es un defecto acotado del formulario, independiente del cálculo de metas y rachas. Debe conservarse como pendiente. |
| D-07 | La búsqueda elimina caracteres significativos. | `backend/src/services/videojuegos.service.ts:10` elimina caracteres fuera de una lista permitida antes de construir la expresión regular. | `Spider-Man` se convierte en `SpiderMan`; una búsqueda solo con símbolos puede convertirse en una expresión vacía. | Diferir. | Afecta a la búsqueda de biblioteca, sin bloquear las reglas de E2. Requiere una corrección específica posterior. |
| D-08 | Estado de edición no reiniciado ni protegido al cambiar el ID. | `frontend/src/paginas/FormularioJuego.tsx:27–45` no reinicia carga ni descarta respuestas anteriores; si no hay ID retorna sin limpiar datos. | Puede conservar datos al navegar de edición a creación o dejar editable un formulario cuya carga falló. | Diferir. | Es un problema del formulario existente. Los formularios futuros deben evitar repetir el patrón sin ampliar ahora el alcance. |
| D-09 | Consultas y cálculos cargan historiales completos. | `backend/src/services/partidas.service.ts:4–5` lista sin paginación; `backend/src/services/videojuegos.service.ts:21–22` carga todas las sesiones para resumir; `frontend/src/paginas/Landing.tsx:11–12` descarga sesiones para estadísticas. | El coste crece con el historial; no se midió degradación actual. | Diferir la optimización general. | No hay mediciones que justifiquen una refactorización amplia. Las consultas específicas de E2 deberán evaluarse al diseñarlas. |
| D-10 | Superposición de estilos globales y reglas heredadas. | `frontend/src/main.tsx:1` importa tres hojas globales; `styles.css`, `brutalist.css` y `editorial.css` redefinen estilos globales. Hay reglas `.sidebar` sin ese componente en `App.tsx` y numerosos `!important` en estilos de páginas. | Dificulta predecir la cascada y aumenta el riesgo de regresión visual. | Diferir la limpieza general. | No bloquea E2. Se conservará la identidad visual y se evitará una refactorización estética dentro de esta fase. |
| D-11 | El cliente HTTP descarta estado e identificador de los errores. | `frontend/src/api/cliente.ts:5` lanza un `Error` con el mensaje sin conservar el estado HTTP ni `requestId`. | Dificulta distinguir fallos y correlacionarlos con los registros del backend. | Diferir. | La interfaz ya muestra mensajes de error; enriquecer su información no es requisito previo para las reglas de E2. |

## Bloqueos y condiciones previas de E2

- **D-01:** definir la semántica temporal antes de implementar rachas y corregir el intercambio de fechas según esa decisión.
- **D-02:** incorporar una base de pruebas para comprobar criterios y regresiones durante la implementación.
- **D-03 y D-04:** pagar las dos deudas seleccionadas con criterio de aceptación, test y corrección verificable.
- **D-05:** definir y comprobar la política de eliminación antes de completar la integración de videojuegos, partidas y metas. No se prescribe todavía una solución técnica.

No se identificaron errores de TypeScript que bloqueen la preparación de E2. Sí quedan decisiones de negocio para la especificación posterior: qué actividad cuenta para una racha, límites del día, múltiples sesiones diarias, interrupciones y efecto del borrado. No se fijan estas reglas en el diagnóstico.

**Diferidos:** D-06, D-07, D-08, D-09, D-10 y D-11. Su aplazamiento no los cierra ni elimina sus riesgos. No se corregirán incidentalmente sin revisar el alcance aprobado.

## Deuda técnica seleccionada para pagar

### DT-01 — Errores del parser e identificación de solicitudes (D-03)

**Resultado esperado:** un cuerpo JSON mal formado recibe una respuesta 400 con `requestId`, y la solicitud pasa por el registro correspondiente. Los errores inesperados siguen respondiendo 500 sin exponer detalles internos.

**Verificación prevista:** una prueba de integración del contrato HTTP que envíe JSON mal formado y compruebe estado, cuerpo e identificación; comprobar también el registro de la solicitud. La corrección y la prueba quedan pendientes de implementación.

### DT-02 — Nombre de base de datos ignorado (D-04)

**Resultado esperado:** la conexión utiliza el nombre de base de datos resuelto por la configuración, en lugar de un literal independiente.

**Verificación prevista:** una prueba con configuración controlada que compruebe el `dbName` enviado a la conexión, sin depender de credenciales ni archivos `.env`. La corrección y la prueba quedan pendientes de implementación.

Estos resultados orientan los criterios de aceptación futuros; todavía no constituyen una especificación ni tests ejecutados.

## Comprobaciones realizadas

| Comprobación | Resultado y alcance |
| --- | --- |
| Inventario de archivos y revisión estática | Revisados README, modelos, servicios, controladores, rutas, middleware, configuración fuente, páginas, componentes, cliente API, tipos, estilos y configuración de herramientas. Se excluyeron archivos `.env`. |
| Scripts npm | Backend: `dev`, `build`, `start`. Frontend: `dev`, `build`, `preview`. No hay scripts de tests, lint o comprobación de tipos independiente. |
| Configuración TypeScript | Ambos proyectos tienen `strict: true`. |
| TypeScript del backend | Ejecutado el compilador local con `--noEmit --incremental false`; finalizó con código 0 y sin errores. |
| TypeScript del frontend | Ejecutado el compilador local con `--noEmit --incremental false`; finalizó con código 0 y sin errores. |
| Dependencias reproducibles | Existen `backend/package-lock.json` y `frontend/package-lock.json`; no se reinstalaron dependencias. |
| Repositorio durante el diagnóstico inicial | `git status --short` no mostró cambios antes ni después de las comprobaciones. |
| Rama antes de documentar | Confirmada `feature/e2-metas-rachas`; el estado de trabajo estaba limpio. |
| Herramientas locales | `node --version` informó `v24.20.0`. La invocación de `npm` fue bloqueada por la política de PowerShell para `npm.ps1`; no es un defecto del proyecto. Puede utilizarse `npm.cmd` sin cambiar esa política. |

## Limitaciones de verificación

- No se ejecutó la aplicación ni se conectó a MongoDB, para evitar la carga de `.env`. Se revisó `backend/src/config/env.ts` como código fuente, sin leer valores privados.
- No se ejecutaron builds: el backend generaría archivos y Vite puede cargar `.env`. La comprobación de tipos no acredita un build completo.
- No se ejecutaron tests automatizados porque no existe una suite configurada.
- No hubo pruebas HTTP, operaciones sobre datos, pruebas de concurrencia, mediciones de rendimiento ni inspección visual en navegador.
- No se comprobó el despliegue público, el historial de PR ni el cumplimiento de una rúbrica externa del Proyecto 3.
- No se inspeccionaron datos históricos; no se puede afirmar qué sesiones requieren tratamiento por zona horaria.

## Continuidad y trazabilidad

Mantener los identificadores D-01 a D-11 como origen de los hallazgos. En fases posteriores, relacionar cada trabajo aprobado con sus requisitos, criterios de aceptación, tickets, tests y cambios de código. DT-01 y DT-02 deben conservar su vínculo con D-03 y D-04, respectivamente.

La Fase 1 entrega este diagnóstico para revisión. No se implementaron correcciones, no se crearon harness, PRD o specs y no se realizaron commits.
