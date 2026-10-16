# Operar pagos y conciliaciones manuales

Alcance: implementación S1-05, en rama de revisión. Aplicar después de integrar y migrar
en el entorno de prueba. No confirma dinero bancario automáticamente.

## Revisión diaria

1. Iniciar sesión con una cuenta ADMIN. Abrir **Admin → Pagos**.
2. Buscar la operación en la cuenta bancaria/Yape del negocio; comparar proveedor,
   código, monto íntegro y moneda PEN contra el pedido. Una captura del cliente no
   demuestra recepción. El sistema bloquea aprobación si los datos internos discrepan.
3. Si corresponde, marcar la confirmación y pulsar **Confirmar pago**. La reserva se
   conserva sin descontar botellas otra vez. Ver el resultado y trazabilidad del pedido.
4. Si no corresponde, indicar motivo y confirmar **Rechazar y liberar stock**.
   El pedido queda cancelado. Si después se localiza dinero, usar conciliación.
5. Si otro operador cambió el pedido, actualizar y revisar el estado antes de actuar.
   No repetir una devolución bancaria para solucionar un mensaje de conflicto.

Preparación → envío → entrega requieren una acción nueva desde el estado actual.
Un formulario antiguo no puede saltar un paso. Pagos comunicados mantienen su reserva
aunque pase el plazo original; deben ser revisados por la tienda.

## Cancelación y mantenimiento

El cliente cancela únicamente su reserva pendiente sin operación comunicada.
Ejecutar mantenimiento desde el panel o `npm run db:maintenance` para liberar reservas
pendientes vencidas. La apertura del pago también comprueba su vencimiento.
No hay programador automático añadido en este sprint. En preview gratuito conviene
revisarlo antes de atender pedidos. No cancelar automáticamente pagos en revisión.

## Reembolso antes del despacho

En el detalle de un pedido **Pagado / Preparando**, devolver primero el importe íntegro
al cliente fuera de la plataforma. Guardar el comprobante bancario por el procedimiento
del negocio. Registrar su referencia y confirmar **Registrar reembolso y reponer stock**.
La operación marca pedido/pago reembolsados y repone una vez. Para pedidos enviados o
entregados, revisar físicamente las botellas y resolver fuera de este flujo; no forzar estados.

## Ingreso tardío o discrepante

Si el cliente pagó después del cierre, no debe pagar de nuevo. Localizar el pedido
cancelado y verificar el ingreso en la cuenta del negocio. En **Conciliación manual**:

1. Registrar código original, importe realmente recibido con dos decimales (`100.00`),
   motivo y confirmación. Puede diferir del total del pedido.
2. El caso queda **Ingreso pendiente de devolución**. Revisar el importe antes de devolverlo.
3. Devolver íntegramente ese importe fuera de la plataforma. Registrar referencia y
   confirmar la devolución. El caso queda **Conciliación resuelta**.

El pedido sigue cancelado, el pago conserva su estado cancelado/rechazado y el stock
no cambia. Una referencia ya utilizada no se reasigna. Un caso abierto no se sobreescribe;
si se cometió un error, escalar para revisión, sin crear referencias ficticias.
Para volver a comprar se requiere un pedido nuevo con disponibilidad y precio actuales.
Este flujo contempla una operación/conciliación por pago; varios ingresos, devoluciones
parciales y disputas posteriores al despacho necesitan un procedimiento adicional.

## Evidencias y acceso

Eventos administrativos, comunicaciones, cancelaciones y vencimientos se registran
desde S1-05. El historial muestra actor disponible, motivo y fecha de Perú. No se inventan
eventos antiguos. Movimientos de inventario enlazan el pedido, producto, cantidad y saldo.
Retirar el rol ADMIN bloquea nuevas acciones aunque quede una sesión abierta.
Los datos de QA y sus códigos son ficticios; no transferir a `QA-NO-TRANSFERIR`.
