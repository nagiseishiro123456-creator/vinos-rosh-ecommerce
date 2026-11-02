# Izipay: guía para probar y explicar a ROSH

## Lo que se puede ver ahora

1. En desarrollo abre `/desarrollo/izipay`. Es una simulación sin tarjetas, dinero,
   pedidos ni cambios de stock. Prueba Formulario y espera, Respuesta perdida,
   Formulario cerrado, Cambio de sesión y Reserva vencida.
2. Entra como administrador a `/admin/configuracion/izipay`. Está dentro de
   Configuración → Pagos Izipay. Las claves privadas quedan vacías al volver a entrar.
3. El dueño puede guardar las credenciales completas del comercio, elegir modo y
   confirmar con su contraseña. Guardar sin habilitar conserva la pasarela apagada.
   La marca de éxito confirma almacenamiento, no aceptación por Izipay.

El ejemplo DEMO del documento fue rechazado con INT_905: no sirve para demostrar
un pago externo. No se debe mostrar una simulación al cliente como una integración
aceptada por Izipay ni presentar TEST como dinero recibido.

## Cuando Izipay entregue el acceso

- Confirmar Mi Cuenta Web V4/Krypton y los medios habilitados, incluido QR si corresponde.
- El responsable técnico prepara una sola vez la clave privada de cifrado en el servidor.
  El dueño ingresa las credenciales de sandbox desde el admin sin editar código.
- Habilitar sandbox únicamente en desarrollo. Crear un pedido de prueba, elegir Izipay,
  abrir el formulario una vez y usar los datos de prueba que indique el proveedor.
- Registrar la URL HTTPS completa `/api/payment/webhook` en las reglas de notificación
  del comercio. Localhost no es accesible desde Izipay; el retorno firmado permite
  comprobar un resultado TEST, pero no sustituye la prueba de IPN pública.
- Verificar aprobación/rechazo, 3DS/QR, vuelta al pedido, repetición de notificación,
  pérdida de conexión y pago después del vencimiento. Si un intento queda incierto,
  consultar antes de repetir. La aplicación no lo reinicia automáticamente.
- Revisar resultados recientes y trazabilidad desde la configuración/pedido.

Producción solo se habilita tras las pruebas y el acceso real del comercio. Seleccionar
el modo no basta: requiere marcar habilitar, introducir las claves correctas, confirmar
`ACTIVAR PRODUCCION` y la contraseña del administrador. Durante esta entrega permanece
sin activar. Un pedido TEST no puede convertirse en producción cambiando esa opción.

## Explicación breve para el cliente

«El sistema prepara el importe desde el pedido y Izipay recoge los datos de pago.
Una notificación verificada confirma la venta desde el servidor. Las repeticiones no
duplican el stock ni el correo. Si el resultado no está claro o llega tarde, se conserva
para revisión y no se invita a pagar otra vez. Las pruebas se identifican y nunca habilitan
un despacho como si hubiera ingresado dinero real.»
