# Conciliación manual — S3-04

2026-10-29. Incremento autorizado sobre ec5303f. El comercio todavía no dispone de
acceso Izipay ni de Resend configurado. Esta función permite trabajo operativo manual;
no consulta bancos ni confirma una pasarela externa.

## Dinero y evidencia

Solo permite editar un pago Yape/transferencia manual PAID en PEN, único en su pedido,
con fecha pagada coherente y total igual al pedido pagado/preparado/enviado/entregado.
El bruto proviene del servidor. Comisión y abono aceptan decimales exactos de dos cifras,
sin floats ni porcentajes inventados. Vacío es desconocido; 0.00 es cero explícito.
Comisión no supera el bruto. El neto es bruto menos comisión; diferencia es abono menos
neto. Sin comisión no se calcula neto ni se declara conciliado.

El abono requiere importe, referencia y fecha de calendario válida, no futura en Perú.
Se identifica un reporte/extracto para cada registro y un motivo para cada corrección.
Es evidencia ingresada por un operador, no verificación automática ni documento fiscal.
Un abono agrupado requiere identificar previamente la parte correspondiente a este pago;
el módulo no distribuye lotes ni ejecuta transferencias/reembolsos.

## Persistencia y acceso

Migración aditiva 16: PaymentSettlement, único por Payment, sin backfill. Checks de
importes, evidencia del abono y revisión positiva. FK cascade conserva el comportamiento
de borrado del pago; no se añade UI de borrado. No cambia tablas ni importes históricos.
Prisma refleja la tabla y el repositorio SQL hace explícito el orden de locks.

La transacción verifica ADMIN actual, bloquea Order → Payment y lee de nuevo el estado.
expectedRevision=0 crea; una corrección exige la versión vigente. Dos operadores no
sobrescriben silenciosamente el mismo registro. Guardado y OrderEvent son atómicos;
si falla la auditoría, se revierte la evidencia. El evento conserva antes/después, fuente,
fecha, referencia, actor y motivo. No se modifica pago, stock, carrito ni outbox.

Al devolver/cambiar un pedido, el registro se conserva y proyecta REVIEW, sin edición.
No se convierte un abono histórico en cero ni se da por resuelta una devolución.
La pantalla muestra 25 pagos por página y 20 eventos recientes por detalle; el historial
completo permanece en el pedido. No ofrece totales globales basados en una página parcial.
La acción exige confirmación y limita 15 guardados por administrador/minuto.

## Estados y límites

PENDING_COSTS: comisión desconocida. PENDING_DEPOSIT: neto conocido, abono sin verificar.
MATCHED: coincidencia manual. DIFFERENCE: discrepancia. REVIEW: pago/pedido cambió o
datos incoherentes. Un cambio concurrente devuelve conflicto y conserva el formulario.
Errores por campo explican qué corregir; errores internos no muestran datos de BD.

`/admin/conciliacion` es privado; `/desarrollo/conciliacion` usa datos ficticios, no tiene
acciones de escritura y devuelve 404 fuera de development. El respaldo nativo restaura
dos versiones, evidencias, auditoría y outbox intacta.

El respaldo comercial JSON pasa a versión 3 e incluye paymentSettlements con importes
decimales como texto, fecha de abono y revisión, en el mismo snapshot RepeatableRead que
pagos e historial. Conserva exclusiones de secretos. Es una exportación, no un restaurador
automático de PostgreSQL ni de cuentas/autenticación.

S3-04 sigue parcial: integrar reporte/consulta y referencias verificadas de Izipay cuando
exista acceso, y completar aceptación operativa. No cubre liquidaciones por lote,
contabilidad, fiscalidad ni devoluciones parciales. [Guía](../guia-prueba-sprint-03.md).
