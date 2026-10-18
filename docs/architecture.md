# Arquitectura — Vinos ROSH

## Estilo arquitectónico
Monolito modular sobre Next.js App Router. La interfaz, las rutas servidor, autenticación, validaciones y acceso a datos viven en un mismo proyecto, separados por módulos de negocio.

## Stack
- Next.js + React + TypeScript estricto
- Tailwind CSS 4 + CSS propio + Lucide React (shadcn/ui no se identifica en el código actual)
- PostgreSQL
- Prisma ORM
- Zod
- Auth.js / NextAuth Credentials + bcryptjs
- Cloudinary opcional para URLs de media; también existen imágenes locales en `public/`
- Resend opcional por HTTP para recuperación de contraseña; notificaciones de pedidos pendientes
- Render gratuito como preview, con servicio Node.js y PostgreSQL separados
- Motion pendiente de incorporar; no está instalado en S1-01

Estado comprobado al iniciar Sprint 2 (2026-10-18): Sprint 1 integrado en main
`16074e1fd97fc62f51fb863cfb3f46230a3df3d2`; Motion y carrito invitado/lateral siguen
sin implementar. [Diseño propuesto de Sprint 2](ux/sprint-02-recorrido-compra.md).

## Ejecución del backend
Server Actions (`src/modules/*/actions.ts`) para operaciones de formularios;
Route Handlers (`src/app/api/**/route.ts`) para HTTP, autenticación y health check.
Prisma Client accede a PostgreSQL mediante `DATABASE_URL`. No hay backend Express separado.
Toolchain fijado en S1-01: Node.js 22.23.3, npm 11.9.0 y `package-lock.json`.
La salida `standalone` requiere copiar `public` y `.next/static`; se usa
`scripts/prepare-standalone.mjs` en CI/preview y `COPY` en la imagen Docker.

## Módulos
- auth
- users
- products
- categories
- inventory
- cart
- checkout
- shipping
- orders
- payments
- reviews
- admin

## Decisiones de negocio
- Registro obligatorio antes de completar compra.
- Un administrador inicialmente.
- Tarifas de envío administrables por distrito.
- Checkout recopila los datos para boleta/factura; la emisión tributaria automática no está implementada.
- Reseñas solo para compradores verificados con pedido entregado.
- Pagos desacoplados del pedido mediante la entidad `Payment`.
- El modelo contempla `CULQI`, `YAPE_MANUAL`, `TRANSFER_MANUAL`. El flujo implementado es manual; Culqi queda pendiente.
- La dirección y los datos principales del producto se guardan como snapshot en el pedido para preservar historial.

## Pagos híbridos

### Automático
Culqi podrá confirmar pagos mediante webhook.

### Manual
Yape/transferencia generan primero un pago `PENDING` con reserva. El cliente comunica la operación para pasar a `UNDER_REVIEW`; el administrador verifica el abono y cambia a `PAID` o `REJECTED`.

### Regla
Nunca se almacenarán números completos de tarjeta ni CVV.

## Seguridad
- Secretos únicamente en variables de entorno.
- Contraseñas con bcrypt.
- Roles `CUSTOMER` y `ADMIN`.
- Validación servidor con Zod.
- Rutas administrativas protegidas por sesión y rol.
- S1-05 comprueba también el rol ADMIN vigente en BD en las transacciones administrativas.
- `.env` excluido de Git.

## Persistencia local
Desarrollo utiliza PostgreSQL 16 mediante Docker Compose. El script `scripts/setup-dev.ps1` automatiza secretos locales, arranque de BD, migración, seed y typecheck.

## Flujo de compra
Flujo implementado desde S1-03 e integrado con Sprint 1 (ver [QA histórico](testing/s1-03-reserva.md)):
1. Catálogo → carrito persistente del usuario autenticado.
2. Dirección con cobertura → resumen y comprobante/método, todavía sin datos bancarios.
3. Confirmar: transacción Serializable de snapshot firmado, orden PENDING_PAYMENT,
   líneas, pago PENDING, reserva condicional, movimientos y retiro de líneas del carrito.
4. Después del commit: instrucciones privadas en `/pedidos/[number]/pagar`, con importe y plazo persistidos.
5. Comunicar operación: cambio atómico a PAYMENT_REVIEW/UNDER_REVIEW, sin otra reserva ni limpieza de carrito.
6. Administrador verifica el abono y aprueba o rechaza. Preparación, envío y entrega tras PAID.
7. Tras DELIVERED se habilita la reseña verificada.

Cada reserva nueva tiene stockReservedAt/reservationExpiresAt; cancelar o vencer marca stockReleasedAt.
Solo PENDING_PAYMENT sin operación comunicada puede vencer/cancelarse por cliente. PAYMENT_REVIEW
conserva inventario mientras se concilia, incluso si pasó el plazo de reserva original.
Mantenimiento usa el índice `(status, reservationExpiresAt)` y procesa hasta 100 candidatos por ejecución;
abrir instrucciones o comunicar después del plazo ejecuta la misma liberación protegida.
Sin mantenimiento/acceso, la liberación puede demorarse. No se agrega cron de pago.
La migración 8 reconoce stock de pedidos históricos activos sin asignarles nuevos plazos.
Pendientes históricos sin marca de reserva se bloquean para revisión operativa; no se infiere su stock.
Ver [ADR 0003](decisions/0003-reserva-previa.md). Idempotencia de creación implementada desde S1-04 e integrada en main.

## Importes y confirmación — S1-02
Ver [ADR 0002](decisions/0002-dinero-y-confirmacion.md). El cálculo comercial usa
Prisma.Decimal. El navegador recibe cadenas con dos decimales; el formateo y la
suma de previsualización utilizan céntimos enteros, sin Prisma en el bundle cliente.
La Server Action autentica, valida con Zod y verifica la configuración del método.
`reserveManualOrder` relee carrito/dirección/tarifa en una transacción Serializable,
comprueba la firma del resumen y guarda líneas, subtotal, envío, total y pago del
mismo snapshot. Los cambios de contenido exigen revisar la pantalla actualizada.
Las acciones de administración rechazan precisión monetaria extra.
S1-02 no modificó el esquema. S1-03 incorpora la reserva previa; idempotencia persistida
se implementa desde S1-04 y está integrada. La firma confirma contenido y la clave identifica la operación.

## Confirmación idempotente — S1-04
Ver [ADR 0004](decisions/0004-idempotencia-reserva.md) y [QA](testing/s1-04-idempotencia.md).
La migración 9 agrega checkoutKey/checkoutRequestHash y UNIQUE(userId, checkoutKey), con check de pareja/formato.
La clave HMAC es estable por cliente y firma del resumen; no depende del clic o de memoria de una instancia.
La huella SHA-256 liga todos los datos aceptados y normalizados. El servidor busca primero el resultado
persistido: mismo contenido devuelve la orden existente; contenido distinto produce conflicto propio.
La creación sigue siendo Serializable. P2034 se reintenta; P2002 de checkout se resuelve leyendo la orden ganadora.
Stock, orden, identidad, pago y consumo de carrito se confirman juntos o revierten juntos.
La disponibilidad del proveedor se resuelve dentro de la creación usando la misma función que la UI;
no se exige al recuperar un resultado anterior. Replays no extienden plazos ni mutan carrito/stock/pagos.
Históricos conservan NULL, sin deduplicación retroactiva. No hay TTL de identidad mientras exista la orden.
El formulario hidratado conserva sus datos si falla la respuesta; las redirecciones de Next se relanzan
al framework. La acción nativa permite envío sin JavaScript. No se incorporan servicios/dependencias.

## Revisión y conciliación — S1-05

Implementado desde S1-05 e integrado en main. [ADR 0005](decisions/0005-revision-conciliacion.md)
y [guía operativa](operacion-pagos-manuales.md). La migración 10 agrega `OrderEvent` y
`PaymentReconciliation`, sin cambiar estados/importes anteriores ni inventar historial.
Los servicios comprueban el rol vigente, reclaman el pedido antes de pago/productos y
guardan el evento en la misma transacción. Aprobar exige un único pago manual, PEN,
importe exacto, operación y reserva no liberada. Rechazar requiere motivo y libera una vez.
Reembolsar registra dinero ya devuelto externamente, solo antes de despacho, y repone una vez.
El avance de cumplimiento vincula el estado esperado al formulario: reintentar no avanza otro paso.
Las acciones revalidan panel, inventario y detalles propios y muestran resultados/conflictos.

Un pedido cancelado puede tener un ingreso verificado tardío/discrepante. Se registra
el importe realmente recibido (Decimal) y la operación única del proveedor; después,
la referencia de devolución íntegra externa. Ni abrir ni cerrar conciliación cambia
estado comercial o inventario. Un caso por pago, sin edición del importe ni reasignación
de referencias. No hay pasarela, comisión ni servicio adicional con este flujo.
El historial incluye comunicación de pago, cancelación y vencimiento desde esta entrega.
