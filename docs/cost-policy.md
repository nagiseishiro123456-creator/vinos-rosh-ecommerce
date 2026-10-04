# Política de costos — Vinos ROSH

## Objetivo

Durante el desarrollo y la primera etapa operativa, el proyecto debe evitar dependencias con pago obligatorio. Toda integración externa debe cumplir al menos una de estas condiciones:

1. Ser open source y ejecutarse localmente.
2. Tener un plan gratuito suficiente para el MVP sin obligación de activar un plan pagado.
3. Ser opcional y mantenerse desactivada por defecto.

## Decisiones vigentes

- Next.js, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Auth.js, Zod y bcryptjs: open source / sin licencia de pago para el proyecto.
- GitHub: se utilizará el nivel gratuito mientras sea suficiente.
- PostgreSQL local: Docker Compose, sin costo.
- Imágenes: se permite GitHub/raw GitHub y, opcionalmente, Cloudinary únicamente dentro de su plan gratuito. La aplicación no dependerá de Cloudinary para funcionar.
- Correos: Resend será opcional y solo se activará dentro del nivel gratuito. El sistema debe seguir funcionando si no está configurado.
- Culqi: opcional y desactivado por defecto. El flujo inicial soporta Yape y transferencia manual para evitar comisiones de pasarela.
- Hosting: durante desarrollo se ejecutará localmente y/o en alternativas gratuitas compatibles. No se contratará Vercel Pro ni otro plan pagado sin aprobación expresa del cliente.

## Regla de implementación

Ninguna característica debe asumir que existe una suscripción paga. Si un proveedor gratuito alcanza su cuota, la aplicación debe poder desactivar esa integración o migrar a otra alternativa antes de generar un costo.

## Variables actuales

```env
PAYMENTS_CULQI_ENABLED="false"
PAYMENTS_YAPE_MANUAL_ENABLED="true"
PAYMENTS_TRANSFER_MANUAL_ENABLED="true"
```

Esta política solo puede cambiar con aprobación explícita del propietario del proyecto/cliente.
