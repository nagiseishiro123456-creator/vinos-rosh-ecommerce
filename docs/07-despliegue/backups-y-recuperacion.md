# Respaldo y recuperación de PostgreSQL

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
