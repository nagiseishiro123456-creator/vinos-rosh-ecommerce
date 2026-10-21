# S2-06 — Revisión e integración del Sprint 2

2026-10-21 (America/Lima). **Revisión técnica completa e incremento integrado**.
Plan previo en `7ec201e49ee1d26495441bea99d3972428666d0e`; base de revisión S2-05
`d9a0e0ea946158ee8735e71706d18ad07d003166`, main inicial `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`.
La aceptación comercial/UAT queda por registrar y el lanzamiento corresponde a fases posteriores.

## Resultado

| Comprobación | Código revisado en PR #14 | Main integrado |
| --- | --- | --- |
| Fuente | `3d6dd51a946fba9b8c337cb1a8b63bca0e38e461` | `d2efd04047bb0cc331efa6e004dba4fd927f842b` |
| CI | [39670639919](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39670639919) aprobada | [39672240551](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39672240551) aprobada |
| Servidor | **117/117**, sin fallos | **117/117**, sin fallos |
| Navegador | **66/66**, sin reintentos | **66/66**, sin reintentos |
| BD | 12 migraciones y cinco contratos SQL | 12 migraciones y cinco contratos SQL |
| Recuperación | pg_dump/psql + replay y escritura nueva aprobados | Mismo contrato aprobado |
| Checks | Prisma/tipos/lint/build, producción con 0 hallazgos | Mismos checks aprobados |

Árbol del código revisado, checkout sintético del PR y merge final:
`13173db75d38b638cb0ea14b87ac6e220590efae`. Se comprobó igualdad mediante API Git.
Node 22.23.3/npm 11.9.0/PostgreSQL 16, build habitual de Next y Chromium de Playwright.
El cierre posterior solo cambia documentación/evidencia; sus checks/fusión se consultan
en el PR documental, conservando como fuente el código integrado identificado arriba.

## Revisión del incremento

| Área | Resultado de revisión |
| --- | --- |
| S2-01 | Recorrido/baseline conservados con procedencia; no se presentan capturas históricas como interfaz nueva. |
| S2-02 | Resumen antes de reserva en DOM/móvil, moneda sin cortes, radios nativos, foco visible y controles flotantes en flujo. |
| S2-03 | Solo IDs/cantidades en selección local; preview por lote con precios de servidor, límites y fallback en memoria. |
| S2-04 | Destinos internos normalizados, sobre ligado a usuario/contenido, comprobante transaccional y confirmación coincidente. |
| S2-05 | Un solo estado panel/página/contador, comandos Serializable, revisiones, sesión/propietario y formularios progresivos. |
| Accesibilidad/Motion | Teclado/foco/scroll, diálogo y preferencia en vivo; solo entrada/salida bajo demanda. Las regresiones mantienen los cuatro viewports. |
| Seguridad/compra | Autenticación/rol vigente, Origin/JSON/bytes/rate, dinero/firma/reserva/idempotencia y conciliación preservados. |
| Respaldo | SQL completo conserva tablas/huellas/identidades; JSON es comercial y parcial, sin ampliación innecesaria ni secretos nuevos. |

No se identificó una corrección adicional de comportamiento del producto. Se añadieron
comprobaciones entre módulos y recuperación, sin dependencias ni migraciones nuevas.
Los ADR 0006/0007/0008 anteriores al código siguen siendo el contrato de diseño.

## R2-01 — Recorrido integrado de compra

Un caso en escritorio y móvil une selección invitada 2 + carrito de cuenta 3 = 5;
confirma limpieza local, edita a 4 desde el panel y muestra subtotal S/ 119.60.
Reserva 4 por **S/ 128.10** con envío S/ 8.50: stock 10→6 y carrito consumido.
Después añade 1 para otra compra y comunica la operación del pedido original.
Resultado: un pedido PAYMENT_REVIEW, pago UNDER_REVIEW, una sola reserva, importe
persistido S/ 128.10, stock 6 y nueva selección de 1 intacta. Comunicar no confirma el abono.

Las 64 regresiones anteriores se mantienen; estos dos casos elevan el total a 66.
Ingreso/registro y destino, errores/red/sesión, storage/memoria/dos pestañas, teclado/
movimiento reducido y formularios autenticados/reserva sin JS conservan su cobertura previa.
Los casos nuevos comprueban ausencia de pageerror en ese recorrido.

## R2-02 — Recuperación de identidades

CI crea dos BD temporales en su contenedor PostgreSQL 16, separadas de la BD de smoke.
Aplica las 12 migraciones a la fuente y usa **los servicios reales** para producir:
cantidad 4, revisión 2, un CartImport y un CartMutation con sus huellas.
pg_dump con --clean/--if-exists/--no-owner/--no-privileges y psql con ON_ERROR_STOP=1
restauran el destino. Repetir ambas identidades conserva 4/revisión 2; otra huella se
rechaza. Una identidad nueva permite set a 3/revisión 3; el replay antiguo devuelve
su resultado histórico y el snapshot actual. Stock sigue 10 y no hay órdenes.

Resultado fuente: `S206_RESTORE_CONTRACT passed=true`; 12 migraciones, 1 importación,
2 comandos al finalizar, revisión final 3. Dump temporal 54863 bytes,
SHA-256 `3489f2af7f1bf24f1f75742b20d746fc9aa2d0aef3af46a8a09ce8f7d39950db`.
Ese tamaño/hash es del run fuente; otras ejecuciones generan timestamps/IDs distintos.
Se eliminan únicamente las dos BD temporales y no se publica el SQL como artefacto.

## R2-03 — Alcance del respaldo

[Guía actualizada](../07-despliegue/backups-y-recuperacion.md): JSON comercial no restaura
una tienda completa ni incluye carritos/comprobantes técnicos. La recuperación íntegra
necesita SQL con Cart, CartItem, CartImport, CartMutation y sus restricciones.
El contrato ejecuta las mismas opciones nativas que los scripts, sin afirmar que se
probó el proceso operativo del hosting real ni Docker Compose en el entorno local.

## R2-04 — Escritores concurrentes

Nueva prueba PostgreSQL: merge de 2 y add de 1 en paralelo sobre cantidad 3 dejan 6,
revisión 2 y un comprobante de cada tipo. Replay conserva cantidad/revisión, stock 10
y ausencia de pedidos. Se añade a las 116 pruebas previas: total **117**.
Las carreras deliberadas siguen concurrentes dentro del caso; los archivos que comparten
fixtures conservan --test-concurrency=1.

## Integración verificada

Se revisaron los PR, se retargetaron a main después de sus dependencias y se fusionaron
con método merge, SHA esperado e historial conservado. Todos los commits de integración
incluyen `[skip render]`. El árbol prospectivo y el árbol fusionado se comprobaron
contra la cabecera validada antes/después de cada operación.

| PR | Cabecera validada | Fusión | Árbol |
| --- | --- | --- | --- |
| [#9](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/9) | [97042fd](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/97042fd95f35f7646f499d2d26498a7b5852cf62) | [17cda84](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/17cda84862e3dcc1993a8ef3520c412902a7b9b1) | Igual al validado |
| [#10](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/10) | [496b8f4](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/496b8f4314492b153424620c74b63f17b01f6082) | [5e54bde](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/5e54bdebb1a5a48fd0687d11abb97aed22bbee52) | Igual al validado |
| [#11](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/11) | [b74c607](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/b74c60726c57e2e50c979eec1465937f31cad867) | [6e453b4](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/6e453b4c49ed5dd9ec484b95bc5a4348418aaf37) | Igual al validado |
| [#12](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/12) | [3c7f012](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/3c7f012fe1e92b63c5b71d5405589c2b6621b09a) | [f3f3be1](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/f3f3be1a1d2452c890d86dbd88f530c696578e06) | Igual al validado |
| [#13](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/13) | [d9a0e0e](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/d9a0e0ea946158ee8735e71706d18ad07d003166) | [7d41b7b](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/7d41b7bf64dad2e8c86a89d9b052d9b5ca32c349) | Igual al validado |
| [#14](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/14) | [3d6dd51](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/3d6dd51a946fba9b8c337cb1a8b63bca0e38e461) | [d2efd04](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/commit/d2efd04047bb0cc331efa6e004dba4fd927f842b) | Igual al validado |

La recomputación transitoria de mergeability de #10 se esperó hasta estado clean; no hubo
conflictos ni cambios forzados. Las cinco CI intermedias de main fueron canceladas por
el grupo concurrency al avanzar las fusiones; la CI del incremento completo es la de
main citada arriba. No se presentan esas cancelaciones como fallos de pruebas ni aprobaciones.

## Evidencia y comparación visual

[Seis PNG originales](../evidencias/sprint-02/integracion/README.md), tres estados en
1440×1000 y 390×844; reserva/revisión son full-page con otras alturas en el manifiesto.
Fuente: PR #14, `3d6dd51a946fba9b8c337cb1a8b63bca0e38e461`, run 39670639919. El árbol se conserva en main.
Se verificaron bytes/dimensiones/SHA-256 y SHA del blob Git al guardar; sin retoque,
recompresión, duplicados de attachments ni capturas fallidas. 186 históricos intactos; total 192.

Inspección de las seis imágenes y contraste con baseline S2-01 móvil (carrito, reserva,
revisión): desaparecen las superposiciones de navegación inferior del embudo, los importes
mantienen lectura y el ID se separa de la fecha. El panel es nuevo respecto a ese baseline.
Cantidades/precios/fechas y estados de QA difieren deliberadamente; no es una comparación
de conversión ni una métrica de rendimiento. Se conserva el aspecto de bebida sin alcohol
y no se inventan datos comerciales/notas de cata.

## Secuencia documental y límites

1. Plan/commit previo antes de cambios e integración.
2. Revisión registrada y cobertura R2-01–R2-04. Se precisó el selector del encabezado de
   estado para distinguirlo del badge con el mismo texto; no se debilitó la aserción.
3. Cabeceras intermedias sustituidas no reciben la aceptación de la final: `3dd5b46…`
   pasó servidor/restore antes de la actualización; `40746e2…` fue sustituida al incluir
   la carrera entre escritores. La aceptación se refiere a `3d6dd51…` y su CI propia.
4. CI/capturas/inspección y PR #14 listo, integración #9→#14, igualdad de árboles y CI de main.
5. Cierre, manifiesto, backlog/progreso y continuidad actualizados en PR documental posterior.

Local: Node 24 sin Docker/psql; npm ci normal falló en la descarga de motores Prisma
(ECONNRESET). La instalación posterior sin scripts/generación sin motor sirvió para
comprobaciones estáticas; no se atribuyen pruebas locales de BD ni build reproducible.
La aceptación usa instalación estándar, generación nativa y toolchain fijado de CI.

Cinco avisos altos de desarrollo permanecen heredados; auditoría de producción con
0 hallazgos. Chromium automatizado; Safari/Firefox, dispositivo real, lector de pantalla,
contraste/zoom medidos y CWV no se ejecutaron. No es certificación WCAG ni aceptación UAT.
Persisten los límites de memoria/storage/identidad y mantenimiento de reservas documentados
en historias previas. No hubo acciones en Render, BD remota, servicios pagos ni pagos reales.

**Siguiente:** [refinar Sprint 3 antes de implementar](../sprints/cierre-sprint-02.md).
La aceptación funcional corresponde al Product Owner y el lanzamiento sigue en Sprint 6.
