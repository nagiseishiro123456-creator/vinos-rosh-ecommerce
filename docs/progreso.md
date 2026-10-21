# Punto de avance

- Fase: 2. Sprint: 2. S2-01 documentada y verificada en rama (3 SP); restantes historias pendientes.
- Fecha de este punto de avance: 2026-10-18 (America/Lima).
- Inicio de Sprint 2 autorizado tras la propuesta de seis historias (26 SP preliminares).
- Base: main `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`, Sprint 1 integrado por PR #3–#8.
- CI final de esa base: [39096709609](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39096709609),
  67/67 pruebas, 16/16 casos de navegador y checks completos aprobados.
- Rama de entrega: `fase-2/sprint-02-recorrido-base`; integración pendiente. Los checks y
  el resultado de CI de esta entrega se registran en su PR.
- Alcance actual: documentos y capturas base; sin cambios en UI, lógica, dependencias ni esquema.
- Render no se reanuda ni despliega. La aceptación comercial/UAT no se infiere del inicio del sprint.

## S2-01 — Recorrido y referencia visual

[Plan del sprint](sprints/fase-2-sprint-02.md), [diagnóstico y flujo propuesto](ux/sprint-02-recorrido-compra.md)
y [QA](testing/s2-01-recorrido.md) documentados. 16 PNG originales del run de main,
generados 2026-10-17 en Perú y revisados 2026-10-18, conservados con manifiesto/hashes.
[Galería](evidencias/sprint-02/s2-01/README.md): ocho estados en escritorio y móvil.
No son nuevas capturas de una interfaz modificada; las 56 históricas del Sprint 1 no cambian.

Prioridades: overlays móviles, resumen posterior al botón, cortes de moneda, radios de
dirección y continuidad de registro. `En revisión`/`Boleta` ya están traducidos. El carrito
invitado, su unión y el panel lateral son propuestas para S2-03–S2-05, aún sin implementar.

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
La corrección aprobó CI 39096248346: 67/67 pruebas y 16/16 casos de navegador,
migraciones/contratos SQL, tipos, lint, build y producción sin hallazgos. La actualización
posterior a ese commit solo registra resultados en documentación; los checks del PR #8
y de main comprueban la cabecera final.
[Registro completo](testing/revision-integracion-sprint-01.md).

Render comprobado después de las cinco fusiones: web y PostgreSQL suspendidos, último
deploy `dep-db3bbrvlk1mc73a2bli0` sobre Fase 1. Se usó `[skip render]`; no hubo
reanudaciones, cambios de configuración ni migraciones remotas. El build configurado
en Render todavía usa `npm install`: sincronizar antes de un futuro despliegue.

## Siguiente acción
S2-02: reproducir overlays con scroll/foco reales y corregir jerarquía móvil, importes y
selección de direcciones. Mantener reglas de dinero/reserva y rutas del checkout.
Comparar con los ocho estados del baseline, añadir pruebas pertinentes y documentar
el antes/después. Antes de S2-03/S2-04: ADR de persistencia/estado y unión idempotente.
Durante cada historia: decisiones y estados en el PR. Al cerrar: QA, capturas con fuente,
backlog y este archivo. Motion sigue pendiente para S2-05; Home inmersivo queda en Sprint 5.

## Riesgos abiertos
- Conciliación ampliada: varias operaciones por pago, correcciones y devoluciones parciales/despachadas fuera del alcance actual.
- Docker y PowerShell no ejecutados en este contenedor; ver límites de S1-01.
- Dependencias de desarrollo revisadas: 5 avisos altos propagados desde braces, sin parche publicado.
  Auditoría de producción: 0. Seguimiento antes del lanzamiento, sin downgrade incompatible de Next.
- Ajustes móviles y de accesibilidad registrados en el diagnóstico S2-01. Separar el ID de
  pedido de su fecha comercial; conservar los identificadores históricos.
- La liberación de reservas abandonadas requiere ejecutar mantenimiento o acceder al pedido;
  no se añadió programación periódica ni servicios de pago.
- Render sigue suspendido como preview; main integrado no implica app desplegada. No se utilizó su BD.
