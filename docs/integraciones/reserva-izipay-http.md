# S3-02 — Reserva automática autenticada de pruebas

Fecha: 2026-10-23 (America/Lima). Continuación del Sprint 3 por solicitud del propietario.
Incremento local de backend; no es aceptación externa ni cierre de S3-02.
[ADR 0011](../decisions/0011-reserva-sandbox-autenticada.md) · [QA](../testing/s3-02-reserva-http.md).

## Entrada y guardas

`POST /api/orders/reserve`, Node.js, usa la sesión NextAuth del servidor. GET devuelve 405.
La ruta responde 404 antes de autenticar mientras cualquiera de estos flags no sea `true`:

```dotenv
PAYMENTS_IZIPAY_ENABLED="false"
IZIPAY_MCW_RESERVE_ENABLED="false"
```

El nuevo opt-in es independiente de `IZIPAY_MCW_INITIATE_ENABLED`; preparar una reserva
no habilita la petición de token. `.env.example` y CI lo mantienen desactivado. No se
modificó el `.env` local ni se conectó un botón en el checkout.

Se exige Origin exactamente igual al origen de `NEXT_PUBLIC_APP_URL` (o `NEXTAUTH_URL`
si falta el primero), URL HTTP(S), rechazo de `Sec-Fetch-Site: cross-site`, JSON y sesión.
El presupuesto persistente es de diez solicitudes por usuario cada diez minutos.
Una cuenta distinta a la del resumen devuelve `ACCOUNT_CHANGED` antes de reservar.
La identidad del cuerpo nunca sustituye a la identidad autenticada.

## Cuerpo admitido

Ejemplo con IDs y confirmaciones sintéticas, no reutilizables para una compra:

```json
{
  "expectedUserId": "cm123456789012345678901234",
  "addressId": "cm223456789012345678901234",
  "checkoutQuote": "v1:1111111111111111111111111111111111111111111111111111111111111111",
  "checkoutKey": "ck1:2222222222222222222222222222222222222222222222222222222222222222",
  "receiptType": "BOLETA"
}
```

`documentNumber`, `businessName`, `taxAddress` y `customerNotes` son los campos opcionales
existentes. FACTURA exige RUC, razón social y dirección fiscal; no equivale a emitir una
factura fiscal. La validación es estricta: rechaza total, moneda, método, tokens y campos
de tarjeta/Yape enviados por el navegador.

El límite real es 8192 bytes y cinco segundos para leer el cuerpo. Cuenta bytes UTF-8
acumulados incluso si Content-Length falta o miente; rechaza UTF-8/JSON inválidos y
cancela la lectura al agotar plazo o desconectarse el cliente. Los errores no reproducen
el cuerpo, datos privados ni excepciones del proveedor/BD.

## Efectos y recuperación

El handler delega en la reserva ACID compartida, sin cambiar reglas de dinero, stock,
carrito o límite común de tres pedidos pendientes. La creación exige configuración
`MICUENTAWEB_V4`, modo TEST y campos de claves presentes; esa presencia no certifica
que el comercio tenga claves de prueba válidas. No se hace ninguna llamada al proveedor.

Respuesta 201 tras guardar la reserva:

```json
{
  "kind": "reserved",
  "orderId": "cm323456789012345678901234",
  "orderNumber": "ROSH-REFERENCIA-SINTETICA",
  "replayed": false
}
```

Un replay idéntico devuelve 200 y `kind: recovered`, manteniendo orden, importe y plazo.
No afirma que la reserva siga activa: puede recuperar un pedido ya cancelado. No reactiva
stock ni extiende fechas. Una respuesta perdida tras el commit se recupera con la misma
confirmación; nunca se indica generar otra clave a ciegas. Otro contenido o método en
la misma clave devuelve 409 y la referencia del pedido de esa misma cuenta.

Todas las respuestas JSON llevan `Cache-Control: private, no-store`, `Pragma: no-cache`
y `X-Content-Type-Options: nosniff`.

| HTTP | Resultado |
| --- | --- |
| 201 | Reserva nueva guardada; todavía sin pago, intento ni token. |
| 200 | Orden recuperada, sin nueva reserva. Verificar su estado antes de iniciar pago. |
| 400 / 413 / 415 | Entrada inválida, cuerpo demasiado grande o tipo incorrecto. |
| 408 | Cuerpo agotó plazo o cliente desconectado antes de reservar. |
| 401 / 403 | Sesión ausente u origen rechazado. |
| 404 | Ruta desactivada o dirección no disponible para esta cuenta. |
| 409 | Cuenta cambiada, resumen/stock/cobertura cambiados, carrito vacío, límite de pendientes, conflicto o transacción ocupada. |
| 429 | Presupuesto agotado; incluye Retry-After. |
| 503 | Configuración/almacenamiento no disponible. Consultar pedidos y conservar la confirmación. |

Los códigos de negocio permiten al futuro cliente distinguir estos errores. Una desconexión
una vez iniciada la transacción no cancela una reserva ya guardada ni compensa stock por
su cuenta: el replay recupera el resultado persistido.

## Operación y siguiente paso

Sin nueva migración ni dependencias. Las catorce migraciones existentes se aplicaron
solo a `vinos_rosh_test`, no a la base de desarrollo. El runner local permite repetir
la regresión sin reset ni seed; ver QA.

El checkout manual permanece operativo. No se activan SDK, IPN, pago aprobado ni correos.
Pendientes de S3-02: producto/paquete TEST de ROSH confirmado, recuperación/consulta del
proveedor, formulario oficial y prueba externa. S3-03 debe resolver notificaciones
auténticas, idempotencia y pagos tardíos antes de activar cobros.
