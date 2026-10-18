# Evidencias — Integración del Sprint 1

Dos capturas originales de Chromium, sin retoques ni recompresión. Fecha:
2026-10-17 (America/Lima). Candidato `db61726caa9cbedd94506745b38c3d4a39e98be0`,
[CI 39095704639](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39095704639),
artefacto `12124850316`. El árbol coincide con main `3620f98556a4a9eaf6d4060e5568e345d74a489f`.
[manifest.json](manifest.json) conserva origen, dimensiones, tamaño y SHA-256.

| Comprobación | Escritorio 1440 px | Móvil 390 px |
| --- | --- | --- |
| Pedido ajeno bloqueado tras retirar ADMIN | [Captura](ci-desktop-22-pedido-ajeno-tras-revocar-admin.png) | [Captura](ci-mobile-22-pedido-ajeno-tras-revocar-admin.png) |

El 404 genérico es el resultado esperado: no expone datos del pedido. Ambas imágenes
se inspeccionaron; la traducción y presentación de errores quedan para el pulido UX.
Las aserciones de Playwright mantienen el JWT antiguo con ADMIN, comprueban el rol
actual en BD y verifican también backup 403, rechazo de la acción de envíos sin
mutaciones y acceso del propietario. Los usuarios y pedidos son sintéticos en QA.

No se usaron cuentas bancarias, pagos reales ni BD de Render. Son evidencia visual
complementaria: las comprobaciones de autorización y estado dependen de tests/BD.
Se preservan 56 capturas en total, incluidas las 54 originales de las cinco historias.
[Revisión e integración](../../../testing/revision-integracion-sprint-01.md).
