# Backlog — Fase 2

Product Goal: compra móvil clara, total verificado en servidor, inventario consistente,
pago conciliable y operación trazable. La tienda está en preview gratuito.
Estimaciones preliminares; los puntos no representan horas.

## Sprint 1 — Integridad e instalación (26 SP)

| ID | Historia | SP | Estado |
| --- | --- | ---: | --- |
| S1-01 | Reproducir instalación, BD y comprobaciones, con evidencias. | 3 | Implementada y verificada en rama; integración pendiente |
| S1-02 | Calcular dinero de forma exacta en servidor. | 5 | Implementada y verificada en rama; integración pendiente |
| S1-03 | Crear pedido y reservar antes de presentar instrucciones de pago. | 8 | Implementada; validación de BD/navegador en curso |
| S1-04 | Evitar pedidos duplicados mediante idempotencia persistida. | 5 | Pendiente |
| S1-05 | Resolver revisión, vencimiento y concurrencia con trazabilidad. | 5 | Pendiente |

Dependencias: S1-01 → S1-02 → S1-03/S1-04 → S1-05.
Documentación y pruebas forman parte de cada historia.

## Secuencia posterior, sujeta a refinamiento

| Sprint | Objetivo | Documentación antes / durante / al cerrar |
| --- | --- | --- |
| 2 | UX móvil, carrito invitado/lateral y accesibilidad. | Recorrido y fusión del carrito / componentes y estados / evidencias de teclado, móvil y movimiento reducido. |
| 3 | Pago automático, conciliación y comunicación. | Proveedor y estados / webhooks, notificaciones y comprobantes / sandbox e incidencias. |
| 4 | Dirección, cobertura y costo de entrega. | Zonas y tarifa / mapas, permisos y cuotas / cobertura y fallos. |
| 5 | Rendimiento, SEO y Motion contextual. | Medición inicial / caché, imágenes, metadatos y animación / comparación antes-después. |
| 6 | Aceptación y preparación de producción. | Plan de lanzamiento y recuperación / operación y monitoreo / UAT, restauración y versión liberada. |

Reglas de Motion para los sprints de UI: componentes con `'use client'` en primera línea;
scroll/parallax solo en Home desktop (>=768px) sin preferencia de movimiento reducido;
producto con microinteracciones y CTA inmediato; catálogo/carrito/checkout sin scroll complejo.
`useReducedMotion` y equivalente CSS obligatorios. Motion sigue pendiente de instalar.

No se activan servicios de pago ni se modifica la política de costos con este backlog.

Pendientes detectados al verificar S1-02: revisar las dependencias de desarrollo señaladas
por la instalación completa de CI antes del cierre de Sprint 1; en Sprint 2, traducir
estados técnicos, evitar saltos de línea en moneda/importe y revisar controles flotantes,
posición del resumen y CTA móvil. Ver [QA S1-02](testing/s1-02-dinero.md).
