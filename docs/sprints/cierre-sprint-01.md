# Sprint 1 — Registro de revisión y cierre técnico

Fecha: 2026-10-16 (America/Lima). Estado: cinco historias implementadas y verificadas
en ramas, 26 SP. Cierre técnico documentado. Revisión, integración y aceptación del Product Owner pendientes.

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
Cada PR depende del anterior; ningún cambio se ha fusionado ni desplegado en Render.

## Resultado técnico del incremento

Código final `2e90b606436d55d6e4f59cb8634a347a15e8b8d6`,
[CI 38970804257](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38970804257)
aprobada: 66 pruebas Node, 14 casos Chromium (escritorio/móvil), 10 migraciones y tres
contratos SQL sobre PostgreSQL 16, tipos, lint y build. Auditoría de producción: 0 hallazgos.
54 capturas originales preservadas con manifiestos. [QA final](../testing/s1-05-revision.md).
Se corrigieron durante QA la validación de importes malformados y el estiramiento del
formulario móvil; las pruebas negativas y de tamaño permanecen en la suite.

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
Falta revisar los cinco PR e integrar en orden
#3 → #4 → #5 → #6 → #7, retargeteando el siguiente a main y comprobando su diff y CI.
Revisar el incremento con el Product Owner y registrar aceptación/incidencias antes
de cerrar formalmente Sprint 1. Esta entrega no habilita lanzamiento comercial.

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

## Retrospectiva técnica propuesta

Mantener: decisiones antes del código, transacciones pequeñas, pruebas con BD aislada
y evidencia identificada por commit. Mejorar: validar formatos antes de convertirlos,
mantener visible el estado de integración y no confundir capturas con prueba de atomicidad.
Acción para Sprint 2: fijar criterios visuales/móviles antes de cambiar componentes y
revisar la pantalla con la misma disciplina que los resultados de servidor.
