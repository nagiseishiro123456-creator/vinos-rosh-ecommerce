# Confirmaciones recuperables — S3-05

2026-10-27. Operativas para aprobación manual; preparadas para una futura IPN auténtica.
El propietario confirma que ROSH aún no tiene acceso del comercio a Izipay. No se activa
el pago automático. [Guía del cliente](../guia-prueba-sprint-03.md).

## Persistencia

Migración aditiva 15: PaymentConfirmationOutbox, una fila única por pedido. Pago, orden
PAID, historial y aviso se guardan en la misma transacción. Si el aviso no se puede guardar,
se revierte la aprobación completa y se informa con un mensaje operativo controlado.
Repetir la aprobación no añade otro correo. No hay avisos retroactivos para históricos.

El snapshot conserva nombre, destinatario y productos/importes exactos. No almacena
tarjeta, CVV, código Yape, credenciales o respuesta del proveedor. Antes del envío se
comprueban estado pagado, paidAt, importe, número y correo actual. Un pedido cerrado
detiene el aviso; datos cambiados requieren revisión. No se cambia stock al enviar.

## Procesamiento

`/admin/notificaciones` y su detalle exigen ADMIN vigente en BD. El servicio comprueba
ese rol de nuevo en su transacción. La acción requiere checkbox y limita diez solicitudes
por administrador/minuto. No recibe destinatarios o cuerpos arbitrarios del navegador.
Abrir/actualizar una vista previa no envía. No hay cron/worker ni envío automático al aprobar.

| Estado | Significado |
| --- | --- |
| QUEUED | Aviso guardado con el pago; sin petición al proveedor. |
| PROCESSING | Lease de 60 s; otro procesador espera. |
| RETRY | Mismo aviso pendiente; se respeta nextAttemptAt. |
| SENT | Aceptado por el proveedor, sin acreditar entrega en bandeja. |
| REVIEW | Rechazo, cinco intentos, ventana agotada o datos/configuración cambiados. |
| CANCELLED | Pedido cerrado; aviso detenido. |

La red se ejecuta fuera de BD. El primer intento congela remitente/destinatario/asunto/
HTML/texto; las repeticiones usan `payment-confirmation/<uuid>`. Si falla guardar SENT
después de aceptar el proveedor, el lease vence y se recupera el mismo cuerpo/clave.
No se promete entrega exactamente una vez fuera del contrato externo.

Resend conserva idempotencia 24 h; el servicio se detiene a las 23 h o tras cinco intentos.
Cambiar credencial/remitente/URL también requiere revisión. No hay botón de reinicio a
ciegas de REVIEW: primero comprobar el historial con el proveedor.
[Claves oficiales](https://resend.com/docs/dashboard/emails/idempotency-keys) y
[API de envío](https://resend.com/docs/api-reference/emails/send-email), consultados el 2026-10-27.

Destino HTTPS fijo, timeout de 8 s, sin redirects, respuesta de máximo 8 KiB y errores
estáticos. Los fallos de BD no imprimen payloads/valores. Un correo no emite comprobante fiscal.

## Configuración

PAYMENT_CONFIRMATION_EMAIL_ENABLED=false por defecto, también en CI. Sin flag, clave
y remitente válidos no se reclama/envía el aviso. RESEND_API_KEY/EMAIL_FROM son opcionales;
antes de activar externamente se verifica remitente/dominio y límites gratuitos.
No se activó ni envió correo externo: las pruebas utilizan transportes sintéticos.

`npm run db:prepare:email` admite solo vinos_rosh/vinos_rosh_test locales, fuera de production,
y las migraciones aditivas conocidas 13–15. Rechaza otros destinos/pendientes; no resetea ni
carga datos comerciales. El repositorio SQL tipado mantiene explícitos los locks y leases;
el modelo Prisma refleja la tabla. [QA](../testing/s3-05-confirmaciones.md).

S3-05 sigue parcial: entrega externa, operación y conexión de enqueue a la futura IPN
por verificar. El adaptador de correo nunca confirma un pago.
