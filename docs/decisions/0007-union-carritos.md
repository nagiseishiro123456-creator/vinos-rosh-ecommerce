# ADR 0007 — Unión idempotente de selección invitada y carrito de cuenta

Fecha: 2026-10-19 (America/Lima). Historia S2-04, 8 SP. Decisión registrada antes
del código; base S2-03 `b74c607…`. Estado: aceptada para implementación y QA.

## Problema y alternativas

El visitante ya puede preparar su selección. Al ingresar/registrarse debe sumarla
al carrito privado una sola vez, incluso si pierde una respuesta o abre dos pestañas.
No basta un indicador local de «ya importado»: puede fallar después del commit.

| Alternativa | Ventaja | Límite |
| --- | --- | --- |
| Sumar y vaciar únicamente en el navegador | Sin esquema adicional | Duplica tras respuesta perdida; no es aceptable. |
| Clave calculada solo a partir del contenido | Dos pestañas coinciden | Impide importar otra selección futura con las mismas botellas. |
| Revisión de selección + comprobante transaccional por usuario | Reintentos recuperables, nueva selección independiente | Requiere migración aditiva y coordinar persistencia del navegador. **Elegida.** |

## Identidad y contrato del servidor

- `POST /api/cart/merge`: JSON estricto `{ importId, expectedUserId, items }`.
  Máximo 50 IDs únicos/99 unidades por línea y 16 KiB reales, incluidos streams.
  No admite precios, datos de pago ni usuario de destino arbitrario.
- Sesión NextAuth obligatoria; `expectedUserId` debe coincidir. Comprobar también
  existencia del usuario. Origin debe coincidir con el origen de la petición; rechazar
  `Sec-Fetch-Site: cross-site`. Sin CORS habilitado. Respuesta `no-store` y rate limit.
- Revisión nueva `g2_` + 32 caracteres hex aleatorios. La migración desde formato 1 usa
  `g1_` + SHA-256 de selección canónica ordenada: dos pestañas antiguas obtienen la misma
  identidad. Cambiar la selección genera una revisión nueva; no reutilizar la identidad
  del checkout. Dos selecciones posteriores iguales son operaciones distintas.
- `CartImport`: UNIQUE `(userId, importId)`, SHA-256 del usuario/contenido canónico y
  resultado JSON inmutable. Misma clave/contenido recupera resultado; otro contenido
  produce 409 sin aplicar cambios. Consultar el comprobante antes del catálogo/carrito.
  Otro usuario no puede recuperar el resultado privado. No purgar comprobantes por TTL
  sin un diseño posterior que impida reaplicar identidades antiguas.
- En una transacción Serializable: comprobar repetición, validar usuario, obtener/crear
  carrito, consultar productos por lote y sumar únicamente productos enviados.
  Cantidad final = min(cuenta + invitado, stock actual, 99). Retirar de esas líneas
  los productos inexistentes/inactivos/agotados/sin precio válido y explicar ajustes.
  Las otras líneas de cuenta se conservan. Persistir cambios y comprobante juntos.
- Reintentar conflictos Serializable/unicidad de forma acotada; si se agotan, responder
  recuperable sin inventar éxito. La unión no modifica inventario, reservas, pedidos ni
  pagos, ni fija precio de compra: página/checkout vuelven a consultar precios exactos.
- Resultado: cantidades finales de las líneas tratadas y ajustes, sin dirección, email,
  instrucciones de pago ni snapshot privado completo. Un replay informa del resultado
  histórico de la unión; la página refrescada muestra el carrito vigente.

## Persistencia, dos pestañas y cambios durante la petición

- Se conserva la clave local `rosh-guest-cart-v1` para migrar clientes existentes, pero
  el contenido pasa a formato **2**: revisión y selección activa, más una importación
  pendiente opcional `{ userId, importId, items }`. Solo selección invitada y metadatos
  de coordinación: nunca se copia el carrito privado, precios o resultados al disco.
- Antes de enviar, mover la selección activa a ese sobre pendiente inmutable y dejar
  una selección activa nueva vacía. El pendiente conserva las botellas hasta confirmar.
  Las adiciones siguientes pertenecen a la selección nueva. Al confirmar se elimina
  **solo el sobre pendiente coincidente**, conservando íntegra la selección nueva.
  Así la respuesta anterior nunca vacía ediciones posteriores. La UI distingue una
  selección en proceso de las nuevas adiciones; no permite editar el sobre enviado.
- Coordinar lectura/edición/escritura entre pestañas con Web Locks, sin paquetes nuevos;
  además, una cola por instancia conserva el orden de acciones rápidas. Toda mutación
  lee el estado persistido vigente bajo el mismo lock. No mantener el lock durante red.
  Las dos pestañas envían el mismo pendiente y el servidor aplica una vez.
- Si storage o Web Locks no están disponibles: recuperar lo legible y continuar en
  memoria, con aviso explícito. No escribir de forma insegura ni prometer persistencia
  o sincronización entre pestañas en ese modo. El servidor conserva la idempotencia
  de una identidad compartida ya recuperada. El fallback de memoria se conserva en
  navegación SPA de ingreso/registro, pero se puede perder al recargar/cerrar.
- Una respuesta perdida conserva el pendiente para reintento. Si falla guardar la
  limpieza local tras éxito, no deshacer el carrito de cuenta: una recarga recuperará
  el mismo pendiente y su comprobante, sin otra suma. No borrar por timeout/401/409/503.
- Un pendiente de otra cuenta no se envía con la nueva sesión ni se reasigna: pedir
  volver a la cuenta original. Mostrar solo selección invitada/mensaje genérico;
  no conservar ni mostrar resultados de otra cuenta. Cerrar sesión no copia datos
  privados a la selección invitada.

## Continuidad y UX

Validar destinos internos con URL normalizada y origen fijo; rechazar URLs externas,
protocol-relative, barras invertidas y controles. Conservar destino al alternar ingreso/
registro. Si hay selección, ir al carrito y conservar el destino como acción de continuación:
el comprador revisa la suma y los ajustes antes de seguir. Sin selección, continuar directo.

Una barrera cliente en carrito/checkout/confirmación detecta trabajo pendiente, muestra
progreso/error/reintento y oculta acciones de compra hasta confirmar/refrescar datos servidor.
El render servidor sigue separado y el precio sigue siendo autoritativo allí. Una sesión
vencida conserva el sobre. Sin JavaScript se informa que no hay importación local y se
mantienen los formularios nativos autenticados existentes. No hay animaciones de scroll.

## Validación y documentación

1. Pruebas de estado: migración, hidratación, fallos de storage/locks, cola, dos instancias,
   selección nueva mientras hay pendiente, respuesta perdida, vinculación de cuenta.
2. PostgreSQL 16: suma, topes/retirados, replay tras cambios de catálogo/carrito, conflicto
   de contenido, carreras de misma/diferente identidad, rollback y aislamiento por usuario.
3. Contrato SQL de migración aditiva sobre fixtures históricos: carritos/usuarios existentes
   intactos, unicidad/FK/cascade y comprobantes inicialmente vacíos.
4. E2E: ingreso y registro con destino, dos pestañas, respuesta perdida/reintento, selección
   nueva pendiente, cambio de cuenta, memoria, sin JS y regresiones anteriores.
5. Al cerrar: QA con resultados reales y límites, capturas originales con manifiesto/hash,
   backlog/progreso/arquitectura actualizados. PR apilado sobre #11, sin merge ni Render.

La carrera de añadir desde formularios de cuenta existentes sigue en S2-05 según su
aceptación; esta historia prueba transacciones concurrentes de **importación**. No afirmar
soporte comprobado en navegadores distintos de los que se ejecuten en QA.
