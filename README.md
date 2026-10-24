# LEVEL UP — Tu diario gamer

Una aplicación React + TypeScript y Express + Mongoose para administrar videojuegos, logros y sesiones de juego, con progreso calculado por el servidor. Creada a partir de los patrones de arquitectura practicados en Pawnee, con un diseño visual nuevo.

## Intención y modelo de datos

- **Videojuego**: `nombre` (requerido), `genero` (enum), `plataforma` (requerida), `estado` (enum), `portada` (URL opcional), `descripcion`, `calificacion` (0–10) y `logros` (subdocumentos `{_id,nombre,descripcion,obtenido}`). Se embeben los logros porque son una lista acotada que se lee junto al juego; no requieren consultas independientes.
- **Partida**: `videojuego` (`ObjectId` con `ref: 'Videojuego'`), `fecha`, `duracionMinutos` (1–1440), `porcentajeAvance` (0–100) y `notas`. Se referencia porque un videojuego puede tener un historial ilimitado de sesiones que se consultan también globalmente.

### Fórmula de resumen

Para un juego `id`, el **servicio** busca todas sus partidas y calcula:

- `totalPartidas = partidas.length`.
- `minutosTotales = Σ partida.duracionMinutos`.
- `horasTotales = redondear(minutosTotales / 60, 2 decimales)`.
- `ultimaSesion = fecha de la partida más reciente`.
- `porcentajeAvanceActual = porcentajeAvance de la partida más reciente`, incluso si es menor a otro porcentaje histórico. En un empate de fechas se desempata por fecha de creación y `_id`.
- Si el juego no tiene partidas: `totalPartidas=0`, `minutosTotales=0`, `horasTotales=0`, `ultimaSesion=null` y `porcentajeAvanceActual=0`.

**Integridad:** al eliminar un juego se borran también sus partidas; el servicio valida la referencia antes de crear una sesión.

## Ejecutar localmente

Necesitas Node 20+, npm y un cluster MongoDB Atlas con acceso desde tu IP.

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con la URI privada de MongoDB Atlas
npm run dev
```

En otra terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:5173`. La API corre en `http://localhost:3000/api`.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/salud` | Healthcheck |
| GET | `/api/videojuegos?estado=&genero=&buscar=` | Listar y filtrar |
| GET | `/api/videojuegos/:id` | Detalle |
| POST | `/api/videojuegos` | Crear juego |
| PUT | `/api/videojuegos/:id` | Editar juego |
| DELETE | `/api/videojuegos/:id` | Eliminar juego y sus sesiones |
| PATCH | `/api/videojuegos/:id/logros/:logroId` | Cambiar `obtenido` booleano |
| GET | `/api/videojuegos/:id/partidas` | Sesiones de un juego |
| GET | `/api/videojuegos/:id/resumen` | Estadísticas calculadas |
| GET | `/api/partidas` | Listar con populate de videojuego |
| POST | `/api/partidas` | Registrar sesión con validación de referencia |
| DELETE | `/api/partidas/:id` | Eliminar sesión |

### Ejemplo reproducible (Thunder Client o curl)

```bash
curl -X POST http://localhost:3000/api/videojuegos -H 'Content-Type: application/json' -d '{"nombre":"Hollow Knight","genero":"Indie","plataforma":"PC","estado":"Jugando","logros":[{"nombre":"Primer jefe","obtenido":false}]}'
# Copia el _id devuelto como ID
curl -X POST http://localhost:3000/api/partidas -H 'Content-Type: application/json' -d '{"videojuego":"ID","fecha":"2026-10-01T18:00:00","duracionMinutos":60,"porcentajeAvance":15}'
curl -X POST http://localhost:3000/api/partidas -H 'Content-Type: application/json' -d '{"videojuego":"ID","fecha":"2026-10-02T18:00:00","duracionMinutos":120,"porcentajeAvance":35}'
curl -X POST http://localhost:3000/api/partidas -H 'Content-Type: application/json' -d '{"videojuego":"ID","fecha":"2026-10-03T18:00:00","duracionMinutos":90,"porcentajeAvance":50}'
curl http://localhost:3000/api/videojuegos/ID/resumen
# Resultado: 3 partidas, 270 minutos, 4.5 horas, 50% avance
```

### Manejo de errores

- HTTP **400**: errores de validación de Mongoose y IDs mal formados.
- HTTP **404**: videojuego, partida o logro no existente; incluye referencias inexistentes al crear una partida.
- HTTP **500**: errores inesperados. Todos los errores incluyen `requestId`; `logger` registra cada petición.

## Despliegue en Render

1. Sube el repositorio a GitHub, excluyendo **todos los `.env`**.
2. Crea **Web Service** para `backend`, con Root Directory `backend`, Build Command `npm install && npm run build`, Start Command `npm start`.
3. En las variables del backend configura `MONGODB_URI`, `MONGODB_DB`, `FRONTEND_URL` (URL pública del frontend). Render define `PORT`.
4. Crea **Static Site** para `frontend`, con Root Directory `frontend`, Build Command `npm install && npm run build`, Publish Directory `dist`.
5. En frontend configura `VITE_API_URL=https://TU-BACKEND.onrender.com/api`. Como Vite inserta esa variable durante la compilación, vuelve a desplegar si cambia.
6. Agrega una regla de rewrite de `/*` hacia `/index.html` para que React Router funcione al refrescar una ruta.
7. Ajusta en Atlas la lista de acceso de red de forma segura según la red del backend. Comprueba CORS entre los dos dominios.

### URLs públicas

- Frontend: https://level-up-gluw.onrender.com/
- Backend: https://level-up-paula.onrender.com
- Estado de la API: https://level-up-paula.onrender.com/api/salud

### Control de versiones

El proyecto se desarrolló utilizando ramas de trabajo
y commits descriptivos. El frontend se integró en
main mediante el Pull Request #2.

## Demo final

Crear juego → añadir tres sesiones → abrir detalle y comprobar resumen → marcar logro → filtrar biblioteca. Provoca y documenta los cuatro tipos de error.

## Git / Pull Request

Trabajo sugerido: crear `feature/modelos-videojuegos`, hacer commits separados por modelo, servicio, controlador, ruta y frontend; abrir PR hacia `main` y fusionarlo. **El ZIP no prueba que exista un PR ni incluye un repositorio remoto**: debes crearlo en GitHub.

## Seguridad

Nunca subas `.env` ni una URI real de Atlas. Si una credencial se compartió previamente en un ZIP, revócala o rótala. No se incluye autenticación: la aplicación es un ejercicio de diario personal, no un servicio multiusuario con aislamiento entre estudiantes.
