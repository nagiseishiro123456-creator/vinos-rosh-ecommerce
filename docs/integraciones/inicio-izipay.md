# S3-02 — Inicio protegido de Mi Cuenta Web sandbox

Fecha: 2026-10-22 (America/Lima). Base: PR #18, `6d81d539c782a2d63cae64ae7312cff1b757f891`.
Incremento de backend condicionado; no es cierre del checkout ni habilitación comercial.

## Entrada y configuración

Existe `POST /api/payment/initiate`, Route Handler de Next.js, `server-only`, runtime Node.js.
GET devuelve 405. La ruta devuelve 404 mientras cualquiera de estos flags no sea `true`:

```dotenv
PAYMENTS_IZIPAY_ENABLED="false"
IZIPAY_MCW_INITIATE_ENABLED="false"
```

Ambos quedan desactivados en `.env.example` y en el servidor de CI. El opt-in de la ruta
es independiente de preparar el adaptador. Además, el servicio exige `MICUENTAWEB_V4`,
modo TEST y credenciales presentes. Las credenciales reales de pruebas y el producto
web de ROSH siguen pendientes; no activar estos flags para vender ni usar claves reales.

La ruta exige sesión, Origin del URL público configurado, JSON y presupuesto de diez
solicitudes por usuario cada diez minutos. Rechaza `Sec-Fetch-Site: cross-site` y una
configuración de URL que no sea HTTP(S). La identidad autenticada viene del servidor.

Cuerpo permitido, con IDs sintéticos:

```json
{
  "orderId": "cm223456789012345678901234",
  "expectedUserId": "cm123456789012345678901234"
}
```

`expectedUserId` detecta un cambio de cuenta; no sustituye la sesión ni la comprobación
de propiedad. La validación es estricta: no acepta montos, moneda, token del navegador
ni datos de tarjeta/Yape. El body tiene límite real de 2048 bytes y cinco segundos,
también si no declara Content-Length. Los errores no reproducen datos recibidos.

## Orden de las operaciones

1. Autorizar y guardar/recuperar el intento con el servicio de persistencia existente.
2. Solo el creador puede solicitar el token. Revalidar propietario, reserva, estado,
   modo y coincidencia de importe antes de salir a la red.
3. Solicitar el formToken al adaptador, fuera de cualquier transacción de BD, sin retries.
4. Bloquear la orden y volver a comprobar elegibilidad e importe. Guardar hash/hora del
   token mediante transición condicionada. Solo después de confirmar el commit se devuelve.
5. Si falla la llamada o la finalización, intentar marcar UNCERTAIN y responder recuperación.
   Si también falla esa escritura, INITIATING sigue bloqueando otra solicitud.

La respuesta 200 contiene exclusivamente `kind`, `attemptId`, `formToken` y `publicKey`.
Todos los JSON usan `Cache-Control: private, no-store`. No se registran token, correo,
contraseña, respuesta del proveedor ni mensaje/stack de excepciones arbitrarias.

| HTTP | Significado |
| --- | --- |
| 200 | Token obtenido y hash persistido; no es un pago aprobado. |
| 202 | El intento INITIATING ya existe; no se envía otra solicitud ni un token. |
| 409 | Cuenta cambiada o recuperación necesaria; sin reinicio automático. |
| 400 / 413 / 415 | Cuerpo inválido, demasiado grande o tipo incorrecto. |
| 401 / 403 | Falta sesión o falla la comprobación de origen. |
| 404 | Ruta desactivada u orden ajena/no elegible, sin revelar datos del pedido. |
| 408 | El cuerpo agotó plazo o el cliente ya estaba desconectado antes de iniciar. |
| 429 | Límite por usuario; incluye Retry-After. |
| 503 | Configuración o almacenamiento no disponibles; sin detalles privados. |

## Límites de recuperación y aceptación

El token no se guarda en texto recuperable. Si se pierde la respuesta 200, el intento
TOKEN_READY se recupera como 409, sin pedir otro token. Un proceso que cae después de
persistir INITIATING también queda bloqueado; no se deduce si salió o no la solicitud.
Este comportamiento prioriza no repetir llamadas; todavía no permite al cliente
continuar todos los fallos. No se afirma «exactamente una vez» en una red distribuida.

La cancelación/vencimiento durante la llamada invalida la entrega del token; se conservan
el stock liberado y la identidad del intento. La reserva puede vencer después de la
última comprobación o después de entregar el token: S3-03 aún debe resolver cualquier
ingreso tardío sin reabrir órdenes ni volver a reservar. Esta ruta no confirma pagos.

El flujo manual conserva su circuito. La elegibilidad exige ahora el marcador explícito
MICUENTAWEB_V4 y ningún pago existente; no deduce el método de la ausencia de pagos.
La [reserva automática interna](reserva-izipay.md) ya crea ese snapshot con el núcleo
ACID compartido. Los tests usan ese servicio real en BD aislada; no eliminan pagos
manuales. Todavía no hay punto HTTP de reserva automática ni botón de tarjeta/Yape.

Pendientes antes de activar: producto/test package de ROSH, llamador autenticado de la
reserva, contrato de recuperación/consulta, SDK y medios habilitados, IPN persistida y
verificada, pruebas externas y aceptación. Esta ruta se añadió sin migración; el
incremento posterior de reserva añade la migración 14. [QA](../testing/s3-02-reserva.md).
No se modificó ni desplegó Render en este incremento.

## Fuentes y evidencia

Se verificó nuevamente el [ejemplo oficial Node.js de Izipay](https://github.com/izipay-pe/Server-PaymentForm-NodeJS):
Mi Cuenta Web devuelve formToken/clave pública para el formulario. El ejemplo no sustituye
las guardas, idempotencia o persistencia de ROSH, ni confirma la modalidad contratada.
[Familias de API](izipay-sandbox.md) · [Persistencia](intentos-izipay.md) · [QA del incremento](../testing/s3-02-inicio.md).
