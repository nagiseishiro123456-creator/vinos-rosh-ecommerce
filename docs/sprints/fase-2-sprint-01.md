# Fase 2 — Sprint 1

## Sprint Goal
Crear pedidos con importes exactos, reserva anterior al pago y protección contra duplicados.
Estado: iniciado, S1-01 a S1-03 implementadas y verificadas en ramas; integración pendiente. Base: `b4831eab1eaf7c3486b4bf8643001edefb5decc2`.
Los 26 SP son una estimación preliminar; no constituyen fecha de entrega.

## Historias y aceptación

### S1-01 — Base reproducible (3 SP)
- Instalación limpia con lockfile y versiones registradas.
- Migraciones versionadas sobre PostgreSQL 16 vacío; seed inicial.
- Resultados de tests, tipos, lint, build y auditoría registrados.
- Evidencia visual de escritorio/móvil identificada como fixture de QA.
- Documentar límites del entorno y fallos preexistentes; CI verificable.

### S1-02 — Dinero exacto (5 SP)
- Política monetaria registrada antes de implementar.
- Precios y envío determinados en servidor; no aceptar totales del navegador.
- Exactitud de cálculos/redondeo y snapshot del importe confirmado.
- Si el precio cambia antes de confirmar, presentar el nuevo total para aceptación.
- Ejemplo de aceptación: 3 × S/29,90 + S/8,50 = S/98,20.

### S1-03 — Reserva previa (8 SP)
- Pedido, artículos y reserva en una misma transacción.
- Rollback completo si falta un producto; una sola reserva de la última unidad.
- Vencimiento explícito persistido; instrucciones después de reservar.
- Pagar no descuenta otra vez; cancelar/vencer devuelve una sola vez.
- Conservar modificaciones del carrito posteriores a la confirmación.

### S1-04 — Idempotencia (5 SP)
- Clave ligada al usuario y operación con unicidad en BD.
- Doble clic/reintento recupera una orden, sin nueva reserva.
- Clave repetida con otro contenido: conflicto controlado.
- No depender del botón deshabilitado; impedir acceso cruzado entre clientes.

### S1-05 — Revisión y concurrencia (5 SP)
- Dueño del pedido y administrador autorizados por operación.
- Operaciones de pago no duplican confirmaciones.
- Aprobación/cancelación/mantenimiento concurrentes mantienen consistencia.
- Movimientos de inventario con motivo y referencia al pedido.
- Pruebas de BD y recorrido completo, registrando incidencias.

## Reglas propuestas para implementar en S1-03/S1-05
`PENDING_PAYMENT`: reserva con fecha límite, todavía sin operación comunicada.
`PAYMENT_REVIEW`: operación comunicada, requiere revisión; no cancelar solo por
vencimiento del plazo inicial. `PAID`: pago verificado, sin nuevo descuento.
La reserva sin operación comunicada puede vencer/cancelarse y liberarse una sola vez.
Pagos tardíos, discrepancias y cancelación tras comunicar pago requieren conciliación.
El valor inicial de 120 minutos puede mantenerse configurable para reservas sin pago informado;
cambiar la configuración no debe alterar retroactivamente el vencimiento de una orden.
S1-03 implementa y verifica estas reglas; S1-01/S1-02 se conservan como registros históricos.

## Orden de trabajo y documentación
1. Baseline y entorno → resultados iniciales y guía de arranque.
2. Decisiones de dinero/estados/reintentos → ADR antes de tocar lógica.
3. Cálculo y creación protegida → PR y pruebas con documentación en el mismo cambio.
4. Reserva e instrucciones → modelo/migración y flujo actualizados.
5. Revisión y mantenimiento → reglas operativas y pruebas de conflicto.
6. QA y revisión del incremento → evidencia, incidencias y pendientes heredados.

## Definition of Done
Historias comprometidas aceptadas, pruebas pertinentes/tipos/lint/build aprobados,
migraciones verificadas, permisos y entradas validados en servidor, sin defectos críticos
en el alcance entregado, documentación coherente y commit/PR identificados.
Los checks de S1-01 no demuestran el cierre de las otras cuatro historias ni habilitan producción.

## Registro de entregas
- S1-01: preparación reproducible verificada y 10 capturas conservadas; ver [QA](../testing/sprint-01.md).
- S1-02: implementada y verificada, PR #4 dependiente de #3; 28 pruebas y 4 casos de navegador aprobados, 10 capturas nuevas; ver [QA de dinero](../testing/s1-02-dinero.md).
- S1-03: implementada y verificada en PR #5 (depende de #4); 40 pruebas, 6 casos de navegador, 8 migraciones y 16 capturas. [ADR](../decisions/0003-reserva-previa.md) y [QA](../testing/s1-03-reserva.md).
- S1-04/S1-05: pendientes; el ajuste básico que excluye pagos en revisión del vencimiento se adelanta a S1-03 por coherencia del flujo.
