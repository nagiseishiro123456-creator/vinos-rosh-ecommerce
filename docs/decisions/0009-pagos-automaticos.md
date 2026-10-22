# ADR 0009 — Contrato de pago automático

Fecha: 2026-10-21 (America/Lima).
Estado: **propuesto, pendiente de proveedor/producto y aceptación**.
Alcance: diseño previo del Sprint 3; ninguna migración o integración implementada aquí.

## Contexto y alternativas

La base integrada calcula importes exactos y reserva stock una vez antes de presentar
instrucciones de pago manual. El propietario quiere evaluar Izipay/Yape; la identidad
«ezepay» está por confirmar. [Investigación y fuentes](../investigacion/pagos-yape-izipay.md).

Se consideran mantener el flujo manual, link individual alojado y un checkout por SDK/API.
Un link manual necesita conciliación humana. Para el objetivo automático se recomienda
un solo adaptador de proveedor elegible: Izipay si la modalidad está habilitada para ROSH;
CulqiOnline es alternativa a evaluar. La elección no se da por aprobada con este ADR.

## Diseño propuesto

1. Separar reserva, intento de pago, resultado verificado y abono. La orden conserva
   precios, cantidad, total y moneda del snapshot; el navegador no decide importes.
2. Persistir un intento antes de llamar al proveedor. Relacionar orden, usuario,
   producto/ambiente del proveedor, referencia, importe, moneda y resultado conocido.
   Usar unicidad de la identidad externa y de efectos de negocio. No reutilizar el
   enum `CULQI` para etiquetar Izipay ni cambiar el sentido de registros históricos.
3. Llamar al proveedor fuera de una transacción de BD para no retener bloqueos en red.
   Un timeout deja un intento de resultado incierto recuperable; consultar/reconciliar
   antes de crear otro cargo. Adoptar idempotencia del proveedor solo si su contrato la soporta.
4. La interfaz abre el componente del proveedor bajo demanda. Tarjeta, CVV y código
   Yape no se almacenan ni se envían al backend de ROSH para procesar el cobro.
   Credenciales privadas y validación de firma permanecen en runtime servidor.
5. Una IPN tiene su propio Route Handler público HTTPS. No requiere sesión de navegador
   ni Origin de ROSH: la autenticidad viene del contrato del proveedor. Conservar
   límites de tamaño, validación estructural y control de tráfico compatibles con sus reintentos.
6. Verificar el contenido original firmado sin reserializarlo. Para la familia SDK
   consultada: `payloadHttp`/firma HMAC conforme a la documentación, comparación segura,
   datos firmados como autoridad. Comprobar comercio, ambiente, referencia, intento,
   importe/moneda y estado efectivo; no confiar en campos exteriores no firmados ni
   en una URL de éxito. Para otra familia de API documentar su contrato por separado.
7. Persistir identidad y aplicar resultado/transición/evento/outbox atómicamente.
   Repeticiones no descuentan stock ni limpian otra vez el carrito. Errores de red,
   autenticación y rechazos no se interpretan como pago aprobado.
8. Definir el significado de autorizado/capturado/confirmado según producto. Una
   respuesta aprobada no implica que el dinero ya esté abonado en el banco.

El contrato de consulta, retry y ACK de IPN se fijará al identificar el producto.
No se propone un endpoint inventado para consultar o devolver dinero.

## Reglas de estados y concurrencia a concretar

| Situación verificada | Resultado requerido |
| --- | --- |
| Pago confirmado, reserva vigente | Pago y orden avanzan una vez; sin nuevo descuento de stock. |
| IPN duplicada/paralela | Recuperar el resultado ya aplicado; no emitir otro efecto de negocio. |
| Retorno de navegador sin resultado autoritativo | Mostrar verificación pendiente; consultar servidor. |
| Timeout o respuesta incierta | Mantener identidad, bloquear reintento que pueda duplicar cargo y recuperar estado. |
| Importe, moneda, comercio o identidad discrepantes | No marcar pagado; incidencia conciliable con trazabilidad mínima. |
| Éxito externo después de liberar stock/cancelar | Registrar ingreso para resolución; no reabrir/despachar ni reservar silenciosamente. |
| Dos intentos cobrados | Una orden no cuenta dos ventas; escalar ingreso duplicado y devolución conforme al procedimiento. |
| Pago frente a vencimiento/cancelación concurrentes | Transición condicionada y atómica; ningún saldo negativo ni doble reposición. |
| Fallo de correo tras confirmar | Pago preservado; entrega del aviso pendiente/reintentable. |

No reutilizar directamente las funciones administrativas manuales para aprobar una IPN:
comprueban rol humano, proveedor manual y un pago por pedido. Se diseñará la extensión
manteniendo las garantías y las pruebas históricas.

## Conciliación, comunicación y comprobantes

Registrar importe bruto, comisión conocida, neto y abono como datos distintos. Si la
tarifa o liquidación no se ha recibido, mostrar desconocido/pendiente; no deducir una
comisión genérica como si fuera un dato confirmado del proveedor. Los reembolsos reales
necesitan referencia externa y estado verificado; el panel no puede fingir ejecutarlos.

El outbox de confirmación se guarda con la transición confirmada; su envío ocurre
después del commit. Identidad persistida y mecanismo de entrega/reintento se prueban
con el servicio seleccionado. El correo de pedido y la constancia de pago no emiten
una boleta/factura fiscal. WhatsApp automático requiere refinamiento aparte.

## Costos, privacidad y pruebas

Conservar pagos manuales, modo prueba y proveedor automático desactivado por defecto.
No registrar secretos, PAN/CVV, código Yape ni payloads completos con datos personales;
guardar referencias/huellas y campos mínimos para auditoría. Un ambiente sandbox no
autoriza usar producción. La [política de costos](../cost-policy.md) sigue vigente.

Probar migraciones sobre datos anteriores, transacciones y carreras en PostgreSQL,
notificación auténtica/repetida/falsa, intento incierto y pago tardío. Regresión móvil,
teclado y movimiento reducido sin animaciones complejas en carrito/checkout. Conservar
los resultados previos como baseline; obtener prueba externa separada del simulador.

## Pendientes para aceptar el ADR

- Marca/producto, disponibilidad del negocio y condiciones económicas.
- Contratos exactos de token, verificación, estado, consulta, ACK/reintentos y vencimiento.
- Estado/migración de intentos y eventos, retención de información y recovery operativo.
- Mecanismo y límites de correo, su operación de reintentos y plan de aceptación sandbox.

Al resolverlos, actualizar el estado y el contrato antes del primer PR de integración.
