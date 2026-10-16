# QA — S1-02: dinero exacto

Fecha: 2026-10-15 (America/Lima). Base S1-01: `5c4c59e1b3806f4a131edbf74c4e8e4a62c17b17`.
Rama: `fase-2/sprint-01-dinero-exacto`, dependiente del PR #3.
Estado: implementada y verificada en rama; integración pendiente. PR #4, dependiente del PR #3.
No se utiliza la BD de Render.

## Alcance
Cálculo, validación de entrada, serialización, presentación y persistencia de importes.
Confirmación firmada para detectar cambios del resumen entre lectura y envío.
Sin pasarelas, comisiones, impuestos o descuentos nuevos. Sin migración de esquema.

## Casos automatizados
- 3 × 29,90 + 8,50 = 98,20; suma de céntimos y envío cero.
- Rechazo de precisión adicional, exponentes en formularios, negativos, no finitos y límites administrativos.
- Cantidades enteras válidas y límite Decimal(10,2) antes de cualquier reserva.
- Firma canónica: orden de líneas y 8.5/8.50; usuario/carrito/dirección/cantidad/tarifa ligados al resumen.
- Rechazo de firma manipulada, clave diferente y cambio de precios que mantiene el mismo total agregado.
- BD: pedido/línea/pago exactos; importes extra del cliente ignorados; snapshots conservados tras cambios de catálogo.
- BD: precio o tarifa cambiados no crean pedido/pago ni descuentan stock; un resumen actualizado permite un nuevo envío explícito.
- Navegador: login con cliente ficticio, carrito 89,70, entrega/pago 98,20; cambio a 98,80 bloquea el primer envío;
  un segundo envío explícito ignora campos de total falsificados y persiste 98,80.

## Resultados

Código verificado: `b72f85c061db70a4fefef6fd172bc26527c3aa4b`.
[CI aprobada: run 38827763285](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38827763285), job `116739119376`.

| Comprobación | Resultado |
| --- | --- |
| Node / npm | 22.23.3 / 11.9.0; instalación por lockfile. |
| PostgreSQL 16 | 7 migraciones sobre BD vacía, seed y conexión aprobados. Sin migraciones nuevas. |
| Lógica e integración | 28 aprobadas: 15 existentes, 9 nuevas sin BD y 4 nuevas con BD. |
| Navegador Chromium | 4 aprobadas: baseline y compra autenticada en escritorio/móvil. |
| Tipos / lint / build | Aprobados. |
| Auditoría de producción | `npm audit --omit=dev`: 0 vulnerabilidades reportadas en esa consulta. |
| Evidencia nueva | 10 PNG originales revisados, conservados en Git con hashes. |

Localmente se aprobaron las 9 pruebas nuevas sin BD y las comprobaciones de tipos/lint/build.
Las pruebas con PostgreSQL se ejecutaron en CI, no en este contenedor.
La instalación completa de CI informó 5 vulnerabilidades altas incluyendo dependencias de desarrollo;
el resultado de producción de la tabla no equivale a una auditoría completa sin hallazgos.
La auditoría completa local confirmó la cadena de desarrollo `eslint-config-next`,
`@next/eslint-plugin-next`, `fast-glob`, `micromatch` y `braces`. Se conserva como
pendiente de revisión de herramientas antes del cierre del sprint, sin aplicar el
retroceso de versión mayor que propone automáticamente npm.

## Incidencia corregida durante QA
Run inicial `38827299790`: las 28 pruebas y los dos baseline pasaron; los dos recorridos
de dinero fallaron por selector ambiguo `getByRole("alert")`, que incluía el anunciador
de rutas de Next.js. Se restringió al aviso del checkout sin debilitar las aserciones
de importes, stock ni persistencia. El run aprobado ejecutó el recorrido completo.

## Evidencias conservadas
[Galería y manifiesto](../evidencias/sprint-01/s1-02/README.md): carrito, entrega,
pago, aviso de resumen cambiado y pedido recibido en escritorio y móvil.
El pedido queda en revisión; la prueba no demuestra la recepción de un pago real.
Datos sintéticos, cuenta bancaria `QA-NO-TRANSFERIR` y dirección ficticia; no hay abonos reales.
El flujo crea registros manuales en revisión exclusivamente en la base aislada de CI.

## Revisión visual y pendientes de UX
Se revisaron las diez capturas: identidad, formularios, aviso de cambio y totales presentes.
Pendientes para Sprint 2: mantener moneda/importe juntos en líneas de producto,
traducir `UNDER_REVIEW`/`BOLETA`, revisar orden del resumen móvil y superposición de
WhatsApp/navegación fija con contenido y CTA. La captura larga conserva los controles
fijos en la posición del viewport inicial; Playwright sí pudo continuar y enviar el formulario.
Revisar zona horaria de fechas de pedidos antes de lanzamiento (CI usa UTC).

## Límites
El cliente todavía puede haber pagado antes de crear la orden (S1-03 pendiente).
Si cambió el resumen, se indica contactar a la tienda y no pagar otra vez.
La firma no demuestra un abono ni hace idempotente la operación (S1-04 pendiente).
La cancelación por demora de revisión se corregirá en S1-05.
