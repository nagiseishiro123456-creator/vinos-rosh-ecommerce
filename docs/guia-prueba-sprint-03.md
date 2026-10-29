# Probar el avance y explicarlo al cliente

Actualizado 2026-10-29. Entorno local; Izipay y Resend aún no están habilitados para ROSH.

## Nuevo: conciliación y preparación del correo

Abre `http://localhost:3000/desarrollo/conciliacion`. Pulsa **Ver diferencia**: un pago de
98.20 menos comisión 2.50 deja neto 95.70; un abono de 94.70 muestra que falta 1.00.
Pulsa **Ver conciliado**, **Comisión desconocida** y **Sin comisión** para comparar.
Datos ficticios, sin guardar registros ni consultar cuentas bancarias.

En la función real, después de aprobar un pago manual de prueba:

1. Entra como administrador a `http://localhost:3000/admin/conciliacion`.
2. Abre el pedido y registra la comisión (vacío si se desconoce), abono, fecha y referencia.
3. Identifica el extracto y explica el registro. Guarda con la confirmación solicitada.
4. Si aparece diferencia, corrige el dato después de revisar la fuente; indica el motivo.
5. Comprueba el historial: conserva valores anteriores y nuevos. Recargar no añade registros.

Prueba con comisión 99.00 frente a bruto 98.20: el formulario indica el campo y conserva
los valores para corregir. Una fecha futura o abono sin fecha/referencia también se rechaza.
El panel requiere ADMIN; un pago reembolsado conserva evidencia y queda para revisión.

Correo: `http://localhost:3000/admin/notificaciones/configuracion` muestra lo pendiente
sin exponer claves ni enviar mensajes. `npm run email:check` ofrece el mismo diagnóstico.
ROSH todavía debe preparar Resend y verificar su dominio; [pasos de configuración](integraciones/confirmaciones-correo.md).

Para explicarlo al cliente: «Un pago confirmado y el abono recibido se revisan por separado.
Registramos la comisión real y el extracto; si hay diferencia, queda visible. Las correcciones
conservan historial. La preparación del correo no envía mensajes hasta configurar el proveedor».

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
npm run db:prepare:sprint3
npm run dev
```

Si ya están servidor/base preparados, abre las páginas. Durante la implementación se
aplicaron las aditivas pendientes 13–15 y después la 16 en la base local, sin reset ni seed.

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
