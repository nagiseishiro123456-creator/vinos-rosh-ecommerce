# Identidad Azul-Violeta de ROSH

Mejora visual de la landing y la navegación compartida. El color de referencia
entregado por el cliente es **#4B1C71** (RGB 75, 28, 113).

| Uso | Color |
| --- | --- |
| Marca, cabeceras internas y acciones | #4B1C71 |
| Acciones al pasar el cursor | #612A8E |
| Violeta oscuro | #301247 |
| Fondo de la sección nocturna | #1B0C29 |
| Superficies de trabajo | #FFFFFF y #F8F7FB |
| Bordes y contraste sobre violeta | #E2DBE9 y #E6D5F5 |

Los tokens se administran en `src/app/globals.css`. `brand-theme.css` comparte
la navegación pública. `admin-brand.css` y `auth-brand.css` se cargan en sus
respectivas rutas. La animación y los estilos propios de la landing se conservan.
Las antiguas reglas de portada sin referencias se retiran de los estilos globales.

La cabecera pública mantiene logo, navegación, cuenta y carrito. En tablet y móvil
se convierte en menú desplegable; Escape lo cierra y devuelve el foco. Abrir ese
menú no altera el bloqueo de desplazamiento que administra el carrito. El panel
tiene una cabecera de marca con Panel, Producto, Pedidos, Pagos, Ver tienda y Cerrar
sesión. Los accesos operativos completos siguen en el panel.

Se aplican superficies blancas y neutrales frías, botones y enlaces violetas, y
controles de cabecera con borde y brillo al pasar el cursor. Los avisos de éxito,
advertencia y error mantienen sus colores semánticos para distinguir los estados.
Manifest, icono y color del navegador usan la misma identidad.

## Revisión local

- TypeScript y ESLint de los componentes modificados.
- Navegación pública en inicio, producto, envíos, carrito, contacto, historia,
  preguntas frecuentes y las cuatro rutas de acceso/recuperación.
- Menú, Escape, apertura y cierre del carrito entre 320 y 1100 px.
- Panel y cabecera reales renderizados con dependencias de datos aisladas para
  revisar 320, 390, 1024 y 1440 px. Las capturas del panel contienen ceros de muestra;
  no describen la base local ni sustituyen una prueba autenticada de servidor.

Capturas locales de referencia (no versionadas): `docs/evidencias/brand-violet/admin-1440.png` y
`docs/evidencias/brand-violet/admin-390.png`.

## Navegación de un único vino

Se retira Producto de la cabecera pública, su acceso de búsqueda y los menús
móviles. Los accesos de compra de carrito, Mi cuenta, pedidos, historia y envíos
apuntan a `/#comprar`. Ese enlace abre directamente los controles de cantidad y
compra de la landing, incluso al recargar o con movimiento reducido; no obliga
a recorrer la animación. Producto se mantiene en administración para gestionar
precio, stock y textos. Las rutas previas conservan compatibilidad.
