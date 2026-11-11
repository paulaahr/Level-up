# LEVEL UP — Sistema de diseño existente

## Alcance y fuentes

Inventario del frontend actual, obtenido por revisión estática; no acredita una auditoría visual o WCAG. No introduce tokens nuevos ni cambia estilos.

Fuentes: `frontend/src/main.tsx`, `App.tsx`, `componentes/UI.tsx`, `Reveal.tsx`, `ScrollMotion.tsx`, `styles.css`, `brutalist.css`, `editorial.css` y las hojas CSS de `paginas/`.

`main.tsx` carga los tres estilos globales en orden: base, brutalista y editorial. Las páginas importan además su CSS. Hay redefiniciones y `!important`: comprobar la regla y el ámbito concretos antes de reutilizar una variable. Los nombres históricos de los tokens no describen siempre su color.

## Identidad

Estética editorial gamer: grandes titulares, composiciones de póster, numeración de secciones, etiquetas en mayúsculas, estrellas y flechas decorativas. Predominan bloques de color plano, bordes oscuros, sombras desplazadas sin desenfoque y controles rectangulares. No es una interfaz uniforme de un único tema: inicio, biblioteca, detalle y formularios tienen variaciones intencionales.

## Paleta real

| Valor                 | Uso y evidencia                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#f06038`             | Naranja de titulares, acciones y fondos. `editorial.css :root --ink`; `Detalle.css --accent`; variables locales `--orange`, `--fj-orange`, `--biblioteca-orange` y `--partidas-orange`. |
| `#fff1e6`             | Crema de superficies y texto sobre naranja. `editorial.css --pink`, detalle `--paper`, formularios `--cream` / `--fj-cream`.                                                            |
| `#d6f74c`             | Lima de acentos, botones y decoración. `editorial.css --red`, detalle y formulario de partida `--lime`.                                                                                 |
| `#8c9cff`             | Lavanda de fondos, acentos y estados de foco. `editorial.css --paper`, variables locales `--purple`, `--fj-purple`, `--partidas-purple`.                                                |
| `#23151a`             | Tinta oscura para texto, bordes y sombras en páginas: `--ink`, `--fj-ink`, `--biblioteca-ink`, `--partidas-ink`.                                                                        |
| `#ffffff` / `#fff`    | Campos y superficies claras; detalle `--light` y formulario de juego `--fj-white`.                                                                                                      |
| `#180b0b`             | Tinta heredada en `brutalist.css`; no sustituir automáticamente la tinta local de cada página.                                                                                          |
| `#21060624`           | `--grid` global en `editorial.css`, con transparencia.                                                                                                                                  |
| `#ffb1b7` y `#810000` | Fondo y texto de selección en `editorial.css`.                                                                                                                                          |

`styles.css` conserva una base oscura (`#0d0e14`, `#f4f3fa`) que las hojas posteriores redefinen. No tomarla como paleta principal de una pantalla nueva. Las variables son las existentes y tienen ámbito; no hay un contrato semántico global de colores normalizado.

## Tipografías existentes

- **Bootzy:** fuente local `frontend/src/fonts/BootzyTM.ttf`, declarada con `@font-face` y `font-display: swap` en las hojas globales. Titulares grandes de páginas y formularios.
- **Archivo Black:** marca, titulares y fallback de Bootzy según selector.
- **DM Sans:** cuerpo, formularios y algunos elementos de gran tamaño.
- **Space Mono:** navegación, etiquetas, índices, acciones y metadatos.
- **Playfair Display:** importada y usada como fallback en títulos de secciones de `FormularioJuego.css`.
- **DejaVu Sans / Segoe UI Symbol:** fallback de estrellas y símbolos con `font-variant-emoji: text` en `editorial.css`.
- `index.html` también solicita IBM Plex Mono y Space Grotesk; `styles.css` referencia Outfit. Su presencia no significa que sean la tipografía principal efectiva de cada vista ni que todas se descarguen correctamente.

Las fuentes externas provienen de Google Fonts. No se verificó su carga en red. Los tamaños combinan valores fijos y `clamp()`: por ejemplo, el título de partida usa `clamp(64px,7.4vw,116px)` con interlínea `.83`; la navegación usa Space Mono de `11px`. No normalizar estos valores durante E2 sin revisar el diseño.

## Espaciado y variables visuales

No hay una escala de espaciado tokenizada común. Ejemplos reales, no tokens nuevos:

| Patrón                          | Valores existentes                                                             |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Navegación editorial            | `padding: 16px clamp(22px,4vw,65px)`, altura mínima `80px`, separación `25px`. |
| Cuerpo de formulario de partida | `padding: 65px clamp(20px,5vw,80px) 115px`, ancho máximo `1460px`.             |
| Rejilla del mismo formulario    | Dos columnas `minmax(0,1fr)`, separación `27px 22px`; una columna en móvil.    |
| Campos del mismo formulario     | `padding: 17px 18px`, borde oscuro `2px`, radio `0`.                           |
| Botón principal de partida      | Altura mínima `58px`, sombra `6px 6px 0`, desplazamiento de hover `-2px,-2px`. |
| Tarjetas de biblioteca          | Rejilla con separación `35px 24px`; predominan bordes rectos.                  |

Otros ámbitos usan bordes de `1px`, sombras de `3px`, `5px`, `7px` o `13px`, y excepciones con radio: no imponer una regla universal de radio cero. `--progress` controla el relleno del slider; `--scroll-shift` desplaza el arte del inicio y `--reveal-delay` gobierna la aparición escalonada. Son variables dinámicas existentes, no una escala de diseño.

## Componentes y patrones

- `App.tsx`: marca LEVEL UP, navegación con estado activo, menú móvil, contenido y pie de páginas internas.
- `Encabezado`: etiqueta superior, título, descripción y acciones opcionales. Las páginas pueden redefinir u ocultar partes mediante CSS.
- `Tarjeta` y `Portada`: enlace a un juego, portada o sustituto con símbolo y nombre, estado, género, plataforma y llamada a detalle. La portada compartida es un fondo CSS, no un elemento `img`.
- Biblioteca: hero editorial, buscador, filtros y rejilla de juegos.
- Detalle: ficha, acciones, estadísticas, barra de avance, checkboxes de logros e historial.
- Historial: tabla de sesiones con etiquetas `data-label` y acción de borrado.
- Formularios: secciones numeradas, labels, campos nativos, selector de fecha/hora, slider, notas, cancelación y botón de envío deshabilitado mientras guarda.
- `Reveal` y `useScrollMotion`: aparición por intersección y desplazamiento vinculado al scroll. Reutilizar con atención a movimiento reducido.

## Estados de interfaz

| Estado                           | Implementación existente                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Carga                            | `Loading`: spinner y «Cargando tu universo gamer...».                                                 |
| Error                            | `ErrorVista`: símbolo, «Algo salió mal», mensaje y botón «Reintentar» cuando se proporciona callback. |
| Vacío                            | `Vacio`: título, explicación y enlace de acción opcional.                                             |
| Guardado                         | Texto «Guardando...» y botón deshabilitado; logros deshabilitan el checkbox que se está guardando.    |
| Confirmación o fallo de acciones | Varias pantallas usan `confirm` y `alert` nativos; no existe un sistema común de modales o toasts.    |
| Ruta desconocida                 | Vista «404 / NIVEL NO ENCONTRADO» y enlace de retorno.                                                |

Los mensajes de error de API pueden reflejar validaciones del servidor. Los defectos de estados de edición están registrados en D-08; esta descripción no los corrige.

## Tono de los textos

Español directo en instrucciones y acciones: «Agregar juego», «Registrar sesión», «Guardar cambios». Titulares cercanos con referencias gamer: «Tu universo», «Tu historia», «Cada partida cuenta». Las etiquetas editoriales mezclan español e inglés: `PLAYER ARCHIVE`, `SESSION HISTORY`. Mantener acciones comprensibles, sin introducir jerga técnica interna en los flujos del usuario.

## Accesibilidad

Existen labels en formularios, nombres accesibles en botones de borrado y menú, `aria-expanded`, navegación etiquetada, decoraciones con `aria-hidden` y barra de avance con `role="progressbar"` y valores ARIA. Hay reglas de foco visible en hojas globales y de páginas.

**Pendiente de verificar:** contraste de cada combinación real, recorrido completo con teclado, nombres de filtros, anuncios de carga/error y lectura de portadas de fondo. `Loading` y `ErrorVista` no declaran por sí mismos regiones vivas. No se afirma conformidad WCAG.

**Requisitos para cambios futuros, no hechos ya comprobados:** mantener foco perceptible, labels y nombres accesibles; no depender solo del color; conservar semántica de controles y comprobar teclado y contraste en el alcance del ticket.

## Responsive y movimiento reducido

Los breakpoints varían por hoja: editorial `720px`, biblioteca `740px`, detalle `1120px` y `740px`, partidas `900px`, formulario de juego `860px` y `740px`, formulario de partida `760px`. Hay rejillas que pasan a una columna, menú desplegable, ajustes de tipografía, márgenes y disposición del historial. No existe un breakpoint único para todo el sitio.

`Reveal` muestra contenido inmediatamente si detecta `prefers-reduced-motion: reduce`. `brutalist.css` reduce duraciones; otras hojas desactivan determinadas transiciones y la animación de biblioteca. La cobertura no es uniforme: `useScrollMotion` no consulta esa preferencia y el reinicio de scroll de `App.tsx` usa desplazamiento instantáneo. Verificar el comportamiento completo en navegador antes de afirmar que todo movimiento queda desactivado.

## No hacemos

- No reemplazamos la estética editorial gamer por un tema genérico o un framework visual.
- No renombramos tokens históricos ni limpiamos la cascada como efecto incidental de E2 (D-10 está diferido).
- No añadimos fuentes, paletas, escalas o componentes visuales nuevos sin identificarlos como propuestas y revisar su alcance.
- No afirmamos accesibilidad, responsive o carga de fuentes verificados solo por leer CSS.
- No cambiamos contenido, componentes o estilos del frontend durante la creación del harness.
