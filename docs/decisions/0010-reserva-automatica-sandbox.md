# ADR 0010 — Reserva automática interna de pruebas

Fecha: 2026-10-22 (America/Lima).
Estado: aceptado para preparación interna, con la instrucción del propietario de continuar.
No acepta la contratación, activación comercial ni el cierre del ADR 0009.

## Decisión

Compartir la transacción de reserva existente entre pagos manuales y preparación
Mi Cuenta Web TEST, en vez de duplicar cálculo, stock e idempotencia. Los adaptadores
validan entradas distintas y conservan la respuesta manual. Ninguna llamada de red
ocurre dentro de esta transacción.

La orden automática se identifica con `paymentIntegration = MICUENTAWEB_V4` y no crea
un `Payment`. La migración 14 deja NULL en todas las órdenes anteriores. No deducir el
método por ausencia de pagos ni borrar un pago manual para habilitar un intento.
El inicio exige el marcador además de reserva, propiedad, importe y estado válidos.

Se conserva la identidad `(userId, checkoutKey)` para ambos métodos. Cambiar entre
manual y automático con esa identidad produce conflicto; no convierte la orden.
El replay recupera el snapshot original incluso si después cambian carrito/configuración.

El plazo inicial es **15 minutos**, política local provisional de stock para estas
pruebas internas. No es un TTL de token documentado por Izipay. Antes de activar el
checkout se debe acordar el plazo con el contrato real y resolver pagos tardíos en S3-03.
Las reservas manuales conservan su plazo actual. El mantenimiento existente libera
una reserva vencida una vez y conserva el intento; no se implementa un programador nuevo.

## Consecuencias y límites

Se añade un servicio interno y una fachada `server-only`, sin Server Action ni nueva
ruta de reserva. Un futuro llamador autenticado debe aplicar sesión, origen/CSRF,
identidad esperada y rate limiting. El POST de inicio existente sigue desactivado.
Se exige configuración Mi Cuenta Web TEST para crear; no se necesita para recuperar
una reserva ya creada. La presencia de valores no certifica que sean claves de test.

La alternativa de copiar todo el servicio manual aumentaría la posibilidad de que
stock, importes o rollback diverjan. El núcleo común exige regresión completa manual
además de las nuevas pruebas automáticas. Se prueba migración sobre datos anteriores
y recuperación de orden/intento en un dump completo con datos sintéticos.

No hay SDK, webhook, pago confirmado, consulta del proveedor ni desbloqueo automático
de intentos inciertos. [Contrato](../integraciones/reserva-izipay.md),
[QA](../testing/s3-02-reserva.md) y [decisión comercial pendiente](0009-pagos-automaticos.md).
