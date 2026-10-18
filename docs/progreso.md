# Punto de avance

- Fase: 2. Sprint: 1. Cinco historias revisadas e integradas en main (26 SP).
- Fecha de este punto de avance: 2026-10-17 (America/Lima).
- Incremento integrado: `3620f98556a4a9eaf6d4060e5568e345d74a489f` (PR #3–#7).
- Rama de cierre: `fase-2/sprint-01-cierre-integrado`, basada en main integrado.
- Estado: RI-01/RI-02 corregidos y verificados; CI de main detectó RI-03 de interferencia
  entre archivos de pruebas. Corregido el runner; validación del cierre pendiente.
- Candidato de código validado: `db61726caa9cbedd94506745b38c3d4a39e98be0`.
- Aceptación funcional del Product Owner por registrar; Render continúa suspendido.

## S1-01 conservada
Instalación reproducible, 7 migraciones, 15 pruebas y 2 smoke aprobados en su entrega.
10 capturas y resultados originales: [QA S1-01](testing/sprint-01.md).

## S1-02 conservada
Rama `fase-2/sprint-01-dinero-exacto`, basada en S1-01; integrada mediante PR #4 tras #3.
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

## Revisión e integración
RI-01 comprueba el rol actual en BD en pedido/envíos/backup; una sesión con ADMIN
revocado ya no conserva esos permisos. RI-02 exporta historial y conciliaciones con
snapshot consistente, sin secretos. [CI 39095704639](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39095704639)
aprobada: 67 pruebas, 16 casos de navegador, 10 migraciones, tres contratos SQL,
tipos/lint/build y producción sin hallazgos. Dos capturas nuevas de regresión:
[evidencia](evidencias/sprint-01/integracion/README.md); total 56, conservando las 54 históricas.

Se integró #3 → #4 → #5 → #6 → #7; cada árbol fusionado coincide con su cabecera validada.
La primera CI de main 39096006029 falló en el fixture de una prueba por conflictos
Serializable entre archivos paralelos (66/67). RI-03 aísla los archivos compartidos
con `--test-concurrency=1`; las carreras deliberadas dentro de los casos se conservan.
[Registro completo](testing/revision-integracion-sprint-01.md).

Render comprobado después de las cinco fusiones: web y PostgreSQL suspendidos, último
deploy `dep-db3bbrvlk1mc73a2bli0` sobre Fase 1. Se usó `[skip render]`; no hubo
reanudaciones, cambios de configuración ni migraciones remotas. El build configurado
en Render todavía usa `npm install`: sincronizar antes de un futuro despliegue.

## Siguiente acción
Completar CI del cierre y comprobar main tras integrarlo. Luego registrar aceptación
funcional y refinar Sprint 2 de UX móvil/accesibilidad antes de programarlo.
Antes: recorrido y criterios de aceptación. Durante cada historia: decisiones y estados
en el PR. Al cerrar: pruebas pertinentes, capturas identificadas y actualización de este
archivo/backlog. Motion sigue pendiente; respetar las reglas ya registradas.

## Riesgos abiertos
- Conciliación ampliada: varias operaciones por pago, correcciones y devoluciones parciales/despachadas fuera del alcance actual.
- Docker y PowerShell no ejecutados en este contenedor; ver límites de S1-01.
- Dependencias de desarrollo revisadas: 5 avisos altos propagados desde braces, sin parche publicado.
  Auditoría de producción: 0. Seguimiento antes del lanzamiento, sin downgrade incompatible de Next.
- Ajustes de UX móvil registrados en QA S1-02/S1-03. S1-03 traduce estados de pago/comprobante
  y fechas del detalle; falta normalizar la fecha del prefijo del número interno de pedido.
- La liberación de reservas abandonadas requiere ejecutar mantenimiento o acceder al pedido;
  no se añadió programación periódica ni servicios de pago.
- Render sigue suspendido como preview; main integrado no implica app desplegada. No se utilizó su BD.
