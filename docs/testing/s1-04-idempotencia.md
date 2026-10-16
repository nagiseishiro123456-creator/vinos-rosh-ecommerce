# QA — S1-04: confirmación idempotente

Fecha: 2026-10-16 (America/Lima). Estado: implementada; validación de BD/navegador pendiente.
Rama `fase-2/sprint-01-idempotencia`. Base S1-03 `b35a57896ba06eb35402f5b4d404f3233846df95` (PR #5).
[Decisión anterior al código](../decisions/0004-idempotencia-reserva.md).

## Alcance y casos
- Clave HMAC estable por cliente/resumen y huella de todos los campos aceptados, normalizados con Zod.
- UNIQUE(userId, checkoutKey) y check de pareja/formato; históricos mantienen NULL, sin deduplicación retroactiva.
- Lectura del resultado antes del carrito/proveedor/límite; reintento devuelve la misma orden/plazo/importe/estado.
- Seis confirmaciones simultáneas idénticas crean una orden, un pago y una reserva.
- Misma clave con proveedor, comprobante, datos fiscales, notas o resumen distintos: conflicto controlado.
- Dos solicitudes concurrentes distintas para la misma clave: una gana; la otra no sobrescribe ni reserva.
- Otro cliente o clave ausente/manipulada no recupera ni crea la orden ajena.
- Fallo real inyectado en PostgreSQL al insertar la orden, después del decremento: rollback de stock/clave;
  se retira el fallo y el mismo intento puede crear su orden.
- Pedido cancelado/vencido/pagado sigue siendo el mismo resultado; no se renueva ni descuenta otra vez.
- Nueva compra con líneas nuevas produce otra clave. Campos monetarios falsificados se ignoran.
- Proveedor deshabilitado impide crear; no impide recuperar una orden completada. Rotar el secreto tampoco rompe esa recuperación persistida.
- Navegador: abortar la respuesta DESPUÉS del commit, conservar notas/clave y recuperar desde dos pestañas.
- Navegador: conflicto con datos diferentes; formulario nativo sin JavaScript y reintento desde pestaña hidratada.
- SQL real de migración 9 sobre fixtures antiguas y unicidad/checks probados en esquema temporal con rollback.

## Preparación y resultados locales
22 pruebas sin BD aprobadas; Prisma validate/generate, tipos/lint y compilación local aprobados.
La primera comprobación de tipos detectó opcionales de Zod inferidos como propiedades requeridas;
se corrigió usando optional externo a la transformación y se repitió la comprobación.
Se revisó la implementación instalada de Next.js para no capturar sus redirecciones como errores de red.
El build finaliza sin PostgreSQL local; sus avisos de conexión no equivalen a una prueba de BD.
Los resultados de PostgreSQL/recorridos/capturas se registrarán después de CI.

## Aislamiento y límites
La inyección de fallo se limita a una clave de QA en `vinos_rosh_ci`/`vinos_rosh_test`,
con trigger/función temporales al caso, eliminados al terminar. No se usa Render.
Las fixtures visuales reinician solo los cupos de acciones de su cliente sintético entre escenarios.
Las acciones reales mantienen rate limiting, también para reintentos; no es un permiso ilimitado.
No hay transferencias reales; cuenta `QA-NO-TRANSFERIR`. No hay dependencias/servicios nuevos.
La recuperación conserva la orden, no demuestra un abono manual ni activa una pasarela.
La recuperación de red se prueba dentro del mismo despliegue y sesión; una pestaña de una
versión anterior puede requerir consultar Mi cuenta. No se guardan datos fiscales en localStorage.
S1-05 ampliará conciliación y revisión administrativa. Los pendientes de UX de S1-03 siguen registrados.
