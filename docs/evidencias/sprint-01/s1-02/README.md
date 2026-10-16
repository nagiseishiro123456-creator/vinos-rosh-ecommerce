# Evidencias — Sprint 1 / S1-02

Capturas reales de Chromium en CI, sin retoques ni recomprimir. Fecha: 2026-10-15
(America/Lima), ejecución UTC 2026-10-16. Código `b72f85c061db70a4fefef6fd172bc26527c3aa4b`.
[Run 38827763285](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38827763285),
artefacto `12015109857`. El ZIP remoto expira; estos diez PNG se conservan en Git.
[manifest.json](manifest.json) registra el origen, tamaño, dimensiones y SHA-256.

| Pantalla / resultado | Escritorio 1440×1000 | Móvil 390×844 |
| --- | --- | --- |
| Carrito: 3 × S/29,90 = S/89,70 | [Imagen](ci-desktop-05-carrito-exacto.png) | [Imagen](ci-mobile-05-carrito-exacto.png) |
| Entrega: + S/8,50 = S/98,20 | [Imagen](ci-desktop-06-entrega-exacta.png) | [Imagen](ci-mobile-06-entrega-exacta.png) |
| Pago: mismo total S/98,20 | [Imagen](ci-desktop-07-pago-exacto.png) | [Imagen](ci-mobile-07-pago-exacto.png) |
| Cambio de precio: aviso y nuevo total S/98,80 | [Imagen](ci-desktop-08-resumen-actualizado.png) | [Imagen](ci-mobile-08-resumen-actualizado.png) |
| Pedido recibido en revisión: S/98,80 | [Imagen](ci-desktop-09-pedido-verificado.png) | [Imagen](ci-mobile-09-pedido-verificado.png) |

Son imágenes largas; los controles fijos aparecen en la posición del viewport inicial.
El capturador carga imágenes diferidas y desactiva animaciones y `content-visibility`
solo al tomar la captura. No cambia el CSS de la aplicación.

Cliente, dirección, botella y operación son ficticios. La cuenta `QA-NO-TRANSFERIR`
no permite transferencias. Se comprobó el pedido en una BD PostgreSQL 16 aislada;
no se comprobó un abono ni se accedió a Render. La revisión visual y los pendientes
para los siguientes sprints están en [QA S1-02](../../../testing/s1-02-dinero.md).
