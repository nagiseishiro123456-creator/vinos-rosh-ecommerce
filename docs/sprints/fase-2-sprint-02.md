# Fase 2 — Sprint 2

Fecha: 2026-10-18 (America/Lima). Inicio autorizado por el usuario tras revisar el plan.
Base de código: main `16074e1fd97fc62f51fb863cfb3f46230a3df3d2`, cierre del Sprint 1.
Estado: S2-01 documentada; S2-02 verificada por CI, revisión/integración pendientes;
S2-03 verificada por CI; S2-04 verificada por CI; S2-05–S2-06 pendientes de implementación.
Las historias y puntos son una previsión de trabajo; no representan horas ni una fecha garantizada.

## Sprint Goal

Permitir elegir productos y preparar un carrito antes de iniciar sesión, conservar esa
selección al identificarse y continuar la compra con una interfaz clara y accesible en móvil.
Se mantienen la cuenta obligatoria antes del checkout, el dinero determinado en servidor
y la reserva de stock únicamente al confirmar un pedido.

## Historias, aceptación y documentación

### S2-01 — Recorrido y diseño del flujo (3 SP)

Como responsable del producto, quiero un diagnóstico y un recorrido propuesto verificables
para implementar las mejoras sin perder reglas comerciales ni evidencia del estado anterior.

- Identificar commit, rutas, pasos, fricciones y componentes actuales.
- Conservar y revisar capturas reales de producto, ingreso, carrito, entrega, confirmación,
  resumen cambiado, instrucciones y pago en revisión, en escritorio y móvil.
- Definir jerarquía de contenido, estados vacíos/error/carga, criterios medibles y responsables
  por historia. Separar lo observado en código/capturas de lo aún propuesto o sin ejecutar.
- Registrar dependencias, riesgos, pruebas y secuencia de actualización documental.
- Entregables: este plan, [recorrido](../ux/sprint-02-recorrido-compra.md),
  [QA S2-01](../testing/s2-01-recorrido.md) y
  [galería con manifiesto](../evidencias/sprint-02/s2-01/README.md).
- DoD: entregables coherentes y revisados, enlaces/hashes comprobados, rama y PR identificados.
  Esta historia no implementa carrito invitado, Motion ni cambios de interfaz.

### S2-02 — Correcciones de UX móvil (3 SP)

Como comprador, quiero leer el total y usar cada control sin que otros elementos lo tapen.

- En 320, 390, 768 y 1440 px de ancho: sin desbordamiento horizontal del embudo;
  nombres largos se ajustan y moneda/importe permanecen juntos.
- En confirmación: entrega, productos y total antes del botón de reserva tanto en DOM
  como en lectura móvil; evitar duplicar formularios o resúmenes con importes divergentes.
- La navegación inferior, WhatsApp y cualquier banner no cubren el control enfocado ni
  las acciones principales. Verificar con scroll y posiciones reales, no solo una captura larga.
- Controles accionables principales con objetivo de diseño de 44×44 px o mayor; foco visible,
  orden lógico, etiquetas y errores comprensibles. La dirección se selecciona también con teclado.
- Conservar la diferencia entre reserva, operación comunicada y pago confirmado.
  Revalidar las traducciones ya corregidas; no reabrirlas como defecto sin una regresión.
- Mantener los números históricos de pedido. Presentar el identificador separado de la fecha
  de creación en hora de Perú; no interpretar el prefijo del ID como fecha comercial.
- DoD: capturas antes/después y comprobaciones de foco, geometría, navegación y regresión.
  Documentar los cambios en CSS/componentes en el PR; si el alcance de accesibilidad crece,
  dividirlo y reestimar explícitamente antes de comprometer más trabajo.

### S2-03 — Carrito invitado (5 SP)

Como visitante, quiero añadir y editar productos sin crear una cuenta todavía.

- Añadir, editar y eliminar desde producto/carrito; conservar selección tras recargar el mismo navegador.
- Guardar localmente solo IDs y cantidades normalizadas, con versión de formato y límites
  explícitos definidos antes de implementar; nunca credenciales, direcciones ni precios autoritativos.
- Consultar productos, precios y disponibilidad al servidor; productos retirados/agotados o
  cantidades ajustadas se explican. Añadir al carrito no bloquea inventario ni crea pedido/pago.
- Si el almacenamiento está bloqueado, lleno o corrupto: carrito utilizable en memoria y aviso
  de que no se conservará al salir. No prometer continuidad entre dispositivos ni funcionamiento offline completo.
- Evitar errores de hidratación; anunciar cantidades/resultados sin mover el foco innecesariamente.
- Sin JavaScript, informar de la limitación del carrito invitado y conservar las rutas autenticadas
  que ya funcionan; no afirmar que el carrito local funciona sin JS.
- DoD: casos de formato inválido, recarga, almacenamiento fallido y stock actualizado;
  evidencia y decisión de estado/persistencia documentadas en el mismo PR.

### S2-04 — Unión al iniciar sesión (8 SP)

Como comprador, quiero recuperar mi selección de invitado junto con mi carrito de cuenta
sin pérdidas ni duplicaciones al identificarme o repetir una petición.

- Preservar el destino interno de compra al pasar por ingreso y registro; no permitir destinos externos.
- Para un producto válido: sumar cuenta + invitado, con límite vigente de 99 y disponibilidad;
  mostrar los ajustes. Ejemplo: 2 invitado + 1 cuenta = 3; repetir la misma unión conserva 3.
- Definir en ADR la identidad de importación, su vínculo con usuario/contenido, unicidad
  y transacción antes de implementar. La clave del checkout no se reutiliza para esta operación.
- Respuesta perdida, doble clic y dos pestañas no aplican dos veces la misma importación;
  misma identidad con otro contenido debe rechazarse sin mutaciones parciales.
- Limpiar solo la selección local confirmada por el servidor; no borrar nuevas ediciones
  realizadas durante una petición pendiente. Reintentar una unión fallida antes de reservar.
- Al salir o cambiar de cuenta, no copiar el carrito privado al invitado ni mostrar datos
  de la cuenta anterior. Los resultados de unión se entregan únicamente al usuario autorizado.
- La unión no modifica stock, reservas, órdenes ni pagos. Si requiere esquema adicional,
  usar migración aditiva y pruebas sobre datos históricos.
- DoD: integración con PostgreSQL para carreras/reintentos, E2E de ingreso/registro y
  permisos; ADR, contrato, mensajes, migración si aplica y capturas incluidos.

Entrega técnica S2-04: [ADR previo](../decisions/0007-union-carritos.md), [QA 98/98 + 44/44](../testing/s2-04-union-carritos.md) y [32 capturas](../evidencias/sprint-02/s2-04/README.md); PR #12 pendiente de revisión/integración.

### S2-05 — Carrito lateral accesible (5 SP)

Como comprador, quiero revisar mi selección y seguir explorando sin perder el contexto.

- Panel único compartido entre el indicador del header y la acción de añadir; página
  `/carrito` disponible y coherente con el mismo estado. Contador = suma de unidades.
- Abrir desde la tienda, editar/eliminar, continuar comprando y avanzar al checkout.
  En móvil ocupar el espacio disponible sin tapar controles ni generar scroll horizontal.
- Diálogo con nombre accesible, foco inicial, navegación contenida, cierre por Escape,
  devolución del foco y fondo no interactivo. Restaurar scroll al cerrar.
- Estados: vacío, cargando, guardando, sin disponibilidad, error recuperable y sesión vencida.
  Confirmar mutaciones de cuenta con servidor y recuperar estado si una respuesta falla.
- Dos acciones concurrentes de añadir en cuenta no deben perder incrementos; probar
  esta carrera y proteger la actualización, conservando límites de cantidad/disponibilidad.
- Motion solo para entrada/salida del panel/ítems. `'use client'` en primera línea de
  componentes animados, `useReducedMotion` y alternativa CSS; con movimiento reducido,
  desactivar desplazamientos. No retrasar el acceso a controles con la animación.
- DoD: pruebas de teclado, foco, movimiento reducido, coherencia página/panel/contador y capturas.

### S2-06 — Regresión y cierre (2 SP)

Como equipo, quiero verificar el incremento completo y dejar un punto de continuidad claro.

- Recorridos invitado → ingreso/registro → unión → entrega → reserva → comunicar operación;
  también cliente con carrito existente, errores recuperables y sesión vencida.
- Mantener regresiones del Sprint 1: dinero exacto, firma, idempotencia, última botella,
  rollback, privacidad, rol revocado, revisión y conciliación. No sustituir pruebas con capturas.
- Validar CI, migraciones si las hay, tipos/lint/build y auditoría; inspección visual en
  móvil/escritorio, teclado y movimiento reducido. Comparar con la base de S2-01.
- Revisar PRs e integrar en orden conservando historial y usando `[skip render]`;
  verificar main. Registrar aceptación funcional/incidencias y límites reales de cobertura.
- DoD: cierre, manifiestos, backlog y progreso actualizados, pendientes heredados identificados.
  La aceptación de producción/UAT global sigue en Sprint 6.

## Secuencia y puntos de control

Total preliminar: **26 SP**. Orden: S2-01 → S2-02 → S2-03 → S2-04 → S2-05 → S2-06.
S2-04 concentra el mayor riesgo: la fusión es una operación transaccional distinta del checkout.
Las estimaciones se revisan con lo aprendido; no usar la suma del sprint anterior como velocidad garantizada.

| Momento | Registro y verificación |
| --- | --- |
| Antes de S2-02 | Este plan, flujo, lista de hallazgos y baseline del main integrado. |
| Antes de S2-03/S2-04 | ADR de persistencia/estado y fusión con alternativas, fallos y contrato; aprobar técnicamente el diseño antes del código. |
| Durante cada historia | Cambio, criterios, incidencias y pruebas pertinentes en su PR. |
| Al terminar cada historia | QA, capturas originales y manifiesto con commit/run/hashes; backlog y progreso. |
| Al integrar/cerrar | Checks de main, revisión funcional, límites y pendientes del sprint siguiente. |

## Arquitectura propuesta y límites

Mantener App Router, Prisma, PostgreSQL y validación servidor. Context + reducer se
plantean para el estado de UI/selección local, con proveedor de alcance acotado; la BD
sigue siendo autoridad del carrito autenticado. Confirmar el diseño en ADR antes de
añadir dependencias de estado. No convertir toda la aplicación en componentes cliente.

Conservar identidad visual y contenido real. El catálogo actual se presenta como bebida
de uva sin alcohol; las muestras de QA son ficticias. No inventar añadas, graduaciones,
reseñas, certificaciones ni notas de cata. La ampliación editorial requiere datos del negocio.

Motion aún no está instalado; se prevé incorporar su núcleo en S2-05 tras revisar
compatibilidad, licencia y tamaño. Catálogo/carrito/checkout sin scroll complejo;
producto con interacción moderada y CTA inmediato. Home inmersivo/parallax queda en Sprint 5,
solo desktop >=768 px y sin preferencia de movimiento reducido.

No hay pasarela automática, webhooks, mapas, emisión fiscal, notificaciones de pedido
ni despliegue con este sprint. No se contratan servicios adicionales. Render conserva
la suspensión establecida; cualquier futura reanudación se trata como tarea separada.

## Definition of Done común

Criterios de la historia verificados, validación de servidor y permisos preservados,
pruebas adecuadas a la lógica cambiada, tipos/lint/build correctos, documentación y
evidencia identificadas. Una revisión por código, una captura o un test automático
aislado no equivalen a certificación completa de accesibilidad ni a aceptación comercial.

## Estado de entrega

- S2-01: entregables documentales y 16 capturas base revisadas; publicación y checks en
  la rama `fase-2/sprint-02-recorrido-base`. [Resultados](../testing/s2-01-recorrido.md).
- S2-02: implementada en PR #10; [QA](../testing/s2-02-ux-movil.md) y
  [capturas antes/después](../evidencias/sprint-02/s2-02/README.md). CI oficial aprobada:
  67/67 servidor y 20/20 navegador; revisión/integración pendientes.
- S2-03: ADR 0006 e implementación en PR #11; [QA aprobada](../testing/s2-03-carrito-invitado.md):
  80/80 servidor y 28/28 navegador, 22 capturas conservadas; integración pendiente.
- S2-04: ADR 0007 e implementación en PR #12; [QA aprobada](../testing/s2-04-union-carritos.md):
  98/98 servidor y 44/44 navegador, 32 capturas conservadas; revisión/integración pendientes.
- S2-05–S2-06: pendientes. Siguiente acción: ADR del carrito lateral antes del código
  de S2-05; revisión e integración del incremento completo en S2-06.
