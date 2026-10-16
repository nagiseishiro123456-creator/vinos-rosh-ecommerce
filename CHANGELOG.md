# Changelog

## Fase 2 — Sprint 1 / S1-02 (implementado y verificado en rama, 2026-10-15)
- Cálculos en Prisma.Decimal y representación monetaria canónica, sin punto flotante.
- Confirmación HMAC del resumen y transacción Serializable para leer y guardar importes coherentes.
- Revisión explícita si cambia carrito/dirección/precios/envío; totales del cliente ignorados.
- Entrada administrativa con hasta dos decimales; envío cero permitido.
- Pruebas unitarias, de BD y recorrido de navegador autenticado con pagos ficticios.
- Sin cambio de esquema ni activación de pasarelas. Depende de S1-01 (PR #3).
- Validación: 28 pruebas y 4 casos de navegador aprobados; 10 capturas nuevas y ADR/QA actualizados.

## Fase 2 — Sprint 1 / S1-01 (implementado y verificado en rama, 2026-10-15)
- Dependencias fijadas por lockfile y toolchain Node/npm registrado.
- Instalación con npm ci en CI, preview, Docker y preparación Windows.
- Preparación standalone con assets públicos; copia de public en Docker.
- Smoke de lectura/health y capturas desktop/móvil con fixture sintética aislada.
- Índice, backlog, plan de sprint, ADR, guía reproducible y registro de QA/avance.
- Validación: 7 migraciones, 15 tests y 2 smoke aprobados en PostgreSQL 16 de CI.
- Evidencia: 8 PNG originales de CI y 2 capturas locales del acceso, con índice y manifiesto.
- Sin cambios al modelo de negocio, pagos, stock ni migraciones en esta historia.

## Base anterior
Commit `b4831eab1eaf7c3486b4bf8643001edefb5decc2` (2026-10-07): controles para
cerrar sesión en storefront, cuenta y administración. Es el punto verificable de partida;
no se reconstruyen aquí fechas ni sprints históricos sin evidencia.
