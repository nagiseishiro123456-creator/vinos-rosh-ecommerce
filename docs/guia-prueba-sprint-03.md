# Probar el avance y explicarlo al cliente

2026-10-27. Entorno local; Izipay aún no está habilitado para ROSH.

## Recorrido inmediato

1. Con desarrollo activo, abre `http://localhost:3000/desarrollo/correos`.
2. Revisa el pedido ficticio: tres botellas, envío y total S/ 98.20.
3. Pulsa **Simular fallo de correo**: cambia a Reintento pendiente y conserva número/total.
4. Pulsa **Simular recuperación**: Aceptado por el proveedor. El texto distingue aceptación
   de entrega en bandeja.
5. Prueba **Ver revisión necesaria** y **Ver aviso pendiente**.
6. Abre `http://localhost:3000/desarrollo/sprint-3` para reserva, espera, recuperación y
   vencimiento. Desde Confirmación también puedes abrir la demo del correo.

Rótulos de demostración y datos ficticios. Estas páginas no crean pedidos ni cambian pagos
o envían mensajes; solo existen en development y devuelven 404 en producción.

## Prueba funcional local

El panel real es `http://localhost:3000/admin/notificaciones`, con tu cuenta administradora.
Instalación nueva con PostgreSQL local iniciado, antes de arrancar Next:

```powershell
npm ci
npm run prisma:generate
npm run db:prepare:email
npm run dev
```

Si ya están servidor/base preparados, abre las páginas. Durante la implementación se
aplicaron las aditivas pendientes 13–15 en la base local, sin reset ni seed.

Para comprobar la función real usa datos de prueba en desarrollo:

1. Prepara un producto de prueba con stock, una zona que cubra su dirección y un método
   manual de demostración desde Productos, Envíos y Configuración.
2. Con una cuenta compradora de prueba, añade el producto, revisa el total y reserva.
3. Comunica una referencia ficticia de la prueba local para pasar a revisión.
4. Con la cuenta administradora entra en **Pagos**, localiza ese pedido y confirma el
   pago de prueba. Es una simulación operativa local, sin transferencia bancaria.
5. En Administración abre **Confirmaciones**. Debe existir un solo aviso Pendiente.
   Revisa destinatario, productos e importes en su vista previa.
6. Actualizar la página no crea avisos ni cambia stock/pago.
7. Una cuenta compradora o visita anónima no puede abrir esa cola privada.

Con el envío desactivado se muestra el mensaje correspondiente y no hay botón para enviar.
Las pruebas automáticas verifican reintentos con transportes falsos; la demo explica el
recorrido sin proveedor. Las claves van al archivo local ignorado, nunca a Git o al chat.

## Explicación para el cliente

«La tienda guarda el pedido y su reserva. En el circuito manual, administración verifica
la operación antes de registrar el pago. Al aprobarlo también se guarda un aviso. Si el
correo falla, pedido y pago se conservan y el aviso puede recuperarse sin crear otra
compra. Desde el panel revisamos su estado y contenido. El pago automático de Izipay
requiere habilitar el producto web del comercio y su entorno de pruebas.»

La confirmación no es boleta/factura fiscal. Aceptación del correo y entrega son distintas.
La demo no acredita una operación Izipay, entrega externa o cierre completo del Sprint 3.
