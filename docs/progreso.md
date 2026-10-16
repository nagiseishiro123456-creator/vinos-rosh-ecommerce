# Punto de avance

- Fase: 2. Sprint: 1. S1-01 y S1-02 verificadas en ramas.
- Fecha: 2026-10-15 (America/Lima).
- Base S1-02: `5c4c59e1b3806f4a131edbf74c4e8e4a62c17b17` de S1-01 (PR #3).
- Rama actual: `fase-2/sprint-01-dinero-exacto`.
- Estado: S1-02 implementada y verificada, lista para revisión; integración pendiente. El Sprint 1 sigue abierto.
- PR actual: https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/4
- Código verificado: `b72f85c061db70a4fefef6fd172bc26527c3aa4b`.

## S1-01 conservada
Instalación reproducible, 7 migraciones, 15 pruebas y 2 smoke aprobados en su entrega.
10 capturas y resultados originales: [QA S1-01](testing/sprint-01.md).

## Última historia entregada: S1-02
Rama `fase-2/sprint-01-dinero-exacto`, basada en S1-01; PR #3 sigue pendiente de integración.
Cálculo en Prisma.Decimal, cadenas monetarias canónicas, validación administrativa
y confirmación firmada del resumen. Lectura y persistencia dentro de la misma transacción.
CI aprobada: 7 migraciones sobre PostgreSQL 16, 28 pruebas, tipos/lint/build y 4 casos
de navegador (baseline y compra en escritorio/móvil). Se conservan 10 capturas nuevas
con manifiesto de origen/hashes. No se usó Render ni se realizaron pagos reales.
Detalle: [QA S1-02](testing/s1-02-dinero.md).

## Siguiente acción
Iniciar S1-03: documentar primero estados/transiciones/vencimiento en ADR; luego
crear orden y reserva antes de mostrar instrucciones de pago. Implementar migración
y pruebas de rollback/última unidad/carrito modificado; actualizar flujo, QA y capturas
en su PR. S1-04/S1-05 continúan pendientes. Integrar primero PR #3 y después #4;
no fusionar la rama de S1-02 sin su base ni desplegar sin revisión.

## Riesgos abiertos
- Revisión de pagos manuales que puede vencer automáticamente: S1-05.
- Pago comunicado antes de reservar stock: S1-03.
- Reintento de creación sin clave idempotente persistida: S1-04.
- Docker y PowerShell no ejecutados en este contenedor; ver límites de S1-01.
- Instalación completa de CI informa 5 vulnerabilidades altas incluyendo herramientas;
  auditoría solo de producción informa 0. Revisar dependencias de desarrollo antes de cerrar el sprint.
- Ajustes de UX móvil, traducción de estados y zona horaria registrados en QA S1-02.
- Render sigue como preview. No se ha fusionado main ni utilizado su BD.
