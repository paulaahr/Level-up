# LEVEL UP

Diario de Progreso Gamer: biblioteca, logros y sesiones con resumen del servidor.
E2 incorpora metas y rachas siguiendo Spec-Driven Development (SDD).

## Stack y estructura

- Backend: Express 4, TypeScript estricto, Mongoose 8 y MongoDB; módulos CommonJS.
- Frontend: React 18, TypeScript estricto, React Router 6 y Vite 5; CSS propio.
- `backend/src/`: `modelos/`, `services/`, `controllers/`, `routes/`, `middlewares/`, `config/`.
- `frontend/src/`: `api/`, `componentes/`, `paginas/`, `fonts/`, tipos y CSS global.
- `frontend/public/`: recursos estáticos. Cada aplicación tiene su propio paquete npm.
- `docs/diagnostico.md`: hallazgos D-01 a D-11 y decisiones aprobadas.
- `.claude/`: skill `nueva-spec`, hooks y configuración para Claude Code.
- `DESIGN.md`: diseño existente. `docs/harness.md`: uso, validación y limitaciones.

## Comandos (desde la raíz; en PowerShell usar npm.cmd)

- Backend: `npm --prefix backend run dev`, `npm --prefix backend run build`.
- Backend compilado: `npm --prefix backend start`.
- Frontend: `npm --prefix frontend run dev`, `npm --prefix frontend run build`.
- Vista compilada: `npm --prefix frontend run preview`.
- Tipos sin emitir: ejecutar `node_modules/.bin/tsc --noEmit --incremental false`
  dentro de cada aplicación (en Windows, `node_modules/.bin/tsc.cmd`).
- Harness: `npm ci --ignore-scripts`, `npm run test:harness`, `npm run check:harness`.
- Tests backend: `npm --prefix backend run test:unit` y `run test:integration`.
- Tests frontend: `npm --prefix frontend test`, `run test:e2e` y `run test:e2e:real`.
- Frontend sin archivos de entorno: `npm --prefix frontend run build:aislado`.
- No ejecutar arranque/build que cargue `.env`; usar configuración aislada explícita.

## Convenciones

- Conservar nombres y mensajes en español y TypeScript estricto; evitar nuevos `any`.
- Mantener rutas → controladores → servicios → modelos y acceso HTTP en `frontend/src/api/`.
- Preservar validaciones del servidor, contratos HTTP y trazabilidad con `requestId`.
- Respetar las decisiones del diagnóstico; no corregir incidentalmente los diferidos.
- No introducir reglas de fechas, metas o rachas sin criterios aprobados.

## Frontend

Antes de tocar componentes o estilos, revisar `DESIGN.md` y reutilizar patrones existentes.
No cambiar la identidad visual sin revisar `DESIGN.md` y contar con alcance autorizado.

## Reglas obligatorias del agente

- Nunca leer ni modificar archivos `.env` ni variantes `.env.*`, incluso ejemplos.
- No implementar ninguna funcionalidad sin una spec previa en `docs/specs/`, aprobada.
- Seguir PRD → épica → historias → criterios → tickets → specs → tests → código → auditoría.
- No modificar archivos fuera del alcance del ticket; informar si requiere ampliación.
- Ejecutar los tests correspondientes antes de dar una tarea por terminada.
- Si faltan tests o el entorno impide ejecutarlos, informar la limitación; no afirmar éxito.
- Registrar comprobaciones reales, resultados y pendientes; distinguir tipos de tests.
- No crear PRD/specs, implementar E2 ni pagar deudas durante la fase de harness.
- No hacer commits, publicar ni desplegar sin autorización del usuario.
- Los hooks de Claude Code no se ejecutan automáticamente en Codex ni son un sandbox.
