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
Yape/transferencia generan un pago `UNDER_REVIEW`. El administrador valida el código/comprobante y cambia el pago a `PAID` o `REJECTED`.

### Regla
Nunca se almacenarán números completos de tarjeta ni CVV.

## Seguridad
- Secretos únicamente en variables de entorno.
- Contraseñas con bcrypt.
- Roles `CUSTOMER` y `ADMIN`.
- Validación servidor con Zod.
- Rutas administrativas protegidas por sesión y rol.
- `.env` excluido de Git.

## Persistencia local
Desarrollo utiliza PostgreSQL 16 mediante Docker Compose. El script `scripts/setup-dev.ps1` automatiza secretos locales, arranque de BD, migración, seed y typecheck.

## Flujo de compra
Este es el flujo objetivo. En el código base el stock manual se reserva después
de que el cliente comunica la operación: S1-03 corregirá el orden y S1-05 la
cancelación automática de pagos ya comunicados. Ver el plan y QA del Sprint 1.
1. Cliente navega catálogo.
2. Agrega productos al carrito persistente.
3. Inicia sesión o se registra.
4. Selecciona dirección/distrito.
5. Se calcula envío.
6. Selecciona boleta o factura.
7. Elige método de pago.
8. Pago automático o revisión manual.
9. Pedido pasa a `PAID`.
10. Preparación, envío y entrega.
11. Solo tras `DELIVERED` se habilita la reseña verificada.

## Importes y confirmación — S1-02
Ver [ADR 0002](decisions/0002-dinero-y-confirmacion.md). El cálculo comercial usa
Prisma.Decimal. El navegador recibe cadenas con dos decimales; el formateo y la
suma de previsualización utilizan céntimos enteros, sin Prisma en el bundle cliente.
La Server Action autentica, valida con Zod y verifica la configuración del método.
`createManualOrder` relee carrito/dirección/tarifa en una transacción Serializable,
comprueba la firma del resumen y guarda líneas, subtotal, envío, total y pago del
mismo snapshot. Los cambios de contenido exigen revisar la pantalla actualizada.
Las acciones de administración rechazan precisión monetaria extra.
No se modifica el esquema de BD. Reserva previa e idempotencia persistida siguen
pendientes en S1-03/S1-04; la firma no sustituye esas garantías.
