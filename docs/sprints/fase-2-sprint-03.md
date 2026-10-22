# Sprint 3 — Pago automático y comunicación

Refinamiento iniciado por instrucción del propietario, 2026-10-21 (America/Lima).
Base: `main` `83c8e5774af42d8b7c90dfd3135385faf3c8d0d9`, cierre técnico del Sprint 2.
Estado: propuesta; investigación documentada, proveedor/producto por confirmar.
No se comprometieron fechas ni capacidad; 26 SP son una estimación inicial, no horas.

Actualización 2026-10-22: el propietario, como desarrollador, solicita avanzar y evaluar
Izipay sandbox. Se incorpora [guía técnica y preparación aislada](../integraciones/izipay-sandbox.md).
La familia/producto y la habilitación del comercio continúan pendientes; no se publica
una ruta de pago ni se marca una orden como pagada con esta preparación.

## Sprint Goal

Un comprador puede pagar una reserva con un proveedor habilitado para ROSH y consultar
un estado confirmado por servidor. Los reintentos no duplican cobros/efectos de negocio
y una confirmación de pedido puede recuperarse aunque falle el envío del correo.

Conservar carrito, reserva y revisión manual mientras se construye el flujo automático.
El cierre técnico no sustituye la aceptación comercial ni autoriza el lanzamiento.

## Dependencias y decisión de entrada

- Revisar con el propietario la [guía de acceso al carrito](../guia-carrito.md) y la versión
  de web que está visitando. Su dificultad para encontrarlo mantiene abierta la aceptación UX.
- Izipay es el proveedor solicitado para evaluar sandbox. El uso manual reportado no
  confirma el producto web disponible. Leer [investigación y alternativas](../investigacion/pagos-yape-izipay.md)
  y la [distinción Mi Cuenta Web / SDK](../integraciones/izipay-sandbox.md).
- Confirmar producto comercial y medios habilitados; tener una cuenta de Izipay o un
  POS no demuestra acceso a su SDK multipago con Yape.
- Contar con contrato técnico del sandbox: autenticación, firma, estados, consulta,
  reintentos, montos/monedas, duración y expiración de pagos.
- Mantener [política de costos](../cost-policy.md). Este refinamiento no cambia esa
  política ni activa planes, integraciones facturables o pagos reales.

Si no hay habilitación comercial aún, se puede completar investigación y modelo de
dominio con simulador claramente etiquetado. Esa cobertura no se presentará como una
integración externa aceptada. No cambiar a otro proveedor sin dejar registrada la decisión.

## Historias propuestas y aceptación

| ID | Historia de usuario | SP | Criterios principales | Estado actual |
| --- | --- | ---: | --- | --- |
| S3-01 | Como propietario, quiero entender el carrito y comparar proveedor/producto/costos para elegir sin rehacer el checkout. | 3 | Accesos y versión explicados; estado financiero real inventariado; fuentes y alternativas verificadas; elección y condiciones registradas. | Izipay solicitado para evaluar; producto/condiciones y aceptación pendientes. |
| S3-02 | Como comprador, quiero iniciar un pago de mi reserva en el checkout del proveedor elegido. | 5 | Intento persistido ligado a orden/importe/moneda; token en backend; modo prueba; SDK solo bajo demanda; timeout recuperable sin generar cobro nuevo a ciegas; manuales operativos. | Base de transporte/cripto aislada preparada; intentos, endpoint, UI y sandbox externo pendientes. |
| S3-03 | Como tienda, quiero confirmar resultados auténticos una sola vez incluso con eventos repetidos o tardíos. | 8 | Firma y campos verificados; IPN persistida/idempotente; transacción de estados y stock; carreras pago/vencimiento; discrepancia o ingreso tardío queda conciliable sin vender stock liberado. | Pendiente. |
| S3-04 | Como operador, quiero comparar pagos confirmados, costos y abonos para detectar diferencias. | 3 | Consulta segura/reconciliación según API disponible o reporte verificado; bruto/comisión/neto/abono separados; datos desconocidos explícitos; pendientes y discrepancias trazables. | Pendiente. |
| S3-05 | Como comprador, quiero confirmación de pago y pedido recuperable por correo. | 5 | Evento/outbox persistido en misma transacción; envío después del commit; reintentos registrados; caída del correo no revierte ni duplica pago; constancia sin simular emisión fiscal. | Pendiente. |
| S3-06 | Como propietario, quiero revisar el recorrido y evidencias antes de integrar y aceptar el incremento. | 2 | Regresión previa conservada, nuevos casos de pasarela y errores, capturas de prueba, documentación de operación y revisión del PR; aceptación comercial registrada aparte. | Pendiente. |

S3-01 → S3-02 → S3-03 → S3-04/S3-05 → S3-06.
Reestimar o dividir S3-03 si el contrato, la disponibilidad o el tratamiento de pagos
tardíos hacen que no pueda terminarse como historia verificable. No hay velocidad
garantizada de 26 SP; la capacidad determina el compromiso al planificar.

## Límites del incremento

Incluye un proveedor automático inicial y pagos únicos en PEN; recuperación de fallos,
conciliación básica y correo de confirmación. El «pago confirmado» del comercio y el
«abono bancario recibido» se registran por separado.

Quedan por refinar fuera de este compromiso: contabilidad/ERP, libros y declaraciones,
emisión fiscal/SUNAT, WhatsApp Business automatizado, suscripciones, disputas y reembolsos
parciales automáticos. Las devoluciones del proveedor necesitan diseño y pruebas específicos;
registrar una devolución externa manual no ejecuta un reembolso bancario.
El botón de contacto WhatsApp actual no constituye notificación automática.

Un link creado manualmente en el panel puede ser un hito comercial previo si se elige,
pero no se contará como S3-02/S3-03 completas sin automatización verificada.

## Secuencia de implementación

1. Cerrar S3-01 con proveedor, producto, costos y medios de pago disponibles.
2. Concretar [ADR propuesto 0009](../decisions/0009-pagos-automaticos.md) con contrato real,
   estados y plan de migración antes de conectar el adaptador al checkout. La preparación
   aislada usa solo operaciones verificadas de la familia documentada y transportes simulados.
3. S3-02: preparar dominio/intentos y sandbox con fixture sintética; API externa fuera
   de transacciones de BD, importes del servidor y recuperación del mismo intento.
4. S3-03: validar firma, persistir identidad y aplicar transición atómica; resolver pago
   incierto/tardío antes de permitir un intento que pueda duplicar el cargo.
5. S3-04/S3-05: reconciliación y outbox transaccional con entrega recuperable.
   No contratar una cola/worker únicamente para este MVP; primero evaluar ejecución
   operativa o programador disponible sin costo obligatorio y documentar límites.
6. S3-06: revisar, integrar y registrar UAT. Despliegue y activación de credenciales de
   producción se concretan como trabajo separado del sandbox.

## Pruebas y evidencias

- Base heredada: [CI final de main](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39674983346),
  **117 servidor y 66 navegador**, además de restauración PostgreSQL. Es evidencia del
  Sprint 2; no demuestra una integración Izipay ni se atribuye a esta investigación.
- Unidad: estados, moneda/importe, idempotencia y tratamiento de firmas/mensajes de la API elegida.
- Integración PostgreSQL: fallo antes/después de persistir, unicidad, IPN repetida/paralela,
  pago frente a vencimiento/cancelación, intento incierto y doble éxito externo.
- Contrato externo: credenciales de sandbox del producto habilitado, aprobación/rechazo,
  consulta de estado, notificación y evidencia del proveedor; simulador y sandbox se
  identifican por separado. No exigir el entorno externo en cada PR determinista.
- Navegador: acceso visible al carrito desde Home/catálogo/producto, regreso de pasarela,
  espera/error/reintento, teclado, móvil/escritorio y movimiento reducido.
- Capturas: guardar por historia con commit, origen, viewport y resultados; anonimizar
  datos sintéticos y no incluir claves, códigos de aprobación ni datos de tarjetas.
  Este refinamiento reutiliza la galería anterior y no crea capturas ficticias de pagos.

## Definition of Done

Para cada historia de implementación: criterios revisados, código pequeño y documentado,
validación de servidor, tests pertinentes aprobados, regresión conservada, revisión de
seguridad/privacidad del contrato, migraciones aditivas verificadas cuando correspondan,
evidencias trazables y guía de recuperación. Estados simulados se identifican como tales.
Para cerrar el sprint: S3-01–S3-06 del alcance comprometido completas, CI de la cabecera
integrada aprobada, límites/incidencias registrados y demostración al propietario.
La emisión fiscal y el lanzamiento requieren sus propios criterios.

## Cuándo documentar

| Momento | Entregable | Qué debe quedar antes de continuar |
| --- | --- | --- |
| Ahora / S3-01 | Guía, investigación, este plan y QA del refinamiento. | Separación implementado/propuesto y decisión pendiente explícita. |
| Antes del adaptador | ADR 0009 aceptado y contrato/cotización identificados. | Producto, estados, firma, idempotencia y límites comerciales. |
| Durante cada historia | Código + guía/configuración/migraciones + pruebas en el mismo PR. | Qué cambió y cómo recuperarlo; secretos fuera de Git. |
| Al verificar cada historia | Resultados y PNG reales en `docs/evidencias/sprint-03/` cuando existan. | Commit, procedencia y límites de la ejecución. |
| Fin de cada sesión | `progreso.md` y backlog. | Estado, bloqueos y siguiente acción concreta. |
| Integración / S3-06 | Registro QA, changelog y cierre técnico. | CI del commit integrado y aceptación comercial diferenciadas. |

## Siguiente acción

Confirmar marca/producto y disponibilidad para ROSH. Con eso se completa el criterio
de elección de S3-01 y se concreta S3-02; la investigación documental no activa una pasarela.
El código preparatorio no demuestra habilitación de Yape ni un cobro en sandbox.
