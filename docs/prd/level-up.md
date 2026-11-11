# LEVEL UP 2.0 — Requisitos de producto

Estado: cierre documental de Fase 3 con trece decisiones de negocio aprobadas por el usuario: los ocho huecos originales y las cinco decisiones adicionales. No implica que las funcionalidades estén implementadas.

Fuente principal: enunciado del Entregable 4 y su ficha de hechos del cliente, junto con las trece decisiones aprobadas por el usuario. Las decisiones adicionales concretan el cumplimiento semanal, los estados disponibles, la edición de partidas, la ausencia de meta activa y las fechas. Los requisitos técnicos se reservan para fases posteriores y no se reproducen en este documento de producto.

## Contexto del producto y E1

LEVEL UP es un Diario de Progreso Gamer personal. Permite organizar una biblioteca de videojuegos y recordar lo jugado mediante sesiones, notas, logros y un resumen de progreso.

La épica E1 corresponde al producto original y comprende:

- Añadir, consultar, editar y eliminar videojuegos con nombre, género, plataforma, estado, portada, descripción y calificación opcional.
- Buscar por nombre y filtrar la biblioteca por género y estado.
- Registrar partidas con fecha y hora, duración, porcentaje de avance y notas; consultar y eliminar sesiones.
- Consultar el historial general y el de cada videojuego.
- Añadir y quitar logros personalizados y marcarlos como obtenidos.
- Consultar sesiones acumuladas, tiempo total, última sesión y avance actual por videojuego, además de estadísticas generales.

Son capacidades existentes identificadas en el diagnóstico, con problemas conocidos pendientes; no se declara que estén libres de defectos o verificadas íntegramente en uso. E1 no incluye metas semanales ni rachas.

## Problema del usuario

El diario permite saber cuánto se ha jugado y qué avance se ha registrado, pero no relaciona esa actividad con un objetivo semanal ni hace visible la continuidad de los días jugados. La ficha describe a una persona que juega mucho un fin de semana y después abandona el juego dos semanas. El usuario debe comparar sus registros manualmente para saber si mantiene el hábito y se acerca a lo que se propuso.

## Perfil del usuario

Persona que juega videojuegos, registra voluntariamente sus sesiones y quiere organizar su progreso personal. Necesita objetivos que pueda ajustar a su disponibilidad y una lectura clara de su constancia, sin competir con otras personas. No se presupone una edad, frecuencia de juego o nivel de experiencia específicos.

## Objetivo de E2: Metas y rachas

Permitir que el usuario establezca una meta semanal por videojuego, comprenda su cumplimiento mediante horas y días jugados, identifique hitos de avance y consulte la continuidad de su actividad. E2 amplía el diario existente y conserva su identidad visual y su tono gamer.

### Métrica de éxito

**Cumplir la meta semanal al menos tres de las cuatro semanas evaluadas para la métrica mensual.**

Una semana se considera cumplida únicamente cuando se alcanzan tanto las horas semanales como los días por semana de la meta activa. El porcentaje mostrado mide exclusivamente las horas y los días se comparan por separado: alcanzar el 100 % de horas no basta si faltan días. La métrica requiere al menos tres semanas cumplidas dentro de las cuatro evaluadas; no presupone un resultado ya observado ni añade gráficos históricos o un sistema de analítica. No se impone el supuesto anterior de cuatro semanas completas consecutivas: la decisión aprobada se refiere a cuatro semanas evaluadas.

## Alcance

- Crear, consultar y editar una meta por videojuego con objetivo de horas semanales y días objetivo, junto con sus hitos.
- Desactivar una meta con confirmación y consultar las metas de un videojuego, sin más de una activa.
- Ver en el detalle del videojuego el periodo semanal, una barra de horas frente a la meta, días jugados frente a días objetivo, racha actual, mejor racha y lista de hitos con su estado.
- Consultar la actividad semanal y las rachas incluso sin meta activa; en ese caso, no mostrar hitos de metas anteriores e invitar a crear una meta.
- Incluir la edición de partidas necesaria para actualizar correctamente el progreso tras registrar, editar o eliminar una partida, sin ampliar la gestión de sesiones a otras funcionalidades.
- Mostrar estados de carga, error y vacío y actualizar el progreso después de esas operaciones.
- Hasta cinco hitos de avance por meta, cuyo estado depende del avance actual del videojuego.
- Aplicación de restricciones por estado del videojuego y eliminación conjunta de sus datos relacionados.
- Conservación de metas anteriores como inactivas, sin confundir ese historial de objetivos con gráficos históricos de progreso.
- Contabilizar las partidas históricas por su inicio en America/Guayaquil y rechazar partidas futuras al registrarlas o editarlas.

## No-alcance

- Notificaciones o recordatorios.
- Rankings, competición, metas compartidas o colaboración entre jugadores.
- Gráficos históricos y paneles de evolución de semanas anteriores.
- Premios permanentes por hitos o desbloqueos irreversibles.
- Rediseño de la identidad visual, correcciones generales de E1 o incorporación de funciones ajenas a metas, hitos y rachas.
- Nuevos estados de videojuegos, incluido Abandonado, o reinterpretación de En pausa como abandono.

Conservar metas inactivas no implica ofrecer gráficos históricos ni fijar cómo se conservarán resultados semanales. Los logros manuales de E1 siguen siendo distintos de los hitos calculados de E2.

## Reglas de negocio aprobadas

### Tiempo, semanas y actividad

- **RN-01.** La zona horaria de referencia es **America/Guayaquil**. Los días y las semanas se interpretan en esa zona, independientemente del lugar desde el que se consulte el diario.
- **RN-02.** La semana va de lunes a domingo: comienza el lunes a las 00:00 y termina al comenzar el lunes siguiente. La actividad de ese nuevo lunes pertenece a la nueva semana.
- **RN-03.** Una partida que cruza la medianoche pertenece al día en que comenzó. Su duración se atribuye a ese día y, por tanto, a la semana que lo contiene; no genera un segundo día jugado por continuar después de medianoche.
- **RN-04.** Varias partidas en el mismo día representan un solo día jugado para contar días y rachas. Sus duraciones sí se acumulan para calcular horas reales.
- **RN-05.** Si hoy no hay partidas, pero ayer sí, la racha continúa vigente durante hoy. Esa vigencia no añade hoy al número de días jugados.

### Metas semanales

- **RN-06.** Cada videojuego puede tener como máximo una meta activa. Las metas anteriores se conservan inactivas, manteniendo su propio ciclo de creación, sustitución y desactivación sin alterar la ficha del juego. Se rechaza una segunda meta activa con un mensaje claro; no se sustituye ni desactiva otra silenciosamente.
- **RN-07.** El objetivo de horas semanales debe ser mayor que 0 y menor o igual que 100. No se exige que sea entero.
- **RN-08.** Los días objetivo deben ser un número entero entre 1 y 7, incluidos ambos límites.
- **RN-09.** Si se cambia la meta durante la semana, el progreso se calcula con la meta activa actual. No se mantiene en paralelo un progreso semanal basado en el objetivo sustituido.
- **RN-10.** El porcentaje de cumplimiento semanal de horas tiene un máximo de 100 %. Se obtiene dividiendo las horas de la semana, redondeadas a un decimal, entre las horas objetivo, multiplicando por 100 y redondeando a entero. Los días objetivo no forman parte de este porcentaje: se muestran por separado. Las horas reales pueden superar el objetivo y no se recortan por ese límite.
- **RN-11.** Se mantienen los estados existentes: Pendiente, Jugando, Completado y En pausa. Los juegos en Completado no pueden tener una meta activa, tanto al activarla como después de cambiar el estado del juego. Si Abandonado estuviera disponible, tendría la misma restricción; actualmente no existe y no se añade. En pausa no se equipara a Abandonado. Una meta anterior puede conservarse inactiva.

### Hitos y eliminación

- **RN-12.** Cada meta puede tener hasta cinco hitos, cada uno con descripción y porcentaje objetivo entre 1 y 100, incluidos ambos límites. No se exige que una meta tenga los cinco hitos. Los hitos pertenecen a su meta y se gestionan dentro de ella.
- **RN-13.** Un hito está alcanzado cuando el porcentaje de avance actual del videojuego es igual o superior a su porcentaje objetivo. Puede dejar de estar alcanzado si el avance actual disminuye. El porcentaje de avance del juego es distinto del porcentaje de cumplimiento semanal de la meta.
- **RN-14.** El avance actual mantiene el significado de E1: corresponde a la partida más reciente, aunque sea inferior a un avance anterior. No equivale al mayor avance registrado históricamente.
- **RN-15.** Eliminar un videojuego también elimina sus partidas, metas e hitos, incluidas las metas inactivas. No deben quedar metas o hitos asociados a un videojuego eliminado.

### Consulta del progreso y casos sin actividad

- **RN-16.** Las horas de la semana se calculan sumando los minutos de todas las partidas del videojuego iniciadas en la semana actual, dividiendo entre 60 y redondeando a un decimal. No se recorta el periodo por la fecha de activación o cambio de meta. Los días jugados son las fechas distintas de esas partidas.
- **RN-17.** La racha es por videojuego. La racha actual y la mejor racha se calculan sobre todo su historial, sin reiniciarse al cambiar de semana. La mejor racha es la mayor secuencia de días consecutivos jugados; la actual respeta la vigencia de RN-05. Sin actividad hoy ni ayer, la racha actual es 0.
- **RN-18.** Sin meta activa, no hay objetivo activo ni porcentaje de horas aplicable, pero se calculan y muestran horas, días y rachas y se invita a crear una meta. No se usa una meta inactiva como objetivo actual ni se muestran hitos de metas anteriores. La invitación no elimina las restricciones de estado de RN-11 para activar una meta.
- **RN-19.** Sin partidas, las horas, los días y ambas rachas son 0 y ningún hito está alcanzado. Con meta activa, el porcentaje de horas es 0; sin ella, no es aplicable, conforme a RN-18.
- **RN-20.** Una meta nueva es activa por defecto, siempre que el videojuego exista, su estado lo permita y no tenga otra activa. El usuario puede editarla y desactivarla con confirmación. Los datos fuera de los límites se rechazan con un mensaje claro.
- **RN-21.** E2 incluye la edición de partidas necesaria para que el progreso se actualice correctamente después de registrar, editar o eliminar una partida. La consulta de un videojuego inexistente o de una referencia no válida informa el error, sin presentar un progreso vacío como si el juego existiera.
- **RN-22.** Una semana se considera cumplida solo cuando se alcanzan ambos objetivos, horas semanales y días por semana, de la meta activa actual. El exceso de horas no compensa la falta de días. Este cumplimiento es distinto del porcentaje de horas de RN-10. La métrica mensual exige cumplir al menos tres de cuatro semanas evaluadas.
- **RN-23.** Las partidas históricas se contabilizan según su fecha de inicio en America/Guayaquil para días, semanas y rachas. Al registrar o editar una partida, se rechaza una fecha de inicio posterior al momento actual, incluso dentro del día de hoy, para no anticipar progreso ni rachas. Una partida ya iniciada que cruza medianoche sigue atribuyéndose a su día de inicio conforme a RN-03.

## Los ocho huecos resueltos

Los ocho casos siguientes reproducen las decisiones aprobadas por el usuario y corresponden a los ocho huecos del enunciado. La ficha no fija una respuesta contraria a ninguna de ellas.

| Hueco                                  | Decisión explícita                                                                                                        | Reglas relacionadas |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| H-01: hoy sin actividad                | Si hoy no hay partidas, pero ayer sí, la racha continúa vigente durante hoy; hoy no suma un día jugado.                   | RN-05               |
| H-02: varias partidas diarias          | Varias partidas el mismo día representan un solo día jugado.                                                              | RN-04               |
| H-03: cruce de medianoche              | La partida pertenece al día en que comenzó, utilizando America/Guayaquil.                                                 | RN-01, RN-03        |
| H-04: cambio de meta durante la semana | El progreso se calcula con la meta activa actual.                                                                         | RN-09               |
| H-05: objetivo superado                | El porcentaje semanal se limita a 100 %, pero las horas reales pueden superar el objetivo.                                | RN-10               |
| H-06: retroceso del avance             | Los hitos se calculan con el porcentaje de avance actual y pueden dejar de estar alcanzados si disminuye.                 | RN-13, RN-14        |
| H-07: juegos completados o abandonados | No pueden tener meta activa cuando esos estados están disponibles. Se conservan los estados de E1, sin añadir Abandonado. | RN-11               |
| H-08: eliminación del videojuego       | También elimina sus partidas, metas e hitos.                                                                              | RN-15               |

## Cinco decisiones adicionales aprobadas

| Decisión                                | Regla aprobada                                                                                                                                         | Referencia          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| A-01: semana cumplida y métrica mensual | Se deben alcanzar horas y días de la meta activa. Éxito: al menos tres de cuatro semanas evaluadas. El porcentaje visible sigue midiendo solo horas.   | RN-10, RN-22        |
| A-02: estados existentes                | Se conservan los estados de E1. Completado impide meta activa; Abandonado también lo haría si existiera, pero no se añade ni se confunde con En pausa. | RN-11               |
| A-03: edición de partidas               | Se incluye la edición necesaria para actualizar el progreso tras registrar, editar o eliminar partidas.                                                | RN-21               |
| A-04: sin meta activa                   | Mostrar horas, días y rachas, sin hitos de metas anteriores, e invitar a crear una meta.                                                               | RN-18               |
| A-05: fechas históricas y futuras       | Contabilizar históricas por inicio en America/Guayaquil y rechazar futuras al registrar o editar.                                                      | RN-01, RN-03, RN-23 |

## Registro de supuestos anteriores

Se conservan los identificadores del borrador para registrar su resolución. No quedan supuestos adicionales que condicionen el alcance de esta fase.

| ID   | Estado tras el contraste                                                                              | Consecuencia                                                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| S-01 | Resuelto por la ficha: la racha es por videojuego y usa todo su historial.                            | Se incorpora como RN-17; deja de ser un supuesto de alcance.                                                                              |
| S-02 | Retirado el porcentaje conjunto; aprobada la exigencia de horas y días para una semana cumplida.      | RN-10 mide solo horas y RN-22 define cumplimiento de ambos objetivos.                                                                     |
| S-03 | Resuelto por el cálculo fijo sobre todas las partidas de la semana actual.                            | RN-16 no recorta actividad por la fecha de activación de la meta.                                                                         |
| S-04 | Sustituido por la decisión de evaluar el éxito mensual sobre cuatro semanas, al menos tres cumplidas. | No se impone la propuesta anterior de semanas completas consecutivas, una política de cierre histórico o una función histórica adicional. |

## Puntos resueltos y limitaciones

- **PA-01: cerrado.** El enunciado completo está disponible y fue contrastado con las decisiones del usuario.
- **PA-02: cerrado con limitación del producto actual.** No existe Abandonado y no se incorpora. Se conservan Pendiente, Jugando, Completado y En pausa; la restricción efectiva actual se aplica a Completado. No se inventa una representación alternativa del abandono.
- **PA-03: cerrado en reglas de producto.** El inicio en America/Guayaquil determina el cómputo histórico y se rechazan fechas futuras al registrar o editar. La calidad de las fechas ya registradas es una limitación del diagnóstico; no se afirma que se haya comprobado o corregido ni se cambia su fecha de inicio por suposición.
- **PA-04: cerrado en alcance de producto.** Cumplimiento semanal exige horas y días; el éxito mensual requiere al menos tres de cuatro semanas evaluadas. El porcentaje de horas es una medida distinta. No se añade una funcionalidad de evaluación histórica ni se adopta una política de cierre no solicitada.
- **PA-05: cerrado.** E1 no ofrece edición de partidas; se incluye en E2 con el alcance necesario para que el progreso refleje las tres operaciones sobre partidas.
- **PA-06: cerrado.** Sin meta activa no se muestran hitos de metas anteriores; sí se muestran horas, días y rachas y se invita a crear una meta.

## Coherencia y límites de la entrega

La tolerancia de hoy sin partidas conserva una racha vigente, pero no inventa actividad. Las partidas que cruzan medianoche cuentan una sola vez por su inicio, incluso al cambiar de semana. El límite del porcentaje semanal no elimina horas reales ni altera los umbrales de hitos. Una meta inactiva conservada sigue sujeta a la eliminación de su videojuego.

Las trece decisiones son coherentes: cumplir ambos objetivos no cambia el cálculo exclusivo del porcentaje de horas; mantener los estados actuales no añade Abandonado; conservar metas inactivas no implica mostrar sus hitos sin una activa; el tratamiento histórico y el rechazo de fechas futuras se aplican también al editar. No quedan contradicciones de producto que bloqueen la siguiente fase.

Esta entrega documenta producto y épicas; no crea historias, tickets, especificaciones ni funcionalidades. Las limitaciones del diagnóstico y la implementación pendiente no se consideran corregidas por cerrar el PRD.
