# Consulta de estado del pedido automático

Incremento local del Sprint 3, 2026-10-23. S3-02 continúa parcial.

`GET /api/payment/status?orderId=<cuid>&expectedUserId=<cuid>` consulta exclusivamente
un pedido MICUENTAWEB_V4 del usuario autenticado. No consulta a Izipay, inicia intentos,
vence reservas ni actualiza pedidos/stock. El presupuesto de consulta sí se persiste
en RateLimitBucket: 30 solicitudes por usuario/minuto, separado de reserva e inicio.
Permanece disponible aunque los flags de inicio estén apagados para no ocultar un
pedido que ya existe. No activa el checkout automático.

## Contrato

Respuesta 200 estricta: `orderId`, `orderNumber`, `orderStatus`, `state`, `total`
(decimal de dos posiciones), `currency: PEN`, `reservationExpiresAt`, `confirmedAt`,
`observedAt`. Fechas ISO o null donde corresponda. Sin token, hash de token, referencia
privada del proveedor, credenciales, correo o datos de tarjeta.

| Estado | Fuente y criterio |
| --- | --- |
| reserved | Pedido pendiente con reserva vigente y sin intento. |
| initiating | Intento INITIATING consistente con importe/moneda/producto/modo TEST. |
| prepared | Intento TOKEN_READY consistente. No significa pago aprobado. |
| uncertain | Intento UNCERTAIN consistente. No se propone volver a pagar. |
| expired | Plazo alcanzado o marcadores de liberación/vencimiento. La lectura no libera stock. |
| confirmed | Estado PAID/PREPARING/SHIPPED/DELIVERED y paidAt persistido. |
| closed | CANCELLED o REFUNDED; precede a una confirmación histórica. |
| review | Datos incoherentes, PAYMENT_REVIEW o confirmación incompleta. |

La proyección tiene pruebas deterministas del límite exacto de vencimiento y de las
incoherencias del intento. La confirmación usa exclusivamente el registro del servidor;
el retorno del navegador y un token no cambian el estado de negocio. Este incremento
no implementa la transición IPN que producirá esa confirmación.

401 requiere sesión; 409 detecta otra cuenta; 404 agrupa pedido ausente, ajeno o manual;
400 rechaza DTO inválido, campos extra o repetidos; 403 rechaza Origin ajeno cuando
existe y Sec-Fetch-Site cross-site; 429 incluye Retry-After; 503 no expone el fallo interno.
Origin se compara con NEXT_PUBLIC_APP_URL/NEXTAUTH_URL HTTP(S). El cliente usa la misma
tienda, sin CORS. Todas las respuestas del handler son private/no-store y nosniff.

## Interfaz

El dueño ve un panel en `/pedidos/[number]` solo para pedidos automáticos. Un administrador
que mira un pedido ajeno no monta el panel del comprador. Los pedidos manuales conservan
sus instrucciones; `/pagar` redirige los automáticos al detalle para evitar instrucciones
manuales incorrectas. No se añade aún un botón de inicio de cobro.

Actualizar ejecuta una sola consulta a la vez, con plazo de 10 segundos y cancelación
al desmontar. Si falla la red o la respuesta no cumple el contrato, conserva y etiqueta
la última consulta. Un 401/409 retira el panel y pide ingresar nuevamente. El componente
se monta con clave usuario/pedido; no comparte respuestas entre cuentas. No hay polling,
reintentos de cobro ni acciones del proveedor desde ese botón.

## Recorrido de demostración

`/desarrollo/sprint-3` está disponible solo con NODE_ENV=development y lleva robots
noindex/nofollow; devuelve notFound fuera de desarrollo. Datos fijos y ficticios,
sin direcciones/correos reales. Escenarios interactivos: reserva, formulario previsto,
espera, recuperación, confirmación simulada y vencimiento. Usa el mismo panel visual
que el detalle real. La pestaña «Consulta de estado» monta el componente real con una
referencia ficticia para comprobar sesión/errores; solo realiza el GET al pulsar actualizar.
No crea pedidos ni cobros. La fotografía de producto procede de los archivos del cliente.

Formulario/SDK, IPN, consulta del proveedor, conciliación y correo/outbox siguen pendientes.
El recuadro de correo no envía correos. Las capturas prueban esta UI local, no una operación
Izipay. [QA y límites](../testing/s3-02-estado-ui.md).
