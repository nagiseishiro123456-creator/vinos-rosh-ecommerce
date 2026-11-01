# QA — Primer incremento del Sprint 6

2026-11-01, base f5ecac6 (#25). El propietario autoriza continuar y publicar con jose-israel.
Se conserva el Home local pendiente, sin incluirlo en este incremento.

Nueve pruebas unitarias: 7/7 local sin certificar lanzamiento; preview/desarrollo/orígenes;
catálogo/stock/cobertura vacíos; observaciones fallidas independientes; configuración
desconocida; medios manuales resueltos; datos de atención inválidos; credenciales
redactadas y proveedores completos/incompletos sin verificación externa.

Dos escenarios nuevos en escritorio/móvil (cuatro ejecuciones): actualización de datos
guardados sin cambiar pedidos/stock, estado de preview/proveedores, destinos útiles,
recorrido guiado y ausencia de overflow; rechazo a invitados, compradores y sesiones
administrativas cuyo rol fue revocado en la BD. Se captura el panel en ambos tamaños.

311/311 servidor locales sobre vinos_rosh_test, tipos y lint aprobados. Se esperan
102 ejecuciones de navegador sobre la base de 98. Compilación, contratos SQL,
restauración, navegador y Public assets deben pasar en CI para integrar.
El PR conserva los resultados del SHA final comprobado; esta previsión no acredita CI.

No se prueba una entrega real de correo, cobro ni publicación. Las pruebas de restauración
ya existentes usan PostgreSQL aislado; no acreditan un plan de copias del hosting definitivo.
La aceptación de ROSH no está registrada ni se considera completada por este incremento.
