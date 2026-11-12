# LEVEL UP 2.0 — Tu diario gamer

Diario personal con React 18 + TypeScript + Vite y Express + TypeScript + Mongoose. E1 conserva biblioteca, filtros, logros manuales, partidas y resumen; E2 añade metas semanales, hitos y rachas. No hay autenticación ni aislamiento multiusuario.

## Funcionalidades E2

- Crear, consultar, editar y desactivar metas; conservar las anteriores inactivas. Una activa por videojuego, horas mayores que 0 y hasta 100, días enteros entre 1 y 7 y hasta cinco hitos.
- Semana de lunes a domingo en America/Guayaquil: horas a un decimal, porcentaje entero limitado a 100 y días distintos. Cumplir exige alcanzar **horas y días**.
- Racha actual y mejor racha sobre todo el historial. Si ayer hubo actividad y hoy todavía no, sigue vigente. Varias partidas diarias cuentan como un día; medianoche se atribuye al inicio.
- Hitos calculados desde el avance actual del resumen E1; pueden volver a estar pendientes si disminuye. Los logros manuales son independientes.
- Sin meta activa se muestran actividad y rachas, con invitación a crearla; no aparecen hitos antiguos.
- Registro, edición y eliminación de partidas vuelven a consultar progreso, también desde el historial global. Se rechazan fechas futuras; editar sin cambiar la fecha conserva el instante original.
- Se impide activar metas en juegos completados o completar un juego con meta activa. Se conservan los estados Pendiente, Jugando, Completado y En pausa.
- El borrado de un videojuego incluye partidas y todas sus metas. Requiere transacciones, sin fallback de borrado parcial.

Éxito de producto: cumplir al menos tres de cuatro semanas evaluadas. Sin notificaciones, rankings, metas compartidas ni gráficos históricos.

## Configuración y desarrollo

Usar Node **24.20.0**, la versión local verificada. Las herramientas instaladas del backend requieren Node 20.19+ o 22.12+; Node 20.0 no basta. Cada paquete tiene lockfile. En PowerShell usar npm.cmd.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd --prefix backend ci --ignore-scripts
npm.cmd --prefix frontend ci --ignore-scripts
```

| Proceso  | Variable     | Valor requerido o predeterminado                           |
| -------- | ------------ | ---------------------------------------------------------- |
| Backend  | MONGODB_URI  | URI privada de MongoDB con replica set                     |
| Backend  | MONGODB_DB   | level_up                                                   |
| Backend  | PORT         | 3000                                                       |
| Backend  | FRONTEND_URL | http://localhost:5173; varios orígenes separados por comas |
| Frontend | VITE_API_URL | URL de API terminada en /api; se incorpora al compilar     |

Las plantillas existentes .env.example no contienen credenciales reales. El desarrollador configura sus valores de forma privada. **El agente nunca lee ni modifica archivos .env reales.** El arranque habitual carga dotenv/Vite y no se utiliza en las verificaciones restringidas de esta entrega.

```powershell
# Desarrollo habitual con configuración preparada por el desarrollador:
npm.cmd --prefix backend run dev
npm.cmd --prefix frontend run dev
```

MongoDB standalone no basta para las escrituras transaccionales. Los comandos de integración crean su propio replica set efímero en localhost, con datos sintéticos, sin Atlas. La primera ejecución descarga un binario y requiere red y espacio; la caché queda en backend/node_modules/.cache, fuera de Git.

## Pruebas y compilación

Desde la raíz:

```powershell
npm.cmd --prefix backend run test:unit
npm.cmd --prefix backend run test:integration
npm.cmd --prefix frontend run test
npm.cmd --prefix frontend run test:e2e
npm.cmd --prefix frontend run test:e2e:real
npm.cmd run test:harness
npm.cmd run check:harness
```

- **Unitarias y HTTP simulado:** dominio, validación, contratos y errores controlados; no prueban persistencia.
- **Integración backend:** replica set real efímero, sin Atlas de producción.
- **Navegador interceptado:** Edge a 390/1280 px, diseño también a 360/768; carga, error, vacío, teclado, foco, contraste y movimiento reducido.
- **Navegador real:** Edge → Vite local → Express → replica set, sin interceptar rutas.

Resultados, evidencia y pendientes por criterio: [AUDITORIA.md](docs/AUDITORIA.md). El reporte de navegador y sus capturas se generan bajo frontend/test-results, ignorado por Git.

```powershell
Push-Location backend
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
npm.cmd run build
Pop-Location
Push-Location frontend
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
npm.cmd run build:aislado
Pop-Location
git diff --check
```

build:aislado usa API sintética /api: **no es el artefacto configurado para Render**. El lanzador pasa InlineConfig.envFile:false; en Vite 5, envDir:false por sí solo no impide cargar archivos de entorno. Las primeras rondas no acreditaron ese aislamiento: [bitácora, momento 6](docs/bitacora-agente.md).

## Contratos principales

| Método    | Ruta                                  | Resultado                            |
| --------- | ------------------------------------- | ------------------------------------ |
| POST      | /api/metas                            | Crear                                |
| GET       | /api/metas/:id                        | Consultar                            |
| GET       | /api/videojuegos/:id/metas            | Activas e inactivas                  |
| PUT       | /api/metas/:id                        | Editar                               |
| PATCH     | /api/metas/:id/desactivar             | Desactivar conservando historial     |
| GET       | /api/videojuegos/:id/progreso-semanal | Actividad, objetivos, rachas e hitos |
| GET / PUT | /api/partidas/:id                     | Consultar/editar partida             |

Continúan las rutas E1 de videojuegos, resumen, logros y partidas. El errorHandler distingue **400/404/409/500**, incluye requestId y oculta detalles inesperados. El presupuesto transaccional es cooperativo: diez segundos no garantizan rollback ni tiempo máximo absoluto de respuesta. Un resultado de commit desconocido no autoriza repetir una operación destructiva.

Meta referencia a Videojuego porque tiene ciclo de vida e histórico propios. Sus hitos se embeben por ser una lista corta acotada; su estado se calcula para evitar duplicar avance. Semana, horas, días, rachas e hitos se calculan en dominio puro, separado de datos y HTTP.

## Cómo trabajamos con el agente

**PRD → épica → historias → criterios → tickets → specs → tests → código → auditoría.** Las specs se aprobaron y registraron antes del código correspondiente; los commits nombran tickets. Se utilizó Codex: los hooks se validaron localmente, pero no se acredita carga automática en Claude Code ni una captura de /hooks obtenida allí.

- [AGENTS.md](AGENTS.md), [DESIGN.md](DESIGN.md) y [harness](docs/harness.md); skill en .claude/skills/nueva-spec y hooks en .claude/settings.json.
- [Diagnóstico](docs/diagnostico.md): D-01 a D-11; D-03/D-04 son las deudas seleccionadas.
- [PRD](docs/prd/level-up.md), [épicas](docs/backlog/epicas.md), [backlog](docs/backlog/E2-metas-y-rachas.md).
- [Spec backend](docs/specs/E2-backend-metas-progreso.md) y [spec frontend](docs/specs/E2-frontend-metas-rachas.md).
- [Auditoría](docs/AUDITORIA.md) y [ocho momentos del agente](docs/bitacora-agente.md).

Un test escrito o un mock aprobado no acredita persistencia. La auditoría conserva los límites y pendientes de cada verificación.

## Seguridad y limitaciones

Se ejecuta npm audit --json y npm audit --omit=dev --json por paquete; las versiones y decisiones finales están en [AUDITORIA.md](docs/AUDITORIA.md). Los siete paquetes afectados del frontend agrupan quince GHSA, ya están en los últimos patches de sus mayores y requieren migraciones mayores para resolver todos los avisos. No se fuerzan esas migraciones para la entrega. Se distinguen riesgos de runtime de los de servidores de desarrollo y herramientas de pruebas. No publicar Vite/Vitest como servicio productivo ni ejecutar repositorios no confiables.

D-06 a D-11 siguen diferidos. No se certifica accesibilidad global, rendimiento bajo carga ni aislamiento multiusuario. Las pruebas locales no validan CORS, red, secretos ni datos históricos de producción.

## Preparar Render y pull request

No se ha desplegado ni fusionado esta rama durante el cierre.

1. Revisar auditoría y diff de feature/e2-metas-rachas.
2. Fijar la versión de Node probada en ambos servicios: [los valores por defecto de Render varían según la fecha de creación](https://render.com/docs/node-version).
3. Backend: Root Directory backend, build npm ci && npm run build, start npm start. Configurar variables privadas en Render y verificar conectividad al replica set de Atlas, base, permisos e índice único parcial. No usar datos productivos para pruebas destructivas.
4. Frontend: Root Directory frontend, build npm ci && npm run build, Publish Directory dist. Configurar VITE_API_URL=https://TU-BACKEND.onrender.com/api antes de compilar; usar configuración productiva, no build:aislado.
5. Configurar rewrite /\* → /index.html y probar rutas profundas: [documentación oficial](https://render.com/docs/redirects-rewrites).
6. Con autorización, desplegar y comprobar salud, CORS y flujo E2 con datos de demo; conservar URLs verificadas. Las URLs antiguas del Proyecto 3 no acreditan E2.
7. Abrir PR con tickets, tests, limitaciones y enlace a docs/AUDITORIA.md; revisar antes del merge a main.

## Demo de máximo seis minutos

Crear meta con hitos → registrar partida y mostrar progreso/racha → alcanzar hito → editar avance hacia abajo y mostrar reversión sin alterar logros → provocar 409 de meta duplicada sin reemplazar la vigente → desactivar y mostrar actividad e histórico → recorrer RN-14 → CA-E2-27 → tickets del backlog → specs → tests → código → auditoría. Usar fechas no futuras en Ecuador.
