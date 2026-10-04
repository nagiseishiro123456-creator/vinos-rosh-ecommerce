# Arquitectura — Vinos ROSH

## Estilo arquitectónico
Monolito modular sobre Next.js App Router. La interfaz, las rutas servidor, autenticación, validaciones y acceso a datos viven en un mismo proyecto, separados por módulos de negocio.

## Stack
- Next.js + React + TypeScript estricto
- Tailwind CSS + shadcn/ui + Lucide React
- PostgreSQL
- Prisma ORM
- Zod
- Auth.js / NextAuth Credentials + bcryptjs
- Cloudinary
- Resend
- Vercel/hosting compatible con Next.js

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
- Boleta y factura disponibles en checkout; integración tributaria pendiente de confirmación del cliente.
- Reseñas solo para compradores verificados con pedido entregado.
- Pagos desacoplados del pedido mediante la entidad `Payment`.
- Proveedores soportados: `CULQI`, `YAPE_MANUAL`, `TRANSFER_MANUAL`.
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
