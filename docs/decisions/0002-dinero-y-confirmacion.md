# ADR 0002 — Dinero exacto y confirmación del resumen

Fecha: 2026-10-15. Estado: adoptada para S1-02; verificación pendiente.

## Política
- Moneda única actual: PEN. Precios finales de catálogo y tarifas se expresan con hasta dos decimales.
- Entrada administrativa: texto decimal con punto, sin notación exponencial, negativos, comas o más de dos decimales. Se rechaza precisión extra; no se redondea silenciosamente.
- Cálculo comercial en servidor con `Prisma.Decimal`; multiplicación por cantidades enteras y suma exacta. No hay operaciones de punto flotante monetarias.
- Valores hacia el navegador: cadenas canónicas con dos decimales; presentación y suma de previsualización con céntimos enteros (`BigInt`), sin cargar Prisma en componentes de cliente.
- Límite por importe persistido: S/99.999.999,99, correspondiente a Decimal(10,2). Productos conservan su máximo administrativo S/999.999,00; tarifas hasta S/10.000,00 y envío gratuito permitido.
- No se agregan impuestos, descuentos ni recargos nuevos. Si se incorporan porcentajes, será necesaria otra decisión sobre su redondeo.

## Confirmación
El servidor firma con HMAC-SHA256 el resumen mostrado, ligado al cliente, carrito,
artículos/cantidades/precios, dirección y tarifa. Dominio de firma separado, usando
NEXTAUTH_SECRET; clave ausente/corta bloquea la firma. El formulario transmite esa
confirmación, no importes confiables. La creación relee los datos y comprueba la
firma dentro de una transacción Serializable; guarda los mismos importes calculados.
Si el resumen cambió o fue manipulado, no hay pedido, pago ni movimiento de stock.
La pantalla actualizada requiere un nuevo envío explícito.

## Límites de esta historia
La firma confirma contenido, no reserva inventario ni garantiza idempotencia; eso
corresponde a S1-03/S1-04. No tiene un vencimiento propio en S1-02: solo vale si el
contenido actual coincide; S1-03 definirá el vencimiento persistido de la reserva.
El flujo manual todavía permite que el cliente haya pagado antes de enviar:
ante discrepancias se indica no pagar otra vez y solicitar conciliación. S1-03
cambiará el orden del flujo. No se activa ninguna pasarela.

Alternativas: Number con toFixed oculta errores acumulados; decimal en cliente
duplica dependencias; confiar en inputs ocultos permite manipular importes.
