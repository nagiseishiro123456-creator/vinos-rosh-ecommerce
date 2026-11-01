# Indicaciones editables por zona

2026-10-31. Solicitud del propietario: condiciones comerciales aún no acordadas;
dejarlas editables para que ROSH las gestione. Base main 78f4c5b.

`ShippingZone.deliveryInstructions` es información pública opcional, 600 caracteres,
texto plano con líneas normalizadas y sin controles invisibles. Vacío se guarda como NULL.
Si un llamador anterior omite el campo, editar el precio conserva la información actual.
La UI envía el campo explícito y permite borrarlo. Mismos permisos, bloqueo administrativo,
versión esperada y preservación de pausa que la tarifa. No se añaden APIs de escritura.

La consulta pública solo expone la información de zonas activas sin ambigüedad. La misma
información llega a dirección, resumen y confirmación. React la presenta como texto escapado;
no se interpreta HTML, URLs, horarios ni instrucciones ejecutables.

La firma del resumen incluye el texto cuando existe. Ausencia/NULL mantiene el formato
y firma v1 anterior; cambiar o eliminar información exige revisar nuevamente antes de
reservar. No se permite una condición nueva con una cotización vieja.

El núcleo de reserva manual/automática guarda `Order.shippingDeliveryInstructions` desde
el snapshot autorizado de BD en la misma transacción que stock y pedido. Nunca toma
esta condición del formulario del comprador. Replay de la reserva devuelve el pedido
original, conservando texto, importes y stock. Comprador y ADMIN consultan ese snapshot.
No amplía datos expuestos a otras cuentas ni altera outbox/correos ya preparados.

Migración aditiva 17: dos VARCHAR(600) opcionales, sin defaults, backfill ni modificación
de pedidos o tarifas anteriores. Respaldo JSON de negocio incluye las columnas opcionales;
dump/restore nativo las conserva. Contrato SQL sobre legado y restauración de conciliación
incluyen información histórica distinta de la zona vigente.

Preparación local desde la base anterior: `npm run db:prepare:shipping`. Solo permite
localhost y las BD nombradas de desarrollo/QA; rechaza otras migraciones pendientes.
No hace reset, seed ni cambia activación, precio, pago o correo.

No es un calendario, selección de franja, promesa automática de fecha, regla de calle,
hora de corte ni geocodificación. Esas funciones requieren condiciones concretas de ROSH
y refinamiento adicional. No se precarga ningún horario ni plazo comercial.
