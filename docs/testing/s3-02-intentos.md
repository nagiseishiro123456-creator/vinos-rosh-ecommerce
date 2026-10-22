# S3-02 — QA de persistencia de intentos

Fecha: 2026-10-22 (America/Lima).
Base: PR #17, commit `b71b2da23ec760cdc29d947919bdf5b845db66b9`.
Es preparación aislada: ninguna prueba demuestra un pago real o un sandbox externo aprobado.

## Pruebas incluidas

Nueve casos de integración PostgreSQL en `tests/izipay-attempt.integration.test.ts`:

| Grupo | Qué verifica |
| --- | --- |
| Snapshot y efectos | Total congelado de la orden, referencia única, modo TEST; ni pago aprobado, otro descuento de stock ni borrado del carrito posterior. |
| Propiedad y guardas | Configuración desactivada/producción, usuario ajeno, orden inexistente, vencida, liberada, pagada o en revisión no crean intentos. |
| Compatibilidad | Un pago manual existente se conserva y bloquea la preparación automática. |
| Concurrencia | Tres inicios tienen un solo creador y recuperan la misma identidad. |
| Respuesta perdida | El intento persistido se recupera incluso después de cancelar; no autoriza otro envío ni revive la reserva. |
| Finalización | Se guarda hash, no token; repetición no sobrescribe ni aprueba pago. |
| Incertidumbre | Tokens inválidos no cambian estado; incertidumbre bloquea reinicio/finalización tardía. |
| Carrera | Finalización y resultado incierto disputan una transición condicionada; solo una gana. |

La fixture usa BD aislada `vinos_rosh_ci`/`vinos_rosh_test`. Parte de la reserva real
existente y elimina su pago únicamente dentro de QA para modelar la forma de una futura
orden automática. El servicio de producción rechaza convertir esa orden manual.
Las credenciales son ficticias y el servicio no llama al adaptador ni a Izipay.

El sexto contrato SQL ejecuta la migración en un esquema temporal con datos anteriores.
Comprueba conservación de pedidos/pagos/stock/carrito, tabla nueva vacía, unicidad de
orden/referencia, relación y restricciones de importe, moneda, modo y estado. Termina
en ROLLBACK, sin modificar datos de la aplicación. CI aplica 13 migraciones a su BD vacía.

El contrato heredado de dump/restore del carrito conserva sus aserciones y se actualiza
al total de 13 migraciones. No se atribuye todavía una prueba de restauración de un
intento activo a ese contrato; se necesita antes de la recuperación operativa completa.

## Resultados y trazabilidad

Los comandos/checks y el SHA de cabecera se registran en el PR de entrega, después de
su ejecución. El baseline es 132 casos de servidor más los nueve nuevos (141 esperados)
y 66 de navegador; una cifra esperada no se presenta como aprobada antes de leer CI.
Tipos, lint, validación del esquema, diff y enlaces se comprueban localmente.

La primera ejecución del PR #17, run `39794561379`, aprobó 132/132 servidor,
migraciones, restauración, tipos/lint/build y auditoría de producción; terminó cancelada
durante navegador tras una instalación de dependencias Ubuntu de más de 16 minutos.
Se solicitó reintentar los jobs fallidos/cancelados sobre la misma cabecera. Ese incidente
no se cuenta como regresión completa aprobada. El resultado del reintento queda en su PR.

No cambió la UI. Se conservan las 192 capturas históricas y no se fabrican imágenes
de una pasarela o de un despliegue que no se ejecutaron. La regresión de navegador
de CI genera sus propios artefactos con datos sintéticos.

Pendientes: producto y credenciales de test, creación de orden automática, endpoint/SDK,
IPN y recuperación de intentos inciertos/tokens perdidos. [Contrato y límites](../integraciones/intentos-izipay.md).
