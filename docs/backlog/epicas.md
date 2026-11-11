# LEVEL UP — Épicas

Estado: cierre documental de Fase 3. Fuente de producto: [PRD de LEVEL UP 2.0](../prd/level-up.md), con trece decisiones de negocio aprobadas. El cierre documental no implica implementación ni verificación funcional de E2.

Fuente principal contrastada: [enunciado del Entregable 4 y ficha de hechos del cliente](../referencias/enunciado-E4.md). Las ocho decisiones aprobadas resuelven sus ocho huecos sin contradecir la ficha.

## E1 — Diario de Progreso Gamer original

**Objetivo:** permitir que una persona organice sus videojuegos y conserve un registro de sus sesiones, logros y progreso.

**Funcionalidades incluidas en el producto existente:**

- Biblioteca: añadir, consultar, editar y eliminar videojuegos con sus datos descriptivos, estado y calificación opcional.
- Búsqueda por nombre y filtros por género y estado.
- Registro y eliminación de partidas con fecha, duración, avance y notas.
- Historial de sesiones general y por videojuego.
- Logros personalizados que el usuario puede añadir, quitar y marcar como obtenidos.
- Resumen por videojuego de sesiones, tiempo acumulado, última sesión y avance actual; estadísticas generales del diario.
- Eliminación del videojuego y de sus partidas como comportamiento previsto del producto original.

**Beneficio para el usuario:** consultar qué ha jugado, cuánto tiempo ha dedicado y qué ha registrado como avance o logro, sin reconstruir esa información de memoria.

**Relación con el producto:** es la base de LEVEL UP y aporta los registros de actividad utilizados por E2. Sus capacidades están presentes en el código, con las limitaciones y problemas documentados en el [diagnóstico](../diagnostico.md); no se consideran verificadas integralmente ni libres de defectos.

**Límite:** E1 no incluye metas semanales, hitos calculados de metas ni rachas. Los logros manuales de E1 no se sustituyen por los hitos de E2.

## E2 — Metas y rachas

**Objetivo:** convertir los registros del diario en una referencia para planificar objetivos semanales, consultar su cumplimiento y entender la constancia de juego. Una semana cumplida exige alcanzar tanto horas como días de la meta activa; la métrica mensual requiere cumplir al menos tres de cuatro semanas evaluadas.

**Funcionalidades incluidas en el alcance aprobado:**

- Crear, consultar y editar metas por videojuego con horas semanales mayores que 0 y hasta 100 y días objetivo enteros entre 1 y 7; gestionar sus hitos y desactivarlas con confirmación.
- Mantener como máximo una meta activa por videojuego; conservar y consultar metas anteriores inactivas. Una nueva meta es activa por defecto si cumple las restricciones; una segunda activa se rechaza con un mensaje claro.
- Ver en el detalle del juego el periodo semanal, barra de horas frente a la meta, días frente al objetivo, racha actual, mejor racha e hitos con su estado.
- Consultar horas reales redondeadas a un decimal y porcentaje de horas redondeado a entero y limitado a 100 %, sin recortar las horas reales. Los días se muestran por separado; no forman parte de ese porcentaje.
- Usar la meta activa actual al cambiarla durante la semana.
- Consultar racha actual y mejor racha por videojuego sobre todo su historial: varias partidas en un día cuentan como un día jugado y la actividad de ayer mantiene vigente la racha durante hoy si aún no se ha jugado.
- Interpretar días y semanas en America/Guayaquil, de lunes a domingo, atribuyendo cada partida al día en que comenzó aunque cruce medianoche.
- Definir hasta cinco hitos por meta, con objetivos de avance entre 1 y 100; su estado se calcula con el avance actual del juego y puede revertirse si disminuye.
- Conservar los estados de E1 e impedir metas activas en Completado. La misma restricción se aplicaría a Abandonado si estuviera disponible; actualmente no existe y no se añade ni se equipara con En pausa.
- Eliminar partidas, metas e hitos al eliminar el videojuego, incluyendo metas inactivas.
- Sin meta activa, seguir mostrando horas, días y rachas y ofrecer crear una meta, sin porcentaje de horas aplicable ni hitos de metas anteriores. Sin partidas, mostrar horas, días y rachas en 0 y ningún hito alcanzado.
- Incluir la edición de partidas necesaria para actualizar correctamente el progreso después de registrar, editar o eliminar una partida. E1 no tiene edición de partidas; esta ampliación pertenece a E2.
- Contabilizar partidas históricas por su inicio en America/Guayaquil y rechazar fechas futuras al registrar o editar, evitando anticipar actividad.
- Incluir estados de carga, error y vacío.

**Beneficio para el usuario:** saber cómo se relaciona lo jugado con lo que se propuso para la semana, reconocer continuidad y ajustar expectativas sin perder la referencia de su actividad real.

**Relación con el producto:** amplía E1 con planificación y seguimiento del hábito, reutilizando sus sesiones y su concepto de avance actual. Conserva el diario personal, su identidad visual y los logros manuales existentes.

**Límites:** sin notificaciones, recordatorios, rankings, metas compartidas, gráficos históricos, nuevos estados del videojuego ni rediseño visual. Conservar metas anteriores inactivas no añade gráficos históricos ni permite mostrar sus hitos sin una meta activa. La racha por videojuego, el cálculo exclusivo del porcentaje de horas y el cómputo semanal completo se mantienen. El 100 % de horas por sí solo no equivale a una semana cumplida si faltan días.

**Dependencias y decisiones pendientes:**

- D-01 y D-02: tratamiento temporal coherente y pruebas automatizadas para verificar el comportamiento aprobado.
- D-03 y D-04: pagar las dos deudas técnicas seleccionadas en fases posteriores con criterio, test y corrección.
- D-05: definir y comprobar una eliminación segura que incluya videojuegos, partidas, metas e hitos, conforme a la decisión de producto.
- Los cinco puntos de producto adicionales quedan resueltos en el PRD. Se conserva como limitación la ausencia de Abandonado y la calidad no comprobada de fechas históricas, sin añadir estados ni corregir fechas por suposición.
- D-06 a D-11 continúan diferidos; esta épica no autoriza corregirlos incidentalmente.

## Relación y trazabilidad

| Épica | Papel en LEVEL UP                                                                                                          | Estado de esta entrega                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| E1    | Registro y consulta de juegos, sesiones, logros y avance.                                                                  | Base existente diagnosticada. No se modifica en Fase 3.                        |
| E2    | Objetivos semanales, hitos calculados, continuidad de actividad y edición de partidas necesaria para mantener el progreso. | Alcance documentado en el PRD con trece decisiones aprobadas. No implementada. |

Las reglas RN-01 a RN-23, los huecos H-01 a H-08 y las decisiones adicionales A-01 a A-05 del PRD proporcionan referencias para las fases posteriores de SDD. No se crean todavía historias, criterios de aceptación desarrollados, tickets o specs.

## Observaciones del enunciado para fases posteriores

El enunciado exige trabajo y evidencia de hooks en Claude Code, documentos anteriores a su implementación en el historial, pruebas, auditoría, bitácora, despliegue y pull request final. Esos requisitos no se consideran cumplidos por esta entrega documental ni autorizan adelantar otras fases. El uso de Codex y las pruebas locales del harness no acreditan las evidencias exigidas dentro de Claude Code.

La exigencia de actualizar un ejemplo de entorno del enunciado entra en conflicto con la prohibición expresa del usuario de leer o modificar cualquier archivo `.env.*`, incluidos ejemplos. Se mantiene esa prohibición y se informa el conflicto para resolverlo antes de la fase correspondiente. Asimismo, no se realizan los commits de cierre de fase que indica el enunciado mientras el usuario no los autorice.
