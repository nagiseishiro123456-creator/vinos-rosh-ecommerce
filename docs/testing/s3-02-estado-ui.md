# S3-02 — Consulta y recorrido local

2026-10-23, America/Lima. HEAD base `715327c289853fb688c101e825f68f9ed57fe99b`, cambios
de trabajo sin commit. [Contrato](../integraciones/estado-izipay.md).

## Servidor

`scripts/test-local-postgres.mjs` con Node 24.22.1 local: **238/238 pruebas aprobadas**
(218 previas + 15 deterministas/handler + 5 PostgreSQL de este incremento). Se mantiene
Node 22 como versión declarada del proyecto/CI; esta ejecución no sustituye CI de Node 22.
La base aislada vinos_rosh_test recibió las 14 migraciones existentes; ninguna pendiente.
Sin migración nueva, seed ni reset. No se modificó la base de desarrollo ni `.env`.

Cobertura nueva: reserva/intento/preparado/incierto sin PAID, estado pagado con paidAt,
cancelación/reembolso, vencimiento exacto, importe/modo/producto/moneda incoherentes,
proyección pública, DTO estricto, sesión/cuenta/origen, errores sanitizados y presupuesto
persistente compartido por handlers. Pedidos ajenos/manuales no se leen. La consulta no
modifica pedidos, intentos o stock. La prueba de confirmación escribe datos sintéticos
directamente en QA: no acredita una IPN ni una transición de negocio implementada.

`tsc --noEmit`, `eslint .` y `git diff --check` aprobados. No se ejecuta next build para
no sustituir la carpeta .next utilizada por el servidor de desarrollo del propietario.
No se ejecutó en este incremento la suite de navegador completa ni un sandbox externo.

## Navegador local

Revisión con navegador integrado contra localhost:3000 y servidor Next en desarrollo.
Se recorrieron los estados con controles reales, se comprobó el retiro del panel al
consultar sin sesión válida y se revisó el contenido del formulario previsto: cero inputs
de tarjeta. Reserva/formulario/recuperación/confirmación tienen capturas completas.
Responsive de recuperación a 390×844, vencimiento a 320×740 y espera a 1440×900:
sin desborde horizontal. Enter en «Siguiente» cambia de escenario y conserva el foco
en ese control; se evitó desmontar la sección completa al cambiar el ejemplo.
La verificación se limita a esta revisión local, sin afirmar certificación de accesibilidad,
prueba del SDK ni éxito de una operación externa.

[Capturas originales, resultados y procedencia](../evidencias/sprint-03/s3-02-estado-ui/README.md).
Faltan SDK con claves TEST verificadas, IPN/reconciliación real, correo recuperable,
revisión completa de navegación y aceptación. S3-02/S3-06 no se marcan terminadas.
