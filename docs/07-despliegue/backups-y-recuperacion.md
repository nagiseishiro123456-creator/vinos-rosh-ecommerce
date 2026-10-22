# Respaldo y recuperación de PostgreSQL

S3-02 añade un segundo contrato aislado: `node scripts/verify-cart-restore.mjs automatic`.
Aplica 14 migraciones, genera una reserva automática y un intento INITIATING, restaura
y verifica misma orden/referencia, stock descontado una vez y carrito posterior intacto.
No concede una segunda llamada al proveedor ni contiene un token. El dump completo debe
conservar `Order.paymentIntegration`, claves/huellas y `PaymentAttempt`; no limpiar esos
registros al recuperar. Es prueba sintética de CI, no recuperación real de Render.
[Contrato y límites](../integraciones/reserva-izipay.md) · [QA](../testing/s3-02-reserva.md).

## Objetivo

El MVP de Vinos ROSH debe poder respaldar y restaurar la base de datos sin contratar un servicio adicional. Para desarrollo y autoalojamiento se usan las herramientas nativas de PostgreSQL que ya existen dentro del contenedor Docker.

## Crear un respaldo

Con PostgreSQL levantado mediante Docker Compose:

```bash
npm run db:backup
```

El comando crea un archivo SQL en `backups/` con fecha y hora. Esa carpeta está excluida de Git para impedir que datos reales de clientes terminen en el repositorio.

## Restaurar

La restauración es una operación destructiva y debe realizarse únicamente sobre la base correcta:

```bash
npm run db:restore -- backups/vinos-rosh-AAAA-MM-DDTHH-MM-SS.sql
```

El script usa `ON_ERROR_STOP=1`: ante el primer error PostgreSQL detiene la restauración en lugar de aparentar éxito.

## Mantenimiento

```bash
npm run db:maintenance
```

Elimina buckets de rate limiting vencidos y tokens de recuperación de contraseña usados o caducados.

## Producción

Antes de lanzar datos reales se debe fijar una rutina de respaldo, por ejemplo una copia diaria y una copia externa periódica. No basta con tener un script: al menos una restauración de prueba debe ejecutarse antes de producción.

Nunca subir respaldos, `.env`, credenciales, datos de clientes o códigos de operación a GitHub.

## Carrito e idempotencia desde Sprint 2

La exportación JSON del panel es una copia comercial parcial y no permite restaurar
íntegramente una tienda. No incluye carritos ni comprobantes técnicos de sus operaciones.
Para recuperar la BD se necesita el dump SQL completo, incluidas Cart, CartItem,
CartImport, CartMutation, revisiones, huellas, claves únicas y migraciones aplicadas.
Eliminar esos comprobantes al recuperar datos puede permitir repetir una intención
invitada que el navegador aún conserva como pendiente.

S2-06 incorpora `scripts/verify-cart-restore.mjs` a CI con PostgreSQL 16. Usa bases
temporales aisladas y los mismos flags nativos de pg_dump/psql que los scripts locales:
genera una unión/comando con los servicios reales, restaura y comprueba replay sin suma,
conflicto de otra huella y una edición nueva. El SQL temporal no se publica como artefacto.
Consultar [resultados y límites](../testing/revision-integracion-sprint-02.md).
Este contrato no sustituye la restauración operativa del entorno real antes del lanzamiento.

## Render PostgreSQL 16: exportación externa

El plan Free no incluye PITR ni exportaciones administradas según la documentación
oficial verificada el 2026-10-22. Se necesita un dump propio antes de migrar la preview.
Este procedimiento está preparado, **no ejecutado** sobre la base remota.

Con herramientas cliente PostgreSQL 16 y una conexión externa con TLS configurada
privadamente en `ROSH_RENDER_DATABASE_URL`, elegir un destino seguro fuera de Git para
`ROSH_RENDER_BACKUP_PATH`. No pegar la URL, contraseña ni contenido del dump en el chat.

```bash
pg_dump --dbname="$ROSH_RENDER_DATABASE_URL" \
  --format=custom --no-owner --no-privileges \
  --file="$ROSH_RENDER_BACKUP_PATH"
pg_restore --list "$ROSH_RENDER_BACKUP_PATH"
```

`pg_restore --list` comprueba legibilidad del archivo, no demuestra que se pueda restaurar.
Validar la recuperación en una base **vacía y aislada**, con su URL privada en otra
variable `ROSH_RESTORE_DATABASE_URL`, y nunca contra el origen:

```bash
pg_restore --exit-on-error --no-owner --no-privileges \
  --dbname="$ROSH_RESTORE_DATABASE_URL" "$ROSH_RENDER_BACKUP_PATH"
```

Comparar migraciones completas, pedidos/pagos/stock/carritos y restricciones entre
origen y copia. Guardar fecha, SHA-256 y resultado sin datos sensibles en el registro
de despliegue; conservar el archivo en almacenamiento privado persistente. No subirlo
a GitHub ni a artefactos públicos de CI. No crear recursos de pago sin decisión explícita.

Preflight y pasos de la actualización pendiente en [preview Render](../render-free-preview.md).
Fuentes: [backups](https://render.com/docs/postgresql-backups) y [Free Postgres](https://render.com/docs/free#free-postgres).
