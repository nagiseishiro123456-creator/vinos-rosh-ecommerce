# Vinos Rosh · Segunda landing (la botella que se llena)

Esta guía es solo de la **segunda landing**. Es una sección independiente: se agrega al sitio sin tocar nada de lo que ya está implementado.

Prototipos visuales: tablero «Vinos Rosh — Prototipos», boards 00 a 05.
Prototipo que funciona: `reference/index.html` (solo esta landing). Abrir con un servidor local (`python3 -m http.server`), porque las máscaras no cargan desde `file://`.

## 1. Qué hace

Una sección fija (sticky) de 480vh. Mientras el usuario baja:

1. Aparecen un **logo ROSH violeta** y una **botella vertical vacía** (vidrio pálido).
2. El logo **se vacía de arriba hacia abajo** mientras la botella **se llena de abajo hacia arriba**, hasta la tapa. Un contador sube de 0 a 750 ml y un hilo violeta une el logo con la tapa.
3. Al llegar a 750 ml el logo, el hilo y el contador **desaparecen**.
4. **La misma botella** se mueve a la izquierda y a su derecha **aparece la compra** (precio, cantidad, «Comprar ahora»).
5. La sección sigue fija un rato para poder usar la compra; después sigue «Una botella, una sola historia» (cata, maridaje, origen) y el pie.

Hay **una sola botella** en toda la sección.

## 2. Archivos

| Archivo | Uso |
|---|---|
| `assets/bottle-up.png` | Botella vertical, 304 × 1247 px, PNG sin fondo. **La única botella de esta sección.** |
| `assets/logo.png` | Logo. Aquí se usa como máscara (`mask-image`) para pintarlo violeta y vaciarlo. |

## 3. Estructura

```html
<section id="pour" style="height:480vh">
  <div class="st2" style="position:sticky; top:0; height:100svh">
    <div id="plogo">   <!-- logo violeta -->
    <div id="pstream"> <!-- hilo -->
    <div id="pb">      <!-- botella: img.empty + img.full + .surf -->
    <div id="pvol">    <!-- contador -->
    <div id="pbuy">    <!-- compra -->
  </div>
</section>
<section id="historia2"> ... </section>
```

Si la sección va debajo de otra landing clara, conviene un degradado de 24vh de `#fdfcfe` a `#14061d` entre ambas.

## 4. Avance del scroll

```js
span = seccion.alto - ventana.alto
p    = clamp(-seccion.top / span)               // 0..1

aparece = ease(p / .07)
llena   = ease((p - .07) / .38)
se_va   = ease((p - .45) / .08)
mueve   = ease((p - .53) / .17)
ease(t) = .5 - .5 * cos(PI * clamp(t))
```

| p | Fase |
|---|---|
| 0 – .07 | Aparecen logo y botella |
| .07 – .45 | Se llena la botella y se vacía el logo |
| .45 – .53 | Se van logo, hilo y contador |
| .53 – .70 | La botella pasa a la izquierda y entra la compra |
| .70 – 1 | Reposo |

## 5. Cómo se llena

```
nivel = 98% - 98% * llena                  // % desde arriba de la imagen
.full  { clip-path: inset(nivel 0 0 0) }   // la botella en color
.empty { misma imagen aclarada, opacidad .42 }
.surf  { mask: bottle-up.png; línea blanca en `nivel` }
logo   { clip-path: inset(llena*100% 0 0 0) }
contador = round(750 * llena)
```

El logo violeta se dibuja con la imagen del logo como máscara:

```css
#plogo i{ -webkit-mask:url(logo.png) center/contain no-repeat; mask:url(logo.png) center/contain no-repeat }
#plogo .pa { background: rgba(227,208,244,.30) }     /* base pálida */
#plogo .pb2{ background:#a566f0; clip-path: inset(var(--lt) 0 0 0) }
```

## 6. Medidas (escritorio, 1440 × 810)

- Header oscuro de 84 px: fondo `rgba(20,6,29,.86)`, textos lilas `#e3d0f4`, botón de sesión lila con texto `#26103a`. En el prototipo es siempre oscuro; en el sitio, usar el header oscuro cuando el scroll entra en esta sección. El logo del header se aclara con `filter: brightness(0) invert(.88)`.
- Logo violeta: ancho `min(300px, 60vw)` (300 × 118), centrado, a `84px + 3vh` del borde superior.
- Botella: alto `min(54vh, 500px)` (437 px), arriba a `84px + 3vh + alto del logo + 26px`, centrada.
- Hilo: 3 × 23 px entre el logo y la tapa.
- Contador: a la derecha de la botella (40 px), centrado en su altura. Lora 500, `clamp(3rem, 6vw, 5rem)`.
- Movimiento: `translate: calc(-50% + (-mueve * 21.5vw))`.
- Compra: empieza al 54 % del ancho, margen derecho `max(24px, 5vw)`, centrada en vertical.

## 7. Móvil (≤ 820 px)

- Header de 64 px, márgenes de 16 px.
- **Todo más grande que en la primera versión móvil.** Logo `min(300px, 74vw)`. Botella `min(50vh, 470px)`.
- Contador de 4.4 rem, título de 2.3 rem, precio de 3.2 rem, botones de 54 px de alto (mínimo táctil).
- El contador va **debajo** de la botella, centrado.
- Al pasar a la compra, la botella **sube** hasta 78 px del borde y se achica un 26 % (`scale: 1 - .26 * mueve`, con `transform-origin: 50% 0`).
- La compra se ancla abajo (22 px) con márgenes de 5vw. Se ocultan las etiquetas «100 % natural / 750 ml / 0 % alcohol» y la línea «Envío a todo el país». Se mantienen el precio, la cantidad y «Comprar ahora».

## 8. Colores y tipografía

| Token | Valor | Uso |
|---|---|---|
| night0 | `#14061d` | Fondo |
| night1 | `#26103a` | Degradado, texto del botón |
| lilac | `#e3d0f4` | Texto y botón |
| lilac-dim | `#b9a1d0` | Etiquetas |
| vio | `#a566f0` | Logo violeta e hilo |
| títulos | `#f6edfb` | Títulos y cifras |

Lora 500 para títulos, precio y contador. Jost 400/500 para etiquetas, botones y apoyo (mayúsculas con espaciado .14 – .32em).

## 9. Accesibilidad y rendimiento

- La botella es una imagen con `role="img"` y texto alternativo; el contador y el hilo son decorativos (`aria-hidden`).
- La compra solo recibe clics y foco cuando `mueve > .6`.
- `prefers-reduced-motion`: se muestra el estado final (p = .9) y la sección no es alta.
- Un único listener de scroll, con `requestAnimationFrame`.
- Cantidad entre 1 y 12. «Comprar ahora» debe llamar al carrito que ya existe en el sitio (en el prototipo solo suma al contador).

## 10. Criterios de aceptación

- [ ] En móvil (390 y 360 px) la botella, el contador y la compra se leen sin acercar.
- [ ] El logo violeta se vacía mientras la botella se llena y luego desaparece.
- [ ] La botella se llena entera, hasta la tapa; el contador llega a 750 ml.
- [ ] Hay una sola botella en toda la sección y pasa a la izquierda.
- [ ] La compra aparece al lado y se puede usar.
- [ ] Sin desplazamiento horizontal a 1440, 1024, 820 y 390 px.
- [ ] Con movimiento reducido se ve el estado final.

## 11. Pendiente de confirmar

- Precio (S/ 189 viene del prototipo) y texto de «Origen» (entre corchetes).
- Si «Ver detalles» lleva a otra página o a la sección de historia.
