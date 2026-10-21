# Evidencias — S2-02

Fecha: 2026-10-19 (America/Lima). Capturas locales originales, sin retoques ni recompresión.
La fuente exacta y las versiones están en [manifest.json](manifest.json); métodos y límites
en [QA S2-02](../../../testing/s2-02-ux-movil.md). Las 16 imágenes anteriores siguen en
[S2-01](../s2-01/README.md). No se sobrescriben evidencias históricas.

Las imágenes posteriores estándar tienen el banner opcional de analítica habilitado
con un ID **ficticio de QA**, sin aceptar trackers. La base anterior no lo tenía habilitado.
Los tamaños son viewports; el PNG full-page puede ser más alto. Diferencias de fuentes,
browser y configuración no son una medición de conversión ni de píxeles exactos.

| Estado | Antes escritorio | Después escritorio | Antes móvil | Después móvil |
| --- | --- | --- | --- | --- |
| Producto | [Ver](../s2-01/base-desktop-03-producto-qa.png) | [Ver](local-desktop-03-producto-qa.png) | [Ver](../s2-01/base-mobile-03-producto-qa.png) | [Ver](local-mobile-03-producto-qa.png) |
| Acceso | [Ver](../s2-01/base-desktop-04-acceso.png) | [Ver](local-desktop-04-acceso.png) | [Ver](../s2-01/base-mobile-04-acceso.png) | [Ver](local-mobile-04-acceso.png) |
| Carrito | [Ver](../s2-01/base-desktop-05-carrito-exacto.png) | [Ver](local-desktop-05-carrito-exacto.png) | [Ver](../s2-01/base-mobile-05-carrito-exacto.png) | [Ver](local-mobile-05-carrito-exacto.png) |
| Entrega | [Ver](../s2-01/base-desktop-06-entrega-exacta.png) | [Ver](local-desktop-06-entrega-exacta.png) | [Ver](../s2-01/base-mobile-06-entrega-exacta.png) | [Ver](local-mobile-06-entrega-exacta.png) |
| Confirmación | [Ver](../s2-01/base-desktop-07-confirmacion-exacta.png) | [Ver](local-desktop-07-confirmacion-exacta.png) | [Ver](../s2-01/base-mobile-07-confirmacion-exacta.png) | [Ver](local-mobile-07-confirmacion-exacta.png) |
| Resumen cambiado | [Ver](../s2-01/base-desktop-08-resumen-actualizado.png) | [Ver](local-desktop-08-resumen-actualizado.png) | [Ver](../s2-01/base-mobile-08-resumen-actualizado.png) | [Ver](local-mobile-08-resumen-actualizado.png) |
| Instrucciones | [Ver](../s2-01/base-desktop-09-reserva-confirmada.png) | [Ver](local-desktop-09-reserva-confirmada.png) | [Ver](../s2-01/base-mobile-09-reserva-confirmada.png) | [Ver](local-mobile-09-reserva-confirmada.png) |
| Pago en revisión | [Ver](../s2-01/base-desktop-10-operacion-en-revision.png) | [Ver](local-desktop-10-operacion-en-revision.png) | [Ver](../s2-01/base-mobile-10-operacion-en-revision.png) | [Ver](local-mobile-10-operacion-en-revision.png) |

| Comprobación adicional | Captura |
| --- | --- |
| Banner y header de Home, 1440 px (recorte real) | [Ver](local-desktop-21-inicio-consentimiento.png) |
| Banner y header de catálogo, 390 px (recorte real) | [Ver](local-mobile-22-catalogo-consentimiento.png) |
| Dirección con teclado y foco visible, 1440 px | [Ver](local-desktop-24-direccion-teclado.png) |
| Confirmación enfocada con consentimiento sin responder, 390 px | [Ver](local-mobile-28-consentimiento-sin-superposicion.png) |
| Confirmación con resumen anterior al formulario, 320 px | [Ver](local-small-mobile-26-confirmacion-responsive.png) |
| Nombres e importes largos, 320 px | [Ver](local-small-mobile-27-importes-y-nombre-largo.png) |
| Confirmación, 768 px | [Ver](local-tablet-26-confirmacion-responsive.png) |
| Nombres e importes largos, 768 px | [Ver](local-tablet-27-importes-y-nombre-largo.png) |

Los dos recortes de banner/header excluyen el contenido con imágenes externas que no resolvía por DNS en este entorno; no se presentan como evaluación visual completa de Home/catálogo. [Regresión local de consentimiento](regresion-consentimiento.txt).

La evidencia visual complementa las aserciones de DOM, geometría, teclado y hit testing;
no demuestra por sí sola accesibilidad completa ni concurrencia transaccional.
[Resumen de validación local](validacion-local.txt). CI oficial posteriormente aprobada: [registro](validacion-ci.txt), 67/67 servidor y 20/20 navegador.
Checks consultables en el [PR #10](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/10).
