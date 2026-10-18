# Evidencias — Sprint 2 / S2-01

Baseline del main `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`, previo a cambios de UX.
16 capturas originales conservadas desde
[CI 39096709609](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39096709609),
artefacto `12125430611`. Generadas 2026-10-17 en America/Lima; revisadas 2026-10-18.
No son nuevas capturas de una interfaz modificada. Sin retoques ni recompresión.
[manifest.json](manifest.json) registra fechas, fuente, commit, dimensiones, bytes y SHA-256.

| Estado | Escritorio 1440×1000 | Móvil 390×844 |
| --- | --- | --- |
| Ficha de producto QA | [Imagen](base-desktop-03-producto-qa.png) | [Imagen](base-mobile-03-producto-qa.png) |
| Ingreso | [Imagen](base-desktop-04-acceso.png) | [Imagen](base-mobile-04-acceso.png) |
| Carrito, S/89.70 | [Imagen](base-desktop-05-carrito-exacto.png) | [Imagen](base-mobile-05-carrito-exacto.png) |
| Entrega, total S/98.20 | [Imagen](base-desktop-06-entrega-exacta.png) | [Imagen](base-mobile-06-entrega-exacta.png) |
| Confirmación antes de reservar | [Imagen](base-desktop-07-confirmacion-exacta.png) | [Imagen](base-mobile-07-confirmacion-exacta.png) |
| Precio cambió, nuevo total S/98.80 | [Imagen](base-desktop-08-resumen-actualizado.png) | [Imagen](base-mobile-08-resumen-actualizado.png) |
| Reserva confirmada, instrucciones privadas | [Imagen](base-desktop-09-reserva-confirmada.png) | [Imagen](base-mobile-09-reserva-confirmada.png) |
| Operación comunicada, pago en revisión | [Imagen](base-desktop-10-operacion-en-revision.png) | [Imagen](base-mobile-10-operacion-en-revision.png) |

Los tamaños de cabecera son viewports; las capturas son full-page y pueden ser más altas.
La captura carga imágenes diferidas y desactiva animaciones al capturar. Las posiciones
de elementos fijos corresponden al estado capturado y requieren verificación con scroll
para evaluar operabilidad real. El precio de la fixture cambia deliberadamente durante
el test: no comparar S/98.20 y S/98.80 como si fueran estados del mismo precio sin cambios.

Se inspeccionaron las 16 imágenes. Hallazgos y recorrido propuesto en
[diagnóstico UX](../../../ux/sprint-02-recorrido-compra.md); métodos y límites en
[QA S2-01](../../../testing/s2-01-recorrido.md). Producto/cliente/dirección/operación y
datos bancarios son de QA. No hubo pagos ni uso de la BD de Render.
Las 56 capturas históricas del Sprint 1 permanecen sin cambios; estas 16 forman la
referencia separada del Sprint 2 y no son evidencia de funciones futuras.
