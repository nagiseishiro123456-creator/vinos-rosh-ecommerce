# Vinos ROSH Ecommerce

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce)


E-commerce real para Vinos ROSH, construido con arquitectura monolítica modular sobre Next.js App Router.

## Stack
- Next.js + React + TypeScript estricto
- Tailwind CSS + Motion 14.4.0 (panel bajo demanda, movimiento reducido)
- PostgreSQL + Prisma ORM
- Auth.js / NextAuth Credentials + bcryptjs
- Zod
- Cloudinary (media)
- Resend (correo transaccional)
- Yape y transferencia manuales; Culqi contemplado en el modelo, integración automática pendiente

## Estado
Fase 2: Sprints 1 y 2 revisados e integrados en main. Sprint 2 incorpora compra móvil,
carrito invitado, unión idempotente y panel accesible; cierre técnico 2026-10-21.
El trabajo se entrega por historias pequeñas: ver [avance actual](docs/progreso.md),
[backlog](docs/backlog.md) y [plan del Sprint 1](docs/sprints/fase-2-sprint-01.md).
La tienda sigue siendo un entorno de validación; no hay lanzamiento comercial en este hito.

Para usar la compra: [cómo abrir el carrito](docs/guia-carrito.md).
Sprint 3 en refinamiento: [plan e historias](docs/sprints/fase-2-sprint-03.md) y
[comparación Yape/Izipay](docs/investigacion/pagos-yape-izipay.md).
La pasarela automática todavía no está implementada ni el proveedor elegido.
Izipay se evalúa para sandbox: [guía técnica y base aislada de pruebas](docs/integraciones/izipay-sandbox.md).
Ese código preparatorio está desactivado y no se conecta todavía al checkout.
[Intentos persistentes y límites](docs/integraciones/intentos-izipay.md) ·
[Estado verificado y actualización pendiente de Render](docs/render-free-preview.md).
[Inicio de pago protegido, aún desactivado](docs/integraciones/inicio-izipay.md).

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
`User`, `PasswordResetToken`, `Address`, `Category`, `Product`, `ProductImage`, `Cart`, `CartItem`, `CartImport`, `CartMutation`, `ShippingZone`, `Order`, `OrderItem`, `Payment`, `OrderEvent`, `PaymentReconciliation`, `Review`.

## Preview gratuito en Render

El repositorio incluye un `render.yaml` que crea:
- 1 Web Service Free para Next.js;
- 1 Render Postgres Free;
- migraciones Prisma automáticas al arrancar;
- health check en `/api/health`;
- pagos externos desactivados por defecto.

El botón **Deploy to Render** de arriba usa esta configuración.

> Render indica que los Web Services Free pueden suspenderse tras inactividad y que Render Postgres Free expira a los 30 días. Por eso este entorno es únicamente para demo/validación, no para producción definitiva.

## Hitos integrados y siguiente paso

Sprint 1 integrado: dinero exacto, reserva previa, idempotencia, revisión administrativa
y conciliación. [Cierre](docs/sprints/cierre-sprint-01.md) y
[guía de pagos](docs/operacion-pagos-manuales.md).

Sprint 2 integrado mediante PR #9–#14: selección invitada, unión al identificarse,
estado compartido entre panel/página/contador y compra móvil accesible.
[QA final](docs/testing/revision-integracion-sprint-02.md): **117/117 servidor y
66/66 navegador**, 12 migraciones/cinco contratos SQL y recuperación PostgreSQL aprobados.
[Seis capturas de cierre](docs/evidencias/sprint-02/integracion/README.md), conservando las
186 anteriores. [Cierre técnico y continuidad](docs/sprints/cierre-sprint-02.md).

El Sprint 3 tiene una propuesta documentada de pagos automáticos/notificaciones.
El siguiente paso es confirmar proveedor, producto y disponibilidad para ROSH antes
de implementar el adaptador. El entorno comercial y la aceptación funcional/UAT siguen pendientes.

## Verificación y evidencias

La instalación estándar usa `npm ci --include=dev` y el lockfile versionado.
Para preparar otra plataforma y ejecutar pruebas, seguir [la guía reproducible](docs/desarrollo-reproducible.md).
CI valida migraciones en PostgreSQL 16, pruebas existentes, tipos, lint y build.
También comprueba `/api/health` y genera capturas desktop/móvil con Playwright en una BD aislada.
CI también comprueba recuperación de identidades del carrito después de pg_dump/psql.
Resultados actuales y límites en [QA final del Sprint 2](docs/testing/revision-integracion-sprint-02.md);
[QA histórico del Sprint 1](docs/testing/sprint-01.md) conservado.
