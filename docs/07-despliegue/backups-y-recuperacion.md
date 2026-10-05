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
