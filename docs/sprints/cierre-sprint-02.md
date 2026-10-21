# Cierre técnico — Sprint 2

2026-10-21 (America/Lima). **26 SP revisados e integrados** en main; los puntos no equivalen
a horas ni a una velocidad comprometida para el sprint siguiente.

## Incremento entregado

La tienda permite elegir productos sin cuenta, conservar selección en el navegador,
integrarla una sola vez al ingresar/registrarse y utilizar un panel accesible coherente
con página y contador. El servidor conserva autoridad sobre precios, cantidades y stock.
La reserva sucede al confirmar y comunicar un pago conserva una nueva selección posterior.

La interfaz mantiene el resumen antes de reservar, importes legibles y controles móviles
sin las superposiciones del baseline. Motion se carga bajo demanda para entrada/salida,
con teclado/foco y movimiento reducido en vivo; sin scroll complejo en el embudo.

## Revisión e integración

[Plan previo y QA](../testing/revision-integracion-sprint-02.md), registrado en
`7ec201e49ee1d26495441bea99d3972428666d0e` antes de cambios. Se revisaron límites servidor/cliente,
permisos, callbacks, persistencia, transacciones, formularios nativos, respaldo y geometría.

PR #9 → #14 fusionados en orden con SHA esperado, historial conservado y `[skip render]`.
Cada árbol de fusión se comprobó contra su cabecera validada. Código integrado:
`d2efd04047bb0cc331efa6e004dba4fd927f842b`, árbol `13173db75d38b638cb0ea14b87ac6e220590efae`.
[CI de main 39672240551](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39672240551) aprobada con 117/117 servidor y 66/66
navegador, 12 migraciones/cinco contratos SQL, recuperación PostgreSQL y checks habituales.

La actualización documental posterior conserva seis capturas, manifiesto y resultados;
no cambia archivos de ejecución. Sus checks/fusión están identificados en el PR de cierre.
Las 186 imágenes anteriores se mantienen; total 192. [Galería](../evidencias/sprint-02/integracion/README.md).

## Qué añadió la revisión final

- Carrera real entre unión y comando: 3 + 2 + 1 = 6; replay mantiene cantidad/revisión/stock.
- Recorrido conjunto de escritorio/móvil: unión 5, edición a 4, reserva por S/ 128.10,
  selección nueva de 1 y operación original en revisión con stock 6.
- Recuperación de dump con servicios reales: reaplicar identidades no repite sumas,
  otra huella se rechaza y una intención nueva continúa funcionando.
- Aclaración de exportación comercial parcial frente a respaldo SQL completo.

No se detectó una corrección adicional de comportamiento del producto en esa revisión.
Se conservan las regresiones de errores/red/sesión/privacidad, storage, dos pestañas,
formularios sin JS, dinero/firma/idempotencia/última botella, permisos y conciliación.

## Pendientes heredados y aceptación

La validación es automatizada en Chromium y datos sintéticos. No es certificación WCAG,
aceptación comercial ni prueba de Safari/Firefox, dispositivo real, lector de pantalla,
contraste medido o zoom. CWV y optimización formal continúan en Sprint 5.
Cinco avisos altos de desarrollo siguen pendientes de revisión; producción tiene cero
hallazgos en la auditoría de esta entrega. Se mantienen los límites de storage/memoria
invitada, identidad pendiente en memoria de cuenta y mantenimiento de reservas.

El contrato de restauración no sustituye el ensayo operativo del hosting comercial
antes de lanzar. No hubo acciones en Render, migraciones remotas, servicios pagos
contratados ni pagos reales. Main integrado no equivale a app desplegada.

Product Owner: aceptación funcional por registrar. UAT/lanzamiento global siguen en Sprint 6.

## Inicio del Sprint 3

Presentar propuesta antes de implementar: proveedor/sandbox, estados/webhooks,
idempotencia/conciliación, notificaciones y comprobantes. Confirmar condiciones vigentes
y calidad/precio con fuentes primarias; conservar la política de costos.
Registrar ADR antes del código, resultados/incidencias durante cada historia y QA/evidencia,
backlog/progreso al cerrar. No se inicia Sprint 3 con esta revisión.
