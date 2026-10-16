# Evidencias — Sprint 1 / S1-04

Ocho capturas reales de Chromium, originales de CI, sin retoques ni recompresión.
Fecha: 2026-10-16 (America/Lima). Código `184feaba3d17da1741b7ef16caf8839a5375a428`.
[Run 38927156735](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38927156735),
artefacto `12057810664`. [manifest.json](manifest.json) registra origen, dimensiones, tamaño y SHA-256.
Se conservan aquí aunque expire el ZIP remoto después de 14 días.

| Pantalla / comprobación | Escritorio 1440×1000 | Móvil 390×844 |
| --- | --- | --- |
| Respuesta descartada tras commit; notas conservadas | [Imagen](ci-desktop-13-respuesta-perdida.png) | [Imagen](ci-mobile-13-respuesta-perdida.png) |
| Mismo pedido recuperado desde dos pestañas | [Imagen](ci-desktop-14-mismo-pedido-recuperado.png) | [Imagen](ci-mobile-14-mismo-pedido-recuperado.png) |
| Clave reutilizada con datos distintos: conflicto propio | [Imagen](ci-desktop-15-conflicto-controlado.png) | [Imagen](ci-mobile-15-conflicto-controlado.png) |
| Envío nativo sin JavaScript, con sesión existente | [Imagen](ci-desktop-16-reserva-sin-javascript.png) | [Imagen](ci-mobile-16-reserva-sin-javascript.png) |

El primer caso ejecuta la acción real y verifica el commit en PostgreSQL antes de abortar
su respuesta al navegador. El siguiente reenvío recupera el pedido; la captura es evidencia
visual, complementada por aserciones de una orden/pago/reserva y conservación de stock/plazo/carrito.
El caso nativo usa Boleta y transferencia ficticia; no demuestra login o Factura sin JavaScript.

Cliente, notas, dirección, operación y cuenta `QA-NO-TRANSFERIR` son sintéticos.
No hubo abonos ni acceso a Render. La navegación fija/WhatsApp conserva su posición de
viewport inicial en la captura larga. El capturador carga imágenes diferidas y desactiva
animación/content-visibility solo al capturar. [Resultados y límites](../../../testing/s1-04-idempotencia.md).
