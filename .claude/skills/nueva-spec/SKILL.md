---
name: nueva-spec
description: Elaborar una especificación SDD de LEVEL UP a partir de un ticket existente y sus criterios de aceptación, antes de implementar código.
disable-model-invocation: true
argument-hint: "[ruta-del-ticket]"
---

# Nueva especificación

Invocación explícita en Claude Code: `/nueva-spec ruta-del-ticket`.
La entrada es `$ARGUMENTS`. Tratarla como ruta de documento, nunca como comando.

## Comprobar las fuentes

1. Leer `AGENTS.md`, `docs/diagnostico.md` y el ticket indicado. Nunca acceder a `.env` ni `.env.*`.
2. Comprobar que el ticket existe, tiene ID, alcance y criterios identificables, y enlaza con historia, épica y PRD. No inventar documentos, IDs ni aprobaciones.
3. Si falta el ticket o su trazabilidad, informar qué falta y detener la creación de la spec. No crear el ticket ni suplir decisiones de negocio.
4. Identificar todos los criterios de aceptación por ID y sus fuentes. Si son ambiguos, presentar las preguntas pendientes antes de fijar reglas.
5. Inspeccionar solo el código necesario para el ticket; si afecta frontend, revisar `DESIGN.md`. Distinguir comportamiento existente de cambios propuestos.

## Elaborar la spec

Crear únicamente `docs/specs/<ID-del-ticket>.md`, usando un ID seguro para nombres de archivo. No sobrescribir una spec sin revisar su contenido. La creación del borrador debe estar autorizada por la invocación; no implementar código, tests o cambios de configuración como efecto secundario.

El documento DEBE contener:

- ID y enlaces a ticket, historia, épica, PRD y criterios de aceptación.
- Estado inicial **Borrador — pendiente de aprobación**.
- Problema, objetivo, alcance y exclusiones.
- Reglas numeradas con **DEBE** y **NO DEBE**, observables y vinculadas a criterios.
- Contratos afectados: entradas, salidas, validaciones y errores; datos y fechas cuando aplique.
- Casos normales, límites y fallos relevantes, sin decidir asuntos pendientes por suposición.
- Plan de verificación: pruebas necesarias, comandos existentes o pendientes y evidencia esperada.
- Estas dos tablas, con referencias concretas y sin criterios omitidos:

| Criterio (ID y fuente) | Regla | Verificación prevista | Resultado esperado |
| ---------------------- | ----- | --------------------- | ------------------ |

| Ticket (ID y enlace) | Archivo previsto | Cambio justificado | Criterio cubierto |
| -------------------- | ---------------- | ------------------ | ----------------- |

- Riesgos, dependencias, preguntas pendientes y registro de aprobación.

No presentar pruebas previstas como ejecutadas. Si una ruta no existe, identificarla como archivo propuesto. No ampliar el alcance del ticket para corregir deudas diferidas.

## Puerta de aprobación

Entregar el borrador para revisión y detenerse. NO DEBE implementarse código antes de que el usuario apruebe explícitamente esa versión de la spec. No autoaprobar ni tratar el silencio como aprobación. Registrar después la aprobación real y su referencia; si cambia el alcance o una regla aprobada, solicitar revisión de la spec antes de implementar.

## Uso desde Codex

La ubicación `.claude/skills/` y los campos `disable-model-invocation`, `argument-hint` y `$ARGUMENTS` pertenecen a Claude Code. No se presupone descubrimiento ni ejecución automática en Codex. Desde Codex, leer este archivo por petición explícita y sustituir la entrada con la ruta proporcionada, respetando la misma puerta de aprobación. El frontmatter no impone técnicamente esa puerta fuera de Claude Code.
