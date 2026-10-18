# Evidencias — Sprint 1 / S1-03

16 capturas reales de Chromium, originales del artefacto de CI y sin recomprimir.
Ejecución: 2026-10-15 (America/Lima), UTC 2026-10-16. Registro documental: 2026-10-16.
Código `411e47cc46dff14922c1affc74de02079b0b6b7d`.
[Run 38830960074](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38830960074),
artefacto `12016824246`. [manifest.json](manifest.json) registra procedencia, tamaños, dimensiones y SHA-256.
Los PNG se conservan en Git aunque expire el artefacto remoto a los 14 días.

| Pantalla / comprobación | Escritorio 1440×1000 | Móvil 390×844 |
| --- | --- | --- |
| Carrito, S/89,70 | [Imagen](ci-desktop-05-carrito-exacto.png) | [Imagen](ci-mobile-05-carrito-exacto.png) |
| Entrega, S/98,20 | [Imagen](ci-desktop-06-entrega-exacta.png) | [Imagen](ci-mobile-06-entrega-exacta.png) |
| Confirmación sin datos bancarios | [Imagen](ci-desktop-07-confirmacion-exacta.png) | [Imagen](ci-mobile-07-confirmacion-exacta.png) |
| Nuevo precio requiere revisión, S/98,80 | [Imagen](ci-desktop-08-resumen-actualizado.png) | [Imagen](ci-mobile-08-resumen-actualizado.png) |
| Reserva creada, instrucciones y plazo | [Imagen](ci-desktop-09-reserva-confirmada.png) | [Imagen](ci-mobile-09-reserva-confirmada.png) |
| Operación comunicada, pago en revisión | [Imagen](ci-desktop-10-operacion-en-revision.png) | [Imagen](ci-mobile-10-operacion-en-revision.png) |
| Reserva cancelada sin pago comunicado | [Imagen](ci-desktop-11-reserva-cancelada.png) | [Imagen](ci-mobile-11-reserva-cancelada.png) |
| Reserva vencida y unidades liberadas | [Imagen](ci-desktop-12-reserva-vencida.png) | [Imagen](ci-mobile-12-reserva-vencida.png) |

Las capturas largas mantienen la navegación fija y WhatsApp en la posición del viewport
inicial. El capturador carga imágenes diferidas y desactiva animación/content-visibility
solo al capturar; no modifica el CSS de la aplicación. Los pendientes visuales de móvil
y su alcance están registrados en [QA S1-03](../../../testing/s1-03-reserva.md).

Datos sintéticos: cliente QA, dirección ficticia, botella de prueba y cuenta
`QA-NO-TRANSFERIR`. No se realizaron abonos ni se accedió a la BD de Render.
La captura en revisión no confirma un pago real; stock y transacciones se comprobaron
mediante pruebas y aserciones sobre PostgreSQL 16 aislado, además del recorrido visual.
