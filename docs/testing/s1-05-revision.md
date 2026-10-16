# QA S1-05 — Revisión, conciliación y concurrencia

Estado: implementación preparada; CI PostgreSQL/navegador pendiente. Fecha: 2026-10-16.
Base: `a457caf92fa1038bdaa6a1fc21fd8c96edddc86e` (PR #6).

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

## Matriz preparada para CI

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
Auditoría de producción, migración y resultados finales se completarán con CI.

## Incidencias durante la verificación

- CI inicial [38931930840](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38931930840):
  migraciones/contratos SQL aprobados, 65/66 pruebas aprobadas. La refinación monetaria
  de Zod intentaba convertir `1,00` a Decimal pese al error de formato. Corregido usando
  la exclusión textual de `0.00` después del formato canónico; ninguna conversión se
  ejecuta para entradas inválidas. La prueba negativa original se conserva.
