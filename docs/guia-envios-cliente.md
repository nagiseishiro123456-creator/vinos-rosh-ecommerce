# Configurar entregas — guía para ROSH

2026-10-31. Las condiciones comerciales las define ROSH. El sistema empieza sin texto
de entrega; mantener el campo vacío no publica horarios ni promete fechas.

## Configurar una zona

1. Ingresa con una cuenta administradora y abre http://localhost:3000/admin/envios.
2. Crea un distrito o usa **Editar tarifa** en una zona existente. La ubicación de una
   zona existente se conserva para mantener las direcciones asociadas.
3. Escribe su tarifa en soles, por ejemplo con punto decimal. Cero significa envío sin costo.
4. En **Indicaciones de entrega (opcional)** escribe los días de reparto, horario,
   plazo estimado o forma de coordinación que ROSH ya haya acordado. Hasta 600 caracteres.
   Es texto público: no incluyas claves, datos privados de compradores ni notas internas.
5. Pulsa **Guardar tarifa**. Si la zona estaba pausada, permanece pausada. Usa **Activar**
   cuando deba estar disponible para compradores.
6. Consulta http://localhost:3000/envios y busca el distrito. Comprueba el precio y el texto.

Para quitar las indicaciones, vacía el campo y guarda. Si otra persona modificó la zona,
recarga y revisa los valores actuales antes de guardar otra vez.

## Qué ve el comprador

Las indicaciones de su zona aparecen en cobertura, al seleccionar dirección y antes de
confirmar la reserva. No son un selector de cita ni un cálculo automático de días hábiles.
La tarifa y la zona determinan la cobertura; el texto comunica las condiciones acordadas.

Si ROSH cambia las indicaciones mientras el comprador revisa su resumen, debe revisarlo
de nuevo antes de reservar. Todavía no se descuenta stock en ese intento rechazado.

## Qué pasa con los pedidos existentes

Cada pedido conserva las indicaciones que el comprador revisó al reservar. Los cambios
posteriores solo afectan compras nuevas. El comprador y el administrador pueden
consultar el texto conservado en el detalle del pedido. Pedidos antiguos sin texto
siguen sin indicaciones añadidas retrospectivamente.

## Prueba breve con datos de desarrollo

En una zona claramente identificada como prueba, escribe un texto rotulado como ejemplo.
Revisa el resumen de una compra ficticia y cambia el texto desde otra sesión administradora:
al confirmar debe pedir revisar nuevamente. Confirma el resumen actualizado y vuelve a
cambiar la zona: el pedido reservado conserva el texto anterior. Después retira el texto
de prueba. No realices pagos ni entregas reales durante esta comprobación.

Para presentar la apariencia sin modificar la base usa http://localhost:3000/desarrollo/envios:
está rotulada como demo con importes y texto ficticios y solo existe en desarrollo.
