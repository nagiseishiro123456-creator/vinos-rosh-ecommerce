# Evidencia local — reserva HTTP sandbox

Fecha: 2026-10-23 (America/Lima). Base del checkout local: `715327c`, rama
`fase-2/correccion-registro-local`, con cambios de trabajo sin nuevo commit.

- `servidor.txt`: ejecución real de 218 pruebas de servidor contra `vinos_rosh_test`;
  218 aprobadas, cero fallos/omisiones. Node 24.22.1 y PostgreSQL local del proyecto.
- `http-disabled.json`: comprobación real de la ruta Next local; GET 405, POST 404 y
  caché privada/no-store. No se enviaron credenciales ni se creó una reserva en desarrollo.

La base de QA recibió las 14 migraciones ya existentes. El runner no apunta al nombre
de base de desarrollo. Los mensajes de error de Prisma en el registro proceden de
conflictos/rollback provocados por pruebas con datos sintéticos. No hay capturas de pago
porque no se añadió UI ni se ejecutó una pasarela externa.

[QA y reproducción](../../../testing/s3-02-reserva-http.md).
