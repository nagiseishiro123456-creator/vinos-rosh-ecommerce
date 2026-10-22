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

## Preflight comprobado el 2026-10-22 (America/Lima)

El propietario confirmó **My Workspace**. Se consultaron recursos, despliegues y SQL
de solo lectura con ese workspace explícito; no se cambiaron recursos ni variables.

| Elemento | Estado comprobado |
| --- | --- |
| Preview | Activa; servicio `vinos-rosh-ecommerce-preview`, rama main. |
| URL | https://vinos-rosh-ecommerce-preview.onrender.com |
| Último deploy live | `dep-db3bbrvlk1mc73a2bli0`, commit `b4831eab1eaf7c3486b4bf8643001edefb5decc2`, Fase 1. |
| Objetivo de actualización | main `83c8e5774af42d8b7c90dfd3135385faf3c8d0d9`, Sprint 2 integrado; no las ramas de pago. |
| PostgreSQL | Disponible, versión 16/free; 7 migraciones terminadas y ninguna revertida. |
| Datos, solo agregados | 6 usuarios, 4 productos, 10 pedidos, 10 pagos, 6 carritos y 15 movimientos. No se exportaron filas personales. |
| Caducidad informada por Render | 2026-11-06; la base gratuita no tiene PITR ni exportaciones administradas. |
| Build efectivo | `npm install && npx prisma generate && npm run build`; aún difiere del Blueprint del repositorio. |
| Arranque/health | `bash scripts/render-start.sh` / `/api/health`; el arranque aplica migraciones. |
| Auto deploy | `checksPass`; los commits de este trabajo llevan `[skip render]`. |

La actualización a main requiere aplicar cinco migraciones pendientes: 7 → 12. La
migración 13 de intentos de sandbox solo está propuesta en su rama; no forma parte de
esa actualización de preview. No se ha disparado un deploy ni aplicado SQL de escritura.

### Secuencia operativa preparada

1. Crear dump completo con PostgreSQL 16 y restaurarlo en una BD vacía aislada;
   comprobar datos/migraciones. [Procedimiento externo sin Docker](07-despliegue/backups-y-recuperacion.md#render-postgresql-16-exportación-externa).
2. Sincronizar el build efectivo en Settings con `render.yaml`:
   `npm install --global npm@11.9.0 && npm ci --include=dev && npx prisma generate && npm run build`.
   Mantener start, health, plan gratuito y flags de pago. No presumir que editar YAML
   cambió un servicio creado fuera de Blueprint.
3. Verificar nuevamente main/CI y ausencia de otro deploy; disparar una sola actualización.
   Registrar ID/SHA y esperar estado terminal live antes de afirmar que está publicada.
4. Verificar `/api/health`, 12 migraciones completas y conservación de datos; comprobar
   bolsa superior, carrito móvil y `/carrito`, con capturas reales de esa versión.
   El dump se usa para recuperar datos en un incidente; rollback de código no deshace BD.

El conector disponible permite consulta SQL de solo lectura y deploy, pero no obtener
una conexión para `pg_dump`, exportar respaldos ni editar el build existente. No hay
CLI de Render instalada en este entorno. Esas operaciones quedan pendientes por
un canal compatible; no se solicita pegar credenciales en el chat ni se reemplaza el
respaldo completo con el JSON parcial del panel. La confirmación del workspace ya está resuelta.

Documentación oficial verificada directamente en Markdown el 2026-10-22:
[deploys](https://render.com/docs/deploys), [health](https://render.com/docs/health-checks),
[recovery/exportación](https://render.com/docs/postgresql-backups) y [free](https://render.com/docs/free).
