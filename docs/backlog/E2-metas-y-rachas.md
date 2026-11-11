# E2 — Metas y rachas: historias, criterios y tickets

Estado: backlog de Fase 4 para revisión. Todas las historias y tickets están **pendientes**. Los escenarios y evidencias siguientes son verificaciones previstas; no son resultados ejecutados de E2.

## Fuentes, alcance y convenciones

- [PRD de LEVEL UP 2.0](../prd/level-up.md): RN-01 a RN-23, H-01 a H-08 y A-01 a A-05.
- [Épicas E1 y E2](epicas.md), [diagnóstico](../diagnostico.md) y [enunciado del profesor](../referencias/enunciado-E4.md).
- [AGENTS.md](../../AGENTS.md), [DESIGN.md](../../DESIGN.md) y [harness](../harness.md).

Las historias representan resultados para el usuario; los tickets separan el trabajo técnico. Una historia puede verificarse con datos preparados sin completar otras historias de interfaz. Las dependencias de construcción se expresan entre tickets, no mediante relatos que dependan de un flujo previo obligatorio. Los detalles de contratos y archivos se definirán en las specs, que todavía no se crean.

INVEST: cada historia tiene un resultado independiente, valor explícito, límites y escenarios comprobables; los tickets permiten estimarla y construirla por partes. La solución técnica es negociable dentro del PRD y del enunciado; las trece decisiones aprobadas no se renegocian incidentalmente. Las historias de soporte HU-E2-12 y HU-E2-13 son habilitadoras de calidad y operación, no nuevas funciones de producto.

Todos los ejemplos temporales utilizan un momento de referencia controlado y fechas de inicio en America/Guayaquil, sin depender de la fecha real de ejecución. «Otra partida» o «otra meta» significa del mismo videojuego salvo indicación contraria. Los errores de escritura no deben mostrarse como operaciones exitosas.

## Historias y criterios de aceptación

### HU-E2-01 — Crear y consultar una meta válida

**Como** persona que registra sus juegos, **quiero** crear y consultar una meta con horas, días e hitos, **para** saber qué me propuse para un videojuego.

**Valor:** convertir una intención en un objetivo consultable. **Fuentes:** RN-07, RN-08, RN-12, RN-20, RN-21.

- **CA-E2-01.** DADO un videojuego Jugando sin meta activa, CUANDO creo una meta de 5 horas, 4 días y dos hitos con descripción y objetivos de 25 y 50, ENTONCES se crea activa por defecto y puedo consultar esos mismos valores para ese juego.
- **CA-E2-02.** DADA una meta existente, CUANDO la consulto individualmente y consulto las metas de su videojuego, ENTONCES puedo identificar la misma meta, sus objetivos, sus hitos y si está activa, sin mezclar metas de otro juego.
- **CA-E2-03.** DADO un objetivo de horas, CUANDO creo o edito una meta, ENTONCES se aceptan 0,5 y 100 horas y se rechazan 0, valores negativos, superiores a 100, ausentes o no numéricos, indicando el campo inválido sin guardar la operación rechazada.
- **CA-E2-04.** DADO un objetivo de días, CUANDO creo o edito una meta, ENTONCES se aceptan 1 y 7 y se rechazan 0, 8, fracciones, valores ausentes o no numéricos, sin guardar la operación rechazada.
- **CA-E2-05.** DADA una lista de hitos, CUANDO creo o edito una meta, ENTONCES se aceptan listas de cero a cinco hitos y se rechaza una de seis, conservando la meta anterior si la edición falla.
- **CA-E2-06.** DADO un hito con descripción, CUANDO creo o edito sus objetivos, ENTONCES se aceptan porcentajes 1, 50,5 y 100 y se rechazan porcentajes menores que 1, mayores que 100, ausentes o no numéricos; no se exige un porcentaje entero.
- **CA-E2-07.** DADO un videojuego inexistente o una referencia de videojuego no válida, CUANDO intento crear una meta, ENTONCES se informa el error correspondiente y no queda creada una meta sin videojuego.
- **CA-E2-08.** DADA una meta inexistente o una referencia de meta no válida, CUANDO intento consultarla o modificarla, ENTONCES se informa que no existe o que la referencia no es válida, sin devolver ni modificar una meta distinta.

### HU-E2-02 — Evitar objetivos activos duplicados

**Como** jugador, **quiero** tener como máximo una meta activa por juego, **para** que mi progreso tenga una única referencia.

**Valor:** evitar objetivos semanales contradictorios. **Fuentes:** RN-06, RN-20.

- **CA-E2-09.** DADO un videojuego sin meta activa, CUANDO se intentan crear dos metas activas simultáneamente, ENTONCES solo una queda activa y el otro intento informa el conflicto; nunca quedan dos activas.
- **CA-E2-10.** DADO un juego con metas anteriores inactivas y otro juego con su propia meta activa, CUANDO creo una meta activa para el primero, ENTONCES se admite sin modificar las metas anteriores ni la del otro juego.
- **CA-E2-11.** DADO un juego que ya tiene una meta activa, CUANDO intento crear otra activa o activar una anterior mediante actualización, ENTONCES se rechaza el conflicto con un mensaje claro y la meta activa existente permanece sin cambios.

### HU-E2-03 — Ajustar o desactivar mi objetivo

**Como** jugador, **quiero** editar o desactivar mi meta y consultar las anteriores, **para** adaptar mi planificación sin perder los objetivos conservados.

**Valor:** ajustar disponibilidad sin confundir meta vigente e historial. **Fuentes:** RN-06, RN-09, RN-12, RN-20.

- **CA-E2-12.** DADA una meta editable, CUANDO guardo nuevos valores válidos de horas, días e hitos, ENTONCES consulto los nuevos valores en esa meta y la ficha descriptiva del videojuego no cambia; si los datos son inválidos, se conserva la versión anterior.
- **CA-E2-13.** DADAS 3 horas y 2 días jugados durante la semana y una meta de 6 horas y 4 días, CUANDO cambio la meta activa a 3 horas y 2 días, ENTONCES el porcentaje pasa de 50 % a 100 %, se consideran los registros de toda la semana y la semana alcanza ambos objetivos actuales.
- **CA-E2-14.** DADA una meta activa, CUANDO solicito desactivarla, ENTONCES se pide confirmación; si cancelo sigue activa y si confirmo queda inactiva sin borrar sus datos ni sus hitos.
- **CA-E2-15.** DADA una meta desactivada y una nueva meta activa, CUANDO consulto las metas del juego, ENTONCES ambas siguen identificables con sus estados correctos y solo la actual determina el objetivo semanal; la anterior no se elimina ni se transforma en un gráfico histórico.

### HU-E2-04 — Comprender la actividad de la semana

**Como** jugador, **quiero** consultar horas y días de la semana de mi juego, **para** comparar mi actividad real con mi objetivo.

**Valor:** obtener una lectura semanal consistente. **Fuentes:** RN-01 a RN-04, RN-10, RN-16, RN-23.

- **CA-E2-16.** DADO un momento de referencia en la semana del lunes 9 al domingo 15 de noviembre de 2026, CUANDO consulto la actividad, ENTONCES el periodo corresponde a esos días en America/Guayaquil: el domingo 8 a las 23:59 queda fuera, el lunes 9 a las 00:00 entra y el lunes 16 a las 00:00 pertenece a la siguiente semana, aunque la consulta se haga desde otra zona.
- **CA-E2-17.** DADAS partidas semanales de 60, 90 y 60 minutos y una meta de 5 horas, CUANDO consulto el progreso, ENTONCES veo 3,5 horas y 70 % de horas; los días objetivo no cambian ese porcentaje.
- **CA-E2-18.** DADOS 97 minutos en la semana y una meta de 3 horas, CUANDO consulto el progreso, ENTONCES las horas se muestran como 1,6 y el porcentaje calculado con esas horas es 53 %, con horas a un decimal y porcentaje entero.
- **CA-E2-19.** DADAS 7 horas semanales y una meta de 5 horas, CUANDO consulto el progreso, ENTONCES veo las 7 horas reales y 100 % de horas, sin recortar el tiempo a 5 ni mostrar 140 %.
- **CA-E2-20.** DADAS dos partidas el lunes y una el miércoles para un juego, además de partidas de otro juego, CUANDO consulto sus días semanales, ENTONCES cuento 2 días y sumo las duraciones de sus tres partidas, sin incluir las del otro juego.
- **CA-E2-21.** DADA una partida de 120 minutos iniciada el domingo 8 de noviembre de 2026 a las 23:30 y terminada el lunes 9 a la 01:30, CUANDO consulto después de su final, ENTONCES sus 120 minutos y su único día jugado pertenecen al domingo y a la semana anterior, sin sumar actividad al lunes ni a la semana nueva.

### HU-E2-05 — Reconocer mi constancia

**Como** jugador, **quiero** conocer mi racha actual y mi mejor racha por juego, **para** reconocer la continuidad de mi actividad.

**Valor:** distinguir la constancia vigente de la mejor alcanzada. **Fuentes:** RN-04, RN-05, RN-17.

- **CA-E2-22.** DADO que hoy es 11 de noviembre de 2026 y jugué los días 1 a 5 y 9 a 11, CUANDO consulto las rachas, ENTONCES la actual es 3 y la mejor es 5, usando todo el historial y no solo la semana actual.
- **CA-E2-23.** DADO que hoy es 11 de noviembre y solo jugué los días 8, 9 y 10, CUANDO consulto sin haber jugado hoy, ENTONCES la racha actual sigue vigente y vale 3, sin contar hoy como día jugado ni reiniciarse el lunes 9.
- **CA-E2-24.** DADO que hoy es 11 de noviembre y solo jugué los días 1 a 5, CUANDO consulto sin actividad hoy ni ayer, ENTONCES la racha actual es 0 y la mejor sigue siendo 5.
- **CA-E2-25.** DADAS varias partidas en un mismo día y actividad de otro videojuego en un día intermedio sin partidas del primero, CUANDO consulto las rachas del primero, ENTONCES ese día repetido cuenta una vez y el otro videojuego no rellena el hueco de su racha.

### HU-E2-06 — Consultar hitos según el avance actual

**Como** jugador, **quiero** ver qué hitos de mi meta alcanzo con mi avance actual, **para** obtener una referencia que refleje mi progreso registrado.

**Valor:** evitar hitos obsoletos o confundidos con horas jugadas. **Fuentes:** RN-12 a RN-14, RN-19.

- **CA-E2-26.** DADA una meta activa con hitos de 25, 50 y 100 y avance actual de 50, CUANDO consulto los hitos, ENTONCES los de 25 y 50 están alcanzados y el de 100 no, con independencia del porcentaje de horas semanal.
- **CA-E2-27.** DADO un hito de 50 alcanzado con avance actual de 60, CUANDO la partida más reciente deja el avance actual en 40, ENTONCES el hito deja de estar alcanzado; no se conserva como premio permanente ni altera logros manuales de E1.
- **CA-E2-28.** DADO un avance de 60 en la partida más reciente por fecha de inicio, CUANDO registro después una partida histórica anterior con avance de 20, ENTONCES los hitos se calculan con 60 y no con el último registro introducido ni con un máximo histórico independiente del resumen de E1.
- **CA-E2-29.** DADA una meta con hitos y un videojuego sin partidas, CUANDO consulto los hitos, ENTONCES ninguno está alcanzado, incluso si el umbral más bajo permitido es 1.

### HU-E2-07 — Entender los casos sin meta o sin actividad

**Como** jugador, **quiero** que el progreso distinga ausencia de objetivo y ausencia de partidas, **para** saber qué información existe y qué puedo hacer después.

**Valor:** evitar ceros y estados vacíos engañosos. **Fuentes:** RN-18 a RN-21.

- **CA-E2-30.** DADO un juego con partidas y solo metas inactivas, CUANDO consulto su progreso, ENTONCES veo horas, días y rachas, sin objetivo activo ni porcentaje de horas aplicable, sin hitos anteriores y con invitación a crear una meta.
- **CA-E2-31.** DADO un juego con meta activa pero sin partidas, CUANDO consulto su progreso, ENTONCES veo horas, días, ambas rachas y porcentaje de horas en 0 y ningún hito alcanzado, manteniendo visibles los objetivos actuales.
- **CA-E2-32.** DADO un juego sin metas ni partidas, CUANDO consulto su progreso, ENTONCES veo horas, días y ambas rachas en 0, ningún hito y ningún porcentaje de horas aplicable, junto con la invitación a crear una meta.
- **CA-E2-33.** DADO un videojuego inexistente o una referencia no válida, CUANDO solicito su progreso, ENTONCES recibo el error correspondiente en lugar de un progreso vacío que aparente un juego existente.

### HU-E2-08 — Respetar el estado de mi videojuego

**Como** jugador, **quiero** que las metas respeten el estado del juego, **para** no mantener objetivos activos incompatibles con haberlo completado.

**Valor:** coherencia entre biblioteca y planificación. **Fuentes:** RN-11, RN-18, RN-20.

- **CA-E2-34.** DADO un juego Completado, CUANDO intento crear o activar una meta, incluso desde la invitación del progreso vacío, ENTONCES se rechaza la activación con un mensaje claro y ninguna meta queda activa.
- **CA-E2-35.** DADO un juego con meta activa, CUANDO intento confirmar un cambio a Completado conservando esa meta activa, ENTONCES no se admite esa combinación; ninguna operación confirmada puede dejar simultáneamente el juego Completado y una meta activa.
- **CA-E2-36.** DADO el catálogo actual de estados, CUANDO gestiono un juego o su meta, ENTONCES siguen disponibles Pendiente, Jugando, Completado y En pausa, sin añadir Abandonado; En pausa no provoca el rechazo reservado a Completado. La restricción de abandono solo aplicaría si ese estado existiera, sin incorporarlo en E2.

### HU-E2-09 — Mantener mis partidas y su progreso actualizado

**Como** jugador, **quiero** registrar, editar y eliminar partidas con fechas válidas, **para** que el progreso y las rachas reflejen mi diario real.

**Valor:** corregir registros sin mantener resultados obsoletos. **Fuentes:** RN-01, RN-03, RN-14, RN-21, RN-23.

- **CA-E2-37.** DADA una partida con inicio histórico válido o igual al momento actual, CUANDO la registro, ENTONCES se acepta y se atribuye al día y semana de inicio en America/Guayaquil, sin moverla al día de registro; una partida histórica puede cambiar la mejor racha.
- **CA-E2-38.** DADA una fecha de inicio posterior al momento actual, incluso hoy más tarde, CUANDO registro o edito una partida, ENTONCES se rechaza con un mensaje de fecha futura y no cambia el registro previo, el progreso ni las rachas.
- **CA-E2-39.** DADA una partida existente, CUANDO corrijo su fecha de inicio, duración, avance o notas con datos válidos y guardo, ENTONCES consulto los valores corregidos y el detalle vuelve a mostrar horas, días, rachas e hitos calculados con la edición, sin recargar manualmente la página.
- **CA-E2-40.** DADAS las validaciones existentes de partida, CUANDO registro o edito, ENTONCES se admiten duraciones enteras de 1 a 1440 minutos y avances de 0 a 100, y se rechazan fechas inválidas, duraciones fuera del rango o fraccionarias y avances fuera del rango, sin guardar cambios parciales. Se conserva el límite existente de 500 caracteres en notas.
- **CA-E2-41.** DADA una partida inexistente o una referencia no válida, CUANDO intento editarla o eliminarla, ENTONCES se informa el error sin modificar otra partida ni presentar una actualización exitosa del progreso.
- **CA-E2-42.** DADO el detalle de un juego, CUANDO registro una partida o elimino una existente con éxito, ENTONCES su progreso se vuelve a consultar y muestra horas, días, rachas e hitos correspondientes a las partidas restantes sin recarga manual; eliminar la última sesión muestra el caso sin partidas.
- **CA-E2-43.** DADO un fallo al guardar una partida o al consultar el progreso actualizado, CUANDO termina la operación, ENTONCES se muestra cuál operación falló, no se confirma una escritura rechazada y no se presenta el progreso anterior como actualizado; si falló la consulta, puedo reintentarla.

### HU-E2-10 — Eliminar un juego sin dejar objetivos huérfanos

**Como** jugador, **quiero** que eliminar un videojuego retire también su actividad y objetivos, **para** que no queden datos asociados a un juego que ya no existe.

**Valor:** mantener un diario íntegro. **Fuentes:** RN-15, D-05.

- **CA-E2-44.** DADO un juego con partidas, una meta activa, metas inactivas e hitos, CUANDO confirmo su eliminación y esta termina con éxito, ENTONCES no puedo consultar ese juego ni sus partidas, metas o hitos, y los datos de otros juegos permanecen intactos.
- **CA-E2-45.** DADA la eliminación de un juego, CUANDO ocurre un fallo durante la operación, ENTONCES no se anuncia éxito y no queda una eliminación parcial confirmada: el estado final verificable conserva el conjunto previo o completa su eliminación, sin referencias huérfanas.
- **CA-E2-46.** DADA una creación de partida o meta concurrente con la eliminación de su juego, CUANDO terminan las operaciones, ENTONCES no queda ninguna partida ni meta asociada a un juego inexistente; el intento incompatible informa el conflicto o que el juego ya no existe.

### HU-E2-11 — Usar metas y progreso con la identidad de LEVEL UP

**Como** jugador que utiliza teclado o pantallas de distintos tamaños, **quiero** formularios y progreso comprensibles y accesibles, **para** gestionar mis objetivos sin perder contexto.

**Valor:** integrar E2 en la experiencia existente. **Fuentes:** alcance del PRD, DESIGN.md, requisitos de frontend del enunciado.

- **CA-E2-47.** DADO el formulario de meta, CUANDO creo o edito objetivos e hitos, ENTONCES puedo modificar horas, días y hasta cinco hitos, identificar errores de campo y reconocer que el envío está en curso, sin confirmaciones duplicadas por repetir la acción mientras guarda.
- **CA-E2-48.** DADO un juego con meta y partidas, CUANDO abro su detalle, ENTONCES encuentro el periodo semanal, barra de horas frente a la meta, días frente al objetivo, racha actual, mejor racha y descripción y estado de cada hito, distinguiendo porcentaje de horas de semana cumplida.
- **CA-E2-49.** DADA la sección o formulario de E2, CUANDO hay una consulta pendiente, un error o un resultado vacío, ENTONCES distingo carga, fallo con mensaje y reintento de consulta, o vacío con acción pertinente; no se muestra ausencia de meta como si fuera un error de conexión.
- **CA-E2-50.** DADAS las vistas de E2, CUANDO las recorro con teclado y tecnología de asistencia, ENTONCES puedo alcanzar y activar controles sin ratón, veo el foco, cada campo y acción tiene nombre comprensible, errores y estados se pueden percibir sin depender solo del color y la barra comunica su valor y objetivo.
- **CA-E2-51.** DADAS las vistas de E2 en anchos de 360, 768 y 1280 píxeles y con preferencia de movimiento reducido, CUANDO las utilizo, ENTONCES objetivos, acciones y errores permanecen legibles y operables sin solaparse, conservan paleta, fuentes y patrones de DESIGN.md y las animaciones nuevas no se requieren para acceder al contenido. No se cambia la identidad visual ni se introduce una librería visual no autorizada.

### HU-E2-12 — Recibir errores identificables (D-03)

**Como** persona que utiliza y mantiene el diario, **quiero** errores correctamente clasificados e identificables, **para** distinguir datos inválidos de fallos del servicio y poder investigarlos.

**Valor:** diagnóstico fiable sin exponer información interna. **Fuentes:** D-03 y manejo de errores exigido por el enunciado.

- **CA-E2-52.** DADA una solicitud con cuerpo JSON mal formado, CUANDO el servicio la recibe, ENTONCES responde 400 con un identificador de solicitud en la respuesta y su cabecera, registra esa misma solicitud con su identificador y no la clasifica como fallo interno 500.
- **CA-E2-53.** DADAS operaciones con datos inválidos, recurso inexistente, segunda meta activa y fallo inesperado controlado, CUANDO se ejecutan, ENTONCES se distinguen respectivamente 400, 404, 409 y 500, con mensaje e identificador de solicitud; el 500 no revela detalles internos. El conflicto de meta no modifica la meta vigente.

### HU-E2-13 — Utilizar la base de datos configurada (D-04)

**Como** responsable del diario, **quiero** que la conexión respete la base de datos configurada, **para** separar correctamente los entornos y las verificaciones.

**Valor:** evitar operar sobre una base distinta de la esperada. **Fuente:** D-04.

- **CA-E2-54.** DADA una configuración controlada con nombre de base `level_up_pruebas`, CUANDO se solicita la conexión, ENTONCES se utiliza ese nombre y no el literal `levelup`; la verificación no necesita credenciales reales ni acceder a archivos de entorno.
- **CA-E2-55.** DADA una configuración sin nombre explícito de base, CUANDO se resuelve la conexión, ENTONCES se respeta el valor por defecto existente de la configuración, `level_up`, sin reemplazarlo por otro literal en la conexión.

### HU-E2-14 — Distinguir porcentaje de horas y cumplimiento

**Como** jugador, **quiero** saber si alcancé tanto horas como días, **para** evaluar si cumplí mi meta semanal y el objetivo mensual de constancia.

**Valor:** evitar interpretar muchas horas en un solo día como cumplimiento de todos los objetivos. **Fuentes:** RN-10, RN-22, A-01.

- **CA-E2-56.** DADA una meta de 5 horas y 4 días, CUANDO evalúo semanas con 5 horas y 4 días, 7 horas y 3 días, y 4 horas y 4 días, ENTONCES solo la primera está cumplida; la segunda muestra 100 % de horas pero no cumplimiento. DADAS cuatro semanas evaluadas, CUANDO tres o cuatro cumplen ambos objetivos, ENTONCES se alcanza la métrica mensual; con dos o menos no. Esta evaluación se verifica con datos de prueba o evidencia de evaluación, sin añadir gráficos o analítica histórica al producto.

## Tickets y orden de trabajo

Todos los tickets tienen estado **Pendiente**. El orden de listado es topológico; las dependencias explícitas son obligatorias. Un ticket de pruebas prepara evidencia de fallo esperado y no se considera implementación de los criterios asociados.

**Definition of Done común (DDC):** contar antes de implementar con spec aprobada que vincule ticket, criterios y archivos; mantener el alcance; ejecutar pruebas correspondientes y registrar comando, resultado y evidencia; no leer ni modificar `.env` o variantes; no alterar deudas diferidas ni diseño fuera del alcance; dejar referencias para auditoría. La spec precederá al código en Git cuando se autoricen commits. Los tickets de tests primero registran un fallo esperado por comportamiento ausente y dejan su criterio funcional pendiente hasta la implementación posterior. Los demás tickets requieren sus pruebas aplicables en verde.

### T-01 — Preparar pruebas de aplicación aisladas

- **Tipo:** tests. **Historias:** HU-E2-01 a HU-E2-14. **Criterios:** CA-E2-01 a CA-E2-56 (infraestructura transversal, no aceptación funcional).
- **Alcance:** resolver D-02 con ejecución de pruebas de dominio, integración y frontend según los criterios; reloj controlable y datos aislados sin cargar archivos de entorno ni conectar a datos personales.
- **Definition of Done:** DDC; comandos reproducibles documentados, una prueba de infraestructura ejecutada y aislamiento demostrado; distinguir esta suite de los tests del harness. No implementar reglas E2 para hacer pasar un ejemplo.
- **Dependencias:** ninguna de implementación; requiere la spec aprobada de su alcance.
- **Evidencia esperada:** comandos y salida de pruebas de infraestructura, configuración de aislamiento revisable.

### T-02 — Pagar D-04: respetar la base configurada

- **Tipo:** deuda técnica. **Historia:** HU-E2-13. **Criterios:** CA-E2-54, CA-E2-55.
- **Alcance:** corregir solo la discrepancia entre configuración resuelta y nombre usado al conectar.
- **Definition of Done:** DDC; pruebas de ambos criterios fallan por el literal previo y pasan tras corregirlo; verificar argumentos de conexión sin requerir secretos ni abrir archivos de entorno.
- **Dependencias:** T-01.
- **Evidencia esperada:** prueba de regresión antes/después, salida y vínculo D-04 → criterios → test → corrección.

### T-03 — Pagar D-03 y completar clasificación de errores

- **Tipo:** deuda técnica. **Historia:** HU-E2-12. **Criterios:** CA-E2-52, CA-E2-53.
- **Alcance:** identificación y registro antes de errores del parser; respuesta 400 para JSON mal formado y contrato centralizado de 400, 404, 409 y 500. La unicidad real se entrega en T-06.
- **Definition of Done:** DDC; regresión de CA-E2-52 demuestra fallo previo y corrección; pruebas controladas de cada clasificación, cabecera/cuerpo y registro correlacionados, sin exponer detalles de 500.
- **Dependencias:** T-01.
- **Evidencia esperada:** tests de integración y muestras de respuestas/registros; T-19 comprueba 409 con la operación real.

### T-04 — Definir Meta y sus validaciones

- **Tipo:** backend. **Historia:** HU-E2-01. **Criterios:** CA-E2-01, CA-E2-03 a CA-E2-06.
- **Alcance:** entidad Meta referenciada a Videojuego, hitos embebidos, objetivos, estado activo por defecto y fechas de creación/actualización, según el enunciado. No modificar los modelos existentes salvo alcance aprobado.
- **Definition of Done:** DDC; validaciones positivas, negativas y de límites probadas; justificar referencia de Meta y embebido de hitos en la futura spec, sin persistir el estado calculado de hito. Este ticket no completa el CRUD ni la unicidad concurrente.
- **Dependencias:** T-01, T-02.
- **Evidencia esperada:** tests de validación y resultados de lectura/escritura aislados.

### T-05 — Crear, consultar, editar y desactivar metas

- **Tipo:** backend. **Historias:** HU-E2-01, HU-E2-03. **Criterios:** CA-E2-01 a CA-E2-08, CA-E2-12, CA-E2-14, CA-E2-15.
- **Alcance:** operaciones de metas, consulta individual y por videojuego, existencia de referencias, conservación de inactivas y edición de hitos. La confirmación visual se entrega en T-15.
- **Definition of Done:** DDC; operaciones y errores probados sin alterar la ficha del juego; histórico inactivo recuperable; datos inválidos no guardan cambios parciales; fechas de creación/actualización coherentes con las operaciones.
- **Dependencias:** T-03, T-04.
- **Evidencia esperada:** pruebas de integración de cada operación y referencia no válida/inexistente.

### T-06 — Garantizar meta única y restricciones de estado

- **Tipo:** backend. **Historias:** HU-E2-02, HU-E2-08. **Criterios:** CA-E2-09 a CA-E2-11, CA-E2-34 a CA-E2-36.
- **Alcance:** unicidad activa incluso con concurrencia, activación por actualización y coherencia con Completado en ambas vías de cambio; conservar los estados de E1.
- **Definition of Done:** DDC; dos intentos concurrentes no dejan duplicado y el rechazado informa 409; ninguna operación confirmada deja Completado con meta activa; En pausa no se trata como abandono. La futura spec concreta la secuencia de transición preservando estos resultados, sin introducir un nuevo estado.
- **Dependencias:** T-05.
- **Evidencia esperada:** pruebas de concurrencia, transición, reactivación y aislamiento entre juegos.

### T-07 — Escribir primero pruebas de semana, horas, días y cumplimiento

- **Tipo:** tests. **Historias:** HU-E2-03, HU-E2-04, HU-E2-14. **Criterios:** CA-E2-13, CA-E2-16 a CA-E2-21, CA-E2-56.
- **Alcance:** casos de cálculo puro con reloj controlado, zona horaria, límites de semana, medianoche, redondeos y diferencia entre horas y cumplimiento.
- **Definition of Done:** DDC; al menos un test por criterio verificable sin base de datos, casos límite y fallo esperado registrado antes de implementar T-08. No crear un producto de analítica mensual.
- **Dependencias:** T-01.
- **Evidencia esperada:** suite de dominio y salida del fallo esperado por reglas aún no implementadas.

### T-08 — Calcular semana, horas, días y cumplimiento

- **Tipo:** backend. **Historias:** HU-E2-03, HU-E2-04, HU-E2-14. **Criterios:** CA-E2-13, CA-E2-16 a CA-E2-21, CA-E2-56.
- **Alcance:** funciones puras de dominio, sin consultas, con todas las partidas semanales y meta actual; porcentaje solo de horas, cumplimiento por ambos objetivos. La métrica de cuatro semanas se comprueba con evaluación preparada, sin historial nuevo de producto.
- **Definition of Done:** DDC; suite de T-07 pasa, resultados no dependen de la zona del equipo ni de acceso a datos, se conservan horas reales por encima del objetivo.
- **Dependencias:** T-07.
- **Evidencia esperada:** tests en verde y comparación de resultados con ejemplos del backlog.

### T-09 — Escribir primero pruebas de rachas e hitos

- **Tipo:** tests. **Historias:** HU-E2-05, HU-E2-06. **Criterios:** CA-E2-22 a CA-E2-29.
- **Alcance:** casos puros con historial completo, repeticiones, huecos, vigencia de ayer, mejores rachas e hitos reversibles; preservar desempate del avance actual de E1.
- **Definition of Done:** DDC; pruebas por criterio sin base de datos, historial vacío y cruce de semana; fallo esperado documentado antes de T-10.
- **Dependencias:** T-01.
- **Evidencia esperada:** fixtures temporales controlados, suite y resultados iniciales.

### T-10 — Calcular rachas e hitos

- **Tipo:** backend. **Historias:** HU-E2-05, HU-E2-06. **Criterios:** CA-E2-22 a CA-E2-29.
- **Alcance:** funciones puras de racha actual, mejor racha y estado de hitos; usar el avance actual compatible con el resumen E1, sin máximo histórico ni estado permanente almacenado.
- **Definition of Done:** DDC; T-09 pasa, ninguna repetición diaria aumenta rachas y el avance disminuido revierte hitos sin alterar logros manuales.
- **Dependencias:** T-09.
- **Evidencia esperada:** suite de dominio en verde y regresión del comportamiento de avance E1.

### T-11 — Exponer progreso semanal y casos vacíos

- **Tipo:** backend. **Historias:** HU-E2-03 a HU-E2-07, HU-E2-14. **Criterios:** CA-E2-13, CA-E2-16 a CA-E2-33, CA-E2-56.
- **Alcance:** consulta de progreso semanal exigida por el enunciado; el servicio obtiene datos y delega en dominio puro. Sin meta: objetivo y porcentaje no aplicables y sin hitos anteriores; sin partidas: ceros y ningún hito alcanzado.
- **Definition of Done:** DDC; integración demuestra los escenarios con y sin meta/partidas, 400/404 y el juego con al menos cinco partidas en días distintos y racha rota requerido por el profesor; contrato compatible con el ejemplo oficial y decisiones del PRD.
- **Dependencias:** T-05, T-06, T-08, T-10.
- **Evidencia esperada:** pruebas de integración y tabla reproducible de solicitudes y resultados sin datos personales.

### T-12 — Editar partidas y rechazar fechas futuras

- **Tipo:** backend. **Historia:** HU-E2-09. **Criterios:** CA-E2-37 a CA-E2-42.
- **Alcance:** añadir edición necesaria, extender validación de inicio al registro y edición y mantener validaciones existentes; entregar datos que permitan consultar progreso recalculado. Resuelve el intercambio temporal de D-01 en el alcance aprobado.
- **Definition of Done:** DDC; casos históricos, igualdad al momento actual, futuro hoy/otro día, edición válida e inválida y eliminación probados; al cambiar partidas la consulta de progreso refleja los datos nuevos; sin cambio arbitrario de fechas históricas ni nueva semántica del resumen E1.
- **Dependencias:** T-03, T-11.
- **Evidencia esperada:** pruebas de operaciones y consulta posterior con reloj controlado.

### T-13 — Eliminar videojuego y relaciones de forma segura

- **Tipo:** backend. **Historia:** HU-E2-10. **Criterios:** CA-E2-44 a CA-E2-46.
- **Alcance:** definir y comprobar política D-05 para juego, partidas, metas activas/inactivas e hitos, incluidos fallos y creaciones concurrentes. No imponer una técnica de persistencia en el criterio de producto.
- **Definition of Done:** DDC; pruebas de éxito, fallo intermedio y concurrencia demuestran que no quedan referencias huérfanas ni eliminaciones parciales confirmadas, sin afectar otros juegos; estrategia y límites de recuperación documentados en la futura spec.
- **Dependencias:** T-06, T-12.
- **Evidencia esperada:** pruebas de integridad antes/después y de fallos inducidos en entorno aislado.

### T-14 — Conectar frontend con metas, progreso y edición

- **Tipo:** frontend. **Historias:** HU-E2-01, HU-E2-03, HU-E2-07, HU-E2-09, HU-E2-11. **Criterios:** CA-E2-01, CA-E2-02, CA-E2-12, CA-E2-14, CA-E2-15, CA-E2-30 a CA-E2-33, CA-E2-39, CA-E2-41 a CA-E2-43, CA-E2-49.
- **Alcance:** servicio de metas separado de componentes, consulta de progreso y operación de edición de partidas siguiendo contratos aprobados; conservar el cliente actual sin pagar D-11 incidentalmente.
- **Definition of Done:** DDC; pruebas con respuestas de éxito/error y ausencia de meta verifican la interpretación del contrato; no confundir fallo con vacío ni crear UI todavía en este ticket.
- **Dependencias:** T-11, T-12, T-13.
- **Evidencia esperada:** pruebas de integración del cliente con respuestas controladas.

### T-15 — Formulario y gestión de metas

- **Tipo:** frontend. **Historias:** HU-E2-01 a HU-E2-03, HU-E2-08, HU-E2-11. **Criterios:** CA-E2-01 a CA-E2-08, CA-E2-11 a CA-E2-15, CA-E2-34 a CA-E2-36, CA-E2-47, CA-E2-49.
- **Alcance:** crear/editar metas e hitos, consulta de anteriores inactivas, desactivación con confirmación, validaciones y rechazo de conflicto/estado; estilos de DESIGN.md.
- **Definition of Done:** DDC; pruebas de componentes y flujo demuestran envío, edición, límites, cancelación/confirmación y error sin pérdida de datos; no añadir gráficos históricos ni nuevos estados.
- **Dependencias:** T-14.
- **Evidencia esperada:** tests de formulario y capturas de estados relevantes en vistas de prueba.

### T-16 — Sección de progreso en detalle

- **Tipo:** frontend. **Historias:** HU-E2-04 a HU-E2-08, HU-E2-11, HU-E2-14. **Criterios:** CA-E2-16 a CA-E2-36, CA-E2-48, CA-E2-49, CA-E2-56.
- **Alcance:** barra y objetivos, días, ambas rachas e hitos, estados sin meta/sin partidas y acceso a crear meta sin eludir Completado.
- **Definition of Done:** DDC; pruebas de renderizado y flujos distinguen porcentaje de horas de cumplimiento; no muestran hitos antiguos sin activa; carga, error con reintento y vacío comprobados.
- **Dependencias:** T-14, T-15.
- **Evidencia esperada:** tests de vista y capturas para casos de meta activa, inactiva y ausencia de partidas.

### T-17 — Integrar registro, edición y borrado con progreso

- **Tipo:** frontend. **Historia:** HU-E2-09. **Criterios:** CA-E2-37 a CA-E2-43.
- **Alcance:** edición de partidas en la interfaz, fechas de inicio coherentes con Ecuador y nueva consulta tras las tres operaciones; separar fallo de escritura y fallo de consulta posterior.
- **Definition of Done:** DDC; flujo demuestra cambio de horas/días/rachas/hitos sin recargar la página, rechazo de futuro y recuperación de consulta; no cambia las fichas de edición de juegos diferidas en D-08.
- **Dependencias:** T-12, T-14, T-16.
- **Evidencia esperada:** pruebas de interacción e integración para las tres operaciones y errores.

### T-18 — Verificar accesibilidad y diseño de E2

- **Tipo:** frontend. **Historia:** HU-E2-11. **Criterios:** CA-E2-50, CA-E2-51.
- **Alcance:** corregir solo desviaciones de las nuevas vistas respecto a DESIGN.md y accesibilidad observable: teclado, foco, nombres, errores, barra, tamaños y movimiento reducido.
- **Definition of Done:** DDC; recorrido de teclado y asistencia documentado, comprobación de contraste para combinaciones usadas y revisión en 360/768/1280 píxeles con movimiento reducido; sin refactorizar CSS heredado ni introducir nuevas fuentes, paletas o librerías no autorizadas.
- **Dependencias:** T-15, T-16, T-17.
- **Evidencia esperada:** tabla criterio → revisión → resultado, capturas y pruebas aplicables; no afirmar conformidad WCAG global por esta revisión acotada.

### T-19 — Verificar integración y regresiones de E2

- **Tipo:** tests. **Historias:** HU-E2-01 a HU-E2-14. **Criterios:** CA-E2-01 a CA-E2-56.
- **Alcance:** completar evidencia entre dominio, persistencia e interfaz, con fallos 400/404/409/500 y no regresión de sesiones, logros y resumen E1 dentro del alcance afectado.
- **Definition of Done:** DDC; todos los criterios tienen verificación y resultado, pruebas aplicables en verde y los errores/concurrencia no se sustituyen por capturas; documentar limitaciones reales sin declarar terminado un criterio no comprobado.
- **Dependencias:** T-02, T-03, T-13, T-17, T-18.
- **Evidencia esperada:** reporte por criterio, salidas de suites y tabla HTTP con casos exigidos por el profesor.

### T-20 — Consolidar trazabilidad documental de lo construido

- **Tipo:** documentación. **Historias:** HU-E2-01 a HU-E2-14. **Criterios:** CA-E2-01 a CA-E2-56.
- **Alcance:** actualizar estados del backlog y vincular PRD → historia → criterio → ticket → spec → test → código → auditoría; completar evidencias de deuda y momentos del agente en las fases correspondientes.
- **Definition of Done:** DDC; referencias existentes y resultados reales por criterio; deuda pagada solo con ciclo completo demostrado; ninguna limitación pendiente se marca como éxito. No crear documentación de auditoría ni specs durante la Fase 4.
- **Dependencias:** T-19.
- **Evidencia esperada:** auditoría y bitácora en su fase, enlaces por criterio y comprobación de historial cuando se autoricen commits.

## Matriz de trazabilidad del PRD

La tabla asigna cada regla a criterios funcionales y tickets responsables, sin contar T-01/T-19/T-20 como sustitutos de implementación. Las referencias de criterios por rango incluyen ambos extremos.

| Regla del PRD | Criterios verificables                            | Tickets responsables   |
| ------------- | ------------------------------------------------- | ---------------------- |
| RN-01         | CA-E2-16, CA-E2-21, CA-E2-37, CA-E2-38            | T-08, T-12, T-17       |
| RN-02         | CA-E2-16, CA-E2-21                                | T-08, T-11, T-16       |
| RN-03         | CA-E2-21, CA-E2-37                                | T-08, T-12             |
| RN-04         | CA-E2-20, CA-E2-25                                | T-08, T-10             |
| RN-05         | CA-E2-23, CA-E2-24                                | T-10, T-16             |
| RN-06         | CA-E2-09 a CA-E2-11, CA-E2-15                     | T-05, T-06, T-15       |
| RN-07         | CA-E2-03                                          | T-04, T-05, T-15       |
| RN-08         | CA-E2-04                                          | T-04, T-05, T-15       |
| RN-09         | CA-E2-13                                          | T-08, T-11, T-15       |
| RN-10         | CA-E2-17 a CA-E2-19, CA-E2-56                     | T-08, T-11, T-16       |
| RN-11         | CA-E2-34 a CA-E2-36                               | T-06, T-15, T-16       |
| RN-12         | CA-E2-05, CA-E2-06, CA-E2-12                      | T-04, T-05, T-15       |
| RN-13         | CA-E2-26, CA-E2-27                                | T-10, T-11, T-16       |
| RN-14         | CA-E2-27, CA-E2-28, CA-E2-39                      | T-10, T-12, T-17       |
| RN-15         | CA-E2-44 a CA-E2-46                               | T-13                   |
| RN-16         | CA-E2-13, CA-E2-16 a CA-E2-21                     | T-08, T-11             |
| RN-17         | CA-E2-22 a CA-E2-25                               | T-10, T-11, T-16       |
| RN-18         | CA-E2-30, CA-E2-32, CA-E2-34                      | T-11, T-16             |
| RN-19         | CA-E2-29, CA-E2-31, CA-E2-32                      | T-10, T-11, T-16       |
| RN-20         | CA-E2-01, CA-E2-03 a CA-E2-07, CA-E2-11, CA-E2-14 | T-04, T-05, T-06, T-15 |
| RN-21         | CA-E2-33, CA-E2-39 a CA-E2-43                     | T-11, T-12, T-17       |
| RN-22         | CA-E2-13, CA-E2-48, CA-E2-56                      | T-08, T-11, T-16       |
| RN-23         | CA-E2-21, CA-E2-37, CA-E2-38                      | T-08, T-12, T-17       |

### Trece decisiones aprobadas

| Decisión del PRD                                 | Criterios           |
| ------------------------------------------------ | ------------------- |
| H-01: racha vigente hoy sin partida              | CA-E2-23            |
| H-02: varias partidas, un día                    | CA-E2-20, CA-E2-25  |
| H-03: medianoche e inicio en Ecuador             | CA-E2-16, CA-E2-21  |
| H-04: meta activa actual                         | CA-E2-13            |
| H-05: máximo 100 %, horas reales sin recorte     | CA-E2-19            |
| H-06: hitos reversibles                          | CA-E2-26, CA-E2-27  |
| H-07: restricciones de estado disponible         | CA-E2-34 a CA-E2-36 |
| H-08: eliminación de relaciones                  | CA-E2-44 a CA-E2-46 |
| A-01: horas y días; tres de cuatro semanas       | CA-E2-56            |
| A-02: no añadir Abandonado                       | CA-E2-36            |
| A-03: edición y actualización del progreso       | CA-E2-39 a CA-E2-43 |
| A-04: sin hitos anteriores cuando no hay activa  | CA-E2-30, CA-E2-32  |
| A-05: históricas por inicio y rechazo de futuras | CA-E2-37, CA-E2-38  |

### Requisitos adicionales del enunciado y del diseño

| Fuente                                                                          | Vinculación                                                                                    |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Meta referenciada, hitos embebidos, timestamps y estado calculado               | T-04, T-10; justificación técnica pendiente de spec, no impuesta en los escenarios de usuario. |
| CRUD, consulta individual/listado y conflicto 409                               | CA-E2-01, CA-E2-02, CA-E2-07 a CA-E2-15, CA-E2-53; T-05, T-06.                                 |
| Dominio puro con tests previos y al menos uno por criterio verificable sin base | T-07 a T-10, T-19; D-02 cubierto por T-01.                                                     |
| Consulta de progreso y errores 400/404/409/500                                  | CA-E2-33, CA-E2-52, CA-E2-53; T-03, T-11, T-19.                                                |
| Servicio de metas separado, formulario, detalle y nueva consulta tras mutación  | CA-E2-39, CA-E2-42, CA-E2-47 a CA-E2-49; T-14 a T-17.                                          |
| Accesibilidad, responsive, identidad y movimiento reducido                      | CA-E2-50, CA-E2-51; T-18.                                                                      |
| Auditoría por criterio y bitácora del agente                                    | T-20, después de la implementación; no se crean en esta fase.                                  |

## Deuda técnica

### Seleccionadas para pagar con ciclo completo

| ID del diagnóstico | Problema y decisión                                                                                         | Criterios          | Ticket | Evidencia de pago exigida                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------ |
| D-03               | Parser previo a identificación/registro y JSON inválido como 500. Pagar, sin resolver incidentalmente D-11. | CA-E2-52, CA-E2-53 | T-03   | Criterio → prueba que demuestra fallo previo → corrección → prueba en verde y registro correlacionado → auditoría. |
| D-04               | Nombre de base configurado ignorado. Pagar sin leer ni modificar archivos de entorno.                       | CA-E2-54, CA-E2-55 | T-02   | Criterio → test con configuración controlada → corrección → verificación del nombre usado → auditoría.             |

No están pagadas por existir estos tickets. Cada pago debe conservar evidencia propia y, cuando se autorice, su commit identificable.

### Condiciones prioritarias de E2

| ID   | Tratamiento                                                                                                                       | Vinculación                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| D-01 | Corregir manejo de fechas en el alcance aprobado; contabilizar por inicio en Ecuador sin inventar correcciones de datos antiguos. | CA-E2-16, CA-E2-21, CA-E2-37, CA-E2-38; T-08, T-12, T-17. |
| D-02 | Incorporar pruebas de aplicación y dominio, distintas de las existentes del harness.                                              | T-01, T-07, T-09, T-19.                                   |
| D-05 | Política segura de eliminación e integridad frente a fallos y concurrencia; definir mecanismo en spec.                            | CA-E2-44 a CA-E2-46; T-13.                                |

### Diferidas, conservando los IDs del diagnóstico

| ID   | Problema                                                | Justificación para diferir y límite del alcance                                                                                                                                             |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-06 | Vaciar la calificación no la elimina.                   | Es independiente de metas y rachas. No modificar el formulario de calificación durante E2.                                                                                                  |
| D-07 | Búsqueda elimina caracteres significativos.             | Afecta a la biblioteca, no al cálculo de E2. No aprovechar los tickets para cambiar la búsqueda.                                                                                            |
| D-08 | Estado obsoleto en formulario de edición de juegos.     | Sigue diferido en ese formulario. Las nuevas vistas de metas y partidas deben cumplir sus criterios sin repetir el defecto; eso no autoriza refactorizar el formulario existente de juegos. |
| D-09 | Listados y resúmenes cargan historiales completos.      | No se midió degradación que justifique optimización global. Diseñar consultas de E2 según sus reglas sin incorporar paginación ni rediseñar estadísticas de E1.                             |
| D-10 | Cascada de estilos globales y reglas heredadas.         | Limpieza general fuera del alcance. Adaptar solo las vistas E2 a DESIGN.md sin alterar la identidad.                                                                                        |
| D-11 | Cliente HTTP descarta estado e identificador del error. | La interfaz puede presentar mensajes sin esa refactorización. D-03 verifica el contrato y registro del servidor, sin ampliar el cliente compartido para pagar esta deuda.                   |

## Revisión de trazabilidad y límites

La cobertura prevista comprende **14 historias, 56 criterios y 20 tickets**. Las matrices enlazan las **23 reglas** y las **13 decisiones** del PRD. Todo criterio tiene ticket de implementación además de su verificación; las dependencias de tickets no forman ciclos. Los criterios de soporte tienen detalles operativos solo cuando el resultado requerido es precisamente el contrato de errores o la selección de base.

La métrica de tres de cuatro semanas se vincula a CA-E2-56 como evaluación del resultado, no como autorización para añadir analítica, gráficos o almacenamiento de cierres semanales. No hay requisito funcional de E2 sin vinculación identificada en esta revisión.

Los requisitos de cierre del Entregable 4 —evidencias dentro de Claude Code, README final, despliegue en Render, URLs, demo, commits y pull request— pertenecen a las fases posteriores y no se declaran terminados ni se ejecutan mediante este backlog de implementación. Su planificación operativa de entrega queda pendiente de esa fase. La actualización de un ejemplo de entorno del enunciado sigue excluida por la prohibición del usuario de acceder a `.env.*`; no se crea un ticket para eludirla ni se marca cumplida. Los commits requieren autorización.

Antes de implementar debe aprobarse la spec de cada alcance, con tablas criterio → verificación y ticket → archivos. Esta Fase 4 solo crea el backlog; no modifica las aplicaciones, no escribe specs y no acredita todavía ninguno de sus criterios funcionales.

### Comprobaciones realizadas en Fase 4

- Validación local de 14 IDs de historia, 56 IDs de criterio y 20 IDs de ticket, sin duplicados ni referencias inexistentes.
- Comprobación de DADO / CUANDO / ENTONCES en los 56 escenarios y de los campos requeridos en cada ticket, incluida su Definition of Done.
- Comprobación de que los 56 criterios tienen asignación a trabajo de implementación o deuda, además de los tickets de pruebas y documentación.
- Comprobación de dependencias topológicas, cobertura de RN-01 a RN-23 y H-01 a H-08 / A-01 a A-05 y existencia de enlaces locales.
- Revisión de coherencia de los escenarios con las reglas aprobadas y los límites de diseño. La validación de referencias por sí sola no demuestra corrección del producto.
- `npm.cmd run test:harness`: seis tests aprobados, sin fallos ni omitidos. `npm.cmd run check:harness`: aprobado. Son verificaciones del harness, no tests funcionales de E2.
- Formato del nuevo documento comprobado con Prettier. No se ejecutaron pruebas de aplicación ni se implementaron funcionalidades para verificar los escenarios propuestos.
