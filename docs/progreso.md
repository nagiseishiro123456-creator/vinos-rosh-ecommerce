# Punto de avance

- Fase: 2. Sprint: 1. Cinco historias implementadas y verificadas en ramas (26 SP).
- Fecha de este punto de avance: 2026-10-16 (America/Lima).
- Base S1-05: `a457caf92fa1038bdaa6a1fc21fd8c96edddc86e` de S1-04 (PR #6).
- Rama actual: `fase-2/sprint-01-revision-conciliacion`, basada en S1-04.
- Estado: cierre técnico documentado; revisión, aceptación e integración pendientes. Sprint 1 formalmente abierto.
- PR actual: https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/7
- Código S1-05 verificado: `2e90b606436d55d6e4f59cb8634a347a15e8b8d6`.

## S1-01 conservada
Instalación reproducible, 7 migraciones, 15 pruebas y 2 smoke aprobados en su entrega.
10 capturas y resultados originales: [QA S1-01](testing/sprint-01.md).

## S1-02 conservada
Rama `fase-2/sprint-01-dinero-exacto`, basada en S1-01; PR #3 sigue pendiente de integración.
Cálculo en Prisma.Decimal, cadenas monetarias canónicas, validación administrativa
y confirmación firmada del resumen. Lectura y persistencia dentro de la misma transacción.
CI aprobada: 7 migraciones sobre PostgreSQL 16, 28 pruebas, tipos/lint/build y 4 casos
de navegador (baseline y compra en escritorio/móvil). Se conservan 10 capturas nuevas
con manifiesto de origen/hashes. No se usó Render ni se realizaron pagos reales.
Detalle: [QA S1-02](testing/s1-02-dinero.md).

## S1-03 conservada
La confirmación guarda pedido/reserva/pago pendiente antes de mostrar cuenta/QR.
La comunicación del pago usa el snapshot persistido sin descontar stock ni limpiar el carrito de nuevo.
Plazo por pedido; solo reservas sin pago comunicado vencen o se cancelan por el cliente.
Pagos en revisión mantienen reserva y requieren conciliación. Migración aditiva con backfill seguro.
CI: 40 pruebas, 6 casos de navegador y 8 migraciones aprobados, incluido contrato SQL sobre datos antiguos.
16 capturas revisadas y conservadas con hashes. [QA S1-03](testing/s1-03-reserva.md).

## S1-04 conservada
Clave estable por cliente/resumen y huella completa persistidas con UNIQUE en la orden.
Reintentos idénticos recuperan la misma orden antes de leer carrito/configuración; contenido
distinto produce conflicto sin sobrescribir ni reservar. Los estados cerrados no renuevan reservas.
El formulario conserva datos ante respuesta perdida y mantiene envío nativo con sesión existente.
CI: 53 pruebas, 10 casos de navegador, 9 migraciones y dos contratos SQL aprobados.
Ocho capturas nuevas revisadas y conservadas con hashes. [QA S1-04](testing/s1-04-idempotencia.md).

## Última historia entregada: S1-05
ADR 0005, transacciones de revisión/reembolso, avance con estado esperado e historial.
Conciliación de ingresos sobre pedidos cancelados sin reactivar pedido ni modificar stock.
Rol ADMIN vigente comprobado en BD, motivos/confirmaciones/resultados y guía de operación.
CI final [38970804257](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38970804257):
66 pruebas, 14 casos de navegador, 10 migraciones, tres contratos SQL, tipos/lint/build
y auditoría de producción (0 hallazgos) aprobados. Corregidas validación monetaria y
altura del formulario móvil detectadas en QA. Diez capturas nuevas revisadas con hashes.
[QA S1-05](testing/s1-05-revision.md), [guía operativa](operacion-pagos-manuales.md)
y [cierre técnico del sprint](sprints/cierre-sprint-01.md). 54 capturas conservadas en total.

## Siguiente acción
Revisar el incremento y los PR; integrar después en orden y registrar aceptación/incidencias.
Cadena de integración: PR #3 → #4 → #5 → #6 → #7. Tras integrar cada base, retargetear el siguiente PR
a main y revisar el diff. No se han fusionado ramas ni desplegado estos cambios.
Tras integración/aceptación: refinar Sprint 2, UX móvil y accesibilidad, antes de programarlo.

## Riesgos abiertos
- Conciliación ampliada: varias operaciones por pago, correcciones y devoluciones parciales/despachadas fuera del alcance actual.
- Docker y PowerShell no ejecutados en este contenedor; ver límites de S1-01.
- Dependencias de desarrollo revisadas: 5 avisos altos propagados desde braces, sin parche publicado.
  Auditoría de producción: 0. Seguimiento antes del lanzamiento, sin downgrade incompatible de Next.
- Ajustes de UX móvil registrados en QA S1-02/S1-03. S1-03 traduce estados de pago/comprobante
  y fechas del detalle; falta normalizar la fecha del prefijo del número interno de pedido.
- La liberación de reservas abandonadas requiere ejecutar mantenimiento o acceder al pedido;
  no se añadió programación periódica ni servicios de pago.
- Render sigue como preview. No se ha fusionado main ni utilizado su BD.
