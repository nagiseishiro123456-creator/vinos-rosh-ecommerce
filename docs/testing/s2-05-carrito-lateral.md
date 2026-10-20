# S2-05 — Plan de QA del carrito lateral

Fecha de inicio: 2026-10-19 (America/Lima). Estado: diseño documentado, implementación
y ejecución pendientes. Base S2-04 `3c7f012…`, CI 39364960260: 98/98 servidor y
44/44 navegador históricos de esa entrega; no son resultados de S2-05.
[ADR previo](../decisions/0008-carrito-lateral.md).

## Aceptación prevista

- Panel/página/contador coherentes en invitado y cuenta; cantidades/importes confirmados.
- Dos adiciones concurrentes conservan ambos incrementos; comando repetido no vuelve
  a sumar y contenido cambiado con la misma identidad se rechaza.
- JSON/origen/sesión/usuario/límites/rate limit, datos privados y rollback verificados.
- Vacío, cargando/guardando, producto sin disponibilidad, red incierta/reintento y 401.
- Teclado, fondo modal, Escape, foco inicial/devuelto, scroll restaurado y controles >=44px.
- 320/390/768/1440 px; sin desbordamiento; movimiento normal y reducido sin bloquear CTA.
- Navegación y formularios de cuenta sin JS; regresiones de unión, checkout/reserva y pagos.
- Migración aditiva sobre fixtures antiguos; tipos/lint/build/auditoría y CI completa.

## Evidencia pendiente

Capturas originales del commit de aplicación aceptado, artefacto CI y SHA-256; revisión
visual, límites reales y resultados se añadirán tras ejecutar. No hay capturas ni checks
S2-05 declarados aprobados en este punto. Mantener las 150 capturas históricas intactas.

La historia termina con este QA actualizado, galería/manifiesto, backlog/progreso y PR
listo para revisión. Integración en S2-06; sin acciones en Render ni BD remota.
