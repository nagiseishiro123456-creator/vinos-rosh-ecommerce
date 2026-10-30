# QA — S3-02 reserva autenticada

Fecha: 2026-10-23 (America/Lima). Incremento local, sin commit/PR nuevos ni despliegue.

## Resultado

**218/218 pruebas de servidor aprobadas**, ninguna omitida, contra PostgreSQL local real.
Se aplicaron las 14 migraciones existentes a una nueva base `vinos_rosh_test`, con nombre
separado de `vinos_rosh`. No se ejecutó reset ni seed sobre la base de desarrollo.
[Salida completa](../evidencias/sprint-03/s3-02-reserva-http/servidor.txt).

Casos nuevos: 15 pruebas unitarias del handler/lectura y 8 de integración PostgreSQL.
La regresión completa conserva importes exactos, carrito, reservas manuales, cancelación,
revisión, reembolso e inicio/intentos de Izipay con transporte simulado.

- Flags desactivados, opt-in independiente, origen, sesión, cuenta esperada y presupuesto.
- DTO estricto y datos fiscales normalizados; rechazo de importes/datos de pago del cliente.
- Bytes UTF-8 reales, longitud declarada falsa, stream por partes, timeout y desconexión.
- Dos confirmaciones concurrentes guardan una orden y un movimiento; sin pago ni token.
- Fallo simulado después del commit: mismo pedido recuperado, stock descontado una vez y carrito posterior conservado.
- Pedido cancelado recuperado sin reabrir ni extender fecha, incluso si las claves dejan de estar presentes y la ruta sigue habilitada.
- Dirección ajena, precio modificado, stock insuficiente y configuración no TEST sin consumo parcial.
- Reuso de clave manual conflictivo sin convertir ni borrar su pago.
- Undécima solicitud limitada de forma persistente.
- Errores y respuestas sin datos privados y con caché desactivada.

ESLint de los archivos del incremento, TypeScript completo y `git diff --check`: aprobados.
La ruta real del servidor Next local se comprobó: GET 405 y POST 404 con caché privada
porque permanece desactivada. [Resultado HTTP](../evidencias/sprint-03/s3-02-reserva-http/http-disabled.json).

## Reproducción local

Con Docker/PostgreSQL del proyecto encendido, dependencias y cliente Prisma generado:

```powershell
node --env-file=.env scripts/test-local-postgres.mjs
```

El runner solo acepta PostgreSQL en localhost/127.0.0.1, puerto 5432 y el contenedor conocido
`vinos-rosh-postgres`. Crea/reutiliza `vinos_rosh_test`, migra esa base y ejecuta los archivos
`tests/*.test.ts` secuencialmente. No cambia `.env`, no modifica la conexión del servidor
encendido y no despliega. Los tests crean datos sintéticos con limpieza registrada.
El registro incluye errores deliberadamente provocados de conflicto/rollback de Prisma;
no son fallos de la ejecución final.

Runtime local: Node 24.22.1, Prisma 6.19.3, PostgreSQL del contenedor local. CI mantiene
Node 22 según `.nvmrc`; no se atribuye ejecución remota a estos resultados.

## Límites

No hay formulario/SDK ni recorrido de pago automático en navegador. No se ejecutaron
cobros ni llamadas a Izipay y no se usaron claves externas. No se afirma aceptación de
sandbox, IPN, recuperación del proveedor o cierre del Sprint 3. Sin build de producción
para no sobrescribir `.next` del servidor de desarrollo compartido. Los cambios visuales
previos permanecen, sin nuevas modificaciones de diseño en este incremento.
