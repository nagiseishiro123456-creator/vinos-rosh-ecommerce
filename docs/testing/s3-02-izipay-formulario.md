# QA: formulario, configuración y notificaciones Izipay

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

Pendientes al preparar esta nota: revisión local de pantallas y contrato de navegador
con transporte simulado, regresión de CI/build y comparación de recursos del commit.
Registrar resultados finales antes de integrar. No habilitar producción para obtener evidencia.
