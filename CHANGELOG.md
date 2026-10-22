# Changelog

## Fase 2 — Sprint 3 / S3-01 (refinamiento documental, 2026-10-21)

- Guía de acceso al carrito y distinción entre integración en GitHub y despliegue.
- Investigación de Yape/Izipay, tres comercios y alternativas, con fuentes y límites de vigencia.
- Inventario de lo financiero existente y pendiente; plan preliminar de seis historias y ADR 0009 propuesto.
- Proveedor/producto por elegir; sin integración automática, nuevas migraciones, dependencias o cambios de UI.

## Fase 2 — Sprint 2 (cierre técnico integrado, 2026-10-21)

- Historias S2-01–S2-06 revisadas e integradas en main mediante PR #9–#14.
- Compra móvil: resumen antes de reservar, importes legibles, radios y foco, controles en flujo.
- Selección invitada y unión idempotente; panel accesible con estado compartido, comandos transaccionales y movimiento reducido en vivo.
- Dos migraciones aditivas del sprint (12 acumuladas): CartImport y CartMutation/revisión.
- Cierre: 117/117 pruebas de servidor, 66/66 de navegador, cinco contratos SQL y recuperación PostgreSQL aprobados en main.
- Seis capturas nuevas conservadas con procedencia/hashes, 192 en total; [QA](docs/testing/revision-integracion-sprint-02.md) y [continuidad](docs/sprints/cierre-sprint-02.md).
- Sin lanzamiento comercial; siguiente paso: refinar Sprint 3 antes de implementar.

## Fase 2 — Sprint 1 / S1-04 (implementado y verificado en rama, 2026-10-16)
- Identidad de checkout estable y huella completa de la solicitud; unicidad por usuario/operación en BD.
- Reintento recupera la orden antes de consultar carrito/configuración; conflicto no crea ni sobrescribe.
- Migración 9 aditiva con campos históricos NULL y restricciones de identidad.
- Formulario conserva datos ante respuesta perdida; envío nativo y avisos de recuperación/conflicto.
- Pruebas de concurrencia, fallo tras decremento, usuario ajeno y respuesta perdida después del commit.
- Verificación: 53 pruebas, 10 casos de navegador, 9 migraciones y dos contratos SQL aprobados; 8 capturas nuevas conservadas.

## Fase 2 — Sprint 1 / S1-03 (implementado y verificado en rama, cierre documental 2026-10-16)
- Confirmación/reserva antes de instrucciones; pago pendiente y plazo persistido por pedido.
- Ruta privada para pagar sobre el snapshot de la orden, con comunicación de operación separada.
- Comunicar/aprobar no reserva otra vez ni elimina cambios posteriores del carrito.
- Cancelar/vencer reservas pendientes libera una sola vez; revisión requiere conciliación.
- Migración aditiva de marcadores y reportedAt, con contrato SQL sobre datos antiguos.
- Pruebas de concurrencia/propiedad/límites y recorridos autenticados desktop/móvil.
- Verificación: 40 pruebas, 6 casos de navegador, 8 migraciones y contrato de datos antiguos aprobados; 16 capturas conservadas.

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
