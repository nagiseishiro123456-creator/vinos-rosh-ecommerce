# Punto de avance

- Fase: 2. Sprint: 1. S1-02 en validación; S1-01 conservada.
- Fecha: 2026-10-15 (America/Lima).
- Base: `b4831eab1eaf7c3486b4bf8643001edefb5decc2` de `main`.
- Rama actual: `fase-2/sprint-01-dinero-exacto`.
- Estado: S1-02 implementada, validación en curso. El Sprint 1 sigue abierto.
- PR: https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/3
- Código verificado: `e8910c5946faf502804705496527006a3f82309c`.

## S1-01 conservada
Instalación reproducible, 7 migraciones, 15 pruebas y 2 smoke aprobados en su entrega.
10 capturas y resultados originales: [QA S1-01](testing/sprint-01.md).

## Historia activa: S1-02
Rama `fase-2/sprint-01-dinero-exacto`, basada en S1-01; PR #3 sigue pendiente de integración.
Cálculo en Prisma.Decimal, cadenas monetarias canónicas, validación administrativa
y confirmación firmada del resumen. Lectura y persistencia dentro de la misma transacción.
9 pruebas sin BD y comprobaciones estáticas/build locales aprobadas.
Falta terminar CI con PostgreSQL y el recorrido autenticado con capturas.
Detalle: [QA S1-02](testing/s1-02-dinero.md).

## Siguiente acción
Completar validación de S1-02. Después iniciar S1-03: crear la orden y reservar
antes de mostrar instrucciones de pago. S1-04/S1-05 continúan pendientes.

## Riesgos abiertos
- Revisión de pagos manuales que puede vencer automáticamente: S1-05.
- Pago comunicado antes de reservar stock: S1-03.
- Reintento de creación sin clave idempotente persistida: S1-04.
- Docker y PowerShell no ejecutados en este contenedor; ver límites de S1-01.
- Render sigue como preview. No se ha fusionado main ni utilizado su BD.
