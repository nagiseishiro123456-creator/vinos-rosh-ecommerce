# QA — S2-03: carrito invitado

Fecha: 2026-10-19 (America/Lima). Rama `fase-2/sprint-02-carrito-invitado`.
[PR #11](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/11), dependiente de #10.
Base: cierre S2-02 `496b8f4…`, CI 39328457959 aprobada. Sin merge ni acciones en Render.
Estado: cierre técnico con CI oficial aprobada; revisión e integración pendientes.

## Decisión y comportamiento

[ADR 0006](../decisions/0006-carrito-invitado.md) registrado en `dd9d90c…` antes del
código (`6daea4e…`). No se agregan paquetes ni migraciones.

| Contexto | Estado y autoridad |
| --- | --- |
| Invitado | IDs y cantidades en `rosh-guest-cart-v1`; 50 productos, 1–99 unidades, 16 KiB. |
| Precio/stock | Consulta pública validada en servidor; moneda decimal exacta, sin Prisma en el bundle cliente. |
| Carrito de cuenta | BD y Server Actions existentes; no se copia al invitado ni se importa todavía. |
| Selección al ingresar | Con almacenamiento disponible se conserva localmente; en memoria se advierte posible pérdida. Se abre el carrito de cuenta; unión en S2-04. |
| Sin JavaScript | Selección invitada no disponible, explicación y enlaces. Los formularios autenticados mantienen su envío nativo. |

El proveedor usa Context y useSyncExternalStore con snapshot SSR estable. Primero lee
la selección; no la vacía con una escritura inicial. Escrituras bloqueadas o cuota
agotan solo la persistencia: se conserva la selección de la visita en memoria con aviso.
Formato corrupto/futuro/inválido reinicia con explicación; campos extra se descartan.
Eventos entre pestañas usan última escritura, y volver a una vista vuelve a leer el
disco si no hubo consumidores. No hay promesa de suma transaccional entre pestañas.

La consulta `/api/cart/preview` rechaza campos monetarios manipulados, IDs repetidos,
límites y JSON inválido. Aplica rate limiting existente, sin caché ni CORS adicional.
Consulta productos activos por lote y devuelve precio, ajustes y total; no expone
metadatos inactivos. No modifica carritos comerciales, stock, pedidos, pagos ni movimientos;
solo el rate limiter escribe su tabla existente. La reserva mantiene su validación propia.

La vista muestra importes por verificar mientras carga/falla, permite editar/eliminar,
reintentar y actualizar precios, y cancela/ignora respuestas antiguas. Se conserva el
foco al actualizar; al eliminar se devuelve al título. El contador refleja unidades.
Se incluyó tolerancia al almacenamiento inaccesible en el banner opcional: lectura
fallida no habilita trackers; decisión explícita sin escritura se conserva en memoria.

## Cobertura y resultados

| Capa | Casos y estado |
| --- | --- |
| Unitarias nuevas | 8/8 locales: normalización, límites, metadatos, SSR/lectura previa, bloqueo, cuota, eventos y retorno a vista. |
| Integración nueva | 5/5 aprobados en PostgreSQL 16: precio/stock, datos ocultos, HTTP/manipulación, rate limit y techo monetario. |
| Suite servidor | 80/80 aprobados en CI final 39332792422 (67 anteriores + 8 + 5), fuente `a71c295…`. |
| TypeScript y ESLint | Aprobados localmente y en CI. |
| Navegador | 28/28 aprobados: 20 regresiones + dos escenarios nuevos × cuatro tamaños. |
| Build/auditoría/migraciones | Build habitual aprobado, 10 migraciones y tres contratos SQL; auditoría de producción: 0 hallazgos. Sin migración nueva. |
| Capturas | 22 PNG originales de CI revisados visualmente y conservados con manifiesto/hashes; [galería](../evidencias/sprint-02/s2-03/README.md). |

Escenario 1: añadir sin sesión, actualizar, recargar con precio falso en almacenamiento,
retener una respuesta vieja mientras llega una nueva, reducir stock/cambiar precio,
retirar producto, comprobar ausencia de mutaciones comerciales, ingresar al carrito
privado y volver al invitado sin copiarlo. Escenario 2: JSON corrupto, lectura global
bloqueada, cuota de escritura, rechazo de analítica sin persistencia, red/reintento,
sin JS y formularios nativos de cuenta con sesión existente.
Ambos emulan movimiento reducido en 320, 390, 768 y 1440 px; registran errores de
página/hidratación. Los fixtures requieren BD QA y nunca usan Render.

El run inicial 39330488902 pasó los 80 casos de servidor y el recorrido principal
invitado en los cuatro tamaños. El escenario de recuperación se detenía al buscar
`role=alert` en toda la página: también coincidía el anunciador de navegación de Next.
Se acotó el selector al carrito; no se eliminó ninguna aserción ni se silenciaron
errores de página. El run 39331111400 sobre `43d1b7d…` volvió a pasar 80/80 servidor y avanzó los
cuatro casos de recuperación hasta la comprobación sin JS. El aviso sí estaba en
el DOM, verificado en la traza, pero el motor de texto de Playwright excluye NOSCRIPT
(comprobado en el paquete instalado). Se conserva la aserción de texto y visibilidad
usando un locator DOM explícito. Además, sin JS se ocultan carga y resumen pendientes;
la región no queda marcada como ocupada y ofrece enlaces nativos. Se agrega captura
de esa alternativa. El run 39332083032 sobre `aff3f16…` pasó 80/80 y 28/28. La inspección visual detectó
que el pie de ingreso todavía prometía permanencia incluso en memoria: se hizo
condicional y se agregaron aserciones de esa advertencia para bloqueo/cuota.
La repetición final sobre `a71c295…` aprobó 80/80 y 28/28 en [CI 39332792422](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39332792422).
[Registro y origen de capturas](../evidencias/sprint-02/s2-03/validacion-ci.txt).
Las cancelaciones de consultas obsoletas no se registran como error si la petición
ya está abortada; los errores reales siguen devolviendo 503 y selección conservada.

## Reproducción

Usar el entorno aislado de [desarrollo reproducible](../desarrollo-reproducible.md),
con migraciones/seed y fixture smoke, build habitual y Chromium de Playwright.
`npm test` incluye las unitarias y la integración. Para los casos nuevos de UI:

```sh
npm run test:smoke -- tests/smoke/guest-cart.spec.ts
```

Los proyectos pequeños solo agregan UX y carrito invitado; no multiplican todas las
pruebas históricas. No se registra aceptación comercial, lector de pantalla, contraste
medido, zoom ni Safari/Firefox como ejecutados. S2-04 deberá diseñar la importación
idempotente antes de cambiar el paso a cuenta; S2-05 incorpora panel y Motion.
