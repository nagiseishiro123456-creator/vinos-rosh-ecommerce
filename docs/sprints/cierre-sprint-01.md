# Sprint 1 — Registro de revisión y cierre técnico

Fecha de entrega inicial: 2026-10-16; revisión e integración: 2026-10-17 (America/Lima).
Estado: cinco historias revisadas e integradas en main, 26 SP. Cierre técnico verificado;
aceptación funcional del Product Owner por registrar. No habilita lanzamiento comercial.

## Objetivo y alcance

Crear pedidos con dinero exacto, reserva anterior al pago e idempotencia persistida;
permitir revisión manual coherente y trazable. Compromiso preliminar: cinco historias,
26 SP. Los puntos son una estimación de esfuerzo, no horas ni una medida de productividad.

| Historia | SP | Entrega | Evidencia propia conservada |
| --- | ---: | --- | --- |
| S1-01 Base reproducible | 3 | PR #3 | 10 capturas; QA inicial |
| S1-02 Dinero exacto | 5 | PR #4 | 10 capturas; QA de importes |
| S1-03 Reserva previa | 8 | PR #5 | 16 capturas; contrato de migración |
| S1-04 Idempotencia | 5 | PR #6 | 8 capturas; recuperación/conflicto |
| S1-05 Revisión y conciliación | 5 | PR #7 | 10 capturas; revisión/devolución/conciliación |

Los resultados de cada historia se conservan en [el índice](../README.md).
Se fusionaron en orden #3 → #4 → #5 → #6 → #7 conservando la historia.
[Registro de revisión e integración](../testing/revision-integracion-sprint-01.md).
Render y su BD siguen suspendidos; no se desplegó este incremento.

## Resultado técnico del incremento

Incremento integrado en `3620f98556a4a9eaf6d4060e5568e345d74a489f`.
El candidato con el mismo árbol, `db61726c…`, aprobó
[CI 39095704639](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39095704639):
67 pruebas Node, 16 casos Chromium (escritorio/móvil), 10 migraciones y tres
contratos SQL sobre PostgreSQL 16, tipos, lint y build. Auditoría de producción: 0 hallazgos.
56 capturas originales preservadas con manifiestos: 54 históricas y dos de
[regresión de permisos](../evidencias/sprint-01/integracion/README.md). [QA S1-05](../testing/s1-05-revision.md).
Se corrigieron durante QA la validación de importes malformados y el estiramiento del
formulario móvil; las pruebas negativas y de tamaño permanecen en la suite.
La revisión integral corrigió además permisos de sesiones con ADMIN revocado y
la omisión de historial/conciliaciones en el exportador comercial (versión 2,
snapshot de lectura consistente). Ambos tienen pruebas de regresión aprobadas.
La primera CI de main 39096006029 falló por interferencia entre archivos de tests en
la BD compartida (RI-03); el cierre serializa los archivos, manteniendo las carreras
reales dentro de cada escenario. La corrección `351f3d6c6b8f61c5e09e20b545f7784de146ea23`
aprobó [CI 39096248346](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39096248346)
con 67/67 pruebas y 16/16 casos de navegador y todas las comprobaciones anteriores.
El [PR #8 de cierre](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/8)
registra la entrega final, su fusión y los checks posteriores. Las actualizaciones posteriores
al código validado solo registran resultados documentales.

## Revisión funcional del incremento

El recorrido de demostración usa botellas, cliente, dirección y operaciones sintéticas.
Confirmar 3 × S/29.90 + S/8.50 = S/98.20; guardar una reserva antes de mostrar la cuenta;
simular respuesta perdida y recuperar el mismo pedido; comunicar operación y aprobar
sin descontar de nuevo; registrar devolución externa antes del despacho y reponer una vez.
Demostrar rechazo con motivo, ingreso tardío de S/100.00 y devolución registrada sin
reactivar el pedido. Ver [guía operativa](../operacion-pagos-manuales.md).
La demostración y los tests no equivalen a dinero realmente recibido en un banco.

## Definition of Done y siguientes pasos

Código, migraciones, permisos, pruebas, documentación y evidencias del alcance verificados.
Las cinco historias y los dos hallazgos de revisión están integrados; los árboles de
cada fusión coinciden con su cabecera validada. Registrar con el Product Owner la
aceptación funcional o incidencias en esta revisión. El cierre técnico permite refinar
Sprint 2; no sustituye la UAT ni las comprobaciones de lanzamiento de Sprint 6.

Heredar al Sprint 2: UX móvil del resumen/CTA, importes sin salto de moneda, controles
flotantes y accesibilidad; carrito invitado/lateral y fusión con la cuenta a refinar.
Antes del código: recorrido, criterios y estados. Durante: documentar decisiones en
el PR. Al cerrar cada historia: pruebas de teclado/móvil/movimiento reducido y capturas.
Motion sigue pendiente; aplicar las reglas del [backlog](../backlog.md).

## Riesgos y límites abiertos

- Cinco avisos altos de desarrollo por braces sin parche publicado. Producción sin
  hallazgos en CI final; volver a verificar antes del lanzamiento.
  No bajar Next 16 a 14 ni ocultar avisos para obtener un resultado verde.
- Mantenimiento de reservas requiere ejecución o acceso al pedido; no hay cron añadido.
- Pasarela automática/webhooks, emisión tributaria, avisos de pedido y mapas siguen
  en los sprints posteriores. Registrar un reembolso no realiza una transferencia.
- Conciliación: una operación/caso por pago, devolución íntegra externa. Casos múltiples,
  correcciones de registros y productos despachados requieren procedimiento adicional.
- Docker/PowerShell locales no se ejecutaron aquí; CI utiliza PostgreSQL 16 real.
- Fechas del prefijo interno del pedido y mejoras visuales heredadas quedan para UX.
- Render conserva un build con `npm install`, diferente del Blueprint reproducible.
  Antes de reanudar: sincronizar herramientas/build, verificar respaldo y estado de
  BD/migraciones. No se verificó el contenido de la BD remota ni se ejecutó el preview.

## Retrospectiva técnica propuesta

Mantener: decisiones antes del código, transacciones pequeñas, pruebas con BD aislada
y evidencia identificada por commit. Mejorar: validar formatos antes de convertirlos,
mantener visible el estado de integración y no confundir capturas con prueba de atomicidad.
Acción para Sprint 2: fijar criterios visuales/móviles antes de cambiar componentes y
revisar la pantalla con la misma disciplina que los resultados de servidor.
