# S2-04 — QA de unión de carritos

Fecha de apertura: 2026-10-19 (America/Lima). Estado: implementación preparada;
validación oficial y evidencia visual pendientes. Base S2-03 `b74c607…`, PR #11.
[ADR 0007](../decisions/0007-union-carritos.md) registrado antes del código en `6e66a55…`.

## Alcance implementado para verificar

Comprobante de importación por usuario/revisión en la misma transacción Serializable
que las cantidades. API autenticada con Origin, JSON estricto, límites reales y rate limit.
Formato local 2, sobre pendiente inmutable, Web Locks/cola y confirmación selectiva.
Fallback en memoria sin escrituras inseguras. Continuidad ingreso/registro y barrera
previa a checkout; precio y reserva siguen determinados por el servidor.

## Matriz de aceptación

| Área | Casos previstos | Estado |
| --- | --- | --- |
| Estado y destinos | Migración, duplicados, formato/corrupción, hidratación, límites, storage/locks, cola, dos pestañas, confirmación fallida, nuevas ediciones, cuenta diferente, URL interna | 16/16 locales aprobados, Node 24.19.0; no sustituyen PostgreSQL ni navegador. |
| Servicio/API | Suma y otras líneas intactas, replay, conflicto/carreras, stock/topes/retirados, rollback, usuario, origen/sesión, JSON/UTF-8/tamaño y rate limit | Pendiente CI PostgreSQL 16. |
| Migración | Adición sobre fixtures antiguos sin cambiar carritos/stock/pedidos/pagos; UNIQUE por usuario y FK/cascade | Pendiente contrato SQL y aplicación de 11 migraciones en CI. |
| E2E | Ingreso/registro/destino, dinero exacto, replay, dos pestañas/nuevas adiciones, respuesta perdida, ajustes, memoria, logout/expiración y otra cuenta | Pendiente CI en 320/390/768/1440 px y regresiones S1/S2. |
| Visual | Capturas originales de resultados, recuperación, registro, memoria y ajustes; revisión real y manifiesto | Pendiente ejecución y revisión. |

## Límites de la entrega

- Sin Web Locks no se promete persistencia/sincronización entre pestañas: se recupera lo
  legible en memoria y se avisa. Sin JS no hay importación local; se conservan formularios
  autenticados. El modo memoria se conserva por navegación SPA, no por recarga/cierre.
- Los comprobantes no expiran automáticamente. El resultado de replay es histórico;
  la página refresca el carrito/precio vigente antes de habilitar compra.
- El pendiente ligado a otra cuenta no se reasigna. No se guarda el carrito privado ni
  el resultado de cuenta en almacenamiento local. No se limpian selecciones por timeout.
- La transacción solo normaliza productos enviados; otras líneas de cuenta conservan sus
  reglas anteriores. La carrera de añadir mediante formularios de cuenta queda en S2-05.
- No se afirman pruebas de lector de pantalla, contraste medido, zoom ni Safari/Firefox.
- Sin paquetes de pago, cobros reales, servicios nuevos, merge o acciones en Render.

Al cerrar se sustituirá este estado por resultados de commits/runs exactos, incidentes,
galería con hashes y siguiente acción. No marcar la historia terminada antes de revisar CI.

## Primera ejecución y correcciones

Código `afa9f4c0967b1f99a063095b345800ba0752f747`, árbol
`8b835e6521b3cfe8b38379df8fbfb3b92d9f7aa9`: [CI 39337485869](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39337485869),
job `118350497192`. **96/96 servidor**, 11 migraciones, cuatro contratos SQL,
tipos/lint/build y auditoría de producción aprobados. Navegador: **18/44**, no aprobado.

- 24 casos de selección/unión encontraron rechazo 403 de origen legítimo: NextURL
  normaliza loopback. La corrección usa el origen público configurado, sin confiar en
  Host ni relajar el rechazo externo; se agrega una prueba del escenario de proxy.
- Dos regresiones de confirmación sin JS detectaron el contenido oculto. El HTML y CSS
  originales del trace muestran que `[hidden]` de Preflight en capa con `!important`
  prevalece sobre la restauración sin capa. Se cambia a un atributo de datos con CSS y
  alternativa `<noscript>`, conservando barrera JS y pruebas de formulario nativo.
- Revisión local adicional: impedir que una normalización de `/a/..//host` produzca
  un destino `//host`; permitir query interna codificada y conservar retorno tras sesión
  vencida. Se añaden aserciones de estos casos, sin permitir navegación externa.

Artefacto inicial `12226934877`, ZIP 174720872 bytes; SHA-256
`6466bbd85f356b9d07e2378f6169b86789e4318fac111110d46d7529735ec70e` verificado.
Se inspeccionaron HTML/CSS, errores y captura nativa para identificar las causas;
estas capturas de fallo no constituyen la evidencia final de aceptación.

Segunda ejecución: `7eadc38…`, [CI 39361542665](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39361542665),
job `118428631177`: **97/97 servidor y 40/44 navegador**. Se recuperan las pruebas de
origen y formularios nativos; pasan dos pestañas, respuesta perdida, registro, memoria,
expiración y otra cuenta a los cuatro tamaños. Los cuatro fallos restantes comprueban
un defecto visible: tras sumar 1 + 2, total/cantidad en BD eran 3 pero el input nativo
no controlado mantenía el valor DOM 1 aunque el atributo `value` ya era 3. Se remonta
únicamente ese input cuando cambia la cantidad confirmada por servidor, conservando
formulario/botón y envío nativo. No se debilita la aserción del valor real.
Además se comprueba foco en el resultado y se evita anidar retornos sucesivos al carrito.
