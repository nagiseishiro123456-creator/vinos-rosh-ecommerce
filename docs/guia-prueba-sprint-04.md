# Probar cobertura y direcciones — Sprint 4

2026-10-30. Funciones locales sin mapas ni servicios de pago.

## Recorrido rápido

1. Abre http://localhost:3000/envios o Envíos en el menú. Muestra únicamente las tarifas
   activas que el negocio ya configuró, sin agregar precios de ejemplo a la base.
2. Busca tu distrito o provincia. Sin coincidencia se informa que no hay tarifa habilitada;
   no se ofrece un envío gratuito como alternativa.
3. Para una presentación sin modificar datos abre http://localhost:3000/desarrollo/envios.
   «san isidro», «HUARAL» y una búsqueda inexistente muestran los distintos estados.
   Todos sus precios están rotulados como ficticios y esta demo no existe en producción.

## Prueba operativa con datos de desarrollo

1. Como administrador abre http://localhost:3000/admin/envios. Crea una zona de prueba,
   con un nombre claramente identificable y su precio en soles. 8,50 muestra cómo corregir
   el importe; 8.50 es válido. No se borran los campos por un error.
2. Pausa esa zona. Usa **Editar tarifa**, cambia el importe y guarda: debe seguir pausada.
   Solo **Activar** vuelve a ofrecerla. Una pantalla antigua pide recargar si otra acción
   cambió la zona. No se duplica una ubicación escribiéndola con otra capitalización.
3. Como comprador abre http://localhost:3000/mi-cuenta/direcciones. Agrega una dirección
   con zona activa. Un celular de 8 dígitos indica qué falta y conserva el formulario.
   Usa 9 dígitos comenzando con 9, con +51 opcional.
4. Guarda otra dirección y cámbiala a principal. Debe quedar una sola principal. Quitarla
   selecciona otra activa, conservando la dirección archivada y los pedidos históricos.
5. En checkout una dirección sin tarifa activa muestra **Por calcular**, bloquea
   **Revisar pedido** y ofrece consultar cobertura. Al activar la zona, recarga y comprueba
   que el total incluya su importe. El servidor vuelve a validarlo al reservar.

Hasta 10 direcciones activas por cuenta. Para cambiar la principal selecciona otra;
editar una principal la conserva. Las tarifas comerciales finales y la cobertura real
deben confirmarse con el negocio. La consulta no promete una fecha de entrega.

## Explicación al cliente

«Antes de comprar puedes consultar si llegamos a tu zona y cuánto cuesta el envío.
Guardas tu dirección con una tarifa habilitada y revisamos nuevamente el importe al
confirmar. Si pausamos una zona, deja de ofrecerse. Los pedidos ya reservados conservan
su dirección y precio originales.»

Izipay y entrega real de correo siguen pendientes del Sprint 3. Este incremento no los
activa ni cambia las preferencias de diseño de Home.
