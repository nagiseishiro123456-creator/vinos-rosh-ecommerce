# ADR 0011 — Entrada autenticada para reservas Mi Cuenta Web TEST

Fecha: 2026-10-23 (America/Lima).
Estado: aceptado para preparación local, por instrucción del propietario de retomar funcionalidades y sprints.
No acepta la activación comercial ni sustituye al ADR 0009.

## Decisión

Añadir `POST /api/orders/reserve` con opt-in independiente y desactivado por defecto.
Reutiliza la transacción del ADR 0010 y el DTO estricto existente. La ruta resuelve
sesión, Origin, identidad esperada, límite persistente por usuario y lectura acotada de JSON.

No unir reserva e inicio del proveedor en una única transacción o petición implícita.
La primera operación guarda orden/stock; el inicio posterior conserva sus propias
revalidaciones y registro de intento. La ruta de reserva no obtiene ni devuelve tokens.

Distinguir respuesta de creación (201, reserved) y recuperación (200, recovered). Una
orden cerrada puede recuperarse sin reabrirse; el resultado del replay no promete una
reserva activa. Mantener la clave de checkout en todo reintento tras respuesta perdida.

## Alternativas y consecuencias

Conectar directamente el servicio interno al navegador omitiría controles HTTP necesarios.
Duplicar reserva/cálculo crearía dos circuitos inconsistentes. Añadir una Server Action
al checkout actual cambiaría antes de tiempo la elección de método y el recorrido manual.
Se conserva la entrada separada hasta verificar contrato y UI del sandbox.

El lector JSON tiene límite de bytes y plazo, cancela streams y rechaza importes/token/
campos de pago. Las respuestas se excluyen de caché y los logs solo usan un identificador
estático ante fallos desconocidos. No se introduce migración ni servicio externo.

La prueba usa PostgreSQL real en una base local de QA creada por nombre fijo y con guardas
de conexión local. No se reinicia ni se migra la base del desarrollador.

[Contrato y límites](../integraciones/reserva-izipay-http.md) · [QA](../testing/s3-02-reserva-http.md).
