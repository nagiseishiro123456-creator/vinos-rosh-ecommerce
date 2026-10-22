# Backlog — Fase 2

Product Goal: compra móvil clara, total verificado en servidor, inventario consistente,
pago conciliable y operación trazable. La tienda está en preview gratuito.
Estimaciones preliminares; los puntos no representan horas.

## Sprint 1 — Integridad e instalación (26 SP)

| ID | Historia | SP | Estado |
| --- | --- | ---: | --- |
| S1-01 | Reproducir instalación, BD y comprobaciones, con evidencias. | 3 | Revisada e integrada en main (#3) |
| S1-02 | Calcular dinero de forma exacta en servidor. | 5 | Revisada e integrada en main (#4) |
| S1-03 | Crear pedido y reservar antes de presentar instrucciones de pago. | 8 | Revisada e integrada en main (#5) |
| S1-04 | Evitar pedidos duplicados mediante idempotencia persistida. | 5 | Revisada e integrada en main (#6) |
| S1-05 | Resolver revisión, vencimiento y concurrencia con trazabilidad. | 5 | Revisada e integrada en main (#7) |

Dependencias de entrega: S1-01 → S1-02 → S1-03 → S1-04 → S1-05.
Documentación y pruebas forman parte de cada historia.
Las cinco historias suman 26 SP revisados e integrados; ver [cierre técnico](sprints/cierre-sprint-01.md)
y [registro de integración](testing/revision-integracion-sprint-01.md). Aceptación funcional del
Product Owner por registrar. Sprint 2 integrado; el siguiente paso es refinar Sprint 3.

## Sprint 2 — Compra móvil, carrito y accesibilidad (26 SP integrados)

Inicio: 2026-10-18 (America/Lima), desde main `16074e1…`.
[Plan y aceptación por historia](sprints/fase-2-sprint-02.md) ·
[Recorrido y hallazgos](ux/sprint-02-recorrido-compra.md).

| ID | Historia | SP | Estado |
| --- | --- | ---: | --- |
| S2-01 | Diagnosticar y documentar recorrido, estados y baseline. | 3 | Revisada e integrada en main (#9) |
| S2-02 | Corregir jerarquía móvil, overlays, importes y navegación accesible. | 3 | Revisada e integrada en main (#10) |
| S2-03 | Preparar y conservar carrito invitado en el navegador. | 5 | Revisada e integrada en main (#11) |
| S2-04 | Unir carrito al ingresar/registrarse con recuperación idempotente. | 8 | Revisada e integrada en main (#12) |
| S2-05 | Ofrecer carrito lateral accesible y coherente con página completa. | 5 | Revisada e integrada en main (#13) |
| S2-06 | Verificar, revisar e integrar el incremento completo. | 2 | Revisada e integrada en main (#14) |

Los puntos no son horas ni velocidad garantizada. Si el refinamiento revela más alcance,
dividir y reestimar antes de comprometerlo. S2-01 no implementa todavía funciones de carrito.
16 capturas de main revisadas como baseline, separadas de las 56 del Sprint 1.
Cuenta obligatoria antes del checkout; stock solo se reserva al confirmar, no al añadir/unir.
S2-02 agrega comparación visual y pruebas de foco/layout a cuatro tamaños. Ver
[QA de S2-02](testing/s2-02-ux-movil.md), con CI oficial aprobada y cierre técnico documentado.

## Sprint 3 — Pagos y comunicación (26 SP propuestos, sin compromiso de capacidad)

[Plan, aceptación y secuencia documental](sprints/fase-2-sprint-03.md) ·
[Investigación y alternativas](investigacion/pagos-yape-izipay.md) ·
[Guía de acceso al carrito](guia-carrito.md).

| ID | Historia | SP | Estado |
| --- | --- | ---: | --- |
| S3-01 | Comprender acceso/versión y elegir proveedor/producto con condiciones verificadas. | 3 | Izipay solicitado para evaluar; producto/condiciones y aceptación pendientes. |
| S3-02 | Iniciar pago de la reserva con intento persistido y checkout de sandbox. | 5 | Transporte/cripto aislados preparados; endpoint/intentos/UI y sandbox externo pendientes. |
| S3-03 | Verificar IPN y aplicar resultado una vez, incluyendo concurrencia y pagos tardíos. | 8 | Pendiente. |
| S3-04 | Conciliar pago, costos y abono con referencias verificadas. | 3 | Pendiente. |
| S3-05 | Confirmar pedido por correo con outbox y recuperación de fallos. | 5 | Pendiente. |
| S3-06 | Revisar, comprobar regresión, integrar y demostrar el incremento. | 2 | Pendiente. |

Izipay se solicita expresamente para evaluar sandbox (2026-10-22); su producto web
y habilitación siguen pendientes. [Guía técnica](integraciones/izipay-sandbox.md) y
[QA de la primera preparación](testing/s3-02-base-izipay.md).
Antes de conectar el adaptador al checkout: concretar [ADR 0009](decisions/0009-pagos-automaticos.md) con el contrato
del producto real. La observación del propietario sobre encontrar el carrito mantiene
abierta la aceptación UX. S3-02 tiene una base aislada, desactivada y sin migraciones;
no se contabiliza como historia terminada ni como integración externa comprobada.

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
`useReducedMotion` y equivalente CSS obligatorios. Motion 14.4.0 incorporado en S2-05,
bajo demanda y solo para entrada/salida del panel. La preferencia se actualiza en vivo.

No se activan servicios de pago ni se modifica la política de costos con este backlog.

Dependencias de desarrollo: la instalación de CI S2-05 mantiene cinco avisos altos heredados;
revisar antes del lanzamiento. Auditoría de producción: cero hallazgos. Motion/lock exactos
incorporados sin cambios de entradas anteriores; ver [QA S2-05](testing/s2-05-carrito-lateral.md).
Los hallazgos heredados de importes, controles flotantes, resumen/CTA móvil y teclado
se abordaron en S2-02, con [QA y límites](testing/s2-02-ux-movil.md); conservar regresión.
`En revisión` y `Boleta` ya aparecen traducidos en main.
S2-05 entrega panel/estado compartido y comandos concurrentes idempotentes: [QA](testing/s2-05-carrito-lateral.md),
[ADR previo](decisions/0008-carrito-lateral.md) y [36 capturas](evidencias/sprint-02/s2-05/README.md).
S2-01–S2-06 suman 26 SP revisados e integrados mediante PR #9–#14, sin atribuir aceptación comercial.
[Revisión final](testing/revision-integracion-sprint-02.md): 117/117 servidor, 66/66 navegador y
restauración PostgreSQL aprobados; [cierre](sprints/cierre-sprint-02.md). Siguiente: refinar Sprint 3.
Ver [diagnóstico](ux/sprint-02-recorrido-compra.md) y [plan actual](sprints/fase-2-sprint-02.md).
