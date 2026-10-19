# QA — S2-02: lectura, foco y compra móvil

Fecha: 2026-10-19 (America/Lima). Base: S2-01 `97042fd…`, PR #9.
Entrega: [PR #10](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/10),
rama `fase-2/sprint-02-ux-movil`, dependiente de #9. Sin merge ni despliegue.
Estado: cierre técnico verificado por CI canónica; revisión e integración pendientes.

## Cambios y motivo

| Hallazgo | Implementación | Comprobación |
| --- | --- | --- |
| UX-201, capas sobre controles | Clase `purchaseFlow` en producto/carrito/checkout/pedido: header en flujo, barra inferior oculta en ese contexto y WhatsApp al final del contenido. El menú/carrito del header siguen disponibles. | Foco mediante Shift+Tab/Tab, dimensiones y tres puntos de hit testing por acción, a cuatro tamaños. |
| Banner opcional | Preferencias de analítica antes del contenido y en flujo normal; afecta su presentación global cuando hay trackers configurados. En Home/catálogo, el header permanece dentro de su contenedor mientras el banner está pendiente; vuelve a su posición habitual al responder. No cambia la decisión de consentimiento ni habilita trackers reales. | ID público ficticio en CI/QA; confirmación operable con consentimiento sin responder; opciones visibles y accionables en Home/catálogo; tráfico de trackers abortado en el caso nuevo. |
| UX-202, resumen posterior | Un solo resumen SSR antes del formulario en el DOM y en móvil/tablet; en escritorio se conserva a la derecha mediante grid. | Orden DOM y capturas. Sigue existiendo un único formulario de reserva con la misma firma/clave. |
| UX-203, cortes de moneda | Espacio no separable en `formatPrice`, columnas monetarias indivisibles, nombres con ajuste. En <=479 px, importe debajo del nombre para evitar una columna ilegible. | Rangos de texto de una línea, nombre con ancho mínimo legible, 99 unidades a S/999999.00 + S/8.50 = S/98,999,909.50. |
| UX-207, direcciones | Fieldset/legend y radios nativos con labels/descripciones, seleccionados con estado React y foco en la tarjeta. | Dos direcciones, flechas abajo/arriba, foco y destino del enlace actualizados. |
| UX-209, fecha e ID | Etiqueta de identificador separada de creación en Perú, también en instrucciones. No se regeneran números históricos. | Fecha sintética 2026-10-18 02:30 UTC mostrada como 17/10/2026 en Perú; mismo número persistido. |
| Tamaño de acciones | Actualizar/eliminar/cantidad con mínimo de diseño 44 px; foco visible y sin transform de hover en CTA del embudo. | Geometría real de controles, no una prueba que solo compare clases CSS. |

No cambian reglas de autenticación, precios del servidor, stock, firma, idempotencia,
reservas, pagos ni esquema. El espacio no separable es presentación: las cadenas
decimales que cruzan al servidor mantienen su formato y cálculo existentes.

## Pruebas nuevas

`tests/smoke/ux-mobile.spec.ts` se ejecuta en los proyectos desktop (1440×1000), mobile
(390×844), small-mobile (320×740) y tablet (768×1024). Los dos proyectos nuevos solo
ejecutan ese archivo; la suite canónica pasa de 16 a **20 casos**, aprobados en el run oficial indicado abajo.

Se comprueban: opciones de consentimiento y separación del header en Home/catálogo; ancho de página y controles; Tab/Shift+Tab, flechas y foco; acciones
de 44 px; hit testing; resumen antes del formulario; líneas de dinero; nombres largos;
consentimiento sin responder; reserva de S/98.20 y stock 10→7; identificación y fecha.
Los casos nuevos emulan movimiento reducido. Los escenarios anteriores de dinero
también se ejecutaron localmente: precio cambiado exige revisión y no crea una orden
con el importe anterior; comunicar pago conserva importe y stock de la reserva.

ESLint ahora excluye `playwright-report` y `test-results`, igual que los otros artefactos
generados: al hacer lint después de las capturas se analizaba el JS de terceros del
reporte. Se mantiene el análisis de todo el código fuente del proyecto.

## Ejecución local y límites del entorno

La imagen de trabajo dispone de Node 24.19.0, sin PostgreSQL/Docker ni el Chromium
estándar de Playwright. La instalación de PostgreSQL no pudo usar sus identidades de
sistema; el ZIP estándar del navegador no se pudo descargar correctamente. El build
Turbopack local falló al cargar su directorio de persistencia (`invalid digit found in string`).

Se construyó la aplicación real con **webpack**, sin cambiar el script habitual de build.
Para la revisión visual se usó temporalmente Chromium 153.0.0 de `@sparticuz/chromium`,
PGlite 0.5.10 y pglite-socket 0.2.13 en una instancia WASM efímera, con el SQL de las
migraciones existentes y datos QA. App, DB y tests se ejecutaron juntos sobre loopback.
La URL local usa compatibilidad PgBouncer/caché de sentencias desactivada para evitar
colisiones de prepared statements de clientes distintos sobre un backend único.
Estos ajustes son del arnés local temporal; no entran en configuración ni dependencias del producto.

PGlite multiplexa conexiones sobre un backend único; **no prueba la concurrencia de
PostgreSQL 16**. Referencia del proveedor: https://pglite.dev/docs/pglite-socket.
La comprobación canónica sigue siendo Node 22, build habitual, PostgreSQL 16 y Chromium
de Playwright en GitHub Actions. No se interpreta la alternativa local como sustitución.

Durante la primera prueba visual el selector se comprobaba antes de terminar la
navegación: se añadió espera del heading de entrega. También se corrigió la especificidad
del mínimo de altura, que dejaba prevalecer 38 px. La inspección de la captura de estrés
a 320 px detectó una columna de nombre demasiado estrecha aun sin overflow: se pasó a
importe en una segunda fila y se añadió una aserción de legibilidad antes de repetir QA. La revisión del alcance global del banner detectó que el header fijo de Home podía tapar sus opciones: la regresión ampliada falló localmente sobre la aplicación `3d2f436…` (hit testing y header y=0 frente al banner hasta y=133.45). Se corrigió su posición dentro del hero/contenedor mientras el consentimiento está pendiente. [Registro](../evidencias/sprint-02/s2-02/regresion-consentimiento.txt).

| Check | Resultado de esta entrega |
| --- | --- |
| TypeScript | Aprobado localmente. |
| ESLint | Aprobado localmente sobre fuente; reportes generados excluidos. |
| Dinero | 5/5 unitarias locales aprobadas. |
| Compilación local | Webpack aprobado; Turbopack local bloqueado por persistencia del entorno. |
| Navegador local | 8/8 aprobados: baseline y dinero en escritorio/móvil, más UX en cuatro tamaños. Fuente `8c6fc0e…`; capturas del rerun final. |
| Inspección | 24 PNG finales revisados visualmente; originales y manifiesto en [galería](../evidencias/sprint-02/s2-02/README.md). |
| CI oficial | [Run 39284747193](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39284747193), cabecera `9c59839…`: 67/67 servidor y 20/20 navegador, tipos/lint/build, 10 migraciones, tres contratos SQL y auditoría de producción sin hallazgos. |

El primer commit añadió regresiones antes de corregir, pero su run quedó en cola;
no se afirma haber obtenido una CI roja. La cola se resolvió: el run final terminó correctamente
el 2026-10-19 a las 11:23 en Perú. [Registro oficial](../evidencias/sprint-02/s2-02/validacion-ci.txt).

Para repetir el caso nuevo en el entorno estándar: configurar la **BD QA aislada** según
[la guía](../desarrollo-reproducible.md), con Node/npm fijados y nunca la BD comercial;
aplicar migraciones, seed inicial y `db:seed:smoke`, construir con un GA_ID ficticio de QA,
preparar standalone e instalar Chromium. Ejecutar:

```sh
npm run test:smoke -- tests/smoke/ux-mobile.spec.ts
```

## Evidencias y comparación

Antes: 16 PNG del main integrado, conservados en S2-01. Después: 16 estados equivalentes
y ocho comprobaciones adicionales de foco/320/768/estrés, originales de la aplicación local.
No se retocan ni recomprimen. Manifiesto con fuente de código, versiones, fechas,
dimensiones y SHA-256. Dos recortes adicionales muestran solo banner/header reales de Home y catálogo: las imágenes externas de esas páginas no resolvían por DNS en este entorno y no se usan para valorar su contenido visual. Las capturas estándar posteriores muestran el banner opcional
de QA sin responder; la base anterior no lo tenía habilitado. No son un diff de píxeles
ni una comparación de rendimiento/conversión. Los importes 98.20 y 98.80 corresponden
al cambio deliberado de precio del fixture.

Los ocho estados son producto, acceso, carrito, entrega, confirmación, resumen actualizado,
instrucciones y pago en revisión. Se conserva el original por cada viewport, junto con
las capturas de 320/768 y las comprobaciones de foco. Cliente, dirección, operaciones,
cuentas y productos son sintéticos; no hubo pagos reales ni uso de BD de Render.

## Cierre técnico y pendientes

- CI oficial aprobada sobre `9c59839…`; los commits posteriores de cierre solo documentan el resultado.
- Contraste medido, lector de pantalla, zoom y Safari/Firefox no ejecutados; no afirmar certificación completa.
- Mantener #9/#10 sin fusionar hasta revisión/integración del incremento. No reactivar Render.
- Siguiente historia: S2-03, ADR de persistencia/estado antes del carrito invitado;
  la unión de carritos y el panel siguen en historias posteriores.
