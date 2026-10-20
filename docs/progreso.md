# Punto de avance

## En curso — S2-05 (2026-10-20, America/Lima)

- Rama `fase-2/sprint-02-carrito-lateral`, [PR #13](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/13) en borrador, sobre #12.
- [ADR previo](decisions/0008-carrito-lateral.md) en `8ba1d6b…`; implementación conservada
  en GitHub después de quedar indisponible el entorno anterior. Sin dependencia de archivos locales.
- [QA y registro de CI](testing/s2-05-carrito-lateral.md). Comandos de cuenta y revisión:
  115/115 servidor en `aba53bf…`; navegador pendiente. La nueva cabecera amplía
  privacidad/cambio de cuenta y prevé 116/64, aún sin declarar aprobación.
- Página/panel/contador comparten estado; Motion 14.4.0 bajo demanda, diálogo nativo,
  transacciones y comprobantes de cuenta; 12 migraciones y cinco contratos SQL.
- Siguiente acción: terminar CI y revisar PNG originales; después documentar resultado
  y preparar revisión. Integración solo en S2-06; sin merge, Render ni migraciones remotas.

## Referencia del cierre S2-04 (histórico)

- Fase 2, Sprint 2: S2-01 documentada (3 SP); S2-02 (3 SP), S2-03 (5 SP) y S2-04 (8 SP)
  verificadas por CI; revisión/integración pendientes. S2-05/S2-06 siguen pendientes.
- Fecha: 2026-10-19 (America/Lima). Inicio del Sprint 2 autorizado tras la propuesta de seis historias.
- Main sigue en `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`, Sprint 1 integrado (#3–#8).
  Su CI de cierre 39096709609 aprobó 67/67 servidor y 16/16 navegador.
- Rama actual `fase-2/sprint-02-union-carritos`, [PR #12](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/12),
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

## Última historia entregada: S1-05
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

S2-04 supera QA y conserva sus resultados/capturas. Comprobar la CI de la cabecera
con documentación/evidencia antes de dejar #12 listo para revisión. No fusionar aún:
la revisión/integración del incremento completo corresponde a S2-06.

Siguiente historia: **S2-05 — Carrito lateral accesible**. Documentar el ADR antes de
implementar: un único estado para panel/página/contador, mutaciones de cuenta con
confirmación del servidor y protección de incrementos concurrentes. Diálogo con nombre,
foco inicial/contenido, Escape, devolución de foco, fondo inerte y restauración de scroll.
Instalar Motion solo para entrada/salida, con `useReducedMotion`; sin scroll complejo.
Las consultas y el precio de páginas siguen en servidor. Home inmersivo queda en Sprint 5.

Durante la historia: decisiones/estados/incidencias en el PR. Al cerrar: pruebas, capturas
originales/manifiesto, backlog y este archivo. S2-06 regresará el flujo completo e integrará
PRs en orden, conservando evidencia y verificando main con `[skip render]`.

## Riesgos abiertos
- Conciliación ampliada: varias operaciones por pago, correcciones y devoluciones parciales/despachadas fuera del alcance actual.
- Docker y PowerShell no ejecutados en este contenedor; ver límites de S1-01.
- Dependencias de desarrollo: S1-05 registró cinco avisos altos de braces y su seguimiento.
  El estado del parche no se vuelve a afirmar aquí; comprobarlo antes del lanzamiento.
  Auditoría de producción de esta entrega: cero hallazgos, sin cambios de paquetes.
- QA automatizada de S2-02 aprobada; contraste medido, lector de pantalla, zoom y
  otros navegadores quedan sin validar en esta entrega.
- La liberación de reservas abandonadas requiere ejecutar mantenimiento o acceder al pedido;
  no se añadió programación periódica ni servicios de pago.
- En la revisión del Sprint 1 Render se comprobó suspendido; este sprint no modifica
  su configuración ni utiliza su BD. Main integrado no implica app desplegada.
- S2-02 está verificada pero no integrada; las capturas locales conservan su origen y límites.
- S2-04 verificada y sin integrar. Pendiente de otra cuenta exige volver al usuario original;
  sin storage/locks se usa memoria y no se promete sincronización/persistencia invitada.
- Incrementos concurrentes de formularios de cuenta anteriores y diálogo lateral siguen en S2-05.
