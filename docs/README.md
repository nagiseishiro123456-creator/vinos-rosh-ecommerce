# Documentación de Vinos ROSH

Fecha de inicio de este registro: 2026-10-15 (America/Lima).
La documentación cambia en el mismo PR que el comportamiento. El historial de Git conserva versiones anteriores.

1. [Punto actual y siguiente acción](progreso.md)
2. [Backlog y secuencia de sprints](backlog.md)
3. [Sprint 1: plan, criterios y cierre](sprints/fase-2-sprint-01.md)
4. [Arquitectura vigente](architecture.md)
5. [Instalación y verificación reproducible](desarrollo-reproducible.md)
6. [Decisión 0001: dependencias y evidencia](decisions/0001-base-reproducible.md)
7. [QA S1-01](testing/sprint-01.md) y [QA S1-02](testing/s1-02-dinero.md)
   · [ADR 0002: dinero y confirmación](decisions/0002-dinero-y-confirmacion.md)
8. Capturas conservadas en Git: [S1-01](evidencias/sprint-01/README.md) · [S1-02](evidencias/sprint-01/s1-02/README.md) · [S1-03](evidencias/sprint-01/s1-03/README.md) · [S1-04](evidencias/sprint-01/s1-04/README.md) · [S1-05](evidencias/sprint-01/s1-05/README.md)
9. [Política de costos vigente](cost-policy.md)
10. [Preview Render](render-free-preview.md)
11. [Backups y recuperación](07-despliegue/backups-y-recuperacion.md)
12. [ADR 0003: reserva previa](decisions/0003-reserva-previa.md) · [QA S1-03](testing/s1-03-reserva.md)
13. [ADR 0004: idempotencia](decisions/0004-idempotencia-reserva.md) · [QA S1-04](testing/s1-04-idempotencia.md)
14. [ADR 0005: revisión y conciliación](decisions/0005-revision-conciliacion.md) · [QA S1-05](testing/s1-05-revision.md)
15. [Guía de pagos, devoluciones y conciliación](operacion-pagos-manuales.md)
16. [Cierre técnico, revisión y continuidad del Sprint 1](sprints/cierre-sprint-01.md)
17. [Revisión integral e integración del Sprint 1](testing/revision-integracion-sprint-01.md)
18. [Sprint 2: plan, historias y aceptación](sprints/fase-2-sprint-02.md)
19. [Recorrido de compra y diagnóstico UX](ux/sprint-02-recorrido-compra.md)
20. [QA S2-01](testing/s2-01-recorrido.md) · [Baseline visual S2-01](evidencias/sprint-02/s2-01/README.md)

## Cuándo documentar

| Momento | Registro |
| --- | --- |
| Inicio del sprint | Objetivo, historias y commit de partida. |
| Antes de una decisión relevante | ADR con alternativas, elección y consecuencias. |
| Cada historia / PR | Comportamiento real, configuración, migraciones y pruebas pertinentes. |
| Fin de sesión | Avance, bloqueos y siguiente acción en `progreso.md`. |
| Cierre del sprint | Evidencia, defectos pendientes y commit/PR de entrega. |
| Inicio del siguiente | Pendientes heredados, dependencias y nueva prioridad. |

No registrar contraseñas, `.env`, datos de clientes ni números de operación reales.
Una captura muestra una ejecución concreta, no demuestra por sí sola integridad transaccional.
Los documentos distinguen lo implementado, lo verificado y lo todavía propuesto.
