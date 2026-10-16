# QA — S1-03: reserva previa al pago

Inicio y ejecución con capturas: 2026-10-15 (America/Lima). Registro de cierre: 2026-10-16.
Estado: implementada y verificada en rama; integración pendiente. PR #5, dependiente del PR #4.
Rama `fase-2/sprint-01-reserva-previa`, basada en S1-02 `e8b72d8f41b36eec6d3317e127e531affe4309d5`.
Decisión anterior al código: [ADR 0003](../decisions/0003-reserva-previa.md).

## Alcance
Confirmación sin datos bancarios → transacción de pedido/reserva/pago pendiente → instrucciones
privadas del pedido → comunicar operación sin otra reserva. Caducidad persistida por pedido;
solo reservas pendientes pueden vencer o ser canceladas por el cliente. Pagos en revisión
requieren conciliación. Incluye los ajustes de mantenimiento indispensables del nuevo flujo.

## Comprobaciones ejecutadas
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
La comprobación con PostgreSQL se ejecutó en CI; no se ejecutó PostgreSQL en este contenedor.

## Resultado de CI y evidencia
Código verificado: `411e47cc46dff14922c1affc74de02079b0b6b7d`.
[Run 38830960074 aprobado](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/38830960074),
job `116749379592`. Node 22.23.3 / npm 11.9.0.

| Comprobación | Resultado |
| --- | --- |
| Instalación y Prisma | Lockfile, validate/generate y 8 migraciones sobre PostgreSQL 16 aprobados. |
| Migración sobre datos antiguos | SQL real sobre esquema temporal: backfill de cinco estados, sin reservas inventadas ni plazos retroactivos; rollback aprobado. |
| Lógica e integración | 40 aprobadas: 28 de la entrega anterior adaptadas al nuevo flujo y 12 nuevas. |
| Navegador Chromium | 6 aprobados: baseline, importes/reserva/comunicación y cancelación/privacidad/vencimiento, cada uno en escritorio/móvil. |
| Tipos / lint / build | Aprobados. |
| Auditoría de producción | 0 hallazgos en la consulta de CI; siguen pendientes los 5 altos de herramientas registrados en S1-02. |
| Capturas | 16 PNG originales revisados, con manifiesto de origen/tamaño/dimensiones/SHA-256. |

Se verificó que el checkout no muestre cuenta/QR antes de reservar. Después de reservar,
el precio se conserva aunque cambien catálogo/tarifa. Comunicar el pago mantiene el carrito
añadido después y deja stock 7 para una reserva de 3 sobre stock 10. Cancelar/vencer devuelve
una sola vez. El cliente ajeno autenticado recibe HTTP 404 y no ve datos bancarios.
Los recorridos visuales usan transferencia ficticia; no verifican servicios bancarios ni un abono.
[Galería y manifiesto](../evidencias/sprint-01/s1-03/README.md).

## Revisión visual y pendientes heredados
Se revisaron las 16 capturas: confirmación sin instrucciones, reserva con fecha límite,
operación en revisión, cancelación y aviso de vencimiento coherentes con las pruebas de BD.
Los estados de pago/comprobante del detalle ahora se muestran en español y sus fechas en hora de Perú.
Siguen para Sprint 2: evitar saltos de moneda/importe, revisar orden del resumen/CTA móvil
y superposición de navegación/WhatsApp. Las capturas largas conservan controles fijos en la
posición del viewport inicial; el flujo automatizado pudo operar los botones.
El prefijo de fecha del número interno de pedido sigue usando la fecha del servidor;
normalizar su criterio con las fechas de interfaz antes del lanzamiento.

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
