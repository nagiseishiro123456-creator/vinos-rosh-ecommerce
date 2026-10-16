# Punto de avance

- Fase: 2. Sprint: 1. S1-04 en validación; S1-01 a S1-03 conservadas.
- Fecha de este punto de avance: 2026-10-16 (America/Lima).
- Base S1-03: `e8b72d8f41b36eec6d3317e127e531affe4309d5` de S1-02 (PR #4).
- Rama actual: `fase-2/sprint-01-idempotencia`, basada en S1-03.
- Estado: S1-04 implementada; validación con PostgreSQL/navegador y evidencias pendientes. El Sprint 1 sigue abierto.
- PR actual: https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/5
- Código verificado: `411e47cc46dff14922c1affc74de02079b0b6b7d`.

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

## Última historia entregada: S1-03
La confirmación guarda pedido/reserva/pago pendiente antes de mostrar cuenta/QR.
La comunicación del pago usa el snapshot persistido sin descontar stock ni limpiar el carrito de nuevo.
Plazo por pedido; solo reservas sin pago comunicado vencen o se cancelan por el cliente.
Pagos en revisión mantienen reserva y requieren conciliación. Migración aditiva con backfill seguro.
CI: 40 pruebas, 6 casos de navegador y 8 migraciones aprobados, incluido contrato SQL sobre datos antiguos.
16 capturas revisadas y conservadas con hashes. [QA S1-03](testing/s1-03-reserva.md).

## Siguiente acción
Completar S1-04: PostgreSQL, contratos de migración y recorridos de respuesta perdida/conflicto,
capturas y cierre documental. [ADR 0004](decisions/0004-idempotencia-reserva.md) y
[QA S1-04](testing/s1-04-idempotencia.md). Después iniciar S1-05, revisión/conciliación ampliada.
Cadena de integración: PR #3 → #4 → #5. Tras integrar cada base, retargetear el siguiente PR
a main y revisar el diff. No se han fusionado ramas ni desplegado estos cambios.

## Riesgos abiertos
- Conciliación tardía y revisión administrativa ampliada: S1-05.
- Idempotencia persistida implementada en S1-04, pendiente de verificar con BD/navegador.
- Docker y PowerShell no ejecutados en este contenedor; ver límites de S1-01.
- Instalación completa de CI informa 5 vulnerabilidades altas incluyendo herramientas;
  auditoría solo de producción informa 0. Revisar dependencias de desarrollo antes de cerrar el sprint.
- Ajustes de UX móvil registrados en QA S1-02/S1-03. S1-03 traduce estados de pago/comprobante
  y fechas del detalle; falta normalizar la fecha del prefijo del número interno de pedido.
- La liberación de reservas abandonadas requiere ejecutar mantenimiento o acceder al pedido;
  no se añadió programación periódica ni servicios de pago.
- Render sigue como preview. No se ha fusionado main ni utilizado su BD.
