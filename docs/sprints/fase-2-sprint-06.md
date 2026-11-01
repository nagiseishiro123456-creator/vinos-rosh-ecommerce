# Sprint 6 — Aceptación y preparación de operación

2026-11-01 (America/Lima). Base main f5ecac6, PR #25 integrado con jose-israel.
El propietario autoriza continuar con el panel existente de lanzamiento y conservar
la pausa del rediseño. No se fija fecha de publicación ni compromiso de capacidad.

| ID | Historia | Alcance de este incremento |
| --- | --- | --- |
| S6-01 | Diagnóstico de preparación con siguientes pasos verificables. | Siete comprobaciones locales, servicios externos y revisiones del negocio separados; acceso administrativo vigente. |
| S6-02 | Recorrido de aceptación con ROSH. | Guía dentro del panel y documento para registrar prueba, incidencias y aceptación. La ejecución con el cliente está pendiente. |
| S6-03 | Preparar operación, recuperación y publicación. | Guía diaria y responsabilidades de respaldo; se reutilizan paneles y contratos de restauración existentes. Validación del entorno definitivo pendiente. |
| S6-04 | Integrar y demostrar el incremento. | Nueve pruebas unitarias nuevas; dos escenarios de navegador en escritorio y móvil. Resultados finales en el PR del commit comprobado. |

## Hallazgos

La pantalla anterior aceptaba una URL HTTPS de preview como preparada para producción,
agrupaba comprobaciones locales con revisiones manuales en un único porcentaje y dejaba
pendientes sin un siguiente paso. No mostraba la preparación de Izipay/correo. Una consulta
fallida impedía presentar el resto del diagnóstico.

El nuevo informe reutiliza la política de publicación del Sprint 5 y la configuración
resuelta que usa el checkout. Una consulta fallida produce «No se pudo comprobar»;
no se transforma en cero ni en aprobación. El porcentaje describe solo siete comprobaciones
locales. Izipay y correo nunca se acreditan como verificados por tener variables presentes.

## Criterios y límites

- Lecturas después de requireAdmin, incluyendo comprobación del rol actual en BD.
- Actualizar comprobaciones realiza una navegación completa y consulta valores nuevos.
- Catálogo, stock, cobertura, pago manual, atención, correo comercial y publicación
  tienen estado, explicación, siguiente paso y destino interno.
- Vista previa, desarrollo y orígenes inválidos no acreditan publicación configurada.
- No exponer claves, cuentas bancarias, direcciones privadas de remitente o errores de BD.
- Proveedores y revisiones humanas separados del progreso automático; guía de compra
  con datos ficticios, número de pedido y registro de resultado.
- Abrir el diagnóstico no modifica stock, pedidos, configuración ni servicios. La acción
  de mantenimiento existente conserva su autorización y sus efectos explícitos.

Sin migraciones ni dependencias nuevas. No se activan proveedores, correos, cobros,
trackers ni despliegues. No se guarda todavía aceptación de ROSH en la aplicación ni se
declara el lanzamiento aprobado. Sprints 3–5 conservan sus pendientes externos y comerciales.

[Guía de prueba y operación](../guia-prueba-sprint-06.md) · [Contrato](../integraciones/preparacion-lanzamiento.md)
· [QA](../testing/sprint-06-preparacion-lanzamiento.md).
