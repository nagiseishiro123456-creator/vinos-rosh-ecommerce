# Vinos ROSH Ecommerce

E-commerce real para Vinos ROSH, construido con arquitectura monolítica modular sobre Next.js App Router.

## Stack
- Next.js + React + TypeScript estricto
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Auth.js / NextAuth Credentials + bcryptjs
- Zod
- Cloudinary (media)
- Resend (correo transaccional)
- Pagos híbridos: Culqi + Yape manual + transferencia manual

## Estado
Sprint 0 completado y Sprint 1 en curso.

Ya existe:
- estructura Next.js
- modelo Prisma de producción
- PostgreSQL local automatizable con Docker Compose
- registro de clientes
- login y sesión JWT
- roles `CUSTOMER` / `ADMIN`
- carrito creado al registrar cliente
- seed idempotente del administrador inicial
- endpoint `/api/health` que verifica conexión real con PostgreSQL

## Inicio local recomendado (Windows)

Requisitos:
- Node.js LTS
- Docker Desktop con Docker Compose
- Git

Después de clonar el repositorio:

```powershell
npm run setup:dev
```

Ese comando:
1. crea `.env` local si no existe;
2. genera secretos aleatorios para desarrollo;
3. levanta PostgreSQL 16;
4. instala dependencias;
5. formatea y valida Prisma;
6. genera Prisma Client;
7. ejecuta la migración `init`;
8. crea/actualiza el usuario ADMIN;
9. ejecuta el typecheck.

Al finalizar:

```powershell
npm run dev
```

Abrir:
- `http://localhost:3000`
- `http://localhost:3000/api/health`

Prisma Studio:

```powershell
npm run prisma:studio
```

## Seguridad
- `.env` está ignorado por Git.
- Nunca se versionan claves reales.
- Las contraseñas se almacenan con hash bcrypt.
- La tienda no almacenará números completos de tarjeta ni CVV.
- Los pagos manuales y Culqi comparten una abstracción `Payment`.

## Modelo principal
`User`, `PasswordResetToken`, `Address`, `Category`, `Product`, `ProductImage`, `Cart`, `CartItem`, `ShippingZone`, `Order`, `OrderItem`, `Payment`, `Review`.

## Próximo hito
Validar localmente migración + registro + login + sesión + ADMIN y luego avanzar al catálogo real y al storefront premium basado en el prototipo aprobado.
