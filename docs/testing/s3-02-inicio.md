# S3-02 — QA de inicio protegido y coordinación del token

Continuidad: el incremento de [reserva interna](s3-02-reserva.md) sustituye las fixtures
manuales sin pago por reservas automáticas reales. El resto de esta ficha conserva
el alcance y los resultados históricos del PR #19.

Fecha: 2026-10-22 (America/Lima). Base: PR #18, `6d81d539c782a2d63cae64ae7312cff1b757f891`.
No se usaron credenciales de Izipay ni se hicieron solicitudes a su sandbox.

## Alcance y pruebas

Se añade ruta de inicio desactivada, handler validado y coordinación entre persistencia
y adaptador. La finalización del token ahora vuelve a bloquear/comprobar la orden antes
de persistir. No cambia la UI, dependencias, esquema, migraciones ni pedidos manuales.

| Nivel | Cobertura nueva |
| --- | --- |
| 16 casos deterministas | Orden de persistencia/red, replay, estado invalidado, fallos de transporte/BD sin filtrado ni retry; flags, origen, sesión, rate limit, body/UTF-8/tamaño/plazo, cuenta cambiada, respuestas privadas y cliente ya desconectado. |
| 8 casos PostgreSQL | Intento persistido antes de transporte; dos solicitudes concurrentes y respuesta perdida sin segundo envío; timeout incierto; cancelación/vencimiento durante llamada; importe alterado; propiedad/manual conservado; invalidación entre commit y envío. |
| 2 ejecuciones de navegador | Un caso en desktop y mobile contra la app compilada comprueba POST desactivado/404 sin token y GET/405. No es un formulario de pago externo. |

Los transportes de pruebas se inyectan en memoria; devuelven un token sintético o
rechazan al abortar por timeout. Durante el transporte se consulta/cancela/vence la
orden con servicios reales para verificar que no se retiene una transacción de BD.

Los casos PostgreSQL usan el guard existente de BD aislada `vinos_rosh_ci`/`vinos_rosh_test`.
La fixture conserva una reserva real pero retira su pago manual únicamente en QA para
modelar una futura reserva automática. Esa conversión no existe en código de producción.
El rate limit usa su almacenamiento real y limpia sus buckets de prueba al terminar.

## Verificación y trazabilidad

Local: `npm run typecheck`, `npm run lint` y 31/31 casos deterministas (16 nuevos y
15 del adaptador) aprobados con Node 24.19.0/npm 11.9.0. No hay PostgreSQL local en este
entorno; la ejecución completa de BD se obtiene de CI, no se atribuye a los tests locales.
Se comprueban diff, enlaces relativos y conservación de las 192 capturas anteriores.

Baseline verificado: [CI del PR #18, 39800349578](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39800349578),
141/141 servidor y 66/66 navegador, 13 migraciones, seis contratos SQL y dump/restore
del carrito. Para esta cabecera se esperan 165 servidor y 68 navegador; el resultado
real y SHA se registran en el PR después de leer la ejecución canónica.

CI mantiene ambos flags de la ruta desactivados; los escenarios habilitados se prueban
mediante el handler y transportes inyectados. Toolchain: Node 22.23.3/npm 11.9.0/PostgreSQL 16.
El smoke genera sus artefactos habituales; no se crean imágenes ficticias de Izipay.
No cambió UI, por lo que no se añaden PNG duplicados a la galería histórica.

Pendientes: reserva automática, consulta/recuperación del proveedor y del token perdido,
SDK/IPN e integración externa. [Contrato HTTP, operación y límites](../integraciones/inicio-izipay.md).
