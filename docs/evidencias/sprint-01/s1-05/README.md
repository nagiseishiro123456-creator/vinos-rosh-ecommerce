# Evidencias — Sprint 1 / S1-05

Diez capturas reales de Chromium, originales de CI, sin retoques ni recompresión.
Fecha: 2026-10-16 (America/Lima). Código `2e90b606436d55d6e4f59cb8634a347a15e8b8d6`.
[Run 38970804257](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38970804257),
artefacto `12077335953`. [manifest.json](manifest.json) registra origen, dimensiones,
tamaño y SHA-256. Se conservan en Git aunque expire el ZIP remoto a los 14 días.

| Pantalla / comprobación | Escritorio 1440×1000 | Móvil 390×844 |
| --- | --- | --- |
| Revisión: motivos y confirmación bancaria | [Imagen](ci-desktop-17-revision-administrativa.png) | [Imagen](ci-mobile-17-revision-administrativa.png) |
| Pago aprobado e historial de actor/motivo/fecha | [Imagen](ci-desktop-18-pago-aprobado-trazabilidad.png) | [Imagen](ci-mobile-18-pago-aprobado-trazabilidad.png) |
| Devolución externa registrada y stock repuesto una vez | [Imagen](ci-desktop-19-reembolso-administrativo.png) | [Imagen](ci-mobile-19-reembolso-administrativo.png) |
| Conciliación abierta: S/100.00 recibidos en pedido cancelado | [Imagen](ci-desktop-20-conciliacion-abierta.png) | [Imagen](ci-mobile-20-conciliacion-abierta.png) |
| Conciliación resuelta, sin reactivar pedido/inventario | [Imagen](ci-desktop-21-conciliacion-resuelta.png) | [Imagen](ci-mobile-21-conciliacion-resuelta.png) |

La captura móvil 17 se regeneró tras corregir el estiramiento de los formularios.
Playwright comprueba además que el botón de aprobación mide menos de 96px de alto.
La autorización se prueba con páginas privadas y una Server Action administrativa real
reintentada desde una sesión de cliente; la BD debe permanecer sin aprobación.
Las pruebas de stock y atomicidad inspeccionan PostgreSQL: las capturas solas no las demuestran.

Cliente, dirección, códigos, cuenta y devoluciones son sintéticos. No hubo abonos reales
ni uso de Render. El capturador carga imágenes diferidas y desactiva animaciones solo al
capturar. Se revisaron legibilidad, disposición y estados en las diez imágenes.
Traducciones administrativas heredadas y pulido general de UX quedan para Sprint 2.
[Resultados y límites](../../../testing/s1-05-revision.md).
