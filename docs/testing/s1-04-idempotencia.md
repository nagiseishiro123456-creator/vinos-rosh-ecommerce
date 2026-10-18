# QA — S1-04: confirmación idempotente

Fecha: 2026-10-16 (America/Lima). Estado: implementada y verificada en rama; integración pendiente.
PR #6, dependiente del PR #5.
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
La comprobación con PostgreSQL se ejecutó en CI, no en este contenedor.

## Resultado ejecutado
Código verificado: `184feaba3d17da1741b7ef16caf8839a5375a428`.
[CI aprobada: run 38927156735](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38927156735),
job `117061519579`. Node 22.23.3 / npm 11.9.0 / PostgreSQL 16.

| Comprobación | Resultado |
| --- | --- |
| Instalación / Prisma | Lockfile, validate/generate y 9 migraciones aprobados. |
| Contratos SQL | Backfill de S1-03 y nueva identidad de S1-04 aprobados sobre datos antiguos en esquemas temporales con rollback. |
| Lógica e integración | 53 aprobadas: 40 existentes adaptadas y 13 nuevas (4 sin BD, 9 de integración). |
| Navegador Chromium | 10 aprobados: 6 existentes y 4 nuevos de idempotencia, escritorio/móvil. |
| Tipos / lint / build | Aprobados. |
| Auditoría de producción | 0 hallazgos en la consulta; instalación completa conserva los 5 altos de herramientas ya registrados en S1-02. |
| Evidencia de S1-04 | 8 PNG originales revisados y conservados con manifiesto de procedencia/hashes. |

La prueba de red ejecutó la acción real, comprobó la orden ya guardada y descartó su respuesta.
El formulario conservó clave y notas; los dos reenvíos recuperaron el mismo número, importe S/98,20
y vencimiento. Tras cambiar catálogo/tarifa y añadir otro artículo al carrito, stock siguió en 7,
con una orden, un pago y un movimiento de reserva. Los cambios del carrito se conservaron.
La otra pestaña con notas diferentes produjo conflicto sobre ese mismo pedido, sin sobrescribirlo.
El envío sin JavaScript se probó con sesión de QA ya iniciada, Boleta y transferencia ficticia;
no equivale a verificar login o el formulario condicional de Factura sin JavaScript.
[Galería de S1-04](../evidencias/sprint-01/s1-04/README.md).

## Revisión visual y continuidad
Se revisaron las ocho imágenes: aviso de respuesta perdida con notas preservadas, recuperación
de la reserva original, conflicto en el detalle propio y reserva mediante envío nativo.
Los pendientes de composición móvil de S1-03 (controles fijos, resumen/CTA y moneda en una línea)
se conservan para Sprint 2. Las capturas largas mantienen la posición inicial de controles fijos.
Este incremento no modifica animaciones ni instala Motion.

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
