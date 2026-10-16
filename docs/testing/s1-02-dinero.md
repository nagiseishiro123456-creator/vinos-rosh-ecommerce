# QA — S1-02: dinero exacto

Fecha: 2026-10-15 (America/Lima). Base S1-01: `5c4c59e1b3806f4a131edbf74c4e8e4a62c17b17`.
Rama: `fase-2/sprint-01-dinero-exacto`, dependiente del PR #3.
Estado inicial de esta entrega: en validación. No se utiliza la BD de Render.

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

## Verificación local inicial
9 pruebas nuevas sin BD aprobadas; TypeScript, lint y build aprobados.
La validación con PostgreSQL 16, el recorrido autenticado y las capturas se registrarán
tras CI. No se marca la historia como terminada hasta verificar esos resultados.

## Evidencias previstas
Carrito, entrega, pago, aviso de resumen cambiado y pedido confirmado en escritorio y móvil.
Datos sintéticos, cuenta bancaria `QA-NO-TRANSFERIR` y dirección ficticia; no hay abonos reales.
El flujo crea registros manuales en revisión exclusivamente en la base aislada de CI.

## Límites
El cliente todavía puede haber pagado antes de crear la orden (S1-03 pendiente).
Si cambió el resumen, se indica contactar a la tienda y no pagar otra vez.
La firma no demuestra un abono ni hace idempotente la operación (S1-04 pendiente).
La cancelación por demora de revisión se corregirá en S1-05.
