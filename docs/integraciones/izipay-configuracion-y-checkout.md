# Mi Cuenta Web V4: configuración, formulario y resultados

2026-11-02 · Sprint 3, incrementos S3-02/S3-03. El código está preparado para
tarjetas/medios habilitados en Smart Form; no acredita habilitación comercial ni
una prueba externa aprobada. No se activa una pasarela por instalar esta entrega.

## Configuración y precedencia

`/admin/configuracion/izipay` permite guardar usuario, contraseña REST, clave pública,
HMAC de retorno y modo SANDBOX/PRODUCTION. Exige rol ADMIN vigente, contraseña actual,
presupuesto por usuario y revisión optimista. Los campos privados nunca se precargan,
devuelven ni registran; se introduce el conjunto completo para evitar mezclar claves.
Seleccionar producción y guardar no la activa: además requiere marcar habilitar y
escribir `ACTIVAR PRODUCCION`. Este trabajo no realiza esa activación.

Se cifra el conjunto con AES-256-GCM, nonce aleatorio y AAD versionada. La clave maestra
`GATEWAY_ENCRYPTION_KEY` contiene 32 bytes en base64, vive exclusivamente en el entorno
privado y NO se almacena en la misma base ni en Git. No se reutiliza NEXTAUTH_SECRET.
Conservarla de forma segura junto al procedimiento de respaldo: perderla o sustituirla
invalida el acceso a las versiones cifradas antiguas. No hay rotación automática de esta
clave maestra en este incremento.

La base tiene prioridad como conjunto completo. Solo la ausencia de configuración
permite usar variables de entorno. Un fallo de BD, descifrado o modo no provoca fallback
a otra cuenta. La configuración deshabilitada de BD tampoco activa las variables.
Los nombres históricos de variables que contienen `_TEST_` se mantienen por compatibilidad;
el modo y los prefijos de las claves se validan. Producción por entorno requiere además
`IZIPAY_PRODUCTION_ENABLED=true`; los ejemplos DEMO nunca permiten ese modo.
Las versiones cifradas son inmutables y cada intento conserva su ID: cambiar claves no
invalida la verificación de notificaciones anteriores. El historial no guarda secretos.

Migraciones 20–23: proveedor IZIPAY separado de CULQI, versiones/configuración/auditoría,
eventos mínimos, unicidad de transacciones, modo del intento y modo del pedido.
Sin backfill de pedidos históricos, cambios de precio ni ajustes de stock.

## Pedido y formulario

El checkout muestra la alternativa Izipay solo cuando la configuración del servidor
la permite. TEST queda limitado al desarrollo; producción exige activación independiente,
cuenta propia y claves del modo correspondiente. El comercio demo compartido no se admite
en producción. Los flags de `.env.example` permanecen apagados.

El modo se fija al reservar y entra en el fingerprint de idempotencia. Cambiar la
configuración no convierte una reserva TEST en una venta. El total siempre procede de
Order, se convierte exactamente a céntimos y el cuerpo del navegador no admite importes.
Se mantienen autenticación, propiedad, Origin, límites de bytes/plazo y presupuestos.

`/pedidos/[number]/tarjeta` utiliza el navbar compartido y un formulario oficial bajo
demanda. No carga SDK al visitar el checkout ni solicita tokens desde un efecto React.
Hay preflight y segunda comprobación después de emitir el token. Doble clic no repite
solicitudes; la unicidad/bloqueo de BD también protege entre pestañas/procesos.

El token solo permanece en memoria del formulario. Se cierran los campos al vencer,
recibir el resultado, perder sesión, salir o desmontar. Durante el formulario se consulta
el estado al recuperar foco/visibilidad y cada 15 s. Una nueva instancia no reutiliza
el SDK del documento anterior. Un retorno del navegador nunca establece por sí solo PAID.

Se carga el script oficial y el tema Neon desde rutas fijas de static.micuentaweb.pe.
La CSP añade únicamente orígenes exactos en esta ruta; no amplía scripts/conexiones de
la tienda. La verificación externa de CSP/3DS y de los medios contratados sigue pendiente.
QR depende de lo que Izipay habilite en Smart Form; no se fabrica un QR propio de cobro.

## Resultados, concurrencia y dinero de prueba

`POST /api/payment/webhook` recibe formulario URL-encoded, sin cookie/Origin del comercio,
y exige `kr-answer`, `kr-hash`, `kr-hash-algorithm=sha256_hmac`,
`kr-hash-key=password` y `kr-answer-type=V4/Payment`, sin duplicados de esos campos.
Verifica el texto recibido con la contraseña REST de la versión del intento. La entrada
tiene límite de bytes/plazo y presupuesto; los fallos no reproducen datos privados.

`POST /api/payment/return` requiere sesión, Origin, cuenta y pedido propios. Verifica el
HMAC de retorno con su clave específica. En producción solo deja esperar la IPN; en TEST
puede registrar un resultado de prueba para poder trabajar en localhost sin IPN pública.

Después de la firma se comprueban comercio, referencia, modo, moneda, total/effective amount,
transacción DEBIT/PAID, reserva, estado y ausencia de pagos incompatibles. Se bloquea la
orden y se serializa la referencia del proveedor. El evento, pago, Order y outbox se
registran en una transacción; un fallo revierte el conjunto. Repeticiones no descuentan
stock ni generan correos adicionales. No se persisten payloads, PAN, CVV ni detalles de tarjeta.

**TEST_APPROVED nunca marca Order PAID, habilita despacho ni encola correo comercial.**
Es esencial con claves públicas de demostración, cuyas firmas puede reproducir cualquiera.
El modo de prueba se muestra explícitamente. La reserva puede cancelarse/vencer por el
circuito existente para liberar stock. Los eventos quedan separados de ingresos reales.

Un pago de producción firmado pero tardío se registra en revisión/conciliación y no
vuelve a reservar stock liberado. Las discrepancias quedan en los resultados recientes
del admin y en la trazabilidad del pedido; no se aprueban como pagos manuales.

## Recuperación y límites externos

Si se pierde la respuesta del token o hay timeout, no se pide otro token automáticamente.
El hash persistido no permite reabrirlo. La pantalla permite consultar sin repetir cobros
y contactar a ROSH. La consulta automática al proveedor/reapertura de un intento requiere
confirmar el contrato real y aún no está implementada. No se promete exactamente una vez
en la red ni se borra un intento para volver a cobrar.

Las credenciales del archivo recibido se conservan en `.env.example` como ejemplos
públicos DEMO, con flags apagados. Una única solicitud real al endpoint oficial el
2026-11-02 devolvió `status=ERROR`, `errorCode=INT_905` y ningún token. No se enviaron
tarjetas ni se efectuó un pago. No se presentan como credenciales funcionales de ROSH.

Pendientes externos: cuenta del comercio, credenciales válidas, QR/medios disponibles,
contrato de consulta/recuperación, IPN HTTPS y pruebas de aprobación/rechazo/3DS/cierre
de pestaña. El sandbox externo y la aceptación comercial siguen pendientes.

Fuentes consultadas: [servidor oficial Izipay](https://github.com/izipay-pe/Server-PaymentForm-NodeJS),
[biblioteca y ejemplo React](https://github.com/lyra/embedded-form-glue),
[contrato de métodos KR](https://github.com/lyra/embedded-form-glue/blob/master/index.d.ts).
El handoff es una referencia: no se copiaron sus totales del cliente, datos ficticios de
facturación, falta de idempotencia ni actualizaciones directas a PAID.
