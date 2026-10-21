# ADR 0006 — Selección y persistencia del carrito invitado

Fecha: 2026-10-19 (America/Lima). Historia S2-03, 5 SP.
Base: S2-02, PR #10, cierre documental `496b8f4…`.
Decisión técnica registrada antes del código. Sin migraciones ni dependencias nuevas en S2-03.
Estado al 2026-10-21: implementada, verificada y revisada/integrada en main mediante PR #11
durante S2-06. [Revisión del incremento](../testing/revision-integracion-sprint-02.md).

## Estado y alternativas

Se elige un almacén pequeño por instancia de proveedor, Context para compartirlo y
`useSyncExternalStore` para consumir el estado externo del navegador. El proveedor
envuelve los hijos SSR sin convertir páginas, consultas ni catálogo en componentes cliente.
El snapshot del servidor y de la hidratación inicial es vacío y estable; la suscripción
lee el almacenamiento después del montaje, antes de permitir ediciones. No escribe un
carrito vacío sobre una selección guardada antes de leerla.

| Opción | Ventaja | Coste o límite |
| --- | --- | --- |
| Context + reducer y efectos | Sin dependencia adicional; patrón conocido. | Coordinar lectura inicial, efectos de escritura y eventos externos requiere más estados y cuidado para no sobrescribir la persistencia al hidratar. |
| Context + almacén externo + useSyncExternalStore (elegida) | Snapshot SSR explícito, actualizaciones síncronas, almacenamiento/eventos comprobables de forma aislada. | Se mantiene un pequeño adaptador propio; no es una base para estado global indiscriminado. |
| Zustand persist | API de estado/persistencia disponible. | Añade una dependencia para una selección pequeña; sigue necesitando diseñar hidratación, validación y recuperación. |

## Formato y límites

Clave `rosh-guest-cart-v1`. JSON `{version:1, items:[{productId, quantity}]}`.
Hasta 50 productos distintos, cantidad entera de 1 a 99, IDs CUID de 25 caracteres
generados por el esquema actual. Lectura local limitada a 16 KiB. Duplicados válidos
se agrupan con suma limitada a 99; se informa del ajuste. Campos adicionales se
descartan al normalizar y al escribir. Formato desconocido, JSON corrupto o líneas
inválidas reinician la selección con aviso; no se intenta inventar una migración.

No se persisten precios, importes, nombres, imágenes, stock, dirección, sesión,
credenciales ni datos de cuenta. El límite de productos pertenece al formato invitado;
no modifica reglas ni carritos históricos de usuarios autenticados.

Cada cambio válido se conserva después de cargar. Si leer o escribir lanza una excepción
(bloqueo o cuota), la selección funciona en memoria durante la visita; puede perderse
al recargar/cerrar y se comunica en la UI. No se borra por un fallo de red del servidor.
Eventos storage actualizan otras pestañas con política de última escritura; no se
promete una suma transaccional entre pestañas. La memoria degradada no se sustituye
silenciosamente por una copia antigua del disco. La unión idempotente es otra operación.
El banner opcional también tolera almacenamiento bloqueado: si no puede leer, no carga
trackers; si falla una escritura, conserva la elección explícita solo en memoria.

## Consulta al servidor

`POST /api/cart/preview`, JSON `{items:[{productId, quantity}]}`. Es pública y no lee
la sesión. Zod valida un máximo de 50 IDs únicos y cantidades 1–99; rechaza campos
extra, incluidos precios/totales del navegador. JSON limitado realmente al leer el
stream (16 KiB), no solo por Content-Length. Respuestas sin caché; sin habilitar CORS.
La protección existente limita a 120 consultas/minuto/IP; su identidad depende de la
cabecera del proxy como las demás rutas y no sustituye los límites del proxy de producción.

Consulta Prisma por lote sobre IDs activos y precio positivo, con su primera imagen.
No recupera cada producto mediante una consulta individual. No divulga metadatos de
productos inactivos/retirados. El servidor ajusta por stock y 99, excluye no disponibles
y devuelve cambios explícitos, filas e importes decimales exactos y subtotal. Un total
de vista previa puede superar el techo de pedido: se informa y no se presenta como
importe reservable. La reserva seguirá validando precio, firma y límite en servidor.

Solo se consulta catálogo; no se crean carritos, pedidos, pagos, reservas ni movimientos,
y no se modifica stock. El rate limiter sí utiliza su tabla de infraestructura existente.
400 inválido, 413 demasiado grande, 415 tipo incorrecto, 429 con Retry-After y 503 si
no se puede verificar. La UI conserva la selección, permite editar/eliminar y reintentar.

La vista consulta al cargar, cambiar cantidades, volver a la pestaña o pedir actualización.
Cancela/ignora respuestas de selecciones antiguas. Un resumen pendiente o fallido no
presenta importes viejos como vigentes; las cantidades aceptadas se normalizan sin
duplicar líneas y los ajustes se anuncian. Nada se reserva al añadir.

## UX, autenticación y secuencia

Producto: botón inmediato con JavaScript; sesión autenticada conserva su Server Action
y envío nativo. Carrito: ruta pública con carga, vacío, filas, error/reintento y resumen;
controles de al menos 44 px, foco visible y estado anunciado, sin animación de scroll.
Header invitado refleja unidades seleccionadas, sin copiar el carrito privado de nadie.
Sin JS se explica la limitación y se ofrecen catálogo e ingreso al carrito de cuenta.

S2-03 no importa aún la selección al identificarse. La UI lo explica: al ingresar se
abre el carrito de cuenta y la selección invitada permanece si el almacenamiento funciona.
En memoria se advierte que podría perderse al ingresar. No se
ofrece un botón que prometa continuar automáticamente con esa selección. S2-04 debe
definir identidad/contenido/unicidad y transacción de importación antes de cambiar ese
comportamiento; salir/cambiar de cuenta nunca exporta el carrito privado al invitado.
Panel lateral y Motion corresponden a S2-05.

## Verificación y documentación

Unitarias: formato/versiones, límites, duplicados, datos extra, lectura bloqueada,
cuota al escribir, memoria y suscripción/hidratación. Integración PostgreSQL: solicitud
inválida/manipulada, precios actuales exactos, reducción de stock, retirada, límites
HTTP y ausencia de mutaciones comerciales. Navegador: añadir sin sesión, editar,
recargar, eliminar, contador, cambios de precio/stock, red/reintento, almacenamiento
inaccesible/corrupto y ausencia de errores de hidratación; conservar regresiones autenticadas.

Durante implementación: cambios y resultados en PR dependiente de #10. Al cerrar:
QA, capturas originales/manifiesto, backlog y progreso; registrar límites de cobertura.
No fusionar PRs ni reactivar/desplegar Render con esta historia.

## Evolución posterior — S2-04

El formato 1 y los carritos separados descritos aquí corresponden a la entrega S2-03.
S2-04 migra la persistencia al formato 2, añade coordinación de pestañas/sobre pendiente
y unión idempotente con cuenta. Ver [ADR 0007](0007-union-carritos.md) y
[QA S2-04](../testing/s2-04-union-carritos.md). Los resultados históricos de S2-03
se conservan vinculados a su commit y capturas originales.
