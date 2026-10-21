# S2-05 — Carrito lateral y comandos de cuenta

Fecha de cierre técnico: 2026-10-20 (America/Lima).
**Implementada y verificada en rama. Revisión/integración pendientes en S2-06.**
[PR #13](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/13), base #12
`3c7f012fe1e92b63c5b71d5405589c2b6621b09a`.
[ADR 0008](../decisions/0008-carrito-lateral.md) registrado antes del código en `8ba1d6b…`.

## Resultado aceptado

Código fuente: `f06b4ad41c424216dc67f45b7b904a64421c184d`.
[CI 39493524715](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39493524715), build habitual de Next,
PostgreSQL aislado y Chromium real. Este cierre documental añade evidencia al código validado;
los checks del PR deben comprobar también la cabecera con documentación antes de marcarlo listo.

| Comprobación | Resultado |
| --- | --- |
| Servidor | **116/116**, 0 fallos; 98 regresiones y 18 casos nuevos (9 de store y 9 de integración). |
| Navegador | **64/64**, sin reintentos; 44 regresiones y 5 escenarios del panel × 4 proyectos. |
| Prisma / BD | Esquema y cliente correctos; **12 migraciones** aplicadas y **5 contratos SQL** sobre fixtures históricos. |
| Tipos / lint / build | Aprobados; `tsc --noEmit`, ESLint y `next build` habitual, salida standalone. |
| Dependencias de producción | `npm audit --omit=dev --audit-level=high`: **0 hallazgos**. |
| Capturas | **36 PNG originales**, dimensiones/SHA-256 comprobados e inspección visual; [galería y manifiesto](../evidencias/sprint-02/s2-05/README.md). |
| Histórico | 150 PNG anteriores sin cambios; 186 imágenes conservadas en total. |

Toolchain del job: Node **22.23.3**, npm **11.9.0** después de fijarlo (setup-node
inicialmente muestra el npm incluido), Next **16.3.8**, React **19.3.0**, Prisma
**6.19.3**, Playwright **1.64.1**, Chromium **156.0.8078.4**, PostgreSQL **16**.
La instalación sigue notificando **cinco avisos altos de desarrollo heredados**. Eso
no es el resultado de la auditoría de producción; no se afirma una auditoría total sin hallazgos.

## Comportamiento y contrato verificados

Panel, página y contador comparten estado; el contador suma unidades. La selección
invitada usa un solo preview de servidor. La cuenta recibe snapshot consistente en
RepeatableRead, memoizado por petición RSC con React.cache y sin caché privada global.
Los productos/precios se consultan en lote y el navegador recibe cadenas decimales.

`POST /api/cart` acepta add/set/remove, usuario esperado y UUID; el usuario autorizado
sale de la sesión. Servicio Serializable con cuatro intentos como máximo: cantidad,
revisión y comprobante `CartMutation` se confirman o revierten juntos. Misma identidad/contenido
recupera sin repetir; contenido distinto produce conflicto. Se devuelve también el
carrito actual, sin presentar precios históricos como vigentes.

Add/set respetan stock vigente y 99 unidades; **50 productos distintos para nuevas
líneas creadas por comandos de cuenta**. No es una deduplicación/límite retroactivo
de todos los carritos ni un cambio del contrato de unión. Inactivo/agotado/precio no
positivo no se añade; su línea puede eliminarse. Editar/unir no crea reservas/pedidos/pagos.
Unión y consumo al reservar incrementan revisión en su misma transacción. El checkout
mantiene dinero exacto, firma, idempotencia y reserva condicional.

La escritura exige Origin público configurado, sesión y usuario esperado, JSON/Zod estricto,
Sec-Fetch-Site y tamaño real máximo de 2048 bytes UTF-8. El rate limit es de 120/min por
usuario, con espacios separados para lectura/escritura. No-store, sin CORS permisivo. Los formularios
autenticados sin JS usan el mismo servicio con usuario/UUID ligados al render.

El store confirma antes de mostrar nueva cantidad. Respuesta incierta conserva el UUID
en memoria y bloquea otra intención/checkout; reintenta esa misma operación. No se copia
información privada a localStorage/sessionStorage ni a la señal BroadcastChannel.
Revisiones/secuencias bloquean respuestas viejas. 401/cuenta distinta eliminan datos
privados incluso si la siguiente verificación falla; un SSR anterior no los repone.
Header/producto comparan la identidad de su render servidor con la del proveedor para
recuperar la cuenta correcta tras navegación SPA.

## Cobertura nueva

| Capa | Casos y evidencia |
| --- | --- |
| Integración PostgreSQL (9) | Dos add concurrentes 3→5; copias concurrentes/replay de una identidad; otra huella sin mutación; stock/99/50/inactivos/precio/eliminación; rollback al fallar comprobante; aislamiento; Origin/JSON/bytes/rate/owner; revisión de unión/comandos/reserva. |
| Store (9) | SSR/anon sin fetch privado; respuesta perdida/mismo UUID; GET/SSR viejos; respuestas fuera de orden; 401 y red posterior sin resucitar datos; doble intención/503/429; rechazo definitivo; cleanup de señales; cambio de dueño conservando la identidad pendiente original. |
| SQL | Backfill de revisión 0; CHECK no negativo; filas/FKs anteriores intactas; CartMutation inicialmente vacío; UNIQUE(userId, operationId) y cascade limitado al dueño. |
| Navegador: invitado (4) | Vacío/añadir/editar/eliminar; panel/página/contador; navegación SPA sin recarga y selección en memoria; foco inicial/Tab/Shift+Tab/Escape/scroll/devolución; movimiento normal→reducido→normal→reducido en vivo; acceso inferior donde es visible. |
| Navegador: cuenta (4) | Dos peticiones reales simultáneas; pérdida de respuesta después del commit; retry conserva UUID y cantidad 6; otra pestaña refleja 6→4→vacío; stock 10 y ningún pedido al editar. |
| Navegador: estados (4) | GET retenido/cargando; POST retenido/guardando sin cantidad optimista; stock 0/checkout bloqueado; red/retry; cookies eliminadas/401 y fallo de red posterior sin datos privados. |
| Navegador: compra (4) | Editar desde entrega a 2 unidades; resumen servidor total S/ 68.30; reservar deja stock 8, carrito vacío y contador limpio. |
| Navegador: cuentas (4) | Sesión compartida cambia A→B; se ocultan líneas y contador anteriores; intención A rechazada con 409; navegación SPA recupera B; usuario eliminado redirige a ingreso. |

Se mantienen las regresiones previas: carrito invitado con storage bloqueado/lleno,
unión/respuesta perdida/dos pestañas, ingreso/registro/destino, carrito y reserva nativos
sin JS, dinero/firma/última botella, permisos revocados y conciliación administrativa.
Los errores de Prisma por carreras/fallos inyectados en el log pertenecen a esos casos
y terminan con rollback/reintento comprobado; no se ocultan las aserciones.

## Revisión visual y accesibilidad

[36 capturas](../evidencias/sprint-02/s2-05/README.md): 14 escritorio (1440×1000),
14 móvil (390×844), cuatro de 320×740 y cuatro de 768×1024. Checkout/instrucciones
son full-page y tienen otra altura. Solo muestras sintéticas. No son imágenes generadas.

Se inspeccionan nombre/producto/precio, mensajes/CTA, vacío/carga/error, footer y
privacidad. Rejilla del panel independiente de la página completa: información junto
a imagen, al menos 160 px para el nombre, cantidad y total debajo, sin desbordamiento.
El contenido tiene scroll interno y el footer permanece accesible; en una pantalla corta
puede requerirse desplazar el contenido del panel para alcanzar una línea.

`<dialog>.showModal()` aporta fondo inerte; un manejador explícito contiene Tab/Shift+Tab.
Título inicial, cierre visible/Escape/backdrop y devolución de foco probados. Se restauran
estilos/scroll al cerrar en la misma ruta; navegar no restaura el scroll de la página anterior.
Cerrar enlaces en burbujeo conserva el manejador de Next Link y la selección en memoria.

Motion **14.4.0**, fijado y bajo demanda: AnimatePresence para entrada/salida, opacidad y
pequeño desplazamiento solo a partir de 768 px. useReducedMotion inicial + matchMedia
en vivo + CSS eliminan efectos con la preferencia reducida. Controles/foco inmediatos;
sin scroll/parallax/drag/layout en carrito, catálogo o checkout.

## Coste JS observado

La primera apertura solicitó tres chunks adicionales, iguales en los cuatro proyectos:
**179383 bytes brutos / 60370 bytes gzip estimados**.
Detalle por chunk/proyecto en [bundle-apertura.json](../evidencias/sprint-02/s2-05/bundle-apertura.json).
Son respuestas JS y una compresión gzip reproducible del cuerpo; no bytes de transferencia
medidos, ni tamaño exclusivo de Motion, ni LCP/INP/CLS. La carga se difiere hasta abrir el
panel. La optimización/medición formal de Core Web Vitals sigue en Sprint 5.

El lock añade los cuatro paquetes de Motion y seis entradas opcionales empaquetadas por
npm. La raíz incorpora la dependencia Motion; ninguna versión/resolución anterior cambió ni
se eliminó otro paquete. Se retiró el resolver temporal y CI usa
`npm ci --include=dev` con npm fijado.

## Incidencias y secuencia conservadas

| Código / CI | Resultado y decisión |
| --- | --- |
| `91bed44…` / [39486615317](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39486615317) | 98/98 servidor; build detectó dos href concatenados sin Route. Se tiparon; sin navegador aceptado. Se resolvió el lock exacto de Motion y después se retiró ese paso temporal. |
| `aba53bf…` / [39487070269](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39487070269) | 115/115 servidor, 12 migraciones/cinco contratos y build correctos; cancelada al añadir E2E. No equivale a aceptación de navegador. |
| `04992db…` / [39487865177](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39487865177) | 115/115 y 48/60 navegador. Tab escapaba del modal; cerrar en captura interrumpía Next Link y perdía la selección en memoria. Se añadió contención explícita y cierre en burbujeo. |
| `8b7e045…` / [39489132716](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39489132716) | 116/116; 21 navegador aprobados, cuatro fallos y 39 sin ejecutar. No se aceptó como cierre. |
| `c7cb13b…` / [39489876832](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39489876832) | 116/116; 49 navegador aprobados, cuatro fallos y 11 sin ejecutar. Se corrigió el cambio de movimiento reducido en vivo y la prueba que intentaba usar la barra inferior oculta en producto. |
| `6fc3661…` / [39492192210](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39492192210) | 116/116 y 64/64; revisión visual detectó nombre demasiado estrecho en panel desktop/tablet. No se aceptaron esos PNG como evidencia final. |
| `f06b4ad…` / [39493524715](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39493524715) | Rejilla explícita de panel y geometría de legibilidad; 116/116 y 64/64. 36 PNG nuevos inspeccionados y preservados. |

Antes de quedar indisponible el entorno anterior se ejecutaron 25 pruebas locales de
estado/destino. No se atribuyen al código reconstruido; la aceptación anterior se basa
en sus propias ejecuciones de CI. El entorno actual se valida por GitHub Actions.
El exportador de evidencia es de solo lectura y permite recuperar exactamente los PNG
del artefacto. Cada copia se verifica con SHA-256/dimensiones y SHA del blob Git al guardarla.

## Límites y continuidad

- Chromium automatizado, cuatro viewports; no se declara validación de Safari/Firefox,
  dispositivo real, lector de pantalla, contraste medido ni zoom. No es certificación WCAG/UAT.
- Comando incierto de cuenta conservado en memoria durante la visita. Recargar/cerrar
  recupera el carrito de BD y no reenvía automáticamente una nueva intención; no se promete
  persistencia de esa identidad fuera de la visita. Comprobantes de BD sin TTL en este hito.
- Invitado conserva los límites de storage/locks de S2-04; no es carrito offline completo.
- Datos de QA sintéticos y BD aislada. Sin servicios pagos, pagos reales ni migraciones remotas.
- No se modificó, reanudó ni desplegó Render. Main sigue en Sprint 1.
- **Siguiente: S2-06.** Revisar PRs #9–#13 y el incremento, corregir hallazgos, integrar en
  orden con `[skip render]`, comprobar main y documentar cierre/pendientes antes de Sprint 3.
