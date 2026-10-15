# QA — Sprint 1

## Baseline S1-01
Fecha: 2026-10-15. Base: `b4831eab1eaf7c3486b4bf8643001edefb5decc2`.
Entorno local: Linux, Node 22.23.3, npm 11.9.0. No se accedió a la BD de Render.
Primer sondeo de resolución con Node 24 produjo aviso de motor; las comprobaciones
registradas se repitieron con Node 22. El resultado inicial carecía de lockfile.

| Comprobación inicial | Resultado |
| --- | --- |
| Resolución de dependencias | 423 paquetes instalados; lockfile generado, sin cambiar versiones directas de negocio. |
| Prisma Client 6.19.3 | Generado. Aviso de deprecación `package.json#prisma` para Prisma 7; migración futura. |
| Auth schemas + order hold | 8 pruebas aprobadas, 0 fallidas. |
| Typecheck | Aprobado. |
| Lint | Aprobado. Aviso de soporte de ESLint 9 en instalación; actualización pendiente de evaluar. |
| Build Next.js | Aprobado. |
| npm audit --omit=dev | 0 vulnerabilidades reportadas en esa consulta. No es garantía de seguridad total. |
| PostgreSQL local | No disponible: contenedor sin Docker y con restricciones para iniciar una BD nativa. |

## Validación del cambio
En curso. Se registrarán run de CI, conteo de tests, smoke y enlaces a capturas antes
de declarar cerrada S1-01. Las otras historias permanecen pendientes.
La captura de producto usa un nombre de QA y una imagen de referencia existente;
no prueba un producto comercial ni una transacción real.

## Pruebas necesarias para el resto del sprint
Última unidad concurrente; rollback multiproducto; doble envío; reintento sin respuesta;
total manipulado; vencimiento repetido; aprobación contra mantenimiento;
pago comunicado pendiente de revisión; código de operación repetido; acceso a pedido ajeno.
Algunas pruebas de inventario ya existen; se ampliarán al ciclo completo cuando se implemente.

## Límites explícitos
PowerShell y Docker no ejecutados en este entorno. No se activaron pasarelas,
notificaciones, emisión fiscal ni se verificó producción. Smoke inicial cubre lectura
de páginas y salud de BD; no demuestra checkout, login exitoso ni conformidad de accesibilidad.
