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
