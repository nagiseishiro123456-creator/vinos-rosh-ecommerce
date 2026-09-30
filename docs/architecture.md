# Arquitectura inicial — Vinos ROSH

## Estilo arquitectónico
Monolito modular sobre Next.js. La aplicación web, las rutas del servidor, validaciones y acceso a datos viven en un mismo proyecto, pero separados por módulos de negocio.

## Stack
- Next.js + React + TypeScript
- Tailwind CSS
- shadcn/ui (se incorporará al comenzar componentes reutilizables)
- PostgreSQL
- Prisma ORM
- Zod
- Auth.js (Sprint 1)
- Cloudinary (media)
- Culqi (tarjetas + Yape)
- Resend (correo transaccional)
- Vercel (despliegue)

## Módulos previstos
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

## Decisiones de negocio ya cerradas
- Registro obligatorio para completar compra.
- Un administrador inicialmente.
- Tarifas de envío administrables por distrito.
- Boleta y factura como opciones del checkout; integración tributaria pendiente de definir con el cliente.
- Reseñas solo para compradores verificados con pedido entregado.
- Culqi como primera opción de pasarela; transferencia como método alternativo.
- Yape mediante integración automatizada de la pasarela.

## Seguridad
- No se almacenarán números de tarjeta ni CVV.
- Secretos únicamente por variables de entorno.
- Contraseñas siempre con hash seguro cuando se implemente autenticación.
- Autorización por rol para el panel administrativo.
- Validación de entradas en servidor con Zod.

## Flujo principal de compra
1. Usuario navega catálogo.
2. Agrega productos al carrito persistente.
3. Inicia sesión o se registra.
4. Selecciona dirección y distrito.
5. El sistema calcula la tarifa de envío.
6. Elige boleta o factura.
7. Selecciona pago.
8. Culqi procesa tarjeta/Yape.
9. Webhook confirma el resultado.
10. Pedido pasa a PAGADO y continúa preparación/envío.
11. Tras marcarse ENTREGADO, el cliente puede reseñar los productos comprados.
