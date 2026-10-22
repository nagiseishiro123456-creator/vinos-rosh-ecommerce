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
21. [QA S2-02 y límites de validación](testing/s2-02-ux-movil.md) · [Comparación antes/después](evidencias/sprint-02/s2-02/README.md)
22. [ADR 0006: carrito invitado](decisions/0006-carrito-invitado.md) · [QA S2-03](testing/s2-03-carrito-invitado.md) · [Capturas](evidencias/sprint-02/s2-03/README.md)
23. [ADR 0007: unión idempotente](decisions/0007-union-carritos.md) · [QA S2-04](testing/s2-04-union-carritos.md) · [32 capturas](evidencias/sprint-02/s2-04/README.md)

24. [ADR 0008: panel y comandos de cuenta](decisions/0008-carrito-lateral.md) · [QA S2-05](testing/s2-05-carrito-lateral.md) · [36 capturas revisadas](evidencias/sprint-02/s2-05/README.md)

25. [Revisión e integración S2-06](testing/revision-integracion-sprint-02.md) · [Cierre técnico Sprint 2](sprints/cierre-sprint-02.md) · [Seis capturas nuevas](evidencias/sprint-02/integracion/README.md)

26. [Cómo abrir el carrito y comprobar la versión](guia-carrito.md)
27. [Sprint 3: propuesta, historias y documentación](sprints/fase-2-sprint-03.md)
28. [Investigación: Yape, Izipay, sitios de referencia y costos](investigacion/pagos-yape-izipay.md)
29. [ADR 0009 propuesto: pago automático](decisions/0009-pagos-automaticos.md) · [QA del refinamiento S3-01](testing/s3-01-refinamiento.md)

30. [Guía del desarrollador: Izipay sandbox y familias de API](integraciones/izipay-sandbox.md) · [QA de la base aislada S3-02](testing/s3-02-base-izipay.md)

31. [Intentos persistentes de sandbox y límites](integraciones/intentos-izipay.md) · [QA PostgreSQL S3-02](testing/s3-02-intentos.md)

32. [Inicio protegido y contrato HTTP de sandbox](integraciones/inicio-izipay.md) · [QA de coordinación y ruta S3-02](testing/s3-02-inicio.md)

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
