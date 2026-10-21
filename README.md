# Vinos ROSH Ecommerce

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce)


E-commerce real para Vinos ROSH, construido con arquitectura monolítica modular sobre Next.js App Router.

## Stack
- Next.js + React + TypeScript estricto
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Auth.js / NextAuth Credentials + bcryptjs
- Zod
- Cloudinary (media)
- Resend (correo transaccional)
- Yape y transferencia manuales; Culqi contemplado en el modelo, integración automática pendiente

## Estado
Fase 2, Sprint 1: integridad del pedido e instalación reproducible.
El trabajo se entrega por historias pequeñas: ver [avance actual](docs/progreso.md),
[backlog](docs/backlog.md) y [plan del Sprint 1](docs/sprints/fase-2-sprint-01.md).
La tienda sigue siendo un entorno de validación; no hay lanzamiento comercial en este hito.

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
- Node.js 22.23.3 (archivo `.nvmrc`) y npm 11.9.0
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
5. valida Prisma sin modificar el esquema;
6. genera Prisma Client;
7. aplica todas las migraciones versionadas con `prisma migrate deploy`;
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
`User`, `PasswordResetToken`, `Address`, `Category`, `Product`, `ProductImage`, `Cart`, `CartItem`, `ShippingZone`, `Order`, `OrderItem`, `Payment`, `OrderEvent`, `PaymentReconciliation`, `Review`.

## Preview gratuito en Render

El repositorio incluye un `render.yaml` que crea:
- 1 Web Service Free para Next.js;
- 1 Render Postgres Free;
- migraciones Prisma automáticas al arrancar;
- health check en `/api/health`;
- pagos externos desactivados por defecto.

El botón **Deploy to Render** de arriba usa esta configuración.

> Render indica que los Web Services Free pueden suspenderse tras inactividad y que Render Postgres Free expira a los 30 días. Por eso este entorno es únicamente para demo/validación, no para producción definitiva.

## Próximo hito
Las cinco historias del Sprint 1 están revisadas e integradas en main (PR #3–#7):
dinero exacto, reserva previa, idempotencia, revisión administrativa y conciliación.
La revisión corrigió permisos revocados y completó el respaldo de los nuevos registros.
Ver [cierre técnico](docs/sprints/cierre-sprint-01.md),
[integración y CI](docs/testing/revision-integracion-sprint-01.md) y
[guía operativa de pagos](docs/operacion-pagos-manuales.md).
67 pruebas y 16 casos de navegador; 56 capturas conservadas. Render permanece suspendido,
sin despliegue de este incremento. Siguiente paso: refinamiento de Sprint 2 de UX/accesibilidad
y registro de aceptación funcional del Product Owner.
Sprint 2 iniciado el 2026-10-18: [plan](docs/sprints/fase-2-sprint-02.md),
[diagnóstico del recorrido](docs/ux/sprint-02-recorrido-compra.md) y
[16 capturas base](docs/evidencias/sprint-02/s2-01/README.md). S2-01 es documental;
carrito invitado/lateral y las correcciones de UI todavía están pendientes.

## Verificación y evidencias

La instalación estándar usa `npm ci --include=dev` y el lockfile versionado.
Para preparar otra plataforma y ejecutar pruebas, seguir [la guía reproducible](docs/desarrollo-reproducible.md).
CI valida migraciones en PostgreSQL 16, pruebas existentes, tipos, lint y build.
También comprueba `/api/health` y genera capturas desktop/móvil con Playwright en una BD aislada.
Los resultados ejecutados y las limitaciones se registran en [QA del Sprint 1](docs/testing/sprint-01.md).
