# Pagos: Yape, Izipay y alternativas para ROSH

Investigación para S3-01, 2026-10-21 (America/Lima).
Estado: investigación preparada; proveedor/producto y condiciones comerciales pendientes.
Solicitud del propietario: revisar «ezepay», Yape y webs de referencia antes de elegir.

## Nombre y estado real del proyecto

Por el contexto peruano y la relación con Yape, la hipótesis de trabajo es **Izipay**.
No se asume que «EzePay» sea el mismo proveedor: existen servicios con nombres parecidos.
El propietario debe confirmar marca o enlace del proveedor antes de implementar un adaptador.

Base inspeccionada: `main` `83c8e5774af42d8b7c90dfd3135385faf3c8d0d9`.

| Área | Existe en el código | Falta |
| --- | --- | --- |
| Compra | Carrito invitado/cuenta, unión, panel, checkout y reserva transaccional. | Aceptación comercial del recorrido y comprobar qué versión ve el propietario. |
| Dinero | `Prisma.Decimal`, total calculado en servidor, snapshot de precios/envío, idempotencia. | Conciliación automática de proveedor y abonos. |
| Cobro | Yape/transferencia manual, reporte de operación y revisión administrativa. | SDK/API de Izipay y confirmación automática. |
| Registro financiero | Pagos, eventos, movimientos de inventario y conciliación manual de ingresos tardíos. | Desglose verificable bruto/comisión/neto y referencia de liquidación bancaria. |
| Comprobantes | Solicitud de boleta/factura y datos asociados al pedido. | Emisión fiscal electrónica; seleccionar el tipo no emite un comprobante. |
| Comunicación | Resend para recuperar contraseña y enlace de contacto WhatsApp. | Confirmaciones automáticas de pago por email/WhatsApp. |

`CULQI` en el enum y `PAYMENTS_CULQI_ENABLED` no prueban una integración activa.
El servicio de reserva acepta únicamente `YAPE_MANUAL` y `TRANSFER_MANUAL`.
No hay un módulo contable/ERP completo ni una pasarela Izipay implementada.

## Cómo encajan Yape e Izipay

Yape es un **medio de pago/billetera**. Izipay es un **proveedor que procesa el cobro**.
En la modalidad integrada, el cliente elige Yape dentro del checkout del proveedor;
el comercio integra Izipay. No necesita abrir una cuenta Izipay para comprar.

Yape indica oficialmente que el comercio puede incorporar compras por internet a
través de Culqi, Niubiz o Izipay [F1]. El SDK web de Izipay documenta tarjeta, QR,
código Yape y Plin Interbank [F2]. Para código Yape, el comprador usa su número y
código de aprobación de su app en el formulario del proveedor [F3]. La tienda no
debe solicitar la contraseña de la billetera ni registrar el código de aprobación.

### Tres modalidades que no deben confundirse

| Modalidad | Experiencia del cliente | Confirmación de ROSH | Consideración |
| --- | --- | --- | --- |
| Yape manual | Ve teléfono/QR de la tienda, paga y comunica su operación. | Personal verifica ingreso en cuenta y aprueba. | Ya existe; no valida automáticamente una captura. |
| Link individual de Izipay | Abre un enlace alojado por el proveedor para ese pedido. | Manual si solo se genera en panel; automática únicamente si hay contrato de API/IPN implementado. | Menor esfuerzo inicial; enlazar orden, importe y vencimiento. No usar un link genérico como comprobante de pago. |
| Izipay SDK/API | Elige Yape o tarjeta en el checkout soportado por su producto. | Servidor valida notificación firmada/consulta y actualiza una sola vez. | Mejor continuidad; exige habilitación comercial y pruebas. |

El retorno de un navegador con «éxito» es una señal de interfaz, no una confirmación bancaria.

## Sitios reales consultados

Se revisó su información pública de pagos; no se compró, inició sesión ni se inspeccionó
su backend. Sus páginas prueban los medios que anuncian, no cómo verifican cada operación.

| Sitio y fuente | Qué explica públicamente | Aprendizaje para ROSH |
| --- | --- | --- |
| [Estilos, estilos.pe](https://www.estilos.pe/metodo-de-pago/) [F4] | Un checkout Izipay con tarjeta, código Yape, Plin Interbank y QR; transferencias aparte. | Presentar medios de pago concretos dentro de una pasarela. No confundir este dominio con otra empresa de nombre parecido. |
| [KUMIR](https://www.kumir.pe/pages/medios-de-pago) [F5] | Yape a un teléfono y, por separado, redirección Izipay para tarjetas después de hacer el pedido. | La marca puede ofrecer simultáneamente un medio manual y otro procesado por pasarela. |
| [Deregalo, producto con vino](https://deregalo.pe/producto/regalos-para-mama/) [F6] | Enumera Yape/Plin/transferencia y tarjeta mediante Izipay o PayPal. | Ejemplo de presentación comercial; no demuestra Yape automático dentro de Izipay. |
| [Jumpseller, conector oficial de la plataforma](https://es.jumpseller.com/support/izipay/) [F7] | Configura credenciales/notificación; su guía aún advierte ausencia de billeteras en ese conector. | Los alcances de un plugin no se extrapolan al SDK de otro producto. No aplicar su prueba con dinero real a esta fase. |

## Condiciones que pueden cambiar la elección

Se descargó el PDF oficial de Izipay [F8]: 99 páginas, 1.162.237 bytes,
SHA-256 `9b47557d8a1c9ff58320c35c92a891d7f0c46665fcc5fc1aaad95b3c3dd2a27f`.
Se extrajo su texto y se inspeccionaron visualmente las páginas 27 y 35.

La página 27 vincula la modalidad multipago online a ventas mensuales superiores a
S/200.000 y evaluación. La página 35 trata **Link de pago de afiliación web** por
separado e incluye Yape. El apartado online conserva una promoción de 2024: no
demuestra gratuidad vigente. Pedir confirmación comercial escrita del producto disponible.

Referencias de costo, sujetas al contrato:

- Izipay online, tarjeta nacional: 3,44% más S/0,69, aplicando IGV [F8].
  Ejemplo aritmético, sin otros cargos: cobro S/100 → costo S/4,87 → neto S/95,13.
  No extrapolar esa tarifa a Yape ni a todos sus productos.
- Yape Empresa publica 2,95% sobre ventas diarias recibidas por QR/contacto/número [F9].
  No equivale a una tarifa de API de checkout; «manual» no significa necesariamente gratis.
- CulqiOnline publica para Yape 3,44% más USD0,20 [F10]. Sus condiciones de impuestos,
  mínimos y conversión deben cotejarse con la cotización; no convertir el cargo en
  dólares con un tipo de cambio inventado. La web indica afiliación sin costo [F11].

La tasa de una tarjeta internacional, el pago presencial/POS y el link de APP no se
deben usar como si fueran la tarifa del producto web elegido. No hay cotización
personalizada de ROSH ni habilitación de Yape automático confirmadas en esta entrega.

## Recomendación para elegir

1. Conservar el flujo manual durante la validación del negocio.
2. Si se confirma que el proveedor deseado es Izipay, solicitar **producto exacto**:
   Link de afiliación web o SDK/Punto Web con Yape; preguntar por habilitación y
   API/IPN. Un link operado manualmente puede ser una etapa intermedia, pero no cierra
   el objetivo de pago automático del Sprint 3.
3. Elegir Izipay como primer adaptador solo cuando sus condiciones encajen con ROSH.
   Si la modalidad requerida no está disponible, comparar **CulqiOnline + Yape**:
   es una alternativa explícitamente documentada por el proveedor y por Yape.
4. Implementar **un solo proveedor automático** inicialmente, con pagos manuales como
   alternativa deliberada y cobros automáticos desactivados por defecto hasta validar.

El criterio calidad/precio combina comisión efectiva del ticket habitual, disponibilidad
para el negocio, tiempo de abono y soporte técnico. No hay un ganador universal solo
por porcentaje; una comisión fija afecta más a pedidos pequeños.

## Diseño propuesto para Next.js

El token de sesión de Izipay se solicita desde backend [F12]. El componente de checkout
carga el SDK al necesitarlo. Los secretos permanecen en servidor; no se incorporan a
variables `NEXT_PUBLIC_*`. En ROSH se pueden usar Route Handlers con runtime Node.js,
Prisma y PostgreSQL; no hace falta añadir Express únicamente para esta integración.

Izipay documenta `urlIPN`, JSON, `payloadHttp` y `signature` [F13], y HMAC-SHA256 sobre
el mensaje original [F14]. El producto Mi Cuenta Web tiene otro contrato y ejemplo
Node.js (`formToken`, `kr-answer`, `kr-hash`) [F15]. **No mezclar esas familias de API**.
La cuenta asignada determinará cuál corresponde.

El retorno de redirección puede usar POST de formulario [F16]; tendrá ruta separada
de la IPN JSON. Los detalles de autenticación, consulta de estado, reintento, límites
y expiración se fijarán con la documentación del producto efectivamente habilitado.
No se inventan endpoints ni se reutiliza la sesión del cliente para autenticar la IPN.

## Información necesaria para la decisión

- Confirmar si «ezepay» significa Izipay; en caso contrario, enlace de la empresa.
- Si existe afiliación, identificar producto/panel y si Yape está habilitado; no pedir claves en el chat.
- Obtener condiciones de API/IPN, sandbox, consultas/reintentos, comisiones por cada medio,
  cargos fijos, mínimos, impuestos, abonos, devoluciones y posibles retenciones.
- Confirmar dominio/entorno HTTPS de pruebas y acceso público para notificaciones.
- Separar confirmación del pedido, constancia del proveedor y comprobante fiscal.

No se contactó a terceros, creó cuenta, contrató servicio ni efectuó transferencia.

## Fuentes y límites de vigencia

Consultadas el 2026-10-21 (America/Lima). Las condiciones comerciales se reconfirman al afiliar.

- F1: [Yape: incorporar compras por internet al comercio](https://www.yape.com.pe/preguntas-frecuentes/compras-por-internet/como-puedo-tener-la-opcion-de-compras-por-internet-codigo-de-aprobacion-yape-en-l).
- F2: [Izipay: SDK web](https://developers.izipay.pe/web-core/).
- F3: [Izipay: código Yape](https://developers.izipay.pe/products/pay-with-yape-code/).
- F4–F7: páginas enlazadas en la tabla de sitios.
- F8: [Izipay: términos PDF publicado en octubre de 2026](https://cdnwebb.izipay.pe/content-manager/pdfs/terminos/302/terminos), apartados 12.1 y 12.3. El buscador pudo indexarlo, aunque el lector web devolvió error; la descarga directa dio HTTP200 y cabecera PDF válida. El archivo se utilizó como fuente de revisión, no como comprobante contractual de ROSH.
- F9: [Yape Empresa: costo](https://www.yape.com.pe/preguntas-frecuentes/yape-empresa/yape-empresa-tiene-algun-costo).
- F10: [Culqi: comisión de CulqiOnline](https://ayuda.culqi.com/portal/es/kb/articles/cual-es-la-comision-de-culqionline).
- F11: [CulqiOnline: producto/tarifario](https://culqi.com/productos/online-pasarela-de-pagos/).
- F12: [Izipay: inicio rápido y token de backend](https://developers.izipay.pe/web-core/quickstart/).
- F13: [Izipay: notificaciones del SDK web](https://developers.izipay.pe/web-core/notifications/).
- F14: [Izipay: validación de firma](https://developers.izipay.pe/web-core/Modalidades/firma-validation/).
- F15: [Ejemplo oficial Node.js Mi Cuenta Web](https://github.com/izipay-pe/Server-PaymentForm-NodeJS).
- F16: [Izipay: redirección y retorno](https://developers.izipay.pe/web-core/modalidades/redirect/).
