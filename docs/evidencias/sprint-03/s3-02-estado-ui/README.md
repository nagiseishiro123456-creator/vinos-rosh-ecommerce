# Sprint 3 — Estado y vistas de ejemplo

Capturas reales de `/desarrollo/sprint-3` en localhost:3000, 2026-10-23.
HEAD base: `715327c289853fb688c101e825f68f9ed57fe99b`; árbol con cambios sin commit.
Navegador integrado, Next en development, datos fijos ficticios. El rótulo de demostración
está visible en cada captura. No hubo proveedor, tarjeta, cargo ni correo real.

| Archivo | Contenido | Viewport CSS |
| --- | --- | --- |
| 01-reserva-y-plan.jpg | Reserva y próximos desarrollos del Sprint 3 | 1102×884, página completa |
| 02-formulario-previsto.jpg | Espacio previsto para el formulario oficial pendiente | 1102×884, página completa |
| 03-recuperacion.jpg | Resultado incierto, sin proponer repetir el pago | 1102×884, página completa |
| 04-confirmacion-y-correo-previstos.jpg | Confirmación simulada y correo pendiente | 1102×884, página completa |
| 05-consulta-sesion-requerida.jpg | Consulta real con referencia ficticia retira el panel | 1102×884, página completa |
| 06-recuperacion-movil.jpg | Recuperación sin desborde horizontal | 390×844, página completa |
| 07-vencimiento-movil-320.jpg | Vencimiento sin desborde horizontal | 320×740, página completa |

El alto del JPG completo y su ancho de contenido pueden diferir del viewport por scrollbars.
La foto procede del cliente; precio y producto son ilustrativos. Los estados mostrados no
son capturas de una compra externa, de IPN o de correo entregado.

`servidor-final.txt` contiene salida parcialmente truncada del tramo final de la regresión:
238/238 aprobadas, exit 0, ~25 s, PostgreSQL vinos_rosh_test. Los errores Prisma visibles
corresponden a casos deliberados de rollback/concurrencia que aprobaron. Tipos y lint
aprobaron por separado. [QA](../../../testing/s3-02-estado-ui.md).
