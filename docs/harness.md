# Harness — Entregable 4, Fase 2

## Alcance

Entorno de instrucciones y herramientas para preparar E2, basado en `docs/diagnostico.md` y en los requisitos proporcionados por el usuario. No se recibió una rúbrica adicional del profesor; no se afirma cumplimiento de requisitos externos desconocidos.

Se mantienen las decisiones D-01 a D-11. Esta fase no implementa E2, no paga deudas, no crea PRD o specs y no modifica backend, frontend ni identidad visual.

## Archivos y uso

| Archivo                                         | Responsabilidad                                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                                     | Contexto, estructura, comandos y reglas del agente; máximo 60 líneas.                                          |
| `CLAUDE.md`                                     | Una línea `@AGENTS.md` para importar las instrucciones en Claude Code.                                         |
| `DESIGN.md`                                     | Inventario del diseño real, fuentes de evidencia y verificaciones visuales pendientes.                         |
| `.claude/skills/nueva-spec/SKILL.md`            | Skill explícita que comprueba ticket y criterios, redacta un borrador y exige aprobación antes de implementar. |
| `.claude/settings.json`                         | Registro de hooks PreToolUse y PostToolUse para herramientas de edición.                                       |
| `.claude/hooks/protect-env.cjs`                 | Rechaza rutas `.env` y `.env.*`, incluidos ejemplos, con código 2. No lee su contenido.                        |
| `.claude/hooks/format-file.cjs`                 | Aplica Prettier al archivo modificado compatible y dentro del proyecto.                                        |
| `.claude/hooks/paths.cjs`                       | Comprobaciones compartidas de rutas y exclusiones.                                                             |
| `.claude/hooks/harness.test.cjs`                | Pruebas locales de los scripts con entradas simuladas y archivos temporales.                                   |
| `.claude/hooks/verify-harness.cjs`              | Comprueba límites de líneas, JSON, frontmatter y estructura básica.                                            |
| `package.json` y `package-lock.json` de la raíz | Paquete privado de herramientas, separado de las aplicaciones; Prettier fijado en `3.6.2`.                     |

Desde la raíz, instalar con `npm.cmd ci --ignore-scripts` y ejecutar:

```powershell
npm.cmd run test:harness
npm.cmd run check:harness
```

Estos comandos no arrancan las aplicaciones ni cargan `.env`. Las pruebas del harness no sustituyen los futuros tests de aplicación de D-02.

## Skill y puerta SDD

En Claude Code: `/nueva-spec ruta-del-ticket`. El ticket debe existir y enlazar criterios, historia, épica y PRD. Si faltan fuentes, la skill debe informar y detener la creación. La salida prevista es un borrador en `docs/specs/` con reglas DEBE/NO DEBE y tablas criterio → verificación y ticket → archivos. La skill no se ha invocado para crear una spec durante esta fase.

`disable-model-invocation: true` impide su invocación automática en Claude Code; se utiliza porque crear el borrador modifica el repositorio. La aprobación de la spec es una regla de trabajo que el agente debe respetar; no es un control de acceso del sistema de archivos.

Codex no tiene garantizado el descubrimiento de `.claude/skills/`, ni interpreta necesariamente las extensiones de Claude Code. Puede seguir el contenido cuando el usuario solicite explícitamente leerlo; no se instala una segunda copia. El validador genérico de `skill-creator` no admite los campos específicos de Claude Code utilizados aquí; la validación local comprueba YAML y los campos esperados sin eliminar esas extensiones.

## Hooks y límites

Configuración orientada al entorno Windows del proyecto: `shell: "powershell"`, Node disponible en PATH y ruta del proyecto obtenida de `CLAUDE_PROJECT_DIR`, entre comillas para admitir espacios. Antes de usarla en otro sistema se debe adaptar y probar el shell, sin asumir portabilidad automática.

- **PreToolUse:** matcher `Edit|Write|MultiEdit|NotebookEdit`. Examina `tool_input.file_path` o `notebook_path`; bloquea variantes de entorno y entradas sin archivo identificable. Para archivos existentes también comprueba su ruta física mediante metadatos.
- **PostToolUse:** matcher `Edit|Write|MultiEdit`. Formatea únicamente el archivo indicado, no todo el repositorio. Admite JS, CJS, MJS, JSX, TS, TSX, JSON, CSS, HTML, Markdown y YAML. Omite `.env*`, extensiones ajenas, rutas fuera del proyecto y directorios `node_modules`, `.git` y `dist`.
- El formateador usa la API de Prettier con `filepath` y opciones por defecto; no carga configuraciones ejecutables del proyecto ni archivos de entorno. Informa errores sin fingir que el formato se aplicó.
- Un hook PostToolUse actúa después de la edición y no puede deshacerla ni autorizar archivos fuera del ticket. Toda modificación de formato debe entrar en el alcance aprobado.
- Estos matchers **no interceptan escrituras por Bash, PowerShell, herramientas MCP u otras vías**. Los hooks no son un sandbox ni garantizan el bloqueo de todos los accesos. La prohibición de leer o modificar `.env*` se aplica al agente por `AGENTS.md` en todas las herramientas.
- Los hooks de `.claude/settings.json` no se ejecutan automáticamente en esta sesión de Codex. Las pruebas locales inyectan eventos simulados; no prueban el ciclo real de Claude Code.

Estructura contrastada con la documentación oficial de [hooks](https://code.claude.com/docs/en/hooks) y [skills](https://code.claude.com/docs/en/skills) de Claude Code. No se afirma aceptación por una versión concreta del cliente sin probarla allí.

## Verificaciones y pendientes

Comprobaciones efectivamente realizadas en esta fase:

| Comprobación                | Resultado                                                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rama y estado inicial       | `feature/e2-metas-rachas`, sin cambios pendientes antes de crear el harness.                                                                                                                                                        |
| Instalación de herramientas | Prettier `3.6.2` instalado en la raíz con scripts de instalación desactivados; se generó su lockfile. El primer intento falló por restricciones de acceso; el reintento autorizado finalizó correctamente.                          |
| `npm.cmd run test:harness`  | 6 tests aprobados, 0 fallos y 0 omitidos. Se probaron rechazo de rutas de entorno simuladas, entrada inválida, formato real e idempotencia, exclusiones, errores de sintaxis y ambos comandos de configuración mediante PowerShell. |
| `npm.cmd run check:harness` | AGENTS.md: 53/60 líneas; CLAUDE.md: una línea; JSON válido; frontmatter YAML parseable, campos de Claude Code y tablas presentes.                                                                                                   |
| Diseño                      | Contraste estático de paleta, fuentes, variables, componentes y breakpoints con los archivos fuente citados en `DESIGN.md`. No se modificaron estilos.                                                                              |

No se crearon fixtures `.env`: se usaron únicamente sus nombres en entradas JSON. Los fixtures ordinarios de las pruebas se eliminan al terminar. La validación estructural local no equivale a validación completa del cliente Claude Code.

Pendientes de verificación:

- Carga de `CLAUDE.md`, reconocimiento de la skill e invocación `/nueva-spec` en Claude Code con un ticket real autorizado.
- Registro y ejecución automática de ambos hooks en ese cliente; confirmar mediante su interfaz de hooks y eventos reales sobre archivos de prueba permitidos, sin acceder a `.env`.
- Compatibilidad con la versión instalada de Claude Code, políticas locales y herramientas adicionales.
- Verificación visual en navegador, teclado, contraste, fuentes externas y movimiento reducido. `DESIGN.md` está contrastado con código, no con una auditoría visual.
- Incorporación posterior de tests de aplicación (D-02) y validación funcional de E2 tras aprobar sus documentos SDD.

No se hace commit durante esta entrega. Revisar el diff y el listado de archivos antes de aprobarlo.
