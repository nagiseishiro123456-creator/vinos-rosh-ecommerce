# S3-02 — Registro persistente de intentos de sandbox

Fecha: 2026-10-22 (America/Lima). Incremento posterior a la preparación del PR #17.
Alcance: dominio y persistencia aislados. No es un checkout de Izipay ni el cierre de S3-02.
El producto comercial de ROSH y sus credenciales de pruebas siguen por confirmar.

## Contrato implementado

`PaymentAttempt` guarda orden, referencia única generada en servidor, familia
`MICUENTAWEB_V4`, modo `TEST`, moneda PEN e importe entero en céntimos. No se reutiliza
el proveedor histórico CULQI para Izipay. Tampoco se crea un registro `Payment` aprobado.

`beginMicuentawebSandboxAttempt` recibe identidad de usuario autenticada por el futuro
servidor y el ID de orden. Bloquea la fila de esa orden con `FOR UPDATE`, comprueba la
propiedad y recupera primero el intento existente. La transacción no hace solicitudes
externas. La restricción única por orden refuerza que solo haya un creador.

Para un intento nuevo exige reserva vigente, stock sin liberar, estado pendiente y
ningún pago existente. Los pedidos manuales y Culqi conservan su circuito: este
servicio no los convierte ni elimina sus registros. La creación de una reserva
automática elegible es trabajo pendiente antes de conectar una ruta de inicio.

El total procede de `Order.total`, no del precio actual del catálogo ni del navegador.
La referencia identifica el intento en el proveedor; no contiene datos personales.
El correo se lee de la cuenta para el payload inicial y no se duplica en esta tabla.
La proyección de metadatos convierte BigInt a string para poder serializarla.

| Estado | Significado | Comportamiento de otro inicio |
| --- | --- | --- |
| INITIATING | Intención persistida; no certifica que la solicitud haya salido. | Recupera identidad; no concede otra solicitud. |
| TOKEN_READY | Se registró un token del adaptador; no acredita un cobro. | Recupera metadatos; no pide otro token. |
| UNCERTAIN | Una solicitud o su resultado requiere recuperación. | Recupera identidad y bloquea reinicio automático. |

Solo `created: true` otorga al futuro orquestador permiso para efectuar una solicitud.
Un timeout, caída o respuesta perdida no caduca ese permiso para entregárselo a otro
proceso. Si el proceso cae antes de enviar, el intento puede quedar bloqueado aun sin
solicitud externa: es una limitación deliberada hasta verificar el contrato de consulta
y recuperación. No se promete una garantía de «exactamente una vez» en la red.

`recordMicuentawebTokenReady` guarda únicamente SHA-256 del token y la hora; la transición
está condicionada a INITIATING. `recordMicuentawebAttemptUncertain` también reclama ese
estado una vez. Una finalización tardía no sobrescribe UNCERTAIN. Los tokens no se
persisten ni se registran; no se puede reconstruir un token desde su hash.

## Migración y operación

La migración 13 añade enum, tabla, relación, índices y restricciones de importe,
producto/mode TEST y coherencia del estado. No actualiza pedidos, pagos, stock o
carritos históricos. La relación con la orden usa el mismo patrón de borrado en
cascada que los pagos existentes; la retención operativa debe concretarse antes de producción.
No editar ni borrar intentos para desbloquear reintentos; primero conciliar con el proveedor.

Esta rama no aplica la migración a Render ni configura credenciales. No añade rutas,
formularios, SDK o llamadas de red. La entrada de servidor usa `server-only`; su futuro
Route Handler debe comprobar sesión, Origin/CSRF según el mecanismo y límites de tráfico.
Las funciones internas de finalización nunca deben exponerse con parámetros del navegador.

## Pendientes antes de activar

1. Confirmar familia comercial, test keys y medios habilitados. El flag TEST no convierte
   una contraseña real en una credencial de prueba.
2. Crear/reservar órdenes automáticas sin cambiar los pedidos manuales, autenticar el
   endpoint y conectar adaptador fuera de la transacción. Revalidar la reserva antes de enviar.
3. Resolver recuperación de INITIATING/UNCERTAIN y pérdida de token: el hash no permite
   reabrir el formulario; no se hará otra solicitud sin contrato verificado.
4. Implementar IPN persistida, firma/campos/identidad y efectos atómicos, incluidos pago
   tardío y cancelación/vencimiento durante la llamada. Hoy el intento no impide que una
   reserva se cancele y no la revive; S3-03 debe conciliar cualquier ingreso posterior.
5. Definir intento nuevo tras fallo definitivo con prueba autoritativa. La primera tabla
   permite uno por orden y no tiene una vía de desbloqueo o transición a PAID.
6. Probar sandbox externo, retorno/SDK, recuperación operativa y UAT antes de aceptar S3-02.

Ver [guía de familias y fuentes](izipay-sandbox.md), [QA de este incremento](../testing/s3-02-intentos.md)
y [plan del sprint](../sprints/fase-2-sprint-03.md).
