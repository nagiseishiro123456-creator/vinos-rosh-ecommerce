# Punto de avance

## Sprint 3 — Primera preparación de Izipay (2026-10-22, America/Lima)

- El propietario solicita avanzar por historias y evaluar un ejemplo Express con
  `formToken`, Yape y webhook. [Evaluación y guía técnica](integraciones/izipay-sandbox.md).
- Se conserva Next.js/Route Handlers. Se distingue Mi Cuenta Web V4 de Punto Web SDK;
  no se usan totales del navegador ni el dominio Micropayment como si fuera Izipay.
- Base `beb8698f0f1c7d599ea840d5a7ead51b29e72b3b` / PR #16. Preparación Mi Cuenta Web:
  céntimos exactos, configuración TEST desactivada, Basic Auth con destino fijo,
  timeout/límite de respuesta, errores sanitizados y verificación HMAC de IPN.
  Entrada `server-only`; no hay endpoint público ni conexión al checkout.
- Quince pruebas aisladas aprobadas localmente con transportes inyectados sin red real;
  Node 24.19.0/npm 11.9.0 locales, toolchain canónico de CI 22.23.3/11.9.0.
  [QA, comprobaciones y límites](testing/s3-02-base-izipay.md); checks de cabecera en su PR.
- S3-01 mantiene pendiente producto/condiciones y aceptación. S3-02 mantiene pendientes
  intentos persistidos, rutas/UI y sandbox externo. S3-03 no cambia pedidos ni stock.
  No hay nuevas dependencias/migraciones ni capturas de una pasarela inexistente.
- Render: se consultó la selección y la lista de workspaces. El conector no conserva
  selección y exige confirmar el espacio; devuelve `My Workspace`. No se seleccionó
  automáticamente ni se accedió a servicios, BD, secretos o despliegues.
- **Siguiente:** confirmar el workspace para actualizar la preview; identificar con
  Izipay el producto/paquete de test disponible y completar el servicio de intentos
  de S3-02 antes de activar la conexión del checkout. Política de costos vigente.

## Sprint 3 — Refinamiento de pagos iniciado (2026-10-21, America/Lima)

- El propietario pide comprobar cómo abrir el carrito y avanzar a pagos, investigando
  «ezepay»/Yape antes de elegir. Base remota y local: `83c8e5774af42d8b7c90dfd3135385faf3c8d0d9`.
- [Guía de carrito](guia-carrito.md): bolsa arriba a la derecha, acceso móvil, `/carrito`,
  cuenta para checkout y diferencia entre código integrado y versión desplegada.
  La observación de descubrimiento queda abierta para aceptación comercial.
- [Investigación](investigacion/pagos-yape-izipay.md): estado financiero real, tres comercios
  consultados, documentación oficial, alternativas y límites comerciales. Izipay es una
  hipótesis sobre el nombre; se necesita confirmar marca/producto y disponibilidad.
- [Plan Sprint 3](sprints/fase-2-sprint-03.md): seis historias, 26 SP preliminares,
  dependencias, DoD y cuándo documentar. [ADR 0009 propuesto](decisions/0009-pagos-automaticos.md)
  y [QA del refinamiento](testing/s3-01-refinamiento.md) preparados.
- S3-01 tiene investigación preparada, no elección terminada. S3-02–S3-06 pendientes;
  cobro automático, conciliación de proveedor, avisos de pago y emisión fiscal no se
  presentan como implementados. No hay cambios de ejecución, esquema o dependencias.
- Baseline: [CI final de main 39674983346](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39674983346)
  aprobada sobre `83c8e57…`, 117 servidor/66 navegador; resultados heredados de Sprint 2,
  no prueba de integración de pagos. La CI de la propuesta se registra en su PR.
- Este trabajo no consulta ni modifica Render/BD remota, no contacta proveedores y no
  ejecuta pagos. [Política de costos](cost-policy.md) vigente.
- **Siguiente:** confirmar si es Izipay, producto/medios habilitados y condiciones;
  cerrar la decisión S3-01 y concretar S3-02 con sandbox del producto disponible.

## Cierre técnico — Sprint 2 integrado (2026-10-21, America/Lima)

- S2-01–S2-06 revisadas e integradas en main mediante **PR #9 → #14**, conservando historial.
  Los seis árboles de fusión coinciden con sus cabeceras validadas.
- Código integrado: `d2efd04047bb0cc331efa6e004dba4fd927f842b`, árbol `13173db75d38b638cb0ea14b87ac6e220590efae`.
  [CI de main 39672240551](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39672240551):
  **117/117 servidor y 66/66 navegador**, 12 migraciones/cinco contratos SQL, restauración
  PostgreSQL, Prisma/tipos/lint/build y auditoría de producción (0 hallazgos) aprobados.
- [Revisión y resultados](testing/revision-integracion-sprint-02.md) ·
  [Cierre y continuidad](sprints/cierre-sprint-02.md) ·
  [Seis capturas nuevas](evidencias/sprint-02/integracion/README.md).
  186 PNG históricos intactos; total 192.
- La compra invitada, unión, panel y pago en revisión se comprueban en un recorrido conjunto;
  una selección posterior de 1 se conserva al comunicar el pago de la reserva anterior.
  La recuperación de PostgreSQL conserva identidades para que los reintentos no vuelvan a sumar.
- La actualización documental posterior registra ese código integrado y añade evidencia;
  sus checks y fusión se consultan en el PR de cierre documental. No cambia ejecución/esquema.
- **Siguiente: refinamiento y propuesta del Sprint 3**, pagos automáticos y notificaciones,
  antes de implementar. El lanzamiento y la aceptación comercial/UAT siguen pendientes.
- Se usó `[skip render]` en todos los commits/fusiones. Esta entrega no accede a Render
  ni a una BD remota y no efectúa pagos reales.

## Referencia del cierre S2-05 (histórico) (2026-10-20, America/Lima)

- Fase 2, Sprint 2: S2-01–S2-05 implementadas/documentadas y verificadas en sus ramas.
  **S2-06 — revisión e integración — es la siguiente historia.** El Sprint 2 aún no está cerrado.
- Rama `fase-2/sprint-02-carrito-lateral`, [PR #13](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/13), sobre #12.
  Cadena de revisión/integración: #9 → #10 → #11 → #12 → #13.
- Código fuente `f06b4ad41c424216dc67f45b7b904a64421c184d`; [CI 39493524715](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39493524715):
  **116/116 servidor, 64/64 navegador**, 12 migraciones, cinco contratos SQL, Prisma,
  tipos/lint/build y auditoría de producción (0 hallazgos) aprobados.
- [ADR 0008 previo](decisions/0008-carrito-lateral.md), [QA y límites](testing/s2-05-carrito-lateral.md),
  [36 capturas originales revisadas](evidencias/sprint-02/s2-05/README.md).
  Se conservan las 150 anteriores sin cambios; total 186 PNG.
- Panel/página/contador comparten estado. Comandos de cuenta transaccionales e idempotentes;
  diálogo con teclado/foco/scroll y movimiento reducido en vivo. Motion 14.4.0 bajo demanda.
- Main permanece en `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`, con Sprint 1 integrado.
  S2-05 se valida en BD aislada de CI; no implica despliegue ni aceptación comercial.
- Este cierre solo añade documentación/evidencia al código validado; los checks de #13
  deben comprobar también esa cabecera antes de marcarlo listo para revisión.

## Referencia del cierre S2-04 (histórico)

- Fase 2, Sprint 2: S2-01 documentada (3 SP); S2-02 (3 SP), S2-03 (5 SP) y S2-04 (8 SP)
  verificadas por CI; revisión/integración pendientes. En ese hito S2-05/S2-06 aún estaban pendientes.
- Fecha: 2026-10-19 (America/Lima). Inicio del Sprint 2 autorizado tras la propuesta de seis historias.
- Main sigue en `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`, Sprint 1 integrado (#3–#8).
  Su CI de cierre 39096709609 aprobó 67/67 servidor y 16/16 navegador.
- Rama de aquella entrega: `fase-2/sprint-02-union-carritos`, [PR #12](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/12),
  base S2-03 `b74c607…` / #11. Cadena pendiente de integrar: #9 → #10 → #11 → #12.
- Código S2-04 validado: `55f470e73395c8efc135ddee3491344079487b5b`; árbol `b8869b0c4ed1abed6f90c86a4cab65054b271231`.
  [CI 39363492611](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39363492611): **98/98 servidor, 44/44 navegador**, 11 migraciones,
  cuatro contratos SQL, tipos/lint/build y auditoría de producción (0 hallazgos) aprobados.
- Unión con comprobante transaccional, respuesta perdida/dos pestañas, nuevas adiciones,
  origen/sesión/propiedad, ingreso/registro/destino, stock/precio, memoria y recarga verificados.
  [ADR previo](decisions/0007-union-carritos.md) · [QA/contrato/límites](testing/s2-04-union-carritos.md).
- [32 capturas actuales](evidencias/sprint-02/s2-04/README.md) inspeccionadas, fuente y hashes conservados.
  118 imágenes históricas intactas; total 150. Sin nuevas dependencias ni Motion.
- QA S2-02: 67/67 y 20/20, PR #10. S2-03: 80/80 y 28/28, PR #11, 22 PNG;
  esos números corresponden a sus entregas históricas. La unión se implementa en S2-04.
- Sin merge, despliegue, reanudación/configuración de Render ni migraciones remotas.
  La migración nueva solo se ha aplicado a BD QA de CI. No hay pagos reales ni UAT comercial.

## S2-01 — Recorrido y referencia visual

[Plan del sprint](sprints/fase-2-sprint-02.md), [diagnóstico y flujo propuesto](ux/sprint-02-recorrido-compra.md)
y [QA](testing/s2-01-recorrido.md) documentados. 16 PNG originales del run de main,
generados 2026-10-17 en Perú y revisados 2026-10-18, conservados con manifiesto/hashes.
[Galería](evidencias/sprint-02/s2-01/README.md): ocho estados en escritorio y móvil.
No son nuevas capturas de una interfaz modificada; las 56 históricas del Sprint 1 no cambian.

Prioridades: overlays móviles, resumen posterior al botón, cortes de moneda, radios de
dirección y continuidad de registro. `En revisión`/`Boleta` ya están traducidos. En ese
diagnóstico se propusieron carrito invitado, unión y panel para S2-03–S2-05; las dos
primeras funciones ya están verificadas en las entregas posteriores.

## S2-02 — Cambios de UI y QA aprobada

[QA y límites](testing/s2-02-ux-movil.md) · [Antes/después](evidencias/sprint-02/s2-02/README.md).
Los ocho estados de S2-01 se comparan con nuevas capturas locales y casos de 320/768 px,
teclado, consentimiento e importes largos. La fuente y los resultados están en el manifiesto.
El banner opcional de QA ahora está activado con un ID ficticio y se presenta en flujo;
su presencia difiere de la base anterior y no representa una métrica de conversión.

Entorno alternativo temporal: Node 24, webpack, Chromium 153 y PGlite aislado, sin nuevas
dependencias del producto. No prueba concurrencia PostgreSQL 16. La comprobación oficial
se ejecutó en CI con Node 22.23.3/build habitual/PostgreSQL 16 y Chromium de Playwright.
La cola quedó resuelta; no se atribuye una CI roja a los primeros commits sin resultado revisado.

## S1-01 conservada
Instalación reproducible, 7 migraciones, 15 pruebas y 2 smoke aprobados en su entrega.
10 capturas y resultados originales: [QA S1-01](testing/sprint-01.md).

## S1-02 conservada
Rama `fase-2/sprint-01-dinero-exacto`, basada en S1-01; integrada mediante PR #4 tras #3.
Cálculo en Prisma.Decimal, cadenas monetarias canónicas, validación administrativa
y confirmación firmada del resumen. Lectura y persistencia dentro de la misma transacción.
CI aprobada: 7 migraciones sobre PostgreSQL 16, 28 pruebas, tipos/lint/build y 4 casos
de navegador (baseline y compra en escritorio/móvil). Se conservan 10 capturas nuevas
con manifiesto de origen/hashes. No se usó Render ni se realizaron pagos reales.
Detalle: [QA S1-02](testing/s1-02-dinero.md).

## S1-03 conservada
La confirmación guarda pedido/reserva/pago pendiente antes de mostrar cuenta/QR.
La comunicación del pago usa el snapshot persistido sin descontar stock ni limpiar el carrito de nuevo.
Plazo por pedido; solo reservas sin pago comunicado vencen o se cancelan por el cliente.
Pagos en revisión mantienen reserva y requieren conciliación. Migración aditiva con backfill seguro.
CI: 40 pruebas, 6 casos de navegador y 8 migraciones aprobados, incluido contrato SQL sobre datos antiguos.
16 capturas revisadas y conservadas con hashes. [QA S1-03](testing/s1-03-reserva.md).

## S1-04 conservada
Clave estable por cliente/resumen y huella completa persistidas con UNIQUE en la orden.
Reintentos idénticos recuperan la misma orden antes de leer carrito/configuración; contenido
distinto produce conflicto sin sobrescribir ni reservar. Los estados cerrados no renuevan reservas.
El formulario conserva datos ante respuesta perdida y mantiene envío nativo con sesión existente.
CI: 53 pruebas, 10 casos de navegador, 9 migraciones y dos contratos SQL aprobados.
Ocho capturas nuevas revisadas y conservadas con hashes. [QA S1-04](testing/s1-04-idempotencia.md).

## S1-05 conservada
ADR 0005, transacciones de revisión/reembolso, avance con estado esperado e historial.
Conciliación de ingresos sobre pedidos cancelados sin reactivar pedido ni modificar stock.
Rol ADMIN vigente comprobado en BD, motivos/confirmaciones/resultados y guía de operación.
CI final [38970804257](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38970804257):
66 pruebas, 14 casos de navegador, 10 migraciones, tres contratos SQL, tipos/lint/build
y auditoría de producción (0 hallazgos) aprobados. Corregidas validación monetaria y
altura del formulario móvil detectadas en QA. Diez capturas nuevas revisadas con hashes.
[QA S1-05](testing/s1-05-revision.md), [guía operativa](operacion-pagos-manuales.md)
y [cierre técnico del sprint](sprints/cierre-sprint-01.md). 54 capturas conservadas en total.

## Revisión e integración
RI-01 comprueba el rol actual en BD en pedido/envíos/backup; una sesión con ADMIN
revocado ya no conserva esos permisos. RI-02 exporta historial y conciliaciones con
snapshot consistente, sin secretos. [CI 39095704639](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39095704639)
aprobada: 67 pruebas, 16 casos de navegador, 10 migraciones, tres contratos SQL,
tipos/lint/build y producción sin hallazgos. Dos capturas nuevas de regresión:
[evidencia](evidencias/sprint-01/integracion/README.md); total 56, conservando las 54 históricas.

Se integró #3 → #4 → #5 → #6 → #7; cada árbol fusionado coincide con su cabecera validada.
La primera CI de main 39096006029 falló en el fixture de una prueba por conflictos
Serializable entre archivos paralelos (66/67). RI-03 aísla los archivos compartidos
con `--test-concurrency=1`; las carreras deliberadas dentro de los casos se conservan.
La corrección aprobó CI 39096248346: 67/67 pruebas y 16/16 casos de navegador,
migraciones/contratos SQL, tipos, lint, build y producción sin hallazgos. La actualización
posterior a ese commit solo registra resultados en documentación; los checks del PR #8
y de main comprueban la cabecera final.
[Registro completo](testing/revision-integracion-sprint-01.md).

Render comprobado después de las cinco fusiones: web y PostgreSQL suspendidos, último
deploy `dep-db3bbrvlk1mc73a2bli0` sobre Fase 1. Se usó `[skip render]`; no hubo
reanudaciones, cambios de configuración ni migraciones remotas. El build configurado
en Render todavía usa `npm install`: sincronizar antes de un futuro despliegue.

## Siguiente acción

**Sprint 3 — Refinar pagos automáticos y comunicación antes de codificar.**

1. Presentar objetivo, historias/estimaciones, dependencias, DoD y secuencia documental.
2. Elegir proveedor según disponibilidad para el negocio, moneda, comisiones, sandbox,
   webhooks y calidad/precio; verificar condiciones vigentes con fuentes primarias.
3. Registrar ADR de estados, firma/verificación de webhook, idempotencia, conciliación
   y límites entre reserva y confirmación. Definir notificaciones/reintentos sin inventar emisión fiscal.
4. Obtener solo la configuración de prueba necesaria cuando corresponda; mantener secretos
   fuera de Git y costos dentro de la política autorizada.
5. Comenzar una historia a la vez después de concretar el plan. Conservar las 117/66 regresiones.

No se inicia la implementación de Sprint 3 con el cierre de Sprint 2.
Los puntos de aceptación funcional y el entorno comercial se refinan con el Product Owner.

## Riesgos abiertos
- Conciliación ampliada: varias operaciones por pago, correcciones y devoluciones parciales/despachadas fuera del alcance actual.
- Docker y PowerShell no ejecutados en este contenedor; ver límites de S1-01.
- Dependencias de desarrollo: la instalación de CI sigue notificando cinco avisos altos,
  heredados y pendientes de revisión antes del lanzamiento. No se ejecutó una nueva auditoría
  detallada de desarrollo. Auditoría de producción de S2-05: cero hallazgos; Motion añade
  cuatro paquetes y seis entradas opcionales al lock, más la dependencia raíz; sin actualizar
  versiones/resoluciones de paquetes anteriores.
- QA automatizada de S2-02 aprobada; contraste medido, lector de pantalla, zoom y
  otros navegadores quedan sin validar en esta entrega.
- La liberación de reservas abandonadas requiere ejecutar mantenimiento o acceder al pedido;
  no se añadió programación periódica ni servicios de pago.
- En la revisión del Sprint 1 Render se comprobó suspendido; este sprint no modifica
  su configuración ni utiliza su BD. Main integrado no implica app desplegada.
- S2-02 integrada; las capturas locales históricas conservan su origen y límites.
- S2-04 integrada. Pendiente de otra cuenta exige volver al usuario original;
  sin storage/locks se usa memoria y no se promete sincronización/persistencia invitada.
- S2-05 integrada. Los comandos inciertos de cuenta se conservan en
  memoria durante la visita; cerrar/recargar recupera el carrito de BD y no reenvía una intención nueva.
- Los chunks solicitados al abrir el panel se miden en QA; eso no constituye medición de
  Core Web Vitals. Revisión manual con lector de pantalla, zoom y otros motores pendiente.
