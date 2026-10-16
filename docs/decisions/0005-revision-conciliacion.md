# ADR 0005 — Revisión administrativa y conciliación

Fecha: 2026-10-16. Historia S1-05, 5 SP. Base: PR #6.
Decisión registrada antes de implementar.

## Invariantes y permisos

Las acciones requieren sesión ADMIN y los servicios verifican de nuevo el rol vigente
en BD dentro de su transacción. El cliente solo comunica/cancela su propia reserva.
Se reclama primero el pedido mediante estado y marcadores; después pago e inventario.
Un conflicto devuelve un resultado visible y no produce efectos parciales.

| Origen | Acción | Resultado | Inventario |
| --- | --- | --- | --- |
| PAYMENT_REVIEW + UNDER_REVIEW | Aprobar operación verificada, PEN e importe exacto | PAID + PAID | Sin cambios |
| PAYMENT_REVIEW + UNDER_REVIEW | Rechazar con motivo | CANCELLED + REJECTED | Liberar una sola vez |
| PAID / PREPARING + un pago manual PAID íntegro | Registrar devolución externa ya realizada | REFUNDED + REFUNDED | Liberar una sola vez |
| PAID / PREPARING / SHIPPED | Avanzar desde el estado firmado por el formulario | Siguiente estado permitido | Sin cambios |
| PENDING_PAYMENT sin pago comunicado | Cancelar / vencer | CANCELLED + CANCELLED | Liberar una sola vez |
| CANCELLED + pago manual CANCELLED / REJECTED | Registrar ingreso tardío/discrepante verificado | Conciliación abierta | Sin cambios |
| Conciliación abierta | Registrar devolución externa íntegra de lo recibido | Conciliación resuelta | Sin cambios |

Un formulario antiguo de preparación no puede avanzar un pedido ya preparado a enviado.
La aprobación exige una sola obligación de pago, referencia comunicada y reserva vigente
(no liberada); la fecha inicial puede haber transcurrido si el pago estaba en revisión.
Los reintentos no generan un segundo evento ni movimiento.

## Dinero recibido después del cierre

No reabrimos pedidos cancelados ni consumimos stock vendido a otro comprador.
El cliente contacta a la tienda. El administrador verifica el ingreso en su cuenta y abre
una conciliación desde el pedido cancelado: operación, importe realmente recibido en PEN
(puede diferir del total), motivo y confirmación. La operación conserva la unicidad
existente por proveedor en Payment; no puede reasignarse ni sustituirse una referencia.
Una conciliación por pago, con importe inmutable y cierre mediante referencia de devolución.
Se devuelve íntegramente ese importe fuera de la plataforma y luego se registra la devolución.
No ejecutamos transferencias, devoluciones bancarias ni facturación electrónica.
Si el cliente desea comprar, crea otro pedido sujeto a stock/precios actuales.
Otros casos (pago parcial en revisión, múltiples ingresos, devolución de botellas despachadas)
necesitan revisión humana; nunca se aprueban automáticamente ni se repone inventario a ciegas.

## Trazabilidad y migración

OrderEvent registra acción, actor, motivo y fecha en la misma transacción. Payment conserva
sus referencias y revisores; InventoryMovement conserva cantidad y saldo por producto.
PaymentReconciliation separa dinero recibido del cumplimiento del pedido cancelado.
Migración aditiva: crea tablas/índices/constraints sin inventar eventos históricos ni
alterar estados, importes o reservas antiguas. UI administrativa muestra resultados,
eventos y fechas de Perú. El registro se añade desde esta entrega, no es una reconstrucción.

## Dependencias

Auditoría completa: cinco hallazgos altos derivados de una única causa en braces <=3.0.3,
dependencia de desarrollo de eslint-config-next. El registro npm consultado ofrece 3.0.3
como última versión; no hay parche compatible publicado. npm propone bajar el config a
Next 14, incompatible con la base Next 16. No se aplica ese downgrade ni un override sin
parche. Producción: cero hallazgos. Se conserva el seguimiento en QA y cierre; no autoriza
producción. CI continúa bloqueando hallazgos altos en dependencias de producción.

## Verificación prevista

PostgreSQL 16: aprobar/rechazar simultáneos; doble reembolso y rechazo; conflicto con
preparación; mantenimiento/cancelación frente a revisión; rol retirado; discrepancias
de monto/moneda/reserva; referencia reutilizada y conciliación simultánea. Navegador:
cliente no accede a administración, revisión con confirmación/motivo, devolución y
conciliación con evidencias de escritorio y móvil. Documentar resultados después de CI.
