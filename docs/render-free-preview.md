# Preview gratuito en Render

Este despliegue está preparado para **demostración y validación**, no para producción definitiva.

## Recursos

- Web Service: plan `free`.
- PostgreSQL: plan `free`.
- Pagos automáticos: desactivados.
- Yape/transferencia: desactivados hasta configurar datos reales.
- Cloudinary y Resend: no son obligatorios para levantar el preview.

## Limitaciones del nivel gratuito de Render

- El servicio web puede entrar en suspensión por inactividad.
- El primer acceso después de la suspensión puede tardar.
- La base PostgreSQL gratuita expira a los 30 días.
- No debe considerarse una estrategia de almacenamiento permanente.

## Flujo de arranque

`scripts/render-start.sh` ejecuta:

1. `prisma migrate deploy`.
2. Seed del administrador solo si existen `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
3. Arranque de Next.js escuchando el puerto asignado por Render.

## Administrador

No se guardan credenciales de administrador en Git.

Para habilitar el panel, configurar en Render:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (mínimo 12 caracteres)
- `ADMIN_FIRST_NAME` opcional
- `ADMIN_LAST_NAME` opcional

Después de guardar estas variables se debe redeplegar el servicio; el seed es idempotente.
