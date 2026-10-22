# Arquitectura — Vinos ROSH

## Preparación en rama — S3-02

El Sprint 3 prepara Mi Cuenta Web V4 con adaptador, intentos persistidos y
[ruta protegida de inicio](integraciones/inicio-izipay.md). Está desactivada con opt-in
separado; no se conecta al checkout existente. El intento se guarda antes de llamar
fuera de BD; el token solo se entrega tras registrar su hash y revalidar la reserva.
No confirma pagos ni cambia pedidos manuales. Producto/test keys, reserva automática,
recuperación, SDK e IPN siguen pendientes. [QA](testing/s3-02-inicio.md).

## Estilo arquitectónico
Monolito modular sobre Next.js App Router. La interfaz, las rutas servidor, autenticación, validaciones y acceso a datos viven en un mismo proyecto, separados por módulos de negocio.

## Stack
- Next.js + React + TypeScript estricto
- Tailwind CSS 4 + CSS propio + Lucide React (shadcn/ui no se identifica en el código actual)
- PostgreSQL
- Prisma ORM
- Zod
- Auth.js / NextAuth Credentials + bcryptjs
- Cloudinary opcional para URLs de media; también existen imágenes locales en `public/`
- Resend opcional por HTTP para recuperación de contraseña; notificaciones de pedidos pendientes
- Render gratuito como preview, con servicio Node.js y PostgreSQL separados
- Motion 14.4.0 fijado desde S2-05; panel cliente bajo demanda, sin scroll complejo

Estado comprobado al iniciar Sprint 2 (2026-10-18): Sprint 1 integrado en main
`16074e1fd97fc62f51fb863cfb3f46230a3df3d2`; Motion y carrito invitado/lateral siguen
sin implementar en esa base. [Diseño de Sprint 2](ux/sprint-02-recorrido-compra.md).
La evolución posterior se documenta al final de este archivo y en los PR dependientes.

## Ejecución del backend
Server Actions (`src/modules/*/actions.ts`) para operaciones de formularios;
Route Handlers (`src/app/api/**/route.ts`) para HTTP, autenticación y health check.
Prisma Client accede a PostgreSQL mediante `DATABASE_URL`. No hay backend Express separado.
Toolchain fijado en S1-01: Node.js 22.23.3, npm 11.9.0 y `package-lock.json`.
La salida `standalone` requiere copiar `public` y `.next/static`; se usa
`scripts/prepare-standalone.mjs` en CI/preview y `COPY` en la imagen Docker.

## Módulos
- auth
- users
- products
- categories
- inventory
- cart
- checkout
- shipping
- orders
- payments
- reviews
- admin

## Decisiones de negocio
- Registro obligatorio antes de completar compra.
- Un administrador inicialmente.
- Tarifas de envío administrables por distrito.
- Checkout recopila los datos para boleta/factura; la emisión tributaria automática no está implementada.
- Reseñas solo para compradores verificados con pedido entregado.
- Pagos desacoplados del pedido mediante la entidad `Payment`.
- El modelo contempla `CULQI`, `YAPE_MANUAL`, `TRANSFER_MANUAL`. El flujo implementado es manual; Culqi queda pendiente.
- La dirección y los datos principales del producto se guardan como snapshot en el pedido para preservar historial.

## Pagos híbridos

### Automático
Culqi podrá confirmar pagos mediante webhook.

### Manual
Yape/transferencia generan primero un pago `PENDING` con reserva. El cliente comunica la operación para pasar a `UNDER_REVIEW`; el administrador verifica el abono y cambia a `PAID` o `REJECTED`.

### Regla
Nunca se almacenarán números completos de tarjeta ni CVV.

## Seguridad
- Secretos únicamente en variables de entorno.
- Contraseñas con bcrypt.
- Roles `CUSTOMER` y `ADMIN`.
- Validación servidor con Zod.
- Rutas administrativas protegidas por sesión y rol.
- S1-05 comprueba también el rol ADMIN vigente en BD en las transacciones administrativas.
- `.env` excluido de Git.

## Persistencia local
Desarrollo utiliza PostgreSQL 16 mediante Docker Compose. El script `scripts/setup-dev.ps1` automatiza secretos locales, arranque de BD, migración, seed y typecheck.

## Flujo de compra
Flujo implementado desde S1-03 e integrado con Sprint 1 (ver [QA histórico](testing/s1-03-reserva.md)):
1. Catálogo → carrito persistente del usuario autenticado.
2. Dirección con cobertura → resumen y comprobante/método, todavía sin datos bancarios.
3. Confirmar: transacción Serializable de snapshot firmado, orden PENDING_PAYMENT,
   líneas, pago PENDING, reserva condicional, movimientos y retiro de líneas del carrito.
4. Después del commit: instrucciones privadas en `/pedidos/[number]/pagar`, con importe y plazo persistidos.
5. Comunicar operación: cambio atómico a PAYMENT_REVIEW/UNDER_REVIEW, sin otra reserva ni limpieza de carrito.
6. Administrador verifica el abono y aprueba o rechaza. Preparación, envío y entrega tras PAID.
7. Tras DELIVERED se habilita la reseña verificada.

Cada reserva nueva tiene stockReservedAt/reservationExpiresAt; cancelar o vencer marca stockReleasedAt.
Solo PENDING_PAYMENT sin operación comunicada puede vencer/cancelarse por cliente. PAYMENT_REVIEW
conserva inventario mientras se concilia, incluso si pasó el plazo de reserva original.
Mantenimiento usa el índice `(status, reservationExpiresAt)` y procesa hasta 100 candidatos por ejecución;
abrir instrucciones o comunicar después del plazo ejecuta la misma liberación protegida.
Sin mantenimiento/acceso, la liberación puede demorarse. No se agrega cron de pago.
La migración 8 reconoce stock de pedidos históricos activos sin asignarles nuevos plazos.
Pendientes históricos sin marca de reserva se bloquean para revisión operativa; no se infiere su stock.
Ver [ADR 0003](decisions/0003-reserva-previa.md). Idempotencia de creación implementada desde S1-04 e integrada en main.

## Importes y confirmación — S1-02
Ver [ADR 0002](decisions/0002-dinero-y-confirmacion.md). El cálculo comercial usa
Prisma.Decimal. El navegador recibe cadenas con dos decimales; el formateo y la
suma de previsualización utilizan céntimos enteros, sin Prisma en el bundle cliente.
La Server Action autentica, valida con Zod y verifica la configuración del método.
`reserveManualOrder` relee carrito/dirección/tarifa en una transacción Serializable,
comprueba la firma del resumen y guarda líneas, subtotal, envío, total y pago del
mismo snapshot. Los cambios de contenido exigen revisar la pantalla actualizada.
Las acciones de administración rechazan precisión monetaria extra.
S1-02 no modificó el esquema. S1-03 incorpora la reserva previa; idempotencia persistida
se implementa desde S1-04 y está integrada. La firma confirma contenido y la clave identifica la operación.

## Confirmación idempotente — S1-04
Ver [ADR 0004](decisions/0004-idempotencia-reserva.md) y [QA](testing/s1-04-idempotencia.md).
La migración 9 agrega checkoutKey/checkoutRequestHash y UNIQUE(userId, checkoutKey), con check de pareja/formato.
La clave HMAC es estable por cliente y firma del resumen; no depende del clic o de memoria de una instancia.
La huella SHA-256 liga todos los datos aceptados y normalizados. El servidor busca primero el resultado
persistido: mismo contenido devuelve la orden existente; contenido distinto produce conflicto propio.
La creación sigue siendo Serializable. P2034 se reintenta; P2002 de checkout se resuelve leyendo la orden ganadora.
Stock, orden, identidad, pago y consumo de carrito se confirman juntos o revierten juntos.
La disponibilidad del proveedor se resuelve dentro de la creación usando la misma función que la UI;
no se exige al recuperar un resultado anterior. Replays no extienden plazos ni mutan carrito/stock/pagos.
Históricos conservan NULL, sin deduplicación retroactiva. No hay TTL de identidad mientras exista la orden.
El formulario hidratado conserva sus datos si falla la respuesta; las redirecciones de Next se relanzan
al framework. La acción nativa permite envío sin JavaScript. No se incorporan servicios/dependencias.

## Revisión y conciliación — S1-05

Implementado desde S1-05 e integrado en main. [ADR 0005](decisions/0005-revision-conciliacion.md)
y [guía operativa](operacion-pagos-manuales.md). La migración 10 agrega `OrderEvent` y
`PaymentReconciliation`, sin cambiar estados/importes anteriores ni inventar historial.
Los servicios comprueban el rol vigente, reclaman el pedido antes de pago/productos y
guardan el evento en la misma transacción. Aprobar exige un único pago manual, PEN,
importe exacto, operación y reserva no liberada. Rechazar requiere motivo y libera una vez.
Reembolsar registra dinero ya devuelto externamente, solo antes de despacho, y repone una vez.
El avance de cumplimiento vincula el estado esperado al formulario: reintentar no avanza otro paso.
Las acciones revalidan panel, inventario y detalles propios y muestran resultados/conflictos.

Un pedido cancelado puede tener un ingreso verificado tardío/discrepante. Se registra
el importe realmente recibido (Decimal) y la operación única del proveedor; después,
la referencia de devolución íntegra externa. Ni abrir ni cerrar conciliación cambia
estado comercial o inventario. Un caso por pago, sin edición del importe ni reasignación
de referencias. No hay pasarela, comisión ni servicio adicional con este flujo.
El historial incluye comunicación de pago, cancelación y vencimiento desde esta entrega.

## Carrito invitado — S2-03 (rama de PR #11)

[ADR 0006](decisions/0006-carrito-invitado.md), [QA](testing/s2-03-carrito-invitado.md).
Un proveedor cliente pequeño comparte una selección de IDs/cantidades y usa
useSyncExternalStore para hidratar/persistir sin incluir Prisma o consultas en el cliente.
Las páginas de catálogo/producto y el carrito de cuenta siguen renderizándose en servidor.
`POST /api/cart/preview` valida y consulta catálogo en lote, con precios/aritmética del
servidor. No crea un carrito de BD ni reserva stock; solo el limitador utiliza su tabla.

El visitante edita su selección local y puede recuperarse ante almacenamiento o red
fallidos. Los importes no verificados se identifican como pendientes. Las Server Actions
de cuenta y el checkout mantienen sus reglas y permisos. En la entrega de S2-03 aún
no se efectuaba la unión; la evolución de S2-04 se describe a continuación.

## Unión de selección — S2-04 (rama de PR #12)

[ADR 0007](decisions/0007-union-carritos.md) anterior al código y
[QA](testing/s2-04-union-carritos.md). La migración 11 agrega `CartImport` con
UNIQUE `(userId, importId)`, huella SHA-256 del contenido canónico/usuario y resultado
JSON de la operación. En una transacción Serializable se recupera el comprobante o
se suman las líneas enviadas al carrito y se guarda su resultado. Misma identidad/
contenido recupera; diferente contenido genera conflicto. Los reintentos son acotados.
La lectura de productos es por lote; las escrituras por línea están limitadas a 50.
No se altera stock, pedidos ni pagos. El precio actual continúa en el render servidor
y el checkout conserva su firma, dinero exacto y reserva condicional.

`POST /api/cart/merge` exige sesión, usuario esperado, origen público configurado,
JSON estricto y límite real de 16 KiB/rate limit por usuario. El origen no se infiere
de Host ni del Origin enviado por el cliente. La configuración pública contempla la
normalización de loopback de Next y el acceso detrás de un proxy. Sin CORS habilitado.
El namespace pertenece al usuario autenticado; no se recuperan resultados de otra cuenta.

El formato local pasa a versión 2 manteniendo su clave anterior para migración. Revisión
aleatoria para selecciones nuevas y huella determinista para formato 1. Antes de enviar,
la selección activa se mueve a un sobre inmutable ligado al usuario; las adiciones nuevas
permanecen en otra selección activa. Solo la confirmación coincidente elimina ese sobre.
Web Locks serializa operaciones de disco entre pestañas; una cola local preserva acciones
rápidas. El lock nunca abarca la petición de red. Si storage/locks fallan se usa memoria
con aviso; no se persisten precios ni resultados del carrito privado. Un pendiente de otra
cuenta conserva su vínculo y bloquea la unión hasta ingresar con la cuenta original.

Ingreso y registro comparten validación de destino interno normalizado. Con selección se
abre el carrito para revisar el resultado y continuar al destino conservado. Barreras cliente
en carrito/entrega/confirmación ocultan acciones de compra hasta unir y refrescar datos SSR;
un resultado confirmado en otra pestaña también exige refresco. El fallback sin JS restituye
los formularios nativos e informa que no importa selección local. Los componentes de
consulta y precio siguen siendo Server Components. En la entrega de S2-04 no se incorporó
Motion ni paquetes nuevos y la carrera de formularios anteriores seguía prevista para S2-05.
La sección siguiente describe la implementación actual.

## Panel y comandos de cuenta — S2-05 (rama de PR #13)

[ADR 0008](decisions/0008-carrito-lateral.md), [QA](testing/s2-05-carrito-lateral.md)
y [evidencia](evidencias/sprint-02/s2-05/README.md). Migración 12 aditiva:
`Cart.revision` con CHECK no negativo y `CartMutation` con UNIQUE(userId, operationId),
huella SHA-256, resultado mínimo y FK cascade. No se cambian datos anteriores ni se
inventan comprobantes de operaciones históricas. Se prueba backfill, unicidad y cascade.

`GET /api/cart` lee solo la cuenta de la sesión; `POST` admite add/set/remove con
usuario esperado y UUID. Origin público configurado, Sec-Fetch-Site, JSON/Zod estricto,
límite real de 2048 bytes UTF-8 y rate limit de 120/min por usuario para lectura/escritura
en espacios separados. Respuestas no-store; no se habilita CORS. La identidad esperada
evita aplicar una intención creada para otra sesión y nunca sustituye a la autenticación.

El servicio aplica el comando, incrementa revisión y guarda el comprobante en una
transacción Serializable con cuatro intentos como máximo. Dos add suman dentro de la
transacción; un replay no vuelve a sumar. Devuelve el resultado persistido y el carrito
actual, con productos/precios actuales en lote y Decimal. Misma identidad con otro
contenido genera conflicto. Add/set respetan stock y 99; nuevas líneas de comando
tienen tope de 50 productos distintos. Ese tope no es una migración de carritos históricos
ni un límite global nuevo de la unión. Eliminar una línea no depende de disponibilidad.
No se reserva stock al añadir, editar, eliminar ni unir.

El layout obtiene sesión y snapshot consistente (RepeatableRead), memoizado con
React.cache dentro de la petición RSC. No es caché global de datos privados. Context y
useSyncExternalStore comparten el estado entre contador, página y panel; no hay Zustand,
Prisma en cliente ni copia persistente privada. Un único proveedor mantiene el preview
invitado. El proveedor de cuenta usa key por usuario y guardas de identidad/revisión/
secuencia; la selección invitada queda fuera para conservar su protocolo de ADR 0007.

Las mutaciones esperan confirmación; una respuesta incierta conserva el mismo UUID en
memoria y bloquea otra intención/checkout hasta resolverla. Recargar recupera el carrito
de BD, sin prometer conservar ese comando en memoria ni ejecutarlo como intención nueva.
BroadcastChannel publica solo una señal; foco/visibilidad/navegación revalidan. Un 401
o cambio de cuenta elimina el snapshot privado incluso si después falla la red; un SSR
antiguo no lo repone. El header contrasta su identidad servidor con la del proveedor y
refresca el layout al detectar otra cuenta. Los botones de producto verifican ese vínculo.
Los formularios nativos ligan usuario/UUID al render y usan el mismo servicio sin JS.

Unión y consumo al reservar incrementan revisión en su propia transacción. La reserva
revalida el layout y conserva firma/dinero/idempotencia/stock del checkout. El panel
se importa dinámicamente al abrir; `<dialog>` vuelve inerte el fondo y la captura de
Tab/Shift+Tab contiene el foco. Cierre por Escape/botón/backdrop, devolución de foco y
restauración de estilos/scroll solo si se permanece en la misma ruta. Enlaces se cierran
en burbujeo después de Next Link para preservar SPA/selección en memoria.

Motion solo anima entrada/salida con opacidad y un pequeño desplazamiento a partir
de 768 px. useReducedMotion inicial, matchMedia en vivo y CSS eliminan efectos con esa
preferencia. La rejilla propia del panel fija imagen/información/cantidad/total sin heredar
la distribución de la página completa; controles de 44 px y footer accesible a 320 px.
Coste JS medido al abrir documentado en QA; rendimiento y otros navegadores siguen
teniendo sus límites de validación. El incremento fue revisado e integrado en S2-06.

## Incremento integrado — S2-06

S2-01–S2-06 integradas en main (PR #9–#14), con árboles de merge iguales a las cabeceras
validadas. [Registro](testing/revision-integracion-sprint-02.md) y
[cierre técnico](sprints/cierre-sprint-02.md). La revisión no añade dependencias,
migraciones ni comportamiento nuevo al producto; añade cobertura entre módulos y recuperación.

Una unión y un add paralelos conservan ambas sumas y sus identidades. El recorrido
invitado → unión → panel → reserva → comunicación conserva el carrito posterior y no
reserva dos veces. Un contrato aislado de CI aplica las 12 migraciones, genera comprobantes
con los servicios reales, restaura un dump en otra BD y comprueba replay, huellas, revisión
y escritura posterior. El respaldo SQL conserva esos registros; JSON comercial sigue
siendo parcial. No se modifica la política de costos ni la infraestructura de Render.
