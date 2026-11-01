# Probar preparación de lanzamiento y operar ROSH

## Revisar el panel

1. Inicia sesión con tu administrador y abre http://localhost:3000/admin/lanzamiento.
2. Revisa las siete comprobaciones locales. Cada tarjeta explica su estado y permite
   abrir la pantalla donde revisarlo. Un error de lectura se muestra sin darlo por aprobado.
3. Modifica un dato de prueba desde Configuración o Envíos, vuelve al panel y pulsa
   Actualizar comprobaciones. La actualización vuelve a consultar los datos guardados.
4. Desarrollo o preview deben mantener pendiente la configuración de publicación.
   Tener una URL HTTPS no basta para autorizar indexación.
5. Revisa Servicios externos: mientras falten accesos, Izipay y correo seguirán pendientes.
   Abrir esta pantalla no llama proveedores ni activa sus funciones.

## Compra de aceptación con el cliente

Usa exclusivamente datos ficticios y un entorno de prueba. La reserva y la simulación
administrativa modifican stock/pedidos de prueba. No hagas pagos reales para este recorrido.

- Preparar producto, stock, una zona y medio manual de prueba.
- Abrir una ventana privada con una cuenta de comprador de prueba; dejar administración
  abierta en la otra ventana.
- Buscar producto, revisar foto/precio, añadir al carrito e ingresar con la cuenta.
- Elegir dirección; comprobar cobertura, indicaciones, envío y total antes de reservar.
- Guardar el número de pedido. Revisarlo desde administración, simular la revisión del
  pago solo en ese entorno aislado y recorrer preparación/entrega.
- Revisar la vista previa de confirmación. La recepción del aviso y recuperación de
  contraseña requieren el servicio de correo preparado y un destinatario autorizado.
- Revisar el pedido desde la cuenta del comprador y registrar incidencias con ROSH.

Registro sugerido, conservado fuera del repositorio si incluye datos personales:

| Fecha y entorno | Participantes | Pedido de prueba | Resultado | Incidencia / responsable | Aceptación de ROSH |
| --- | --- | --- | --- | --- | --- |
| Por completar | Por completar | Por completar | Pendiente | Por completar | Pendiente |

Las pruebas automáticas y el porcentaje local no sustituyen este registro. El panel
todavía no permite guardar o aprobar la aceptación del negocio.

## Rutina del operador

- Antes de vender: revisar catálogo, inventario, cobertura, tarifas, indicaciones y canales
  de atención desde sus paneles. ROSH determina sus condiciones comerciales.
- Durante la operación: revisar Pedidos y Pagos. Aprobar un pago real únicamente después
  de comprobar su ingreso; revisar discrepancias en Conciliación y fallos en Confirmaciones.
- Reservas pendientes vencidas: el mantenimiento libera las elegibles. Las reservas en
  revisión requieren conciliación; no se liberan como una reserva abandonada normal.
- Copias: acordar responsable, frecuencia y ubicación externa privada. El panel Respaldo
  exporta datos comerciales JSON; el responsable técnico conserva un dump completo y
  prueba restauración en otra BD antes de necesitarlo. Nunca guardar copias o secretos en Git.
- Incidencias: anotar fecha, pedido y síntoma; comunicar el problema al responsable técnico
  evitando compartir contraseñas, claves o datos innecesarios de clientes.

## Explicación para el cliente

«El panel muestra qué configuración tiene la tienda y dónde corregir lo que falta.
La puesta en marcha también necesita una compra de prueba y la revisión de ROSH sobre
entregas, operación y servicios externos. El panel no publica la tienda automáticamente.»
