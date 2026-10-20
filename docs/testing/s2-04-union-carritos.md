# S2-04 — QA de unión de carritos

Fecha de cierre técnico: 2026-10-19 (America/Lima). **Verificada**, revisión/integración
pendientes. [PR #12](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/12),
rama `fase-2/sprint-02-union-carritos`, sobre S2-03 `b74c607…` / PR #11.
[ADR 0007](../decisions/0007-union-carritos.md) registrado antes del código en `6e66a55…`.

Código fuente de aceptación y capturas: `55f470e73395c8efc135ddee3491344079487b5b`.
Árbol: `b8869b0c4ed1abed6f90c86a4cab65054b271231`. [CI 39363492611](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39363492611), job `118434835042`.
La cabecera documental posterior conserva el mismo código; sus checks se comprueban
antes de dejar el PR listo para revisión. No implica integración en main ni despliegue.

## Comportamiento verificado

- Ingreso y registro conservan destino interno; con selección se revisa primero el carrito.
  Se rechazan destinos externos, barras invertidas, controles, rutas protocol-relative
  tras normalización y tipos inesperados de query. Reingresar no anida retornos al carrito.
- Suma 2 invitado + 1 cuenta = 3; misma identidad recupera sin otra suma. Las líneas ajenas
  a la selección se conservan. Stock actual/99 ajustan cantidades y se explican retirados.
- `CartImport` UNIQUE por usuario/identidad, huella de contenido y resultado se guardan
  en la misma transacción Serializable que las cantidades. Replays se consultan antes
  del catálogo; otro contenido con la misma identidad produce conflicto sin otra mutación.
- API con sesión/usuario esperado, origen público configurado, JSON/Zod estricto, UTF-8,
  límite real de 16 KiB y rate limit. El cliente no decide precios ni destino de cuenta.
- Formato local 2, migración canónica desde 1, Web Locks y cola. El sobre enviado permanece
  pendiente e inmutable hasta confirmar; se eliminan solo sus datos y se conservan nuevas
  adiciones. Una respuesta antigua de preview exige contenido y revisión aún vigentes.
- Red fallida/respuesta perdida permite reintentar sin duplicar. Otra cuenta no reasigna
  el pendiente ni obtiene su resultado. Cerrar sesión no copia carrito privado al invitado.
- Carrito/entrega/confirmación bloquean acciones visibles hasta unir y refrescar SSR;
  otra pestaña que confirma también provoca refresco. Cantidad real del input, contador
  y total coinciden. El foco vuelve al resultado después de confirmar.
- Con almacenamiento bloqueado, la selección en memoria sobrevive al ingreso SPA; el
  carrito ya integrado queda guardado en cuenta y persiste al recargar. El aviso diferencia
  esas botellas de selecciones invitadas futuras que el navegador no puede conservar.
- Sin JS no se importa selección local; explicación y formularios autenticados nativos
  conservados. La unión no reserva botellas ni genera pedidos/pagos. El checkout mantiene
  dinero exacto, firma, idempotencia, permisos y reserva del Sprint 1.

## Resultados

| Comprobación | Resultado real |
| --- | --- |
| Estado y destinos, local | 17/17 aprobados con Node 24.19.0; también se ejecutan dentro de CI con Node 22. |
| Pruebas de servidor CI | **98/98**, incluidas nueve de servicio/API/unión con PostgreSQL 16 y las regresiones anteriores. |
| Navegador CI | **44/44**: cuatro casos nuevos S2-04 en 320/390/768/1440 px, más 28 regresiones de S1/S2. |
| Migraciones/contratos SQL | **11 migraciones y cuatro contratos**; el nuevo usa Cart/CartItem y FKs de fixtures antiguos, UNIQUE por usuario y cascade del comprobante. |
| Tipos/lint/build | Aprobados; build habitual `next build`, Node 22.23.3/npm 11.9.0. |
| Auditoría de producción | **0 hallazgos**. Sin cambio de paquetes/lockfile; seguimiento de desarrollo heredado en progreso. |
| Evidencia | **32 PNG originales revisados**; dimensiones/SHA-256 y origen conservados, 118 PNG históricos intactos. |

Integración cubre suma/replay tras cambios de precio/stock/carrito, mismo ID con otro
contenido, carreras de igual/distinta identidad, retirada/topes, rollback al fallar el
comprobante, usuario inexistente/ajeno, origen/proxy y rate limit con Retry-After.
E2E cubre ingreso/registro/destino, checkout exacto, respuesta perdida después del commit,
dos pestañas con adición posterior (6 unidades/dos identidades), stock/precio cambiado,
memoria y recarga, logout/expiración, otra cuenta y recuperación con la cuenta original.
Las pruebas nativas de carrito y reserva sin JS también pasan; no se sustituyen por capturas.

## Evidencia y procedencia

[Galería](../evidencias/sprint-02/s2-04/README.md),
[manifiesto](../evidencias/sprint-02/s2-04/manifest.json) y
[registro de validación](../evidencias/sprint-02/s2-04/validacion-ci.txt).
Artefacto `12238880998` (`sprint-01-smoke-39363492611`),
85571315 bytes. ZIP SHA-256 verificado:
`e60114f1a87bc400d6402e4d06196f1240030e13032b4e89609049f5d87250ba`.

Las 32 imágenes provienen del commit final de aplicación indicado arriba, sin retoque
ni recompresión: 12 escritorio, 12 móvil, cuatro de 320 y cuatro de 768 px. Las imágenes
50/51 son nuevas ejecuciones de las regresiones nativas sobre el código actual.
La 51 crea una reserva **sintética** de QA; no es una reserva causada por la unión.
El total en Git asciende a 150 PNG de evidencia; no se sobrescriben los históricos.

## Límites y continuidad

- Sin storage/Web Locks se recupera lo legible en memoria y se avisa. No se promete
  persistencia/sincronización entre pestañas en ese modo ni carrito invitado offline/sin JS.
- Los comprobantes no expiran automáticamente. El replay es histórico; la página
  refrescada muestra carrito y precio actuales. No se persisten resultados privados al disco.
- Un pendiente de otra cuenta bloquea la unión hasta volver a la cuenta original. No se
  descarta ni se reasigna por timeout/error; no se afirma un flujo de recuperación de
  cuentas eliminadas o de almacenamiento manipulado que cambie identidad/contenido.
- Solo se normalizan las líneas enviadas; otras líneas conservan reglas previas. La
  carrera de añadir por formularios de cuenta anteriores corresponde a S2-05.
- Casos nuevos con movimiento reducido. Sin Motion ni animaciones de scroll añadidos.
  Lector de pantalla, contraste medido, zoom y Safari/Firefox no ejecutados.
- PostgreSQL, pedidos y stock de QA aislados. Sin pagos/entregas reales, servicios de pago,
  merges, configuración/migraciones remotas o acciones en Render. UAT/producción pendientes.

Siguiente: **S2-05**, ADR del panel lateral antes del código, estado compartido de cuenta,
incrementos concurrentes, diálogo/foco/Escape y Motion solo entrada/salida con movimiento
reducido. S2-06 revisará e integrará el incremento completo; no se declara cerrado Sprint 2.

## Historial de QA

Los bloques siguientes conservan el estado y decisiones de cada ejecución anterior.
El resultado de aceptación vigente está arriba; sus incidentes no se ocultan ni se
atribuyen a la cabecera final.

## Primera ejecución y correcciones

Código `afa9f4c0967b1f99a063095b345800ba0752f747`, árbol
`8b835e6521b3cfe8b38379df8fbfb3b92d9f7aa9`: [CI 39337485869](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39337485869),
job `118350497192`. **96/96 servidor**, 11 migraciones, cuatro contratos SQL,
tipos/lint/build y auditoría de producción aprobados. Navegador: **18/44**, no aprobado.

- 24 casos de selección/unión encontraron rechazo 403 de origen legítimo: NextURL
  normaliza loopback. La corrección usa el origen público configurado, sin confiar en
  Host ni relajar el rechazo externo; se agrega una prueba del escenario de proxy.
- Dos regresiones de confirmación sin JS detectaron el contenido oculto. El HTML y CSS
  originales del trace muestran que `[hidden]` de Preflight en capa con `!important`
  prevalece sobre la restauración sin capa. Se cambia a un atributo de datos con CSS y
  alternativa `<noscript>`, conservando barrera JS y pruebas de formulario nativo.
- Revisión local adicional: impedir que una normalización de `/a/..//host` produzca
  un destino `//host`; permitir query interna codificada y conservar retorno tras sesión
  vencida. Se añaden aserciones de estos casos, sin permitir navegación externa.

Artefacto inicial `12226934877`, ZIP 174720872 bytes; SHA-256
`6466bbd85f356b9d07e2378f6169b86789e4318fac111110d46d7529735ec70e` verificado.
Se inspeccionaron HTML/CSS, errores y captura nativa para identificar las causas;
estas capturas de fallo no constituyen la evidencia final de aceptación.

Segunda ejecución: `7eadc38…`, [CI 39361542665](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39361542665),
job `118428631177`: **97/97 servidor y 40/44 navegador**. Se recuperan las pruebas de
origen y formularios nativos; pasan dos pestañas, respuesta perdida, registro, memoria,
expiración y otra cuenta a los cuatro tamaños. Los cuatro fallos restantes comprueban
un defecto visible: tras sumar 1 + 2, total/cantidad en BD eran 3 pero el input nativo
no controlado mantenía el valor DOM 1 aunque el atributo `value` ya era 3. Se remonta
únicamente ese input cuando cambia la cantidad confirmada por servidor, conservando
formulario/botón y envío nativo. No se debilita la aserción del valor real.
Además se comprueba foco en el resultado y se evita anidar retornos sucesivos al carrito.

Tercera ejecución: `0ca6b388cfb9c5b91147c8babdd1e8d2a996b4b0`,
[CI 39362087358](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39362087358),
job `118430342117`: **97/97 servidor y 44/44 navegador**, checks completos aprobados.
Cantidad DOM, suma 2 + 1, foco, ajustes de stock/precio, logout y las regresiones sin JS
quedan verificados. La revisión posterior añade una prueba de respuesta antigua ante
selección nueva con contenido idéntico y valida tipo de callback de query repetida.
La previsualización exige también la revisión vigente dentro de su escritura en cola.
17/17 casos locales de estado/destinos aprobados; se verifica de nuevo la cabecera final
antes de seleccionar el artefacto definitivo, sin atribuirle resultados de otro commit.

Cuarta ejecución: `288a523a76cde208c0c7d17a6c265e77b7e9691b`,
[CI 39362644486](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39362644486),
job `118432111685`: **98/98 servidor y 44/44 navegador**, checks completos aprobados.
Revisión visual de 32 PNG: controles y estados legibles en cuatro tamaños. Se ajusta
el aviso tras éxito en memoria para distinguir selecciones invitadas futuras del carrito
ya guardado en cuenta; el caso E2E también recarga para comprobar su persistencia real.
El contrato legacy se afina con tablas `Cart`/`CartItem` y FKs fieles al modelo, y
aserciones por conteo que también detectan desaparición de filas (sin ambigüedad NULL).
Se conservan los resultados previos como historial; el artefacto final se tomará del
commit que incluya este texto corregido y la comprobación de recarga.

Quinta ejecución y fuente final de aplicación: `55f470e73395c8efc135ddee3491344079487b5b`, [CI 39363492611](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39363492611),
job `118434835042`: **98/98 y 44/44**; migraciones/contratos, tipos/lint/build y producción
sin hallazgos. Se comprueba aviso de cuenta guardada y recarga en memoria, junto con
el contrato legacy afinado. 32 capturas de esta ejecución revisadas y conservadas.
