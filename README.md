# Vinos ROSH Ecommerce

E-commerce de producción para Vinos ROSH, construido a partir del prototipo visual validado y de los requisitos funcionales del cliente.

## Stack principal
- Next.js + React + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Zod
- Auth.js (Sprint 1)
- Cloudinary
- Culqi (tarjetas + Yape)
- Resend
- Vercel

## Estado actual
Sprint 0 — Fundación técnica.

Incluido:
- estructura Next.js
- TypeScript estricto
- Tailwind
- Prisma
- esquema de dominio inicial
- endpoint `/api/health`
- plantilla `.env.example`
- documentación de arquitectura

## Puesta en marcha local
1. Instalar Node.js LTS y PostgreSQL.
2. Clonar el repositorio.
3. Ejecutar `npm install`.
4. Copiar `.env.example` a `.env`.
5. Configurar `DATABASE_URL`.
6. Ejecutar `npx prisma generate`.
7. Ejecutar `npx prisma migrate dev --name init`.
8. Ejecutar `npm run dev`.
9. Abrir `http://localhost:3000`.

## Rutas iniciales
- `/` — storefront base
- `/api/health` — verificación del servicio

## Documentación
Ver `docs/architecture.md`.

## Próximo sprint
Autenticación y usuarios:
- registro
- login/logout
- sesiones
- roles CUSTOMER/ADMIN
- recuperación de contraseña
- perfil y direcciones
