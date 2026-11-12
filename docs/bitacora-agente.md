# Bitácora del agente — LEVEL UP 2.0

Entrega E4, 11 de noviembre de 2026. Se resumen solicitudes reales del diálogo y se enlaza evidencia del repositorio. El historial acredita el orden documental; no sustituye las salidas de ejecución ni demuestra que un hook se haya cargado automáticamente en Claude Code. El trabajo se ejecutó desde Codex; esa limitación del harness sigue documentada en [harness.md](harness.md).

## 1. Diagnosticar antes de implementar

- **Solicitud:** revisar el Proyecto 3 sin modificar código ni acceder a configuración privada.
- **Actuación:** el agente separó funcionalidades observadas de comportamientos no probados y conservó los hallazgos D-01 a D-11.
- **Detección:** la revisión de servicios mostró fechas sin zona explícita, `dbName` fijo y borrado secuencial; no se presentó esa revisión estática como prueba contra MongoDB.
- **Corrección/decisión:** se seleccionaron D-03 y D-04 para pago verificable y se justificaron los diferidos.
- **Aprendizaje:** una funcionalidad identificable en código no equivale a una garantía comprobada.
- **Evidencia:** [diagnóstico](diagnostico.md), tabla de hallazgos y limitaciones.

## 2. Resolver huecos con el usuario

- **Solicitud:** contrastar la ficha del profesor y escribir PRD y épicas, sin inventar producto.
- **Actuación:** se solicitaron las decisiones que faltaban: racha vigente desde ayer, múltiples partidas diarias, medianoche, cambio de meta, tope porcentual, reversión de hitos, estados y eliminación; después se resolvieron cinco ambigüedades adicionales.
- **Detección:** revisar la ficha y el modelo existente evitó añadir el estado «Abandonado» o confundir porcentaje de horas con semana cumplida.
- **Corrección:** el PRD exige horas **y** días para cumplir; conserva los estados existentes y rechaza partidas futuras.
- **Aprendizaje:** las decisiones de producto pertenecen al usuario y deben llegar a criterios y pruebas.
- **Evidencia:** [PRD](prd/level-up.md), [backlog](backlog/E2-metas-y-rachas.md); commits `6f1e8a1` y `6904ed6`.

## 3. Respetar dependencias antes de escribir código

- **Solicitud:** implementar primero dominio puro y después modelo/validaciones con TDD.
- **Actuación:** el agente detectó que T-01 tenía alcance transversal y que T-04 dependía de T-02. Se detuvo para explicarlo antes de ampliar el alcance.
- **Detección:** lectura de las dependencias reales del backlog, en vez de asumir IDs por el orden de la propuesta inicial.
- **Corrección autorizada:** completar la parte unitaria de T-01 para dominio; después corregir T-02 antes del modelo y de las validaciones de T-05. No se declaró terminado el bloque global de integración por tener tests puros.
- **Aprendizaje:** una excepción autorizada debe ser acotada y no borrar responsabilidades pendientes.
- **Evidencia:** [backlog](backlog/E2-metas-y-rachas.md), commits `fca4d29` y `106bc71`; pruebas de dominio, configuración y validación en `backend/tests/`.

## 4. Retirar una garantía transaccional que el driver no podía demostrar

- **Solicitud:** analizar los límites de transacciones antes del CRUD y corregir únicamente la spec técnica.
- **Actuación incorrecta detectada:** el límite absoluto de diez segundos no podía presentarse como garantía de cancelación y rollback con el driver instalado.
- **Detección:** revisión de los mecanismos del driver y de los puntos de control, incluido el commit que puede continuar después del presupuesto cooperativo.
- **Corrección:** se documentó presupuesto cooperativo, propagación de errores, resultados de commit desconocidos y ausencia de reintentos destructivos. La spec corregida se registró antes de implementar ese código.
- **Aprendizaje:** un timeout local no demuestra que la base haya deshecho una transacción ni que un commit no haya ocurrido.
- **Evidencia:** [spec backend](specs/E2-backend-metas-progreso.md), apartado de límites transaccionales; commit documental `85bd34f`, anterior al CRUD `67bb371`.

## 5. Corregir el refresco después de escrituras asíncronas

- **Solicitud:** volver a consultar progreso tras registrar, editar o eliminar, también desde el historial global.
- **Actuación incorrecta detectada:** proteger la vista desmontada podía omitir la consulta obligatoria después de una escritura exitosa; una revisión concurrente también podía dejar bloqueada la desactivación.
- **Detección:** pruebas de regresión con promesas pendientes, cambio de juego y desmontaje antes de completar la escritura; revisión independiente de los controles de versión y bloqueo.
- **Corrección:** capturar el juego afectado, ejecutar el GET después del éxito aunque la vista ya no exista y proteger solo actualizaciones visuales. Los reintentos de lectura no repiten POST/PUT/DELETE; la desactivación libera su bloqueo.
- **Aprendizaje:** la vigencia del componente y la obligación de actualizar datos son responsabilidades distintas.
- **Evidencia:** [tests de partidas](../frontend/tests/partidas-flujo.test.tsx), [detalle](../frontend/tests/detalle-e2.test.tsx), [progreso](../frontend/tests/ProgresoSemanal.test.tsx); commits `8bf36f2` y `cb192a9`.

## 6. Detectar y corregir el aislamiento insuficiente de Vite 5

- **Solicitud:** verificar frontend sin leer archivos `.env`.
- **Actuación incorrecta:** se usó inicialmente `envDir:false` como si desactivara la carga de archivos de entorno en Vite 5. Esa opción de la spec no bastaba en esa versión.
- **Detección:** el chequeo de tipos de las configuraciones rechazó `false`; la inspección del código local de Vite 5 mostró que el bloqueo efectivo se consulta en `InlineConfig.envFile`.
- **Corrección:** los lanzadores programáticos pasan `envFile:false` a `startVitest`, `build` y `createServer`; se comprobó la configuración resuelta y se repitieron las 99 pruebas de frontend, build y las 40 ejecuciones de navegador. Una prueba deliberadamente fallida por timeout verificó salida 1 del lanzador; no se alteró el test para esa comprobación.
- **Limitación:** no se abrió ni se mostró directamente un `.env`, pero las rondas iniciales **no acreditan** que Vite 5 no lo hubiera cargado internamente. La corrección no permite afirmar retroactivamente ese aislamiento. El Vite 7 instalado en backend sí trata `envDir:false` como omisión de archivos; su lanzador final añade también `envFile:false` explícito.
- **Aprendizaje:** una configuración debe verificarse contra la versión instalada, incluso si aparece en una spec aprobada.
- **Evidencia:** commit `ee28819`, [lanzador aislado](../frontend/scripts/entorno-aislado.mjs), [configuración de navegador](../frontend/playwright.config.ts).

## 7. Distinguir diseño existente de accesibilidad comprobada

- **Solicitud:** conservar la identidad visual y revisar teclado, foco, responsive y movimiento reducido.
- **Actuación:** se reutilizaron las variables existentes; la revisión encontró contraste insuficiente en el título del nuevo formulario.
- **Detección:** cálculo sobre colores computados y fondos compuestos en navegador, además de capturas reales a distintos anchos.
- **Corrección:** usar tinta sobre naranja en el título de E2 y combinaciones autorizadas de tinta/lima en sus acciones. Se verificaron 228 combinaciones medidas, con mínimo 5,39:1, y ausencia de desbordamiento en las vistas revisadas.
- **Aprendizaje:** conservar una paleta no implica que cualquier combinación de esa paleta tenga contraste suficiente. La revisión acotada no certifica WCAG global.
- **Evidencia:** [tests de diseño](../frontend/e2e/diseno-accesibilidad.spec.ts), [DESIGN.md](../DESIGN.md); commits `8922b24` y `b8da172`.

## 8. Auditar resultados y riesgos sin cerrar por cantidad de tests

- **Solicitud:** cerrar T-19/T-20 con integración real, auditoría por criterio y revisión de dependencias.
- **Actuación:** se separaron pruebas puras, HTTP simulado, navegador interceptado y persistencia real. La matriz detectó escenarios previstos que no quedaban demostrados por las 40 ejecuciones interceptadas.
- **Detección:** cotejo de cada criterio de las dos specs con los tests, no solo del total de casos aprobados; `npm audit` separado para producción y desarrollo.
- **Corrección:** se preparó un replica set efímero local y nuevos recorridos sin interceptación. La primera ronda real detectó un 500 al crear una meta duplicada con hitos: Mongoose intentaba restaurar un campo de versión inexistente en el subdocumento. Se añadió `versionKey:false` solo a HitoSchema, manteniendo validación estricta; la regresión pasó a 409 real. También se corrigieron fixtures del navegador (formato nativo de fecha, operación completa PUT y uso de teclado para el slider), sin atribuir esos fallos de test a la aplicación. Las 21 pruebas de integración final y las 12 ejecuciones de navegador real pasaron. Se aplicaron patches compatibles de backend; las migraciones mayores quedan como riesgo pendiente.
- **Aprendizaje:** «test escrito», «mock aprobado» y «persistencia observada» son evidencias diferentes. Un reporte honesto conserva los límites de cada una.
- **Evidencia:** [AUDITORIA.md](AUDITORIA.md), [integración UI real](../frontend/e2e-real/flujo-integral.spec.ts), comandos finales del README.
