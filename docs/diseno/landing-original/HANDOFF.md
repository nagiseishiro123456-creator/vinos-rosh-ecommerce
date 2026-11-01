# Vinos Rosh · Guía de implementación del sitio web

Documento para quien mejore la **landing page** (Codex u otra persona). El resto del sitio (carrito, acceso, «Nuestra historia», panel admin) **ya existe y no se toca**. Está escrito para que se pueda trabajar sin preguntar nada más, salvo los puntos marcados como **pendiente**.

## 0. Qué hay en esta carpeta

| Carpeta o archivo | Para qué sirve |
|---|---|
| `HANDOFF.md` | Este documento: todo lo que hay que construir y cómo. |
| `reference/rosh.html` | **Prototipo funcional** de la pantalla de inicio. Ya hace la animación de entrada, el racimo con video, el header y el móvil. Es la referencia de comportamiento y tiempos. Las imágenes del logo y la botella van incrustadas en base64; en el sitio real deben usarse los archivos de `assets/`. |
| `reference/` (resto) | `sueno.mp4`, `grape-mask.png`, `grape-shade.png`, `grape-spec.png`: los archivos que `rosh.html` necesita para abrirse. |
| `assets/` | Todos los recursos finales: logo, botella, racimo compuesto, máscara y capas del racimo, video, fotogramas de ejemplo, tallo y hoja en SVG. |
| `previews/` | Capturas del prototipo funcional: los cinco pasos de la animación en escritorio y el inicio en móvil. |

El diseño completo (tablero tipo Figma con medidas, estados y pantallas) está en el lienzo **«Vinos Rosh — Prototipos»**. Esta guía lo resume y lo amplía. Si hay una diferencia entre el lienzo y esta guía, **gana el lienzo para lo visual y esta guía para lo técnico**.

## 1. Alcance

**Solo la landing page (`/`)**: animación de entrada, header, botella y racimo con video. Usar la tecnología, el router y el estilo del sitio actual.

No hacer ni rediseñar: carrito, inicio de sesión, «Nuestra historia», panel de administración, pagos. Los botones del header (llamar, cuenta, carrito con contador, iniciar sesión) y el enlace «Nuestra historia» **conservan lo que hacen hoy**; aquí solo se define su aspecto y su aparición en la animación.

El racimo solo **lee** la lista de fotos/video que ya entrega el admin existente (ver sección 7).

## 2. Decisiones del cliente (no cambiar)

- Al entrar se ve **solo el logo ROSH**. No lleva la palabra «VINOS».
- Hay **un único logo**. Viaja del centro de la pantalla a la esquina del header. No se crea un segundo logo en el header.
- La botella entra **después** de que el logo salió del centro y queda a la izquierda. Solo entonces aparece el resto del header.
- A la derecha hay un **racimo de uvas** (la forma sale de una foto de racimo que el cliente eligió) y por dentro se ve el video o las fotos. **El video tiene que verse con claridad.**
- **Tallo y hoja** en lila suave, **fuera** de las uvas.
- Alrededor del racimo hay un **halo morado** que respira, como un sueño.
- La **botella va sin fondo** y conserva su sombra suave.

## 3. Tokens de diseño

Definir como variables CSS en `:root`.

### Color

| Variable | Valor | Uso |
|---|---|---|
| `--purple-900` | `#5a1a78` | Texto, bordes, iconos, botón principal |
| `--purple-500` | `#8a2be2` | Acento, halo, anillo de foco |
| `--lilac-100` | `#efe3f7` | Superficies suaves, hover, marcador de posición |
| `--bg` | `#fdfcfe` | Fondo de la página |
| `--leaf-300` | `#c3a3e3` | Hoja (inicio del degradado) |
| `--leaf-500` | `#9a73c0` | Hoja (fin) y tallo |
| `--petiole` | `#a98acb` | Rabito de la hoja |
| `--veil` | `rgba(98,34,132,.04)` | Velo sobre el video |

Estados de botón principal: hover `#6d2190`, presionado `#471360`, desactivado `#c9b4d8`. Hover de botón de icono: fondo `#efe3f7`; presionado `#e3d0f1`. Error: `#b3261e`.

Contraste: `--purple-900` sobre `--bg` ≈ 11:1; blanco sobre `--purple-900` ≈ 11:1.

### Tipografía

Lora (Google Fonts), pesos 500 y 600. Alternativa: `Georgia, serif`. Precargar y usar `font-display: swap`.

| Uso | Tamaño / peso |
|---|---|
| Enlace de navegación | 18.4 px / 600 |
| Botón | 16.8 px / 600 |
| Insignia del carrito | 12.8 px / 600 |
| Texto | 16 px / 500, interlínea 1.55 |
| Título de página | 40 px / 600 |

El logo es una imagen (`assets/logo.png`); no se escribe con la fuente.

### Medidas (pantalla de 1440)

| Elemento | Valor |
|---|---|
| Alto del header | 84 px |
| Margen lateral de página | `clamp(16px, 5vw, 80px)` = 72 px |
| Hueco del logo en el header | 140 × 55 px |
| Botón de icono | círculo de 52 px, borde 1.5 px |
| Insignia del carrito | 24 px, posición arriba −8 px, derecha −6 px |
| Separador vertical | 1 × 42 px, opacidad .5 |
| Espacio entre elementos del header | 22 px |
| Botón principal | píldora, radio 30 px, relleno 14 × 22 px |
| Punto de corte móvil | 820 px |

### Movimiento

| Qué | Duración y curva |
|---|---|
| Logo aparece (opacidad + desenfoque 10 → 0 px) | 1.6 s `ease` |
| Logo viaja al header | 1.4 s `cubic-bezier(.65, 0, .25, 1)` |
| Botella entra (30vw → 0, escala .92 → 1) | 1.9 s `cubic-bezier(.22, .8, .25, 1)`; opacidad 1.3 s `ease` |
| Header aparece (sube 12 px, opacidad) | .8 s, retraso .1 s |
| Racimo aparece (escala .85 → 1, opacidad) | 1.4 s `cubic-bezier(.2, .8, .2, 1)`, retraso .5 s (opacidad 1.1 s) |
| Halo «respira» (opacidad .65–1, escala .96–1.06) | 7 s y 9 s, infinito |
| Racimo flota (−10 px) | 9 s `ease-in-out`, infinito |
| Cambio de foto en el racimo | fundido 1 s, cada 5 s |

## 4. Pantalla de inicio

### 4.1 Estructura

```
<header>   fijo, transparente, 84 px, z-index sobre todo
  [hueco del logo 140×55] | Nuestra historia          [llamar][cuenta][carrito·N] | [Iniciar sesión]
<main>     dos columnas iguales (1fr 1fr), relleno 84px 72px 30px, alto de pantalla
  columna izquierda: botella
  columna derecha:   racimo con video
<img id="logo">  posicionado con position: fixed, por encima de todo, mientras dura la animación
```

El logo animado es un elemento aparte del header: se mide el hueco del header y el logo se mueve hasta ahí con `transform`. Al terminar queda en esa posición (enlace al inicio).

### 4.2 Botella

- Archivo: `assets/bottle.png` (PNG con transparencia, 570 × 810, incluye la sombra).
- Alto `min(86vh, 800px)`, ancho automático, centrada en la columna izquierda.
- **No** usar `mix-blend-mode` ni máscaras para quitar un fondo: el PNG ya viene recortado.
- Texto alternativo: «Botella Rosh, vino de uvas sin alcohol».

### 4.3 Racimo con video

Proporción **1020 : 820**. Ancho `min(114%, 780px, (100vh − 110px) × 1020 / 820)`, centrado en la columna derecha. En móvil: `min(92vw, 520px)`.

Capas, de abajo hacia arriba, dentro de un contenedor `position: relative`:

1. **Fondo lila** (`--lilac-100`), visible mientras carga o si no hay contenido.
2. **Video o foto** a pantalla completa (`object-fit: cover`).
3. **Sombras de uvas:** `assets/grape-shade.png` a pantalla completa con `mix-blend-mode: overlay`.
4. **Brillos:** `assets/grape-spec.png` a pantalla completa, mezcla normal.
5. **Velo** morado al 4 %: `linear-gradient(rgba(98,34,132,.04), rgba(98,34,132,.04))`.

Las capas 1–5 van dentro de un contenedor recortado con la silueta:

```css
.racimo{
  position:absolute; inset:0; overflow:hidden;
  -webkit-mask: url(grape-mask.png) center/100% 100% no-repeat;
          mask: url(grape-mask.png) center/100% 100% no-repeat;
}
```

Encima, **sin recortar**, el SVG de tallo y hoja (`assets/stem-leaf.svg`, `viewBox="0 0 1020 820"`, `preserveAspectRatio="none"`, `overflow: visible`).

Detrás, el **halo**: dos `div` circulares con `filter: blur(38px)`.

```css
.halo1{inset:-14%; background:radial-gradient(closest-side,rgba(138,43,226,.42),rgba(170,110,230,.22) 60%,transparent 80%); animation:respira 7s ease-in-out infinite}
.halo2{inset:-4% -16% -10% -2%; background:radial-gradient(closest-side,rgba(240,150,220,.35),transparent 75%); animation:respira 9s ease-in-out infinite reverse}
@keyframes respira{0%,100%{opacity:.65;transform:scale(.96)}50%{opacity:1;transform:scale(1.06)}}
```

Todo el conjunto (halo, racimo, tallo y hoja) flota: `translateY(0 → −10px)`, 9 s, `ease-in-out`, infinito.

**Luces:** 14 puntos de 4 a 13 px, círculo con degradado radial blanco → lila → transparente; nacen en el 35–95 % de la altura, suben 120 px con deriva lateral de ±30 px, aparecen y se desvanecen. Duración de 6 a 13 s con retrasos negativos distintos. Son decorativos (`aria-hidden`).

**Sin soporte de máscaras:** mostrar `assets/cluster.png` (racimo ya compuesto con un fotograma) en lugar del contenedor recortado.

**Texto alternativo:** el del archivo activo, que carga el administrador.

### 4.4 Video

- `assets/sueno.mp4`: H.264, 896 × 720, ~1 MB, 10 s, sin audio.
- Etiqueta: `<video muted loop playsinline autoplay preload="metadata" poster="…">`.
- Los videos nuevos que suba el cliente deben pasar por una validación (ver sección 7). Si el servidor puede, convertirlos a H.264 sin audio con `ffmpeg -an -c:v libx264 -crf 26 -preset veryfast -movflags +faststart`.
- Con `navigator.connection.saveData` o conexión lenta: mostrar solo la foto (`poster`).

### 4.5 Animación de entrada

Secuencia (ver `reference/rosh.html`, que ya la implementa):

| Tiempo | Qué pasa |
|---|---|
| 0 s | Fondo `--bg`. El logo (640 px de ancho o `72vw`, el menor) está centrado con opacidad 0 y desenfoque 10 px. Se le añade la clase que lo muestra. |
| 0.1 – 1.7 s | El logo aparece. |
| 1.7 – 3.0 s | El logo se queda solo. |
| 3.0 s | Se mide el hueco del header y el logo viaja hasta ahí con `transform: translate() scale()`, `transform-origin: 0 0`. |
| 4.3 s | Entra la botella. |
| 5.4 s | Aparece el resto del header; 0.5 s después empieza a aparecer el racimo. |
| 6.8 s | Termina. Se libera el scroll. |

Reglas:

- Mientras dura, `body { overflow: hidden }`.
- Medir el destino con `getBoundingClientRect()` del hueco. Ojo: si el header todavía está desplazado 12 px hacia arriba por su propia animación, sumar 12 px a la coordenada Y.
- Al cambiar el tamaño de la ventana (ya terminada la animación), recalcular la posición sin transición.
- `prefers-reduced-motion: reduce`: saltar directamente al estado final (logo en el header, botella y racimo visibles), sin transiciones.
- Solo en la primera visita de la sesión (`sessionStorage`); en visitas siguientes mostrar el estado final.
- Clic en el logo: volver arriba.

## 5. Header y componentes

- Header en escritorio: ver tabla de medidas. Los iconos son los del prototipo (cada botón conserva su acción actual) (teléfono, usuario, carrito, entrar), trazo de 1.8 px, 22 px.
- Todos los botones de icono llevan `aria-label` y anillo de foco visible: `outline: 2px solid #8a2be2; outline-offset: 3px`.
- Insignia: usar el contador que el sitio ya tiene; aquí solo se define su aspecto (24 px, fondo `--purple-900`).
- Enlace «Nuestra historia»: sin subrayado normalmente; en hover y en la página actual, subrayado de 2 px con separación de 6 px.
- Botón «Iniciar sesión»: con sesión iniciada pasa a «Mi cuenta».
- «Llamar» abre `tel:[NÚMERO]` (**pendiente**).

## 6. Versión móvil (≤ 820 px)

- Una columna: botella arriba, racimo abajo; la página hace scroll cuando termina la animación.
- Header de 64 px, margen lateral 16 px. Logo de 100 × 40 px. Iconos de 44 px.
- Botones visibles: carrito (con insignia), iniciar sesión (solo icono, relleno) y menú ☰.
- El menú ☰ abre un panel con «Nuestra historia», «Llamar» e «Iniciar sesión / Mi cuenta». (El prototipo `reference/rosh.html` todavía no incluye el botón ☰; en móvil oculta «Llamar» y «Nuestra historia». Seguir el lienzo.)
- Botella: alto `min(46vh, 400px)`, centrada.
- Racimo: ancho `min(92vw, 520px)`, halo con desenfoque 24 px.
- Animación: igual; el logo inicia en `72vw` y viaja al hueco de 100 × 40 px; la botella entra desde `30vw`.

## 7. Contenido del racimo (fuente de datos)

El racimo recibe una lista ordenada. Esa lista la entrega el admin que el sitio ya tiene; si aún no puede, usar `assets/sueno.mp4` como valor por defecto.

```
MediaItem { type: 'video' | 'image', url, posterUrl?, alt }
```

- Una foto se muestra 5 s; un video se reproduce en bucle, sin sonido.
- Cambio entre elementos: fundido de 1 s. Con un solo elemento no hay rotación.
- Sin lista o lista vacía: mostrar `sueno.mp4`.

## 8. Accesibilidad

- Foco visible en todo lo interactivo.
- Botones de icono con `aria-label`; imágenes con texto alternativo; luces y halos con `aria-hidden`.
- Toda la página se puede usar con teclado.
- Respetar `prefers-reduced-motion`.
- Contraste mínimo 4.5:1 en el texto.
- El video nunca lleva audio.

## 9. Rendimiento

- Reservar el espacio de la botella y el racimo con `aspect-ratio` para evitar saltos de diseño.
- Precargar Lora 500 y 600.
- `will-change: transform` solo mientras dura la animación de entrada.
- Fotos en WebP, máximo 1600 px de ancho.
- No cargar video fuera de pantalla en las demás páginas.

## 10. Criterios de aceptación

Marcar cuando esté hecho y comprobado.

- [ ] Al entrar solo se ve el logo ROSH, sin la palabra «VINOS».
- [ ] Hay un único logo en toda la animación y termina exactamente en el hueco del header.
- [ ] La botella entra después de que el logo salió del centro y queda a la izquierda.
- [ ] El header completo aparece cuando la botella ya está en su lugar.
- [ ] La botella no muestra fondo ni cortes en la sombra, ni sobre fondo claro ni sobre fondo oscuro.
- [ ] El racimo tiene la forma de `grape-mask.png` y el video se ve nítido a través de las uvas.
- [ ] La hoja y el tallo son lilas y quedan fuera de las uvas.
- [ ] Funciona a 1440, 1024, 820 y 390 px de ancho sin barras de desplazamiento horizontales.
- [ ] Se puede usar entero con teclado y con `prefers-reduced-motion` activado.

## 11. Comprobación sugerida

Abrir `reference/rosh.html` en un servidor local (por ejemplo `python3 -m http.server`, porque las máscaras no cargan desde `file://`) y comparar con `previews/`. El sitio construido debe verse igual en los cinco pasos de la animación y en el estado final.
