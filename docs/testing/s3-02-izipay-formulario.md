# QA: formulario, configuración y notificaciones Izipay

## Recorrido completo de cliente simulado · 2026-11-02

`/desarrollo/izipay/compra` permite probar botella, cantidad, carrito, entrega,
resumen, aprobación/rechazo/respuesta pendiente y reinicio. Estado solo en memoria;
los importes y la zona son ejemplos explícitos, no reglas comerciales. No usa el
checkout real, SDK, credenciales ni APIs de reserva/pago y no simula una firma válida.

6/6 recorridos locales aprobados en Chrome, escritorio 1440×1000 y móvil 390×844.
Se verifican totales, validación de teléfono de 9 dígitos, eliminación del carrito,
bloqueo de carrito vacío, tres resultados, consultas con confirmación visible,
reinicio/recarga, ausencia de desbordamiento, errores JS, solicitudes de escritura
y contactos al proveedor. El primer caso agotó el tiempo durante la compilación
inicial de la ruta nueva; se repitió tras compilar y pasó. TypeScript y ESLint aprobados.
La comprobación 404 en producción forma parte de las pruebas de CI; los seis
recorridos interactivos se limitan al servidor local de desarrollo.

No acredita sandbox externo, comprobantes, envío de correo, inventario ni permisos
del checkout real. Los controles productivos de Izipay no se modifican.

## Evidencia de integración previa

2026-11-02. Base main 05cc450. Incremento S3-02/S3-03; aceptación externa pendiente.

- 364/364 pruebas del servidor en PostgreSQL `vinos_rosh_test`, sin solicitudes de pago.
- TypeScript y ESLint de los archivos afectados aprobados.
- Pruebas nuevas: doble clic, respuesta perdida, SDK detenido, respuesta tardía tras
  desmontaje, propiedad/sesión, campos inconsistentes, token fuera del estado visible,
  expiración, firma original/alterada y separación de claves, cifrado autenticado,
  contraseña/rol de admin, concurrencia de revisiones, prioridad de BD y fallo cerrado.
- Integración: TEST no aprueba venta ni correo; IPN de producción sintética aplica pago/
  outbox una vez; resultado duplicado/paralelo, moneda/importe distintos, pago después
  de cancelación, reversión atómica cuando falla outbox y bloqueo TEST → producción.
- Los casos de producción usan exclusivamente firmas/datos sintéticos en BD aislada,
  sin red, cuentas reales, correos ni dinero. No acreditan una prueba bancaria.
- Migraciones verificadas primero en QA. La ampliación del enum y el índice están en
  archivos distintos para respetar el commit exigido por PostgreSQL.
- La base QA conservaba una configuración comercial anterior: se apartó y restauró
  al terminar para probar correctamente el fallback a variables. No se cambió una prueba
  para aceptar un medio de pago deshabilitado.
- El probe DEMO autorizado fue una solicitud de token con 100 céntimos y correo sintético:
  HTTP 200, status ERROR, INT_905, sin token. No se completó una transacción.

Revisión local de pantallas aprobada en 1440/390 px: formulario, espera, respuesta
perdida, cambio de sesión y vencimiento sin solicitudes de pago. Admin autenticado con
sesión temporal, campos privados vacíos y pasarela deshabilitada; no se guardó configuración.

Contrato real del adaptador en Chrome con SDK/API interceptados: una solicitud pese
a doble clic, dos scripts de orígenes/rutas fijos, cuerpo sin importe, retorno limitado a
sus cuatro campos, respuesta rechazada no aprobada y fallo de SDK sin reintento.
No se descargó ni ejecutó el SDK real en esas pruebas. Capturas privadas fuera de Git.

Pendientes al preparar esta nota: regresión de CI/build y comparación de recursos del
commit. Registrar resultados finales en el PR antes de integrar. No habilitar producción
para obtener evidencia.
