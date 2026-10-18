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
S1-01 implementada/verificada en rama, PR #3 pendiente de integración. Las otras historias siguen pendientes.

Código verificado: `e8910c5946faf502804705496527006a3f82309c`.
[CI definitiva](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38824743481)
(job `116729444584`, success). El workflow inicial
[38824338198](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38824338198)
también aprobó; se refinó la captura larga para revelar contenido fuera del viewport.

| Comprobación de entrega | Resultado |
| --- | --- |
| npm ci --include=dev local | Aprobado; 432 paquetes. |
| Lockfile y dependencias directas | Coinciden. |
| Toolchain CI | Node 22.23.3 / npm 11.9.0. |
| PostgreSQL de CI | 16.15, servicio temporal aislado. |
| Migraciones sobre BD vacía | 7 aplicadas. |
| Seed administrador y conectividad | Aprobados con datos exclusivos de CI. |
| Suite existente | 15 aprobadas, 0 fallidas, 0 omitidas. |
| Typecheck / lint / build | Aprobados en local y CI. |
| Preparación standalone | Aprobada; imágenes de public accesibles. |
| Auditoría de producción | 0 vulnerabilidades reportadas. |
| Smoke | 2 aprobados (desktop/móvil); health 200, DB conectada, cuatro páginas por proyecto. |
| Fixture fuera de BD permitida | Rechazada antes de conectar (comprobación local con BD ficticia no permitida). |
| Capturas | 8 PNG de CI + 2 locales del acceso, revisadas visualmente. |

[Índice de imágenes](../evidencias/sprint-01/README.md) y
[manifiesto con hashes](../evidencias/sprint-01/manifest.json).
Artefacto original: `12015275384`, run `38824743481`; vence el 2026-10-29.
Las copias en Git conservan la evidencia aunque venza ese artefacto.

La revisión de capturas verificó contenido, logo, formulario y producto de QA.
El capturador carga imágenes diferidas y fuerza `content-visibility: visible` solo
al tomar la imagen para registrar toda la página; no modifica el CSS del producto.
No se evalúa todavía la conformidad de UX del checkout.
La tipografía puede variar entre navegadores/sistemas porque el proyecto usa fuentes del sistema.
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
