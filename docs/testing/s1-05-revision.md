# QA S1-05 — Revisión, conciliación y concurrencia

Estado: implementada y verificada en rama; revisión/integración pendientes. Fecha: 2026-10-16.
Base: `a457caf92fa1038bdaa6a1fc21fd8c96edddc86e` (PR #6).
PR: [#7](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/7).
Código verificado: `2e90b606436d55d6e4f59cb8634a347a15e8b8d6`.
CI y origen de imágenes: [38970804257](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38970804257),
job `117208858847`, aprobado. La CI comprueba el merge virtual con su base S1-04, que es ancestro del código indicado.

## Alcance

ADR [0005](../decisions/0005-revision-conciliacion.md) registrado antes del código.
Verificación del rol vigente en BD, decisiones administrativas atómicas, motivos e
historial; avance ligado al estado original del formulario; conciliación separada del stock.
Guía: [operación de pagos](../operacion-pagos-manuales.md).

## Verificación local

Node 22.23.3/npm 11.9.0. Prisma validate/generate, tipos, lint, build y 22 pruebas puras
aprobados. El build sin PostgreSQL local advierte de consultas de configuración no
disponibles; no cuenta como prueba de conectividad. Pruebas de BD y navegador se
ejecutan en CI con PostgreSQL 16 aislado, sin usar la base de Render.

## Matriz verificada en CI

- Aprobación/rechazo concurrentes: una decisión, reserva o liberación única.
- Aprobación/rechazo repetidos; cancelación/vencimiento simultáneos a revisión.
- Importe, moneda, marcadores y número de pagos inconsistentes: bloquear aprobación.
- Rol vigente: negar aprobación/rechazo/reembolso/avance/conciliación al retirar ADMIN.
- Dos reembolsos y conflicto envío/reembolso: preservar coherencia y stock.
- Formulario antiguo de preparación: no salta a enviado.
- Ingreso tardío y devolución repetidos: una conciliación y dos eventos, sin reactivar stock.
- Referencia bancaria duplicada: rollback de operación, caso y evento.
- Entradas monetarias malformadas y pedidos no cancelados: rechazados.
- Contrato SQL aditivo: preservar datos antiguos, tablas históricas vacías, unicidad,
  importe positivo y referencia obligatoria al cerrar.
- Navegador escritorio/móvil: permisos de páginas y Server Action real bajo sesión
  cliente, aprobación/reembolso, rechazo con motivo y conciliación de S/100.00.

## Hallazgos de dependencias

`npm audit --json` informa cinco altos por propagación del único aviso
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), en braces <=3.0.3,
usado por micromatch/fast-glob del plugin ESLint de Next. No son cinco fallos independientes.
`npm view braces version versions --json` devuelve 3.0.3 como última versión publicada.
No se cambió el lockfile: el downgrade sugerido a eslint-config-next 14.2.35 desalinearía
Next 16. No se suprime el aviso. Revisar disponibilidad de parche antes del lanzamiento.
La auditoría de producción de la CI final informa cero hallazgos. Los cinco de desarrollo
quedan identificados para seguimiento; no bloquean este incremento de prueba ni autorizan producción.

## Incidencias durante la verificación

- CI inicial [38931930840](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38931930840):
  migraciones/contratos SQL aprobados, 65/66 pruebas aprobadas. La refinación monetaria
  de Zod intentaba convertir `1,00` a Decimal pese al error de formato. Corregido usando
  la exclusión textual de `0.00` después del formato canónico; ninguna conversión se
  ejecuta para entradas inválidas. La prueba negativa original se conserva.
- CI [38932211301](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38932211301):
  66 pruebas y 14 casos de navegador aprobados. La inspección real de la captura móvil
  17 detectó un formulario estirado por flex-basis de escritorio al apilar sus acciones.
  Se elimina esa base vertical en móvil y se conserva una aserción del tamaño del botón
  (menor de 96px). Evidencias regeneradas sobre el código corregido y aprobadas en la CI final.

## Resultado final y evidencia

| Comprobación | Resultado |
| --- | --- |
| Instalación Node 22.23.3 / npm 11.9.0 | Aprobada con lockfile existente |
| Auditoría de producción | 0 vulnerabilidades |
| Prisma validate / generate | Aprobados |
| PostgreSQL 16 vacío | 10 migraciones aprobadas |
| Contratos SQL de migraciones 8, 9 y 10 | 3 aprobados; datos históricos preservados |
| Pruebas Node (unitarias e integración) | 66 aprobadas, 0 fallidas; 13 nuevas de S1-05 |
| Tipos / lint / build | Aprobados |
| Playwright Chromium | 14 casos aprobados, 0 fallidos, sin reintentos; 4 nuevos de S1-05 |
| Capturas propias de S1-05 | 10 originales revisadas: 5 escritorio y 5 móvil |

La prueba de autorización captura un payload administrativo válido e intenta ejecutarlo
con cookies de cliente: redirección a su cuenta, pedido todavía en revisión y ningún
evento de aprobación. Los tests de concurrencia inspeccionan BD, stock y movimientos;
las imágenes complementan estas aserciones.

[Galería y origen](../evidencias/sprint-01/s1-05/README.md), con manifiesto de tamaño,
dimensiones y SHA-256 por imagen; ZIP original `12077335953`, SHA-256
`9f6931507e5e2165093648e305e943bcbec921345ac3f464d15551c3d1ec1793`.
Se conservan en Git las 44 capturas de historias anteriores más estas 10: 54 en total.
Datos y referencias son sintéticos; no hubo pagos reales ni acceso a Render.

## Límites y entrega

Una conciliación por pago manual, devolución externa íntegra, sin abono automático,
reapertura de pedido ni reposición por devoluciones posteriores al despacho. No es
facturación tributaria ni prueba de una operación bancaria real. Historial desde esta
actualización, sin reconstruir eventos antiguos. Mantenimiento sigue siendo manual o
por acceso. Traducciones administrativas heredadas y pulido general de UX: Sprint 2.
La CI de este PR dependiente no sustituye revisar/integrar la cadena y volver a comprobar main.
