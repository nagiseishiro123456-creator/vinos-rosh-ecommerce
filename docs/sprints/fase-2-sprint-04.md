# Sprint 4 — Direcciones, cobertura y costo de entrega

2026-10-30 (America/Lima). Base main 70f6dbc, después de integrar #22 conservando autores.
El propietario pide seguir con funcionalidades. No se comprometieron puntos, fechas ni
capacidad. Izipay/Resend siguen pendientes y el Sprint 3 no se marca cerrado.

## Objetivo del incremento

El comprador consulta una tarifa real antes de comprar, guarda una dirección con errores
comprensibles y obtiene el mismo resultado de cobertura en navegador y servidor. El
operador cambia una tarifa sin reactivar una zona pausada ni sobrescribir otro cambio.

## Inspección y alcance

Ya existían direcciones guardadas, zonas administrables, precios exactos y quote firmada.
Se encontró comparación cliente normalizada frente a comparación literal en servidor;
upsert de tarifa que reactivaba la zona; lectura de principal/propiedad fuera de algunas
transacciones; total con subtotal aunque no hubiera cobertura. La reproducción contra
una copia del código de main confirma UNSUPPORTED_ZONE para nombres equivalentes.

S4-01: diagnóstico e identidad compartida. S4-02: consulta pública, tarifas administradas
con estado y control de versión. S4-03: formulario compartido de dirección y mutaciones
serializadas por cuenta. S4-04: refinamiento con el negocio de cobertura, horarios,
excepciones y eventual geolocalización. S4-05: regresión, integración y demostración.
Este incremento implementa S4-01–03; la aceptación operativa permanece pendiente.

## Criterios

- Departamento/provincia/distrito se comparan con la misma regla de mayúsculas, tildes
  y espacios. La provincia no se ignora. Duplicados activos requieren revisión.
- La consulta pública muestra solo tarifas activas y sin ambigüedad; no inventa zonas,
  precios ni fechas de entrega. El servidor vuelve a validar y firma la cotización.
- Crear zona no pisa otra, incluida una pausada. Editar conserva identidad/activación;
  pausar/activar y editar rechazan versiones obsoletas. ADMIN se comprueba en transacción.
- Direcciones propias y activas, celular peruano válido, errores por campo sin borrar
  datos. Primera dirección, cambio de principal y archivo simultáneos conservan una
  sola principal activa. Hasta 10 activas; editar/archivar existentes sigue disponible.
- Las reservas conservan sus datos e importes históricos después de editar la dirección
  o tarifa. Sin cobertura no se presenta un total final ni se puede confirmar el pedido.
- No hay migración de datos geográficos ni normalización destructiva de históricos.

## Validación y límites

Regresión local 286 casos de servidor; nuevas pruebas de navegador desktop/móvil para
pausa/edición, cobertura real/checkout, errores de tarifa/celular y principal. Revisar
capturas, accesibilidad y CI antes de integrar el incremento. La integración técnica
no acredita UAT ni cierre de S4-04/05. [Guía](../guia-prueba-sprint-04.md).

No se contrata proveedor de mapas ni se solicitan permisos de ubicación. Códigos
oficiales/geocodificación, límites por calles, horarios, fechas prometidas, rangos por
distancia y reglas de entrega requieren refinamiento específico. Se mantiene la política
de costos y el trabajo visual de Home pendiente.
