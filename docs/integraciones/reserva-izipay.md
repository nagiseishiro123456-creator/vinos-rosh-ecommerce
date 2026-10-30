# S3-02 — Reserva automática interna de Mi Cuenta Web TEST

Actualización 2026-10-23: ya existe una [entrada de reserva autenticada](reserva-izipay-http.md)
con opt-in independiente/desactivado. La descripción siguiente conserva el alcance de la
entrega original; el llamador HTTP está cubierto por el nuevo contrato y su QA. Sin SDK
ni activación de cobros.

Fecha: 2026-10-22 (America/Lima). Base: PR #19,
`8424493ebdf099b029c9d066ab50869125ccdaf6`, CI 39808132000 aprobada (165 servidor/68 navegador).
Incremento parcial: preparación del dominio; no es checkout ni aceptación externa de Izipay.
[Decisión técnica](../decisions/0010-reserva-automatica-sandbox.md).

## Entrada interna

`reserveIzipayTestOrder` en [automatic-order-server.ts](../../src/modules/orders/automatic-order-server.ts)
es una fachada `server-only`. No es una Server Action ni una nueva ruta HTTP. Recibe
el usuario autenticado por el servidor y un DTO estricto con `expectedUserId`, dirección,
cotización firmada, clave de checkout y campos de comprobante/notas. No acepta monto,
moneda, método, token ni campos de tarjeta/Yape. FACTURA conserva las validaciones
actuales de RUC, razón social y dirección fiscal; esto no emite un comprobante fiscal.

El futuro punto de entrada debe verificar sesión, origen/CSRF y rate limit, y enlazar
la identidad del render con la sesión actual. Esta función interna no sustituye esos
controles. No se conecta todavía a la UI ni se añade un botón de pago.

## Transacción compartida y resultado

Los servicios manual y automático usan [order-reservation-core.ts](../../src/modules/orders/order-reservation-core.ts):

1. Recuperar la orden de la misma cuenta/clave y comparar huella/método. Un replay
   devuelve esa orden antes de leer la cotización, carrito o configuración actuales.
2. Para una creación, verificar clave y snapshot autorizado de carrito/dirección,
   precios, disponibilidad y tarifa de zona del servidor. Validar firma y dinero exacto.
3. Exigir configuración habilitada de `MICUENTAWEB_V4`, TEST y campos de claves presentes;
   las claves reales de pruebas del comercio siguen pendientes. No hay llamada externa.
4. Comprobar el límite común de tres pedidos pendientes/en revisión. Reservar stock
   condicionalmente y guardar orden, líneas y dirección congeladas dentro de Serializable.
5. Registrar `AUTOMATIC_SANDBOX_RESERVED` y movimientos, consumir solo las líneas del
   snapshot y aumentar revisión del carrito. Un fallo revierte todo, incluida la clave.

La orden queda `PENDING_PAYMENT`, `paidAt = NULL`, con integración `MICUENTAWEB_V4`.
No se crea un `Payment` ni un `PaymentAttempt` al reservar. El inicio posterior crea o
recupera el intento con el importe congelado, sin volver a reservar stock.
La respuesta interna conserva `{ id, number, replayed }`.

La clave y su restricción única se comparten entre métodos. Otra huella o cambiar de
manual a automático con la misma clave genera conflicto. Los registros manuales y
sus pagos nunca se eliminan para convertirlos. Se conservan sus reglas previas.

## Plazo, migración y recuperación

La reserva TEST usa **15 minutos**, política local provisional de stock, no un TTL
de token garantizado por Izipay. La fecha queda persistida y el replay no la extiende.
El mantenimiento/cancelación existente libera una vez, sin borrar intentos ni reabrir
una orden al repetir su confirmación. Un ingreso externo después de liberar stock
necesita conciliación en S3-03; no se aprueba ni se vuelve a reservar silenciosamente.

La migración 14, `20261022170000_automatic_order_reservation`, añade un campo nullable
y CHECK de valores admitidos. Deja NULL en históricos; no modifica pagos, intentos,
stock ni carritos. El inicio de nuevos intentos y la entrega de token exigen el marcador.
Una orden histórica sin pagos no se interpreta como reserva automática por esa ausencia.

El dump completo debe conservar orden, marcador, huella, clave, intento y referencia.
CI prueba restaurarlos y repetir ambas operaciones: misma orden/intento, cero pagos,
stock 7 y carrito posterior de 2 conservados. No se concede otra solicitud al proveedor.
Consultar [operación de backups](../07-despliegue/backups-y-recuperacion.md).
No borrar intentos para desbloquearlos: INITIATING/UNCERTAIN requieren recuperación
verificada con el proveedor; el hash de un token no permite reconstruirlo.

## Continuidad del sprint

S3-02 sigue parcial. Secuencia pendiente: confirmar producto/test package y medios
habilitados; verificar recuperación/consulta; conectar un punto de reserva autenticado
y el formulario oficial bajo demanda; probarlo externamente. S3-03 debe resolver IPN
auténtica, persistencia de eventos y carreras/pagos tardíos antes de activar cobros.
Yape dependerá de la familia y habilitación del comercio; no se simula un formulario propio.

El [POST de inicio](inicio-izipay.md) mantiene ambos flags desactivados por defecto.
La CI detectó un aviso crítico en Next.js 16.3.8 antes de ejecutar pruebas. Se fija
Next.js y eslint-config-next en 16.4.2 y se regenera el lockfile; la auditoría no se
omite. No hay cambios de Motion/UI o Render. [QA y límites](../testing/s3-02-reserva.md).
