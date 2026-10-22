# Izipay sandbox — guía del desarrollador de ROSH

Fecha: 2026-10-22 (America/Lima).
Alcance de esta entrega: evaluación del requerimiento y primera base técnica aislada.
No hay ruta de pagos activa, persistencia de intentos nueva, cambio de estado bancario
ni checkout de proveedor incorporado. S3-01 y S3-02 continúan parcialmente pendientes.

## Recomendación de arquitectura

ROSH ya usa Next.js App Router como servidor Node.js, Route Handlers, Prisma y PostgreSQL.
Conservar esa arquitectura y crear el adaptador dentro de `src/modules/payments/izipay/`.
Express es válido para un laboratorio o API independiente, pero un servidor adicional
introduciría otra configuración, despliegue y autenticación que no necesita este alcance.
El núcleo se puede reutilizar desde un adaptador Express si en el futuro se justifica.

La cuenta del comercio y la labor del desarrollador son distintas: se necesitan
credenciales y medios habilitados para el comercio de ROSH, aunque el desarrollador
implemente la integración. Un POS o cobros manuales no prueban acceso al producto web.

## Corregir el ejemplo antes de implementarlo

| Punto recibido | Contrato que usaremos |
| --- | --- |
| `https://api.micropayment.de/` como sandbox | No es la referencia oficial de Izipay usada en esta integración. Micropayment se identifica como otro proveedor [F4]. No enviar claves Izipay a ese dominio. |
| Basic Auth + `formToken` | Corresponde al contrato Mi Cuenta Web V4 [F1]. |
| Token de sesión + código Yape del SDK | Es otra familia, Punto Web/SDK [F2–F3]. No intercambiar sus credenciales, firmas o scripts. |
| Monto enviado desde el carrito del navegador | Recibir identidad de la orden; cargar y autorizar importe/moneda desde BD. El navegador no fija el total. |
| Multiplicar un número JS por cien | Usar el importe decimal canónico de la orden y convertir a céntimos enteros exactamente. |
| Mostrar botón Yape por incluir cualquier SDK | El producto y el comercio deben tenerlo habilitado; comprobarlo en sandbox. No simular el botón con campos propios. |
| Marcar pagado al volver a una URL de éxito | El servidor valida el resultado auténtico, referencia, entorno, moneda, importe y estado; aplica la transición atómica una vez. |
| Servidor a servidor implica cumplimiento PCI automático | El formulario oficial evita que ROSH capture tarjeta/CVV; el alcance y cumplimiento deben validarse con las condiciones aplicables del proveedor/adquirente [F5]. |

## 1. Elegir una sola familia

| Familia | Token y autenticación | Cliente | Firma de notificación |
| --- | --- | --- | --- |
| Mi Cuenta Web V4 | `formToken`; autenticación Basic de usuario/clave REST. | Krypton, recurso `static.micuentaweb.pe`, formulario `kr-embedded`. | `kr-answer` y `kr-hash` hexadecimal; la IPN usa la clave REST según el ejemplo oficial. |
| Punto Web / SDK web | Token de sesión generado en backend. | SDK de `sandbox-checkout.izipay.pe`; soporta código Yape en el producto documentado. | `payloadHttp` y `signature` Base64, conforme a su contrato. |

El ejemplo recibido describe principalmente Mi Cuenta Web; la promesa de Yape viene
de documentación del SDK. Esa combinación debe resolverse con Izipay antes de elegir
el adaptador que se conectará al checkout. La base de código de esta entrega es una
**preparación Mi Cuenta Web**, no una afirmación de que esa cuenta/producto tenga Yape.

## 2. Configuración de pruebas

En `.env.example` se agregaron nombres, todos sin secretos y con integración desactivada:

```dotenv
PAYMENTS_IZIPAY_ENABLED="false"
IZIPAY_INTEGRATION=""
IZIPAY_MODE="TEST"
IZIPAY_MCW_MERCHANT_ID=""
IZIPAY_MCW_REST_TEST_PASSWORD=""
IZIPAY_MCW_PUBLIC_TEST_KEY=""
IZIPAY_MCW_BROWSER_HMAC_TEST_KEY=""
```

Si se confirma Mi Cuenta Web, el selector será `MICUENTAWEB_V4`. Dejar la activación
en `false` hasta completar el contrato y el servicio de intentos. Ingresar credenciales
de prueba únicamente en el archivo local ignorado o en el gestor de secretos del entorno.
No enviarlas al chat, escribirlas en Git ni usar `NEXT_PUBLIC_*` para claves privadas.

Para esta familia, la operación oficial es:

```text
POST https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment
```

La URL está fijada en código y se rechazan redirecciones de HTTP. El modo de prueba
lo determinan las credenciales emitidas por Izipay; `IZIPAY_MODE=TEST` es solo una
barrera local y no convierte una contraseña de producción en una de sandbox.
No se solicitaron ni usaron credenciales reales en esta entrega.

## 3. Base implementada para solicitar el formToken

- [Núcleo de transporte y contrato](../../src/modules/payments/izipay/micuentaweb-core.ts).
- [Entrada exclusiva de servidor](../../src/modules/payments/izipay/micuentaweb-server.ts).
- [Pruebas aisladas](../../tests/izipay-preparation.test.ts).

El núcleo valida configuración, moneda PEN, referencia y correo; convierte el total
canónico a céntimos; hace una solicitud Basic Auth con timeout y límite de respuesta;
devuelve únicamente el token y la clave pública. No expone la respuesta del proveedor
en errores, no registra secretos y no reintenta automáticamente un resultado incierto.
La entrada `server-only` mantiene la lectura de variables en el servidor.

Ejemplo del DTO interno, con datos ficticios:

```ts
const snapshot = {
  orderReference: "QA_ROSH_ATTEMPT_1", // referencia del intento persistido, todavía por implementar
  total: "98.20",                    // total cargado de la orden, no de req.body
  currency: "PEN" as const,
  customerEmail: "buyer@example.test",
};
// 98.20 se convierte a 9820; no se reciben PAN, CVV ni códigos Yape.
```

### Ruta de inicio pendiente de S3-02

La futura `POST /api/payment/initiate` será un Route Handler Node.js. Recibirá una
identidad de orden y la intención estable; exigirá sesión y comprobación de origen
para esa acción del cliente. El servicio comprobará propiedad, estado/reserva, importe,
moneda e intentos previos. Persistirá la identidad antes de llamar al proveedor fuera
de la transacción de BD. Recuperará un intento incierto antes de permitir otro cargo.

El helper no comprueba acceso a BD ni implementa idempotencia distribuida por sí solo;
el tipo `PersistedPaymentSnapshot` expresa una obligación del servicio que lo invoque.
Por eso todavía no se conectó a una ruta pública ni a los pedidos manuales existentes.

## 4. Formulario oficial y Yape

Mi Cuenta Web usa el script documentado en el repositorio oficial [F1]:

```html
<script src="https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js"
        kr-public-key="CLAVE_PUBLICA_DE_PRUEBAS"></script>
<div class="kr-embedded" kr-form-token="TOKEN_GENERADO_POR_EL_SERVIDOR"></div>
```

En Next.js se cargará desde un componente cliente del checkout bajo demanda, con
`next/script` y ciclo de inicialización/limpieza conforme al SDK elegido. Los valores
se insertarán con APIs/props seguras; no concatenar HTML de entradas del cliente.
La clave pública puede llegar al navegador; la clave REST y la del HMAC no.
El token no debe almacenarse en el carrito local ni en logs.

El SDK Punto Web documenta Yape con número de celular y código de aprobación obtenido
de la app [F3]. Esos campos pertenecen al formulario del proveedor. Su aparición junto
a tarjetas requiere el producto y la cuenta habilitados; añadir el script de Mi Cuenta
Web no demuestra ese soporte. No construir un formulario ROSH para recoger ese código.

## 5. IPN y actualización de orden

Para Mi Cuenta Web, el ejemplo oficial recibe una notificación de formulario con
`kr-answer` y `kr-hash` [F1]. El helper de esta entrega verifica HMAC-SHA256 en tiempo
constante sobre el texto recibido, usando la contraseña REST de prueba. La clave HMAC
de retorno del navegador tiene otro contexto y no sustituye esa contraseña en la IPN.
No reserializar JSON antes de verificar. Contrastar las reglas exactas de codificación
y el payload real con el sandbox asignado antes de exponer el endpoint.

La futura `POST /api/payment/webhook` de S3-03 no exige cookie ni Origin de la tienda:
su autenticidad viene del contrato del proveedor. Tendrá límite de bytes, parseo
según Content-Type y validación estricta. Después de la firma se comprobarán comercio,
modo de pruebas, referencia, transacción, moneda, importe y estado efectivo.

Solo entonces una transacción Prisma registrará el evento único y cambiará pago/orden.
Notificaciones duplicadas/paralelas no repetirán efectos. Una reserva liberada con
ingreso tardío irá a conciliación, sin reservar/despachar silenciosamente. `UNPAID`
no se convierte automáticamente en cancelación: puede representar un estado no final.
No agregar ahora un `order.update({ status: "PAID" })` sin esas garantías.

La firma no prueba por sí sola que esa orden de ROSH deba aprobarse, y un helper de
criptografía no ofrece protección de replay sin persistencia. Las migraciones,
unicidad, carreras y outbox se implementarán en las historias correspondientes.

## 6. Validar esta primera entrega

```bash
node --import tsx --test tests/izipay-preparation.test.ts
```

Quince casos sin red real: importes, entrada inválida, configuración desactivada,
producto/modo, Basic Auth/destino fijo, respuesta correcta, errores HTTP/JSON/tamaño,
timeout sin reintento y firma íntegra/alterada/otro contexto.
No se añaden capturas de un checkout inexistente. La integración externa necesitará
evidencia separada del sandbox y pruebas transaccionales de BD, no solo estos mocks.

## 7. Siguiente paso

Identificar el paquete de pruebas del comercio: nombre del producto/panel, guía,
credenciales de test y confirmación de Yape. El desarrollador puede preparar el código;
la habilitación de la cuenta la proporciona Izipay. Después conectar S3-02 y S3-03,
conservando el circuito manual y documentando antes/durante/después de cada historia.

## Fuentes primarias revisadas

- F1: [Izipay: ejemplo oficial servidor Node.js](https://github.com/izipay-pe/Server-PaymentForm-NodeJS) y [formulario incrustado](https://github.com/izipay-pe/Embedded-PaymentForm-.NET). Es referencia de transporte, no código de negocio de ROSH; no se copian aceptación de totales del cliente ni logging de respuestas.
- F2: [Izipay SDK: inicio rápido](https://developers.izipay.pe/web-core/quickstart/).
- F3: [Izipay SDK: pago con código Yape](https://developers.izipay.pe/products/pay-with-yape-code/).
- F4: [Micropayment: identidad del proveedor](https://web.micropayment.de/en/terms-conditions/).
- F5: [PCI SSC: aclaración SAQ A y criterios de seguridad del sitio](https://blog.pcisecuritystandards.org/faq-clarifies-new-saq-a-eligibility-criteria-for-e-commerce-merchants).

Las páginas profundas de `secure.micuentaweb.pe/doc` devolvieron un contenedor sin
texto útil, incluso por descarga HTTP. Los ejemplos oficiales GitHub sí pudieron
leerse. Esos ejemplos no confirman habilitación comercial, el payload completo de la
cuenta de ROSH, su política de reintentos ni certificación PCI de esta aplicación.
