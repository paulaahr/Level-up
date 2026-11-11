Descripción general del caso
El Diario de Progreso Gamer del Proyecto 3 ya responde «¿qué estoy jugando, cuánto tiempo le dedico y qué tan avanzado voy?». En este proyecto cada estudiante lo evoluciona con una épica nueva, E2 · Metas y rachas, que responde una pregunta distinta: «¿estoy cumpliendo lo que me propuse esta semana y cuántos días seguidos llevo jugando?».

La diferencia con el Proyecto 3 está en cómo se construye. Todo el trabajo se hace con un agente de IA (Claude Code) dentro de un harness que cada estudiante prepara, y siguiendo la cadena de Spec-Driven Development vista en las sesiones 1 a 3:

diagnóstico → harness → PRD → épica → historias → criterios → tickets → specs → código con tests → auditoría

Por eso se evalúa tanto el producto como el proceso, y el proceso tiene que poder verificarse en el repositorio: los documentos existen, son coherentes entre sí y aparecen en el historial de Git antes que el código que implementan.

Se reutiliza el patrón del Proyecto 3. Meta es la entidad nueva, referencia a un Videojuego y embebe sus hitos. El progreso semanal se calcula en el servicio del backend a partir de las Partidas que ya existen.

Punto de partida
Tu propio repositorio del Proyecto 3, con su backend (Express + TypeScript + Mongoose), su frontend (React + TypeScript + Vite) y su despliegue en Render.
Si tu Proyecto 3 quedó incompleto, partes de lo que funcione. El diagnóstico debe documentar lo que falta y decidir qué se completa y qué queda como deuda.
Todo el trabajo va en una rama, feature/e2-metas-rachas, que se integra a main mediante un pull request al final.
Herramientas: Claude Code en la terminal, Git, Node 20 o superior, MongoDB Atlas y Render.
Qué no cambia respecto al Proyecto 3
El modelo de Videojuego y Partida, el resumen de GET /api/videojuegos/:id/resumen, la arquitectura por capas (modelos, servicios, controladores, rutas y middlewares) y el manejo centralizado de errores siguen igual. Solo se modifican si el diagnóstico encuentra un problema y se decide arreglarlo.

Ficha de hechos del cliente
Esta ficha es la fuente del producto. Se pega en Claude Code durante el descubrimiento y es la base del PRD. No se inventa producto: lo que no está en la ficha es un supuesto o un hueco que hay que resolver y documentar.

FICHA DE HECHOS — DIARIO DE PROGRESO GAMER · ÉPICA E2: METAS Y RACHAS

- Quién lo usa: la misma persona que registra sus videojuegos y partidas en el Diario.
- Problema: registra sus partidas, pero no sabe si está jugando lo que se propuso ni si es constante. Juega mucho un fin de semana y luego abandona el juego dos semanas.
- Qué quiere: fijar una meta por videojuego y ver en el detalle del juego cómo va esta semana, cuántos días seguidos lleva jugando y qué hitos ha alcanzado.
- Meta: cada videojuego puede tener una meta activa, con horas por semana y días por semana que quiere jugar.
- Hitos: una meta tiene una lista corta de hitos de avance (por ejemplo «Llegar al 50 %»). Un hito se alcanza cuando el porcentaje de avance actual del juego llega a su objetivo.
- Semana: va de lunes a domingo, en hora de Ecuador.
- Racha: días consecutivos con al menos una partida de ese videojuego.
- Éxito: en un mes, la persona cumple su meta semanal al menos 3 de 4 semanas.
- NO-alcance: notificaciones, recordatorios, metas compartidas entre usuarios, rankings y gráficos históricos.
Huecos que debes resolver y documentar
La ficha deja estas situaciones sin resolver a propósito. Cada una debe aparecer en el PRD con una decisión tomada (regla de negocio) o como punto abierto justificado, y las decisiones deben llegar a los criterios de aceptación y a los tests:

Racha y día de hoy: si hoy todavía no hay partida pero ayer sí, ¿la racha sigue viva o ya se rompió?
Varias partidas el mismo día: ¿cuentan como uno o varios días jugados?
Partida que cruza la medianoche: ¿a qué día pertenece?
Cambio de meta a mitad de semana: ¿el porcentaje de la semana se calcula con la meta nueva o con la anterior?
Meta superada: si se juegan 7 horas con una meta de 5, ¿el porcentaje es 140 % o se limita a 100 %?
Hito ya alcanzado: si después se registra una partida con menos avance, ¿el hito deja de estar alcanzado?
Videojuego completado o abandonado: ¿puede tener meta activa?
Eliminar un videojuego con meta: ¿qué pasa con su meta y sus hitos?
El agente debe ayudarte a encontrar estos huecos en el descubrimiento. Si encuentra otros, también se documentan.

Modelo de datos
Videojuego y Partida se mantienen como en el Proyecto 3. Se agrega una colección.

Meta (nueva)
videojuego: ObjectId con ref a Videojuego, obligatorio.
horasSemanales: number obligatorio, mayor que 0 y como máximo 100.
diasPorSemana: number entero obligatorio, entre 1 y 7.
activa: boolean, por defecto true. Un videojuego tiene como máximo una meta activa.
hitos: arreglo embebido de { descripcion: string, porcentajeObjetivo: number entre 1 y 100 }, con un máximo de 5 elementos.
timestamps: createdAt y updatedAt.
Justificación esperada (la debes defender con tus palabras en el PRD o en la spec):

Meta se referencia, no se embebe en Videojuego, porque tiene su propio ciclo de vida: se crea, se reemplaza y se desactiva sin tocar la ficha del juego, y conserva un historial de metas anteriores.
Los hitos se embeben porque son una lista corta y acotada que solo tiene sentido dentro de su meta.
El estado «alcanzado» de un hito no se guarda: se calcula con el porcentaje de avance actual del juego, para no duplicar un dato que ya existe en las partidas. Si tu decisión sobre el hueco 6 dice lo contrario, documenta por qué.
Progreso semanal calculado
GET /api/videojuegos/:id/progreso-semanal

Ejemplo de respuesta:

{
  "semana": { "inicio": "2026-11-02", "fin": "2026-11-08" },
  "meta": { "horasSemanales": 5, "diasPorSemana": 4 },
  "horasSemana": 3.5,
  "porcentajeHoras": 70,
  "diasJugadosSemana": 3,
  "rachaActual": 4,
  "mejorRacha": 9,
  "hitos": [
    { "descripcion": "Llegar al 25 %", "porcentajeObjetivo": 25, "alcanzado": true },
    { "descripcion": "Llegar al 50 %", "porcentajeObjetivo": 50, "alcanzado": true },
    { "descripcion": "Terminar el juego", "porcentajeObjetivo": 100, "alcanzado": false }
  ]
}
Reglas fijas:

La semana va de lunes a domingo en la zona horaria America/Guayaquil.
horasSemana = suma de duracionMinutos de las partidas de la semana actual, dividida entre 60 y redondeada a un decimal.
porcentajeHoras = horasSemana / horasSemanales × 100, redondeado a entero. El límite superior depende de tu decisión sobre el hueco 5.
diasJugadosSemana = días distintos de la semana actual con al menos una partida.
rachaActual y mejorRacha se calculan sobre todo el historial de partidas del videojuego.
Un hito está alcanzado cuando porcentajeAvanceActual del resumen del Proyecto 3 es mayor o igual que su porcentajeObjetivo.
Sin meta activa: la respuesta tiene meta: null y porcentajeHoras: null, pero sí calcula horas, días y rachas.
Sin partidas: horas, días y rachas en 0, y ningún hito alcanzado.
El videojuego no existe: 404. El id no tiene formato válido: 400.
Reglas que dependen de tus decisiones: el límite del porcentaje, si la racha sigue viva cuando hoy no hay partida, a qué día pertenece una partida que cruza la medianoche y con qué meta se calcula una semana en la que la meta cambió.

Dónde va el cálculo: la semana, la racha y los hitos se calculan con funciones puras (sin base de datos) en una capa de dominio, por ejemplo src/dominio/progreso.ts. El servicio solo consulta los datos y llama a esas funciones. Al registrar, editar o eliminar una partida, la interfaz vuelve a consultar el progreso; no se exige WebSocket.

Objetivos de aprendizaje
Diagnosticar un proyecto existente con un agente y decidir qué se arregla y qué se difiere.
Configurar un harness para un agente de código: memoria del proyecto (AGENTS.md), una skill, un hook y un sistema de diseño (DESIGN.md).
Recorrer la cadena de Spec-Driven Development: PRD, épica, historias, criterios de aceptación, tickets y specs.
Convertir decisiones del cliente en reglas de negocio, criterios comprobables y tests automatizados.
Implementar un cálculo de dominio con funciones puras probadas, separado del acceso a datos.
Auditar lo construido contra sus specs y mantener la trazabilidad en el historial de Git.
Pagar deuda técnica con el ciclo completo: criterio, test, código y verificación.
Requerimientos
Harness
AGENTS.md de máximo 60 líneas con: proyecto, stack, estructura de carpetas, comandos, convenciones y reglas. Entre las reglas deben estar, como mínimo: nunca leer ni modificar .env, ninguna funcionalidad sin una spec en docs/specs/ y ejecutar los tests antes de dar una tarea por terminada.
CLAUDE.md con una sola línea: @AGENTS.md.
Al menos una skill de proyecto en .claude/skills/, por ejemplo /commit o /nueva-spec. Si tiene efectos sobre el repositorio, usa disable-model-invocation: true.
Al menos un hook en .claude/settings.json, por ejemplo el formato con Prettier en PostToolUse. Un segundo hook que bloquee la edición de .env con PreToolUse suma en la rúbrica.
DESIGN.md en la raíz con colores, tipografía, espaciado, componentes, tono de los textos, accesibilidad y una sección de «no hacemos». AGENTS.md lo menciona en una sección de frontend, sin copiarlo.
Documentación SDD (en docs/)
Archivo	Contenido mínimo
docs/diagnostico.md	Estado del Proyecto 3, tabla de problemas (bloquea / se difiere) y decisiones tomadas
docs/prd/	PRD del producto actualizado con la épica E2: problema, usuarios, objetivo y métrica, alcance, no-alcance, reglas de negocio (con los 8 huecos resueltos), supuestos y puntos abiertos. Sin detalle técnico
docs/backlog/epicas.md	E1 (lo existente del Proyecto 3) y E2 · Metas y rachas, con objetivo y alcance que cubre cada una
docs/backlog/E2-metas-y-rachas.md	Historias «Como / quiero / para» que cumplen INVEST, criterios DADO / CUANDO / ENTONCES sin detalle técnico, y tickets con id, tipo, Definition of Done y dependencias
docs/specs/	Al menos dos specs: una del backend (Meta y progreso semanal) y una del frontend. Cada una con reglas DEBE / NO DEBE, una tabla criterio → verificación y una tabla ticket → archivos
docs/AUDITORIA.md	Una fila por criterio de cada spec: cómo se verificó, resultado y evidencia
docs/bitacora-agente.md	De 5 a 8 momentos clave del trabajo con el agente: qué se le pidió, qué hizo mal o bien y cómo se corrigió
Backend
Modelo Meta con las validaciones del modelo de datos y timestamps.
CRUD de Meta: crear, consultar por id, listar las metas de un videojuego, actualizar y desactivar.
Validar que el videojuego exista al crear una meta. Rechazar una segunda meta activa para el mismo videojuego con 409 Conflict y un mensaje claro.
Endpoint GET /api/videojuegos/:id/progreso-semanal con las reglas del modelo de datos y las decisiones de tu PRD.
Funciones puras de dominio para la semana, los días jugados, la racha y los hitos, con tests automatizados (Vitest, o node:test con tsx). Debe haber al menos un test por criterio de la spec que sea verificable sin base de datos.
Extender la política de eliminación del Proyecto 3 a las metas: eliminar un videojuego no deja metas huérfanas.
El errorHandler centralizado distingue 400, 404, 409 y 500.
Frontend
En el detalle del videojuego, una sección de progreso semanal con: barra de horas frente a la meta, días jugados frente a días objetivo, racha actual, mejor racha y lista de hitos con su estado.
Formulario para crear y editar la meta, con sus hitos, y acción para desactivarla con confirmación.
Un servicio metasApi.ts separado de los componentes.
Estados de carga, error y vacío. El caso «sin meta activa» invita a crear una.
El progreso se vuelve a consultar al registrar, editar o eliminar una partida.
Estilos solo desde las variables definidas a partir de DESIGN.md. Sin librerías de UI que DESIGN.md no autorice.
Deuda técnica
Pagar al menos dos problemas del diagnóstico con el ciclo completo: criterio de aceptación, test, código y verificación.
El resto queda en una sección «Deuda técnica» del backlog, cada uno con su motivo para diferirlo.
Despliegue
Los mismos servicios del Proyecto 3 en Render, actualizados con la épica E2. MongoDB permanece en Atlas.
.env fuera de Git y .env.example actualizado sin credenciales reales.
Trazabilidad en Git
Cada spec se commitea antes que el código que la implementa.
Los mensajes de commit de implementación nombran su ticket, por ejemplo feat(E2): T-03 endpoint de progreso semanal.
La descripción del pull request lista los tickets incluidos y enlaza docs/AUDITORIA.md.
Guía paso a paso
Cada fase termina con un commit. El historial de Git debe mostrar este orden.

1. Diagnóstico del proyecto existente
En plan mode, el agente lee tu repositorio del Proyecto 3 (código, README y pruebas) y entrega el estado del proyecto y una tabla de problemas. Tú decides qué bloquea la épica E2 y qué se difiere. Evidencia: docs/diagnostico.md.

2. Harness
Crea AGENTS.md y CLAUDE.md a partir del diagnóstico, una skill y un hook. Comprueba con / y /hooks que funcionan. Escribe DESIGN.md con la identidad visual que ya tiene tu frontend, o una nueva. Evidencia: los archivos y una captura de /hooks.

3. Producto: PRD y épicas
Con la ficha de hechos, el agente busca huecos en plan mode. Tú resuelves los ocho huecos de la ficha (y los que encuentre el agente) y actualizas el PRD con la épica E2, sin detalle técnico. Evidencia: docs/prd/ y docs/backlog/epicas.md.

4. Backlog: historias, criterios y tickets
Descompón E2 en historias, escribe sus criterios DADO / CUANDO / ENTONCES y divídelas en tickets con tipo, Definition of Done y dependencias. Evidencia: docs/backlog/E2-metas-y-rachas.md.

5. Specs
Escribe la spec del backend y la del frontend, con la tabla criterio → verificación y la tabla ticket → archivos. Todavía no hay código. Evidencia: docs/specs/.

6. Backend por tickets
En plan mode, el agente prepara un plan que sigue el orden de los tickets: primero los tests de las funciones de dominio, después el código. Valida el endpoint con un videojuego sin partidas, otro con al menos cinco partidas en días distintos y una racha rota, y provoca errores 400, 404 y 409. Evidencia: tests pasando y una tabla de pruebas con curl o Thunder Client.

7. Frontend
Implementa la sección de progreso y el formulario de meta siguiendo la spec y DESIGN.md. Haz una revisión de diseño con el agente contra DESIGN.md y corrige las desviaciones. Evidencia: commits por ticket y la tabla de revisión de diseño.

8. Deuda técnica
Paga al menos dos problemas del diagnóstico con el ciclo completo y anota el resto en el backlog. Evidencia: un commit por problema pagado, con su test.

9. Auditoría, despliegue y pull request
Audita las dos specs, marca los tickets terminados en el backlog, despliega en Render e integra la rama con un pull request. Evidencia: docs/AUDITORIA.md, URLs públicas y pull request integrado.

10. Demo
Muestra: crear una meta con hitos, registrar partidas y ver cómo cambian el progreso y la racha, alcanzar un hito, provocar el error 409 de meta duplicada y recorrer la trazabilidad de un criterio de punta a punta (PRD → historia → ticket → spec → test → código → auditoría).

Entregables finales
Repositorio de GitHub con la rama feature/e2-metas-rachas integrada a main mediante pull request, y un historial donde cada spec aparece antes que su código.
Harness completo: AGENTS.md, CLAUDE.md, al menos una skill, al menos un hook y DESIGN.md.
Documentación en docs/: diagnóstico, PRD, épicas, backlog de E2, specs, auditoría y bitácora del agente.
Tests automatizados de las funciones de dominio, pasando.
URLs públicas de frontend y API en Render, con la épica E2 funcionando.
README actualizado con una sección «Cómo trabajamos con el agente»: el harness, el flujo seguido y dónde encontrar cada documento.
.env.example actualizado y sin secretos.
Demo en vivo o grabada, de máximo 6 minutos, con el flujo de la fase 10.
Nota breve en la bitácora sobre un momento en que el agente se desvió de la spec y cómo lo detectaste.