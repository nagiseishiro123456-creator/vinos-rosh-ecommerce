# S3-05 — Confirmaciones y recuperación

2026-10-27. Base 5af345acfe3fc10dd1906fe141d466ac707cb449. El propietario pide avanzar,
publicar con jose-israel y entregar pasos para probar; confirma ausencia de acceso Izipay.
[Contrato](../integraciones/confirmaciones-correo.md) · [Guía](../guia-prueba-sprint-03.md).

**255/255 servidor locales**, vinos_rosh_test aislado, 15 migraciones. Siete casos nuevos
de contrato/plantilla/transporte y diez PostgreSQL: unicidad, aprobación/aviso atómicos,
fallo al guardar aceptación, recuperación del mismo sobre/clave, scheduling, configuración
o destinatario cambiados, ventana 23 h, cinco intentos, rol revocado y pedido reembolsado.
Se corrigió el reloj de una fixture que procesaba un segundo aviso antes de crearse.
Transportes sintéticos: ningún correo/cobro externo.

El runner prueba el contrato SQL en esquema propio: históricos conservados, cero backfill,
unicidad, leases/aceptación consistentes y cascade de prueba. En desarrollo, el preparador
verificó destino/historial y aplicó únicamente las pendientes aditivas 13–15, sin reset/seed.

TypeScript/ESLint locales aprobados. Se añade Playwright de aprobación, cola/contenido,
acceso por rol y envíos desactivados. Build/suite completa de la cabecera nueva se comprueban
en CI; los checks de la base anterior no se atribuyen a este código.

La primera ejecución de CI detectó que dos contratos de restauración aún exigían 14
migraciones. Ahora comparan los nombres de todas las migraciones comprometidas con el
historial restaurado, en lugar de mantener un contador fijo. Ambos contratos se repitieron
localmente con dump/restore nativos: carrito conservó cantidades/revisión y deduplicación;
reserva conservó un pedido, un intento, stock 7 y carrito posterior intacto, con 15
migraciones y cero solicitudes externas. El runner usa el usuario configurado en la URL
y mantiene sus guardas de CI, localhost y bases temporales. CI completa pendiente de repetición.

Navegador integrado: demo Pendiente → Reintento → Aceptado, móvil 390 sin desborde y cola
anónima redirigida a login. [Evidencias](../evidencias/sprint-03/s3-05-confirmaciones/README.md).
Se incluyen correcciones funcionales previas de carrito/registro y sus regresiones.
Home visual continúa pendiente. S3-05 no se acepta externamente aún; faltan entrega real,
operación y conexión a IPN. S3-02/S3-03 requieren acceso/contrato de Izipay.
