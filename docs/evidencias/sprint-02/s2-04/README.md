# Evidencias — S2-04

2026-10-19 (America/Lima). Fuente `55f470e…`, [CI 39363492611](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39363492611).

Capturas originales de la aplicación compilada en GitHub Actions, PostgreSQL QA aislado
y Chromium de Playwright. Cuentas/direcciones/productos sintéticos; sin pagos reales ni
acceso a Render. Los PNG se conservan sin retoque ni recompresión.

Run, commit, artefacto, dimensiones, timestamps y hashes: [manifest.json](manifest.json).
[QA y límites](../../../testing/s2-04-union-carritos.md) · [Validación](validacion-ci.txt).
Las 118 capturas históricas de S1/S2-01/S2-02/S2-03 se mantienen en sus carpetas originales.

| Estado | Escritorio 1440 px | Móvil 390 px |
| --- | --- | --- |
| 2 invitado + 1 cuenta = 3; S/89.70 | [Ver](ci-desktop-40-union-confirmada.png) | [Ver](ci-mobile-40-union-confirmada.png) |
| Resumen posterior: S/98.20 con envío, todavía sin reserva | [Ver](ci-desktop-41-resumen-tras-union.png) | [Ver](ci-mobile-41-resumen-tras-union.png) |
| Respuesta perdida después del commit; pendiente conservado y reintento | [Ver](ci-desktop-42-union-respuesta-perdida.png) | [Ver](ci-mobile-42-union-respuesta-perdida.png) |
| Dos pestañas y adición posterior: 6 unidades, dos identidades distintas | [Ver](ci-desktop-43-union-con-nuevas-adiciones.png) | [Ver](ci-mobile-43-union-con-nuevas-adiciones.png) |
| Registro; destino interno comprobado por aserciones | [Ver](ci-desktop-44-registro-destino-conservado.png) | [Ver](ci-mobile-44-registro-destino-conservado.png) |
| Cuenta nueva con su selección: 2 unidades, S/59.80 | [Ver](ci-desktop-45-cuenta-creada-con-seleccion.png) | [Ver](ci-mobile-45-cuenta-creada-con-seleccion.png) |
| Ingreso SPA desde memoria: 5 unidades y aviso de persistencia | [Ver](ci-desktop-46-union-desde-memoria.png) | [Ver](ci-mobile-46-union-desde-memoria.png) |
| Otra cuenta: pendiente conservado sin reasignar | [Ver](ci-desktop-47-pendiente-otra-cuenta.png) | [Ver](ci-mobile-47-pendiente-otra-cuenta.png) |
| Recuperación con la cuenta original: 4 unidades, S/119.60 | [Ver](ci-desktop-48-pendiente-recuperado.png) | [Ver](ci-mobile-48-pendiente-recuperado.png) |
| Stock cambia a 4/precio 30.10: aviso, campo 4 y S/120.40 | [Ver](ci-desktop-49-union-ajuste-disponibilidad.png) | [Ver](ci-mobile-49-union-ajuste-disponibilidad.png) |
| Regresión de carrito autenticado sin JS: cantidad 2 | [Ver](ci-desktop-50-cuenta-carrito-sin-javascript.png) | [Ver](ci-mobile-50-cuenta-carrito-sin-javascript.png) |
| Regresión de reserva nativa sin JS: instrucciones privadas | [Ver](ci-desktop-51-reserva-sin-javascript.png) | [Ver](ci-mobile-51-reserva-sin-javascript.png) |

| Tamaño adicional | Unión | Respuesta perdida | Otra cuenta | Ajuste de stock |
| --- | --- | --- | --- | --- |
| 320 px | [Ver](ci-small-mobile-40-union-confirmada.png) | [Ver](ci-small-mobile-42-union-respuesta-perdida.png) | [Ver](ci-small-mobile-47-pendiente-otra-cuenta.png) | [Ver](ci-small-mobile-49-union-ajuste-disponibilidad.png) |
| 768 px | [Ver](ci-tablet-40-union-confirmada.png) | [Ver](ci-tablet-42-union-respuesta-perdida.png) | [Ver](ci-tablet-47-pendiente-otra-cuenta.png) | [Ver](ci-tablet-49-union-ajuste-disponibilidad.png) |

Se conservan 32 capturas representativas. Los tamaños son viewports; los PNG full-page
pueden ser más altos. Las capturas adicionales del mismo run quedan en el artefacto de CI
hasta su vencimiento. Las imágenes 50/51 provienen de las regresiones anteriores ejecutadas
sobre **el código actual**, no de un artefacto histórico. Sus nombres originales y hashes
quedan vinculados en el manifiesto.

La imagen 51 corresponde a una reserva deliberada sobre stock sintético del test nativo
S1-04. La unión de S2-04 no reserva stock ni genera pedidos/pagos; sus pruebas lo comprueban
en BD. La diferencia entre reserva y pago comunicado/confirmado se conserva.

Las imágenes complementan pruebas de transacción, permisos, foco, destino y cantidades.
Los casos nuevos S2-04 usan movimiento reducido; esta entrega no incorpora animaciones.
No sustituyen las aserciones de idempotencia ni constituyen certificación completa de
accesibilidad. Lector de pantalla, contraste medido, zoom y Safari/Firefox no se ejecutaron.
