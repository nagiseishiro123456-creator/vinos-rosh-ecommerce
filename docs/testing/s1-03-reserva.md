# QA — S1-03: reserva previa al pago

Fecha: 2026-10-15 (America/Lima). Estado: implementada, validación con BD/navegador pendiente.
Rama `fase-2/sprint-01-reserva-previa`, basada en S1-02 `e8b72d8f41b36eec6d3317e127e531affe4309d5`.
Decisión anterior al código: [ADR 0003](../decisions/0003-reserva-previa.md).

## Alcance
Confirmación sin datos bancarios → transacción de pedido/reserva/pago pendiente → instrucciones
privadas del pedido → comunicar operación sin otra reserva. Caducidad persistida por pedido;
solo reservas pendientes pueden vencer o ser canceladas por el cliente. Pagos en revisión
requieren conciliación. Incluye los ajustes de mantenimiento indispensables del nuevo flujo.

## Comprobaciones previstas
- Migración 8 aditiva aplicada sobre PostgreSQL 16 vacío, sin reset.
- SQL de la migración ejecutado además sobre fixtures antiguas en esquema temporal con rollback:
  reconoce cinco estados con stock reservado; no infiere reservas pendientes/cerradas ni plazos.
- Reserva guarda importe confirmado y pago pendiente sin código; resta y registra stock una vez.
- Dos checkouts por la última botella: uno crea orden, otro conserva carrito y no reserva.
- Falta de producto no deja pedido/pago/movimientos; reserva multi-producto revierte descuentos anteriores.
- Plazo original prevalece si cambia la variable; al límite exacto ya no se admite comunicar pago.
- Cancelación/vencimiento concurrentes liberan una vez; comunicar/vencer produce revisión o liberación coherente.
- Cliente ajeno no cancela ni comunica; navegador ajeno recibe 404 sin instrucciones bancarias.
- Pago en revisión no vence ni se cancela por cliente; aprobar/reaprobar no descuenta otra vez.
- Código ya usado revierte el cambio a revisión sin perder la reserva.
- Carrito añadido después y precio/tarifa cambiados no alteran la orden reservada.
- Tres reservas/revisiones bloquean otra; pendiente antiguo sin reserva explícita exige revisión.
- Recorridos desktop/móvil con capturas de confirmación, reserva, revisión, cancelación y vencimiento.

## Resultados locales
18 pruebas sin BD aprobadas; Prisma validate/generate, tipos, lint y compilación aprobados.
Un primer lint detectó una variable de cleanup que debía ser const y se corrigió.
La primera validación de Prisma se ejecutó sin DATABASE_URL; se repitió con URL ficticia local
y aprobó. El build termina; registra intentos de configuración sin PostgreSQL local disponible.
CI con BD es la comprobación necesaria antes del cierre, no estas comprobaciones locales.

## Límites heredados
Idempotencia persistida de creación corresponde a S1-04; botón pendiente no sustituye esa garantía.
No se usa Render, no se habilitan pasarelas ni se realizan pagos. El banco y las cuentas de QA son ficticios.
La tienda desconoce un abono manual no comunicado: pagos tardíos requieren conciliación, sin repetir pago.
Sin mantenimiento periódico o acceso al pedido, la liberación no ocurre exactamente al vencer.
S1-05 ampliará conciliación y pruebas de revisión administrativa; producción sigue pendiente.

## Incidencia del primer recorrido
Run `38830377639`, código `efdf71848fd0f10e7ede6e83ead85cf4b4afad91`: 40 pruebas de lógica/BD,
contrato de migración, tipos/lint/build y cuatro casos de navegador aprobados.
Los dos casos nuevos fallaron porque la espera `/carrito$/` coincidía con la query
`/iniciar-sesion?callbackUrl=/carrito`. El auxiliar navegaba antes de completar el POST de login,
cancelándolo. La traza confirmó la navegación sin cookie de sesión; no se relajó autenticación.
Se corrigió la espera para comprobar pathname exacto y heading del carrito antes de continuar.
