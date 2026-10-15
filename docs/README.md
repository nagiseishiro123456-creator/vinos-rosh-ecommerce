# Documentación de Vinos ROSH

Fecha de inicio de este registro: 2026-10-15 (America/Lima).
La documentación cambia en el mismo PR que el comportamiento. El historial de Git conserva versiones anteriores.

1. [Punto actual y siguiente acción](progreso.md)
2. [Backlog y secuencia de sprints](backlog.md)
3. [Sprint 1: plan, criterios y cierre](sprints/fase-2-sprint-01.md)
4. [Arquitectura vigente](architecture.md)
5. [Instalación y verificación reproducible](desarrollo-reproducible.md)
6. [Decisión 0001: dependencias y evidencia](decisions/0001-base-reproducible.md)
7. [Resultados QA y capturas](testing/sprint-01.md)
8. [Política de costos vigente](cost-policy.md)
9. [Preview Render](render-free-preview.md)
10. [Backups y recuperación](07-despliegue/backups-y-recuperacion.md)

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
