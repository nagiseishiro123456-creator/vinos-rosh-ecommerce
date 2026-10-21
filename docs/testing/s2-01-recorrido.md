# QA — S2-01: recorrido y baseline

Fecha de revisión: 2026-10-18 (America/Lima).
Base: main `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`.
Rama: `fase-2/sprint-02-recorrido-base`. Alcance: documentación y evidencia; sin
cambios de comportamiento, dependencias, esquema ni infraestructura.

## Evidencia y procedencia

Se descargó el artefacto `12125430611` del
[run de main 39096709609](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39096709609),
aprobado sobre la base exacta. Se verificó SHA-256 del ZIP y se extrajeron 16 PNG
originales de `test-results/`, sin archivos duplicados del reporte ni recompresión.
Fecha de generación: 2026-10-17 en Perú (2026-10-18 UTC); revisión: 2026-10-18 en Perú.
No se afirma que las capturas fueran tomadas hoy ni que muestren las mejoras futuras.

Ocho estados × dos viewports: producto, acceso, carrito, entrega, confirmación,
resumen actualizado, reserva con instrucciones y operación en revisión.
Se inspeccionaron las 16 imágenes y se registraron hallazgos en
[el recorrido](../ux/sprint-02-recorrido-compra.md).
[Galería y manifiesto](../evidencias/sprint-02/s2-01/README.md).

| Comprobación | Resultado / alcance |
| --- | --- |
| Fuente de código | HEAD local y main remoto coinciden en `16074e1…` al iniciar; árbol de trabajo limpio. |
| Revisión por código | Carrito, auth/registro, producto, entrega, confirmación, instrucciones, encabezado, navegación y CSS. |
| Inspección visual | 16/16 PNG revisados; overlays móviles, resumen posterior y cortes de moneda identificados. |
| Procedencia | Commit/run/artefacto, fechas, nombres originales, dimensiones, bytes y hashes en manifiesto. |
| CI de la base | 67/67 pruebas Node, 16/16 casos Chromium; 10 migraciones, tres contratos SQL, tipos/lint/build y auditoría de producción sin hallazgos. |
| Validación documental | Enlaces locales, suma de SP, correspondencia de ocho estados/dos dispositivos y hashes comprobados antes de publicar. |
| CI de entrega | Se consulta en los checks del PR de esta rama; el resultado final se registra en su descripción para evitar commits que se citen a sí mismos. |

## Criterios de S2-01

- [x] Commit/rutas del recorrido actual y diferencia con la propuesta.
- [x] Plan de seis historias, 26 SP preliminares, dependencias y DoD.
- [x] Ocho estados de pantalla reales, escritorio/móvil, con procedencia revisada.
- [x] Hallazgos asignados por historia; traducciones ya resueltas no se duplican.
- [x] Jerarquía propuesta, cuenta antes de checkout y fusión con recuperación de fallos.
- [x] Criterios de teclado/móvil/movimiento reducido y documentación por etapa.
- [x] Punto de avance y siguiente acción: S2-02.

Los checks anteriores se refieren a entregables documentales, no a que las mejoras
de S2-02–S2-05 ya funcionen. La publicación del PR y su CI se completan como cierre de entrega.

## Límites

No se arrancó un servidor ni una BD nueva para esta historia: se inspeccionaron el
código exacto de main y sus capturas de CI. No se ejecutó navegación exploratoria
nueva, lector de pantalla, contraste, zoom ni validación geométrica a otros scrolls.
No se midieron Core Web Vitals ni conversión. La CI de la base prueba el flujo
autenticado, no un carrito invitado inexistente todavía. Chromium es la cobertura
automática actual; no afirmar cobertura Safari/Firefox.

Los datos de producto, cliente, dirección, cuenta y operación son sintéticos. No se
accedió a la BD comercial, no hubo pagos reales, reanudaciones ni despliegues en Render.
La suspensión remota no se volvió a consultar en esta historia; se conserva la restricción
operativa documentada al cierre del Sprint 1. No se crean servicios ni cargos adicionales.
