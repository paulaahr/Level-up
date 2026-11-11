# E2 — Spec de frontend: metas y rachas

**Estado: Borrador — pendiente de aprobación.** Esta entrega solo crea documentación. NO DEBE implementarse antes de aprobar la spec. Las pruebas descritas son previstas, no ejecutadas de E2.

## Fuentes y alcance

Fuentes: [PRD](../prd/level-up.md), [backlog](../backlog/E2-metas-y-rachas.md), [épicas](../backlog/epicas.md), [diagnóstico](../diagnostico.md), [enunciado](../referencias/enunciado-E4.md), [AGENTS.md](../../AGENTS.md), [DESIGN.md](../../DESIGN.md) y [contrato backend](E2-backend-metas-progreso.md).

Esta spec DEBE guiar T-14 a T-18 y la parte frontend de T-01/T-19/T-20. La tabla cubre **49 criterios**: CA-E2-01 a CA-E2-08, CA-E2-10 a CA-E2-44, CA-E2-47 a CA-E2-51 y CA-E2-56. Los criterios de cálculo/servidor compartidos se verifican aquí como consumo, visualización e integración; la spec backend demuestra sus reglas y garantías de persistencia.

DEBE añadir formularios de metas, listado consultable de anteriores, sección de progreso en el detalle y edición de partidas necesaria para actualizarlo. NO DEBE añadir gráficos históricos, notificaciones, rankings, metas compartidas, estados nuevos de juego, premios irreversibles ni analítica mensual. NO DEBE recalcular el dominio en React ni corregir D-06 a D-11 incidentalmente. NO DEBE modificar el PRD, el backlog o DESIGN.md para justificar desviaciones visuales.

## Integración con React existente

Se conservan React Router, estado local y estructura `api/`, `paginas/`, `componentes/`, `tipos.ts`; no se introduce un gestor de estado ni framework visual. DEBE reutilizarse `peticion` para transporte y los patrones `Loading`, `ErrorVista`, `Vacio` y `Encabezado` sin refactorizar su uso global. Los envoltorios accesibles de E2 DEBEN añadirse en sus vistas, sin depender de que UI.tsx ya anuncie estados.

| Pieza propuesta                   | Responsabilidad                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `api/metasApi.ts`                 | Crear, consultar, listar, guardar y desactivar metas; consultar progreso. Sin JSX, cálculos de dominio ni estado de componentes.      |
| `componentes/ProgresoSemanal.tsx` | Consulta y presenta el progreso del juego; maneja carga/error/ausencia de meta, acciones y revisión de la consulta.                   |
| `componentes/HistorialMetas.tsx`  | Lista metas activas/inactivas con objetivos y acceso a consulta/edición, sin mostrar resultados históricos calculados.                |
| `paginas/FormularioMeta.tsx`      | Crear/editar objetivos e hitos, precarga segura, validación y guardado/desactivación.                                                 |
| `paginas/Detalle.tsx`             | Integra progreso e historial con el juego existente y ofrece editar/eliminar partidas del historial. Conserva resumen y logros de E1. |
| `paginas/FormularioPartida.tsx`   | Reutiliza el formulario existente para creación y edición con precarga y fecha de Ecuador.                                            |
| `api/partidasApi.ts`              | Añade lectura individual y PUT necesarios, conservando POST y DELETE existentes.                                                      |
| `utilidades/fechasEcuador.ts`     | Conversión de presentación/entrada de fechas con IANA, sin calcular semanas, rachas o hitos.                                          |

Rutas nuevas de UI: `/videojuegos/:id/meta/nueva`, `/videojuegos/:id/metas/:metaId/editar` y `/partidas/:id/editar`. DEBEN registrarse en App.tsx sin cambiar rutas E1. El detalle usa el ID del juego y el formulario de meta DEBE verificar que la meta precargada pertenece a ese juego. Una discrepancia DEBE producir error y bloquear guardado, no mostrar datos cruzados. La edición de partidas no permite cambiar su videojuego.

Las consultas DEBEN ignorar respuestas obsoletas al desmontar o cambiar ID, mediante cancelación/guardia por versión. El formulario DEBE reiniciar carga, error y valores al cambiar de modo/ID; NO DEBE conservar datos de un juego anterior. Si la precarga falla NO DEBE mostrarse un formulario vacío editable como si fuera creación.

## Servicio y contratos tipados

Funciones propuestas, no implementadas: `crearMeta(datos)`, `obtenerMeta(id)`, `listarMetas(videojuegoId)`, `actualizarMeta(id, datos)`, `desactivarMeta(id)` y `obtenerProgresoSemanal(videojuegoId)`. DEBEN consumir los métodos/rutas y envoltorios de la spec backend sin inventar endpoints alternativos. `partidasApi` añadirá `obtenerPartida(id)` y `actualizarPartida(id, datos)`.

`tipos.ts` DEBE añadir tipos de Meta, HitoObjetivo, HitoProgreso y ProgresoSemanal según el contrato backend. `meta`, `porcentajeHoras` y `cumplidaSemana` DEBEN permitir null. Las partidas de lectura individual DEBEN tipar `videojuego` como ID para ese DTO y no forzar un cast a juego poblado. La respuesta de progreso es `{progreso, requestId}`, la individual `{meta, requestId}` y la lista `{total, metas, requestId}`; el servicio devuelve al componente su contenido tipado.

El cliente compartido actualmente convierte errores a mensajes y descarta estado/requestId. Esa limitación D-11 permanece diferida. E2 DEBE mostrar el mensaje de error existente sin interpretar su texto como una nueva clasificación de transporte. Las pruebas de API DEBEN simular cuerpos HTTP reales y respuestas de rechazo; NO DEBE modificarse `cliente.ts` para añadir infraestructura de errores ajena al ticket. La correlación 400/404/409/500 y logs corresponde al servidor.

Los datos del servidor DEBEN ser la fuente del progreso: React NO DEBE sumar horas, deduplicar días, seleccionar la última sesión, calcular rachas ni comparar hitos. `cumplidaSemana` llega calculado. Formatear un número o acotar el ancho de la barra a 0–100 es presentación, no autoriza otra fórmula de porcentaje. La métrica de tres de cuatro semanas se comprueba en evaluación preparada; NO DEBE añadirse una pantalla de histórico mensual.

## Sección de progreso del videojuego

DEBE aparecer como sección propia dentro del detalle actual, después del resumen E1 y antes o junto a logros/historial según su rejilla existente, sin sustituirlos. Debe tener encabezado «Progreso semanal» y periodo lunes–domingo de la respuesta. Los strings civiles `YYYY-MM-DD` NO DEBEN convertirse a medianoche UTC y luego al día del navegador; se formatean como fechas de Ecuador.

Con meta activa DEBE mostrar:

- Horas reales frente a horas objetivo y barra de porcentaje de horas; el texto NO DEBE recortar horas si superan el objetivo.
- Días distintos jugados frente a días objetivo, como medida separada del porcentaje.
- Racha actual y mejor racha, con unidad «días» y sin reinicio visual al comenzar semana.
- Cada descripción/porcentaje objetivo de hito y estado textual «Alcanzado»/«Pendiente» con símbolo decorativo opcional. NO DEBE ofrecer checkbox manual de hito ni confundirlo con los logros E1.
- Resultado «Semana cumplida» solo cuando `cumplidaSemana` es true. Si hay 100 % de horas pero faltan días, DEBE mantener «Meta semanal pendiente» y ambos contadores visibles.
- Acción de editar la meta y acción de desactivar con confirmación. Las metas anteriores se consultan como objetivos inactivos, sin trasladar sus hitos a la sección actual.

Una meta sin hitos DEBE indicar que no hay hitos definidos sin interpretarlo como error. Sin partidas y con meta, DEBE mostrar ceros y los objetivos; hitos pendientes, no alcanzados.

Sin meta activa DEBE mostrar horas, días y ambas rachas, un mensaje «Sin meta activa» y acceso a crear una. NO DEBE dibujar una barra con un 0 % ficticio, mostrar hitos antiguos o usar sus objetivos. En Completado, la invitación informativa DEBE explicar que no se puede activar una meta hasta dejar ese estado; el enlace de creación puede mostrarse deshabilitado con explicación y el servidor siempre valida. NO DEBE cambiar el estado del juego automáticamente ni introducir Abandonado. En pausa no se trata como abandono.

## Formulario de crear/editar y metas anteriores

DEBE ofrecer horas, días y una lista editable de cero a cinco hitos con descripción y objetivo porcentual. Los números DEBEN mantenerse como texto durante la edición para distinguir campo vacío de 0; se convierten solo tras validar. Horas y objetivos de hito DEBEN admitir decimales (sin step entero obligatorio); días DEBEN ser enteros. Valores JSON enviados DEBEN ser números, no strings.

La validación DEBE aceptar horas `>0` y `<=100`, días enteros 1–7 e hitos de 1–100, con lista máxima cinco. NO DEBE introducir mínimo 0,5, pasos de 0,5, objetivos enteros, descripciones únicas ni longitudes no aprobadas. El botón de añadir hito DEBE impedir un sexto y explicar el máximo; se puede eliminar un hito. La descripción es string, sin imponer texto no vacío más allá del contrato backend. Cualquier error DEBE conservar los datos introducidos y asociarse al campo conocido; el error global del servidor DEBE ser legible aunque no indique un campo estructurado.

Crear DEBE enviar juego, horas/días/hitos y usar activa por defecto. Editar DEBE precargar los valores, enviar los campos completos y preservar el estado activo/inactivo si no se solicita cambio. NO DEBE reactivar una meta anterior por el mero hecho de editarla; una reactivación por contrato sigue sometida a la unicidad del servidor. No se añade un botón de reactivación independiente no requerido por el flujo.

Durante guardar/desactivar DEBE existir estado `guardando`, texto perceptible y bloqueo de doble envío/acción. El éxito DEBE llevar al detalle y hacer nueva consulta de progreso e historial; no rellenar estadísticas optimistas. Tras cambiar la meta durante la semana, la consulta DEBE reflejar la meta actual sobre las mismas partidas semanales. Un 409 de conflicto o estado DEBE dejar el formulario con su mensaje, sin reemplazar silenciosamente otra meta.

Desactivar DEBE preguntar «¿Desactivar esta meta? Se conservará como inactiva». Se reutiliza la confirmación nativa ya usada en el proyecto; cancelar NO DEBE enviar PATCH. Confirmar DEBE efectuar la operación y refrescar; fallar DEBE conservar el estado y mostrar error. No se implementa un sistema nuevo de modales.

El historial de metas DEBE usar GET de metas del juego y permitir consultar objetivos, estado e hitos como parte de la meta consultada o editada. Estos hitos NO DEBEN mostrarse como los hitos del progreso actual cuando no hay activa. DEBE preservar las anteriores al crear una nueva; no incorpora gráficos de semanas, borrado de metas ni cálculos históricos. Un fallo de listado NO DEBE bloquear ni falsificar el progreso ya obtenido, y viceversa.

## Partidas: fechas, edición y refresco

El formulario de partida DEBE utilizar America/Guayaquil para precargar el instante actual o el guardado, aunque el navegador tenga otra zona. `datetime-local` DEBE estar etiquetado «Inicio (hora de Ecuador)». El valor civil DEBE convertirse explícitamente a un instante ISO con zona antes de POST/PUT, mediante `utilidades/fechasEcuador.ts`; NO DEBE usarse `new Date(cadenaLocal)` dependiente del host ni fijar un offset único para todas las fechas históricas.

Para esa conversión se propone `@js-temporal/polyfill`, importado solo por la utilidad, con versión compatible fijada en T-17. La utilidad DEBE validar fecha/hora y resolver America/Guayaquil por IANA, rechazando valores imposibles o civiles ambiguos/no existentes en lugar de normalizarlos. DEBE enviar ISO UTC y conservar segundos; al editar, si no cambia el campo temporal, DEBE conservar el instante original y sus milisegundos, sin truncarlo a minutos. La fecha visible en nuevos registros y en la edición usa la misma zona, sin cambiar el helper global E1 incidentalmente.

Crear/editar DEBE rechazar fecha de inicio posterior al reloj actual en la UI como ayuda; el servidor es autoritativo y puede devolver 400. Igual al momento actual y pasado son válidos. La duración no altera la validación del inicio ni divide una sesión al cruzar medianoche. Se conservan minutos enteros 1–1440, avance 0–100 y notas hasta 500, con mensaje y sin enviar datos inválidos.

Editar DEBE precargar desde GET `/partidas/:id` y mostrar el juego sin permitir reasignarlo. Una referencia no válida/ausente DEBE mostrar error y bloquear envío. Añadir accesos «Editar» desde historial del detalle y listado de sesiones no cambia sus tablas, fuentes ni identidad visual más allá de la acción necesaria. El detalle DEBE permitir eliminar una partida con confirmación nativa y mostrar un error de acción en E2 si falla.

Después de POST, PUT o DELETE exitoso DEBE solicitarse de nuevo progreso, resumen E1 e historial del juego afectado. La estrategia DEBE ser explícita:

1. Formularios de creación/edición navegan al detalle tras guardar, indicando una revisión en el estado de navegación; el montaje o cambio de revisión vuelve a consultar.
2. Borrado desde el detalle incrementa la revisión local y dispara la misma secuencia, sin recargar la página.
3. Borrado desde el listado global refresca esa lista; al volver al detalle se consulta siempre de nuevo al montar. El router actual muestra una de esas páginas cada vez. NO DEBE mantenerse una caché global de progreso que pueda devolver datos anteriores ni exigirse sincronización entre pestañas o WebSocket fuera del alcance.
4. Una operación exitosa DEBE esperar su respuesta antes de refrescar; respuestas de una revisión anterior NO DEBEN sobrescribir la nueva.

Guardar y refrescar DEBEN tener errores separados. Si la escritura falló, NO DEBE anunciarse éxito ni navegar como si se hubiera guardado. Si se guardó pero falla el GET, DEBE informar «La partida se guardó; no se pudo actualizar el progreso» y ofrecer reintentar solo la consulta, sin repetir la escritura. El valor anterior DEBE ocultarse o etiquetarse como no actualizado mientras hay error; NO DEBE mostrarse como resultado nuevo.

## Estados, accesibilidad y diseño autorizado

Cada consulta de E2 DEBE distinguir `cargando`, `error`, `listo` y ausencia real de meta/partidas. La carga DEBE anunciarse con región de estado; el error debe ser legible y tener reintento de consulta. El reintento no repite mutaciones. La ausencia de meta es éxito con null, no un ErrorVista. Si una consulta secundaria falla, no se debe borrar otra sección correcta. Los avisos se implementan dentro de E2, no en un refactor de UI.tsx.

Las nuevas vistas DEBEN conservar la estética editorial de DESIGN.md. Colores DEBEN usar exclusivamente variables existentes en su ámbito, no hex nuevos ni variables globales con el mismo nombre y significado diferente:

| Ámbito                            | Variables autorizadas y uso                                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Sección dentro de `.detalle-page` | `--accent` naranja, `--paper` crema, `--light` blanco, `--ink` tinta y `--lime` lima, definidos en Detalle.css.                                |
| Formulario de meta                | Contenedor de la misma familia `.detalle-page` para heredar esas variables; CSS encapsulado en `.formulario-meta-page`, sin redefinir `:root`. |
| Edición en formulario de partida  | `--orange`, `--cream`, `--purple`, `--lime`, `--ink` ya definidos en `.formulario-partida-page`.                                               |

No se añade una nueva paleta ni un token de color. Tipografía DEBE heredar DM Sans para cuerpo y reutilizar Bootzy/Archivo Black para títulos y Space Mono para metadatos como ya están documentados. No hay variables de tipografía/espaciado universales: DEBEN utilizarse los valores de referencia de DESIGN.md, sin afirmar que existen tokens nuevos. Se conservan bordes 1–2 px, radios rectos del ámbito, sombras desplazadas y separación fluida existente. El nuevo CSS NO DEBE cambiar navegación global, páginas E1 ni limpiar hojas históricas (D-10).

DEBEN verificarse 360/768/1280 px, formulario en una columna cuando falte espacio y contadores/acciones sin solaparse; se reutilizan breakpoints documentados de 740/760 px según el contenedor y valores clamp existentes. El progreso NO DEBE requerir scroll horizontal para leer objetivos o accionar botones. No se añade animación de aparición esencial; `prefers-reduced-motion` DEBE eliminar transiciones nuevas y mostrar contenido directamente. No se modifica el parallax global diferido.

Accesibilidad DEBE incluir labels ligados a inputs, nombres de botones «Eliminar hito…», mensajes asociados con `aria-describedby` y `aria-invalid`, foco visible y orden de teclado natural, foco en el primer error tras rechazo local y devolución del foco tras cancelar confirmación. Estados de consulta DEBEN anunciarse con `role="status"` o región viva; fallos relevantes con alerta sin anuncios duplicados. Los hitos DEBEN tener estado textual, sin depender de color; símbolos ornamentales con `aria-hidden`.

La barra DEBE tener nombre «Horas semanales», mínimo 0, máximo 100, valor `porcentajeHoras` y texto accesible con horas reales/objetivo. Sin meta no se renderiza una barra porcentual. El texto normal de E2 DEBE comprobar contraste mínimo 4,5:1, títulos grandes 3:1 y estados/foco o límites visuales necesarios 3:1, escogiendo combinaciones de la paleta existente, por ejemplo tinta para texto pequeño en superficies claras. No se certifica WCAG global ni se modifica E1 para esta revisión.

## Estrategia de pruebas

T-01 DEBE añadir configuración Vitest independiente, React Testing Library, user-event y DOM simulado compatible, sin librerías visuales. `frontend/vitest.config.ts` DEBE fijar `envDir: false`, URL de API ficticia y mocks de red antes de importar el cliente; NO DEBE cargar archivos de entorno ni la configuración de desarrollo para obtenerlos. Los tests DEBEN estar en `frontend/tests/` fuera del código emitido y limpiar mocks, rutas y relojes entre casos.

T-14 DEBE probar las llamadas de servicio y envoltorios contra cuerpos acordados. T-15/T-16 prueban validación y representación con datos controlados; NO DEBEN duplicar las fórmulas de dominio en tests de componentes para fingir una segunda implementación. T-17 prueba los tres flujos de mutación y fallos diferenciados. T-18 combina teclado, nombres accesibles y revisión real de diseño/contraste en los tres anchos. T-19 añade flujos de navegador contra backend aislado real y suite de regresión.

Comandos propuestos aún inexistentes: `npm.cmd --prefix frontend run test` para Vitest y `npm.cmd --prefix frontend run test:e2e` para Playwright, con configuración separada y datos sintéticos del replica set de pruebas. Si se inicia Vite para E2E, un config de pruebas explícito DEBE usar `envDir: false` y URL sintética; NO DEBE arrancarse el modo habitual que pueda cargar `.env`. Registrar los resultados como pruebas pendientes hasta ejecutarlos.

## Criterio de aceptación → verificación

**S:** servicio/contrato; **C:** componente con Testing Library; **E:** navegador con backend aislado; **M:** revisión manual registrada. Cálculos compartidos se prueban como entrega y representación; su prueba pura está en backend. Cada fila conserva el criterio original, incluida la parte que comparte con la otra spec.

| Criterio | Verificación prevista y resultado exigido                                                                              | Tickets          |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------- |
| CA-E2-01 | C/E formulario 5 h, 4 días, dos hitos; éxito y consulta de activa; backend demuestra default.                          | T-14, T-15       |
| CA-E2-02 | S/C consulta individual/listado: identidad y estado sin juego cruzado.                                                 | T-14, T-15       |
| CA-E2-03 | C matriz de horas válidas e inválidas, mensajes y sin envío inválido; E rechazo servidor conserva entrada.             | T-15             |
| CA-E2-04 | C días enteros 1/7 y casos fuera de rango/decimales/vacío/tipos.                                                       | T-15             |
| CA-E2-05 | C cero/cinco hitos permitidos, sexto bloqueado con explicación, fallo conserva lista.                                  | T-15             |
| CA-E2-06 | C objetivos 1/50,5/100 permitidos y fuera de rango/ausente rechazados.                                                 | T-15             |
| CA-E2-07 | S/E juego inválido/inexistente: mensaje, sin navegación de éxito ni meta creada.                                       | T-14, T-15       |
| CA-E2-08 | C/E meta inválida/inexistente en precarga bloquea guardado y ofrece retorno.                                           | T-15             |
| CA-E2-10 | E crear con anteriores inactivas conserva listado y juego ajeno; integridad es backend.                                | T-15, T-19       |
| CA-E2-11 | S/C conflicto sobrevenido al guardar: mensaje, valores conservados y sin reemplazo de vigente.                         | T-14, T-15       |
| CA-E2-12 | C/E edición de objetivos/hitos, error conserva entrada y ficha del juego intacta.                                      | T-15             |
| CA-E2-13 | E cambiar 6/4→3/2 y nueva consulta: 50→100 y cumplimiento true.                                                        | T-15, T-16       |
| CA-E2-14 | C/E cancelar confirmación no envía PATCH; confirmar inactiva y refresca; fallo conserva.                               | T-15             |
| CA-E2-15 | C/E histórico de objetivos distingue activa y anterior, sin gráfico ni uso de anterior como actual.                    | T-15, T-16       |
| CA-E2-16 | C/E periodo civil 9–15 visible sin corrimiento en navegadores de distintas zonas.                                      | T-16             |
| CA-E2-17 | C respuesta 3,5/70 presentada igual, días separados y barra 70.                                                        | T-16             |
| CA-E2-18 | C respuesta de 97 minutos ya calculada como 1,6/53, sin redondearla otra vez.                                          | T-16             |
| CA-E2-19 | C 7/5: texto 7 horas reales, barra 100, no 140 ni recorte de horas.                                                    | T-16             |
| CA-E2-20 | E partidas repetidas y ajenas: respuesta y vista con dos días, sin sumas en React.                                     | T-16, T-19       |
| CA-E2-21 | E formulario Ecuador y respuesta tras cruce domingo/lunes; ninguna actividad extra el lunes.                           | T-16, T-17, T-19 |
| CA-E2-22 | C/E actual 3/mejor 5 y etiquetas correctas, sin máximo limitado a semana en UI.                                        | T-16             |
| CA-E2-23 | C/E hoy sin sesión/ayer sí: 3 días vigentes, no 4 y no 0.                                                              | T-16             |
| CA-E2-24 | C/E racha rota 0/mejor 5 se presentan diferenciadas.                                                                   | T-16             |
| CA-E2-25 | E varios registros de día y otro juego no inflan contadores de respuesta/vista.                                        | T-16, T-19       |
| CA-E2-26 | C hitos 25/50 alcanzados, 100 pendiente; no checkbox manual.                                                           | T-16             |
| CA-E2-27 | E editar avance 60→40 y refrescar: hito 50 pendiente, logros manuales intactos.                                        | T-16, T-17, T-19 |
| CA-E2-28 | E registro histórico anterior no cambia hito del avance actual.                                                        | T-16, T-17, T-19 |
| CA-E2-29 | C meta con hitos y cero partidas: todos pendientes.                                                                    | T-16             |
| CA-E2-30 | C/E solo inactivas: actividad y llamada a crear, sin barra porcentual ni hitos anteriores.                             | T-14, T-16       |
| CA-E2-31 | C meta sin actividad: objetivos y ceros, hitos pendientes, no error.                                                   | T-16             |
| CA-E2-32 | C sin metas/partidas: ceros, invitación y ausencia de porcentaje/hitos.                                                | T-16             |
| CA-E2-33 | S/C recurso inválido/ausente: ErrorVista sin sustituir por vacío exitoso.                                              | T-14, T-16       |
| CA-E2-34 | C/E Completado explica restricción; intento de activación rechazado no deja activa.                                    | T-15, T-16       |
| CA-E2-35 | E flujo de estado existente recibe conflicto al completar con activa; no se muestra cambio exitoso.                    | T-15, T-19       |
| CA-E2-36 | C/E no nuevo estado Abandonado, En pausa no bloquea por supuesto abandono.                                             | T-15, T-16       |
| CA-E2-37 | C utilidad de fecha/E formulario pasado o igual a ahora; precarga independiente de zona y registro histórico.          | T-17             |
| CA-E2-38 | C/E futuro hoy/otro día bloqueado, servidor autoritativo y error conserva valores.                                     | T-17             |
| CA-E2-39 | C/E precargar y editar campos, nueva consulta y contadores/hitos tras respuesta sin recarga.                           | T-17             |
| CA-E2-40 | C/E límites 1–1440/0–100/500 y datos inválidos conservados sin escritura parcial.                                      | T-17             |
| CA-E2-41 | S/C edición/borrado ausente o inválido muestra fallo y no actualiza como éxito.                                        | T-14, T-17       |
| CA-E2-42 | E POST/DELETE disparan consultas; eliminar última sesión muestra ceros y no datos viejos.                              | T-17             |
| CA-E2-43 | C/E escritura fallida y GET fallido después de escritura exitosa: mensajes distintos, reintento solo GET.              | T-14, T-17       |
| CA-E2-44 | E confirmación de borrado E1 y retorno; consultas posteriores no encuentran juego/hijos; integridad es backend.        | T-19             |
| CA-E2-47 | C formulario modifica todos los campos/hitos, errores ligados y bloqueo de doble envío.                                | T-15             |
| CA-E2-48 | C/E detalle muestra todos los indicadores y no equipara porcentaje con cumplimiento.                                   | T-16             |
| CA-E2-49 | C promesas pendientes/rechazadas/listas vacías: carga, reintento y vacío diferenciados.                                | T-15, T-16       |
| CA-E2-50 | C/E/M teclado, foco, labels, alertas, nombres y aria de barra; contraste medido.                                       | T-18             |
| CA-E2-51 | E/M 360/768/1280, sin solapamientos; movimiento reducido y variables/tipos según DESIGN.md.                            | T-18             |
| CA-E2-56 | C/E 7 h/3 días no cumplida aunque barra 100; datos 5/4 sí; evaluación mensual prevista en backend, sin nueva pantalla. | T-16, T-19       |

CA-E2-09, CA-E2-45, CA-E2-46 y CA-E2-52 a CA-E2-55 se verifican como garantías de servidor/configuración en la spec backend. Los mensajes de sus errores se consumen por las reglas de interfaz, sin adjudicar al frontend la prueba de concurrencia o selección de DB.

## Ticket → archivos afectados

**E:** existe; **N:** nuevo propuesto respecto al repositorio observado. Solo se autorizará crear/modificar estos archivos al implementar su ticket tras aprobar la spec. Los mismos archivos pueden tener cambios acotados en varios tickets.

| Ticket | Archivos afectados y estado                                                                                                                                                                                                                                                                                                                                                                                             | Límite y evidencia                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| T-01   | E `frontend/package.json`, `frontend/package-lock.json`; N `frontend/vitest.config.ts`, `frontend/tests/setup.ts`, `frontend/tests/infraestructura.test.ts`                                                                                                                                                                                                                                                             | Runner DOM aislado y sin archivos de entorno; parte backend en su spec.                     |
| T-14   | N `frontend/src/api/metasApi.ts`, `frontend/tests/metasApi.test.ts`; E `frontend/src/api/partidasApi.ts`, `frontend/src/tipos.ts`                                                                                                                                                                                                                                                                                       | Contratos de metas/progreso y lectura/edición; NO modificar `cliente.ts` ni pagar D-11.     |
| T-15   | N `frontend/src/paginas/FormularioMeta.tsx`, `frontend/src/paginas/FormularioMeta.css`, `frontend/src/componentes/HistorialMetas.tsx`, `frontend/tests/FormularioMeta.test.tsx`; E `frontend/src/App.tsx`                                                                                                                                                                                                               | Formulario, listado/historial de objetivos y rutas de meta; no edición de juegos.           |
| T-16   | N `frontend/src/componentes/ProgresoSemanal.tsx`, `frontend/src/componentes/ProgresoSemanal.css`, `frontend/tests/ProgresoSemanal.test.tsx`; E `frontend/src/paginas/Detalle.tsx`                                                                                                                                                                                                                                       | Sección E2 e integración con historial de metas; no reescribir resumen/logros de E1.        |
| T-17   | E `frontend/src/paginas/FormularioPartida.tsx`, `frontend/src/paginas/FormularioPartida.css`, `frontend/src/paginas/Partidas.tsx`, `frontend/src/paginas/Detalle.tsx`, `frontend/src/App.tsx`, `frontend/src/api/partidasApi.ts`, `frontend/package.json`, `frontend/package-lock.json`; N `frontend/src/utilidades/fechasEcuador.ts`, `frontend/tests/partidas-flujo.test.tsx`, `frontend/tests/fechasEcuador.test.ts` | Edición, zona IANA y refrescos; polyfill temporal compatible, no nuevas funciones de juego. |
| T-18   | N inicialmente T-15/T-16 `frontend/src/paginas/FormularioMeta.tsx`, `frontend/src/paginas/FormularioMeta.css`, `frontend/src/componentes/HistorialMetas.tsx`, `frontend/src/componentes/ProgresoSemanal.tsx`, `frontend/src/componentes/ProgresoSemanal.css`; E `frontend/src/paginas/FormularioPartida.css`; N `frontend/tests/accesibilidad-e2.test.tsx`                                                              | Ajustes únicamente E2, contraste/foco y adaptación; no tocar estilos globales ni DESIGN.md. |
| T-19   | E `frontend/package.json`, `frontend/package-lock.json`; N `frontend/playwright.config.ts`, `frontend/vite.e2e.config.ts`, `frontend/e2e/metas-rachas.spec.ts`, `frontend/e2e/partidas-progreso.spec.ts`, `frontend/e2e/diseno-accesibilidad.spec.ts`                                                                                                                                                                   | Navegador con servicio aislado; no fixtures personales ni secretos.                         |
| T-20   | E `docs/backlog/E2-metas-y-rachas.md`; N `docs/AUDITORIA.md`, `docs/bitacora-agente.md`                                                                                                                                                                                                                                                                                                                                 | Consolidar en fase futura evidencia real y tabla de diseño; no crear esos archivos ahora.   |

Las rutas backend de soporte y los tests de dominio pertenecen a la otra spec. «N inicialmente» indica archivos creados en un ticket previo; se editan después sin dejar de estar identificados como nuevos respecto al diagnóstico. La revisión final DEBE comprobar que todos los archivos E existen y que ninguno N se ha creado durante esta fase documental.

## Revisión de coherencia y límites de verificación

Las trece decisiones se mantienen: rachas toleran hoy vacío, días se deduplican, las sesiones pertenecen al inicio en Ecuador, la meta actual rige la semana, el porcentaje solo mide horas con límite 100, los hitos pueden revertirse, no se añade Abandonado, borrar juego elimina relaciones, cumplir exige horas y días, existe edición de partidas, no se muestran hitos anteriores sin activa y se rechazan inicios futuros. No se añade una política de cierres ni producto de analítica mensual.

Referencias técnicas: [contraste de texto W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) y [contraste no textual W3C](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) para la comprobación acotada de accesibilidad; [polyfill Temporal](https://github.com/js-temporal/temporal-polyfill) para conversión civil/instante sin zona implícita. No se han instalado estas dependencias ni ejecutado tests de navegador en esta fase. No se afirma conformidad de toda la aplicación por leer el CSS.

La aprobación futura de esta spec DEBE autorizar sus contratos y archivos dentro de los tickets existentes, no una reescritura del diseño o del cliente global. **Registro de aprobación: pendiente.** Ningún resultado de esta spec está verificado funcionalmente hasta ejecutar y registrar sus pruebas.

La comprobación documental de Fase 5 verificó 49 criterios en esta tabla y 50 en backend: 56 distintos entre ambas, sin IDs nuevos o criterios sin verificación prevista. Se comprobaron los 20 tickets y las rutas existentes/nuevas de las tablas. La evidencia de comprobación del harness y sus límites se registra en la spec backend; no se ejecutaron pruebas E2 de interfaz ni revisión visual en navegador durante esta entrega.
