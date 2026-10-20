# ADR 0008 — Carrito lateral, estado compartido y comandos de cuenta

Fecha: 2026-10-19 (America/Lima). Historia S2-05, 5 SP previstos.
Estado: aceptado técnicamente antes del código; implementación y QA pendientes.
Base: S2-04 `3c7f012fe1e92b63c5b71d5405589c2b6621b09a`, PR #12 sin fusionar.

## Problema y alternativas

El invitado ya conserva IDs/cantidades y la unión tiene comprobante transaccional.
La cuenta aún usa lectura + suma + upsert separados: dos adiciones pueden perder un
incremento. Header y página dependen de renders distintos. Un panel con otra copia
de datos agravaría la divergencia y una respuesta perdida podría duplicar un reintento.

1. Estado independiente por panel: simple, pero duplica consultas y cantidades. Descartado.
2. Zustand + librería de diálogos: viable, añade dependencias sin necesitar sus capacidades.
3. Context con store por proveedor, contratos tipados y `<dialog>` modal nativo: elegido.
   Mantiene el patrón de S2-03, SSR y formularios progresivos, sin singleton entre usuarios.

## Decisión de estado y límites Server/Client

- Un proveedor de selección/preview invitado y un proveedor de cuenta/panel en el layout.
  Página, panel y contador comparten sus respectivas fuentes. No se copian datos privados
  a localStorage/sessionStorage. La selección invitada conserva el protocolo de ADR 0007.
- Layout de servidor obtiene sesión y snapshot de cuenta consistente en RepeatableRead;
  precios/importes son cadenas decimales. Catálogo, checkout y consultas siguen en servidor.
  Proveedor de cuenta con key por usuario: cambio de cuenta destruye snapshot y pendientes.
- Preview invitado se consulta una sola vez por selección/revisión, con guardas de respuestas
  antiguas. Solo IDs/cantidades llegan a preview. Los errores conservan selección y permiten
  verificar de nuevo; la página y el panel muestran el mismo resultado.
- GET `/api/cart` devuelve solo el carrito del usuario de la sesión, `no-store`.
  POST del mismo recurso acepta `expectedUserId`, UUID de operación, producto y comando
  estricto `add`, `set` o `remove`; nunca precio, cartId ni userId autoritativo del cliente.
- Store de cuenta confirma servidor antes de cambiar cantidades. Conserva en memoria el
  comando incierto y reintenta **la misma identidad**. No permite otro comando/checkout
  hasta resolverlo. Una recarga recupera el estado de BD; no promete preservar el comando
  pendiente tras cerrar/recargar. No se reejecuta automáticamente como una intención nueva.
- Guardas de secuencia/revisión evitan respuestas viejas. BroadcastChannel transmite solo
  una señal de invalidación; foco/visibilidad revalidan como alternativa. No hay datos de
  productos, sesión, precios ni cuenta en esa señal. Errores/sesión vencida se muestran
  con reintento o ingreso, y un 401 elimina el snapshot privado de la interfaz.

## Transacciones y migración aditiva

- `Cart.revision` entero, inicial 0, y `CartMutation` con UNIQUE `(userId, operationId)`,
  huella SHA-256, resultado mínimo y FK a User con cascade. No caduca comprobantes aquí.
- En una transacción Serializable con reintentos acotados: comprobar comprobante/huella,
  usuario, producto actual, carrito y cantidad; aplicar comando; incrementar revisión;
  guardar resultado/comprobante. Mismo ID/otro contenido: conflicto sin mutación.
- Añadir suma 1 al valor leído dentro de esa transacción. Límites: 99 y stock vigente;
  50 productos distintos para nuevas adiciones. Set afecta una línea; remove es idempotente.
  Producto inexistente/inactivo/sin stock/precio no positivo no se añade; se informa y la
  línea existente puede eliminarse. No se alteran productos, pedidos, reservas ni pagos.
- Replays recuperan el comprobante antes de consultar disponibilidad, y devuelven además
  un snapshot actual, no un precio histórico considerado vigente. POST fallido tras commit
  sigue siendo recuperable por el mismo UUID. La huella incluye usuario y comando completo.
- Todos los escritores incrementan revisión en su misma transacción: comandos, unión
  invitada y limpieza tras reserva de pedido. El servicio de checkout conserva su protocolo
  de dinero/firma/idempotencia/stock. Sus regresiones siguen obligatorias.
- Formularios nativos usan el mismo servicio y un UUID ligado al render del formulario.
  Se conserva navegación POST → redirect/revalidación cuando no hay JavaScript.
- Origin público configurado, sesión vigente, usuario esperado, JSON/Zod estricto,
  UTF-8, tamaño real limitado, rate limit y `no-store`. Sin CORS permisivo ni lectura ajena.
  Contrato SQL verifica backfill 0, filas/FKs antiguas intactas, UNIQUE y cascade nuevos.

## Diálogo y movimiento

- `<dialog>.showModal()` con nombre, título enfocable, cierre visible, Escape y backdrop.
  El navegador contiene el foco y vuelve inerte el fondo. Se prueban Tab/Shift+Tab y
  devolución al disparador; si desaparece, se busca un destino conectado apropiado.
- Bloquear scroll del documento durante el modal; conservar/restaurar estilos y posición.
  Panel de hasta 480 px en desktop y ancho disponible en móvil; scroll interno, controles
  de al menos 44 px, footer visible y sin scroll horizontal en 320/390/768/1440 px.
- Enlaces mantienen href `/carrito` como alternativa sin JS/modificadores. Añadir con JS
  abre panel sin navegar; sin JS cuenta conserva formulario y el invitado explica su límite.
  Página completa sigue disponible. Navegar/cambiar usuario desmonta o cierra el modal.
- Motion 14.4.0 (núcleo MIT, peers React 18/19 según registro npm consultado) fijado,
  sin Motion+. Panel se carga bajo demanda. Solo AnimatePresence de entrada/salida,
  opacidad y pequeño desplazamiento desktop, sin drag/layout/scroll/parallax. Componentes
  animados llevan `'use client'` en primera línea. `useReducedMotion` y CSS reducen a
  duración cero/sin desplazamientos; controles y foco no esperan fin de animación.
- Estados explícitos: vacío, verificación/carga, guardando, ajuste/sin disponibilidad,
  fallo recuperable, comando incierto y sesión vencida. Invitado pendiente de unión
  remite a `/carrito` antes de mutar/continuar con cuenta.

## Secuencia de documentación y QA

1. Este ADR se registra en Git antes del código. QA empieza como plan, sin resultados inventados.
2. Implementar BD/servicio y estado compartido; después panel y formularios progresivos.
3. Pruebas reales PostgreSQL: incrementos concurrentes, replay/otra huella, límites,
   rollback del comprobante, aislamiento de usuario, revisión y contrato de migración.
4. Store: respuesta perdida/reintento mismo UUID, respuestas antiguas, 401/owner y revalidación.
   E2E: invitado/cuenta, edición/eliminación, página/panel/contador, teclado/foco/scroll,
   normal/reduced motion, red/sesión/stock y formularios sin JS. Conservar regresiones S1/S2.
5. Cierre: tipos/lint/build/auditoría/CI; PNG originales revisados con commit/run/hashes;
   QA, arquitectura, backlog/progreso y PR apilado sobre #12, sin merge ni acciones en Render.
   Integración solo en S2-06. No se declara certificación completa de accesibilidad/UAT.

## Fuentes primarias consultadas

- [Motion: instalación/App Router](https://motion.dev/docs/react-installation)
- [Motion: AnimatePresence](https://motion.dev/docs/react-animate-presence)
- [Motion: useReducedMotion](https://motion.dev/docs/react-use-reduced-motion)
- [Motion: bundle y carga](https://motion.dev/docs/react-reduce-bundle-size)
- [Licencia Motion](https://github.com/motiondivision/motion/blob/main/LICENSE.md)
- [W3C: patrón de diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN: dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)

La versión/peers/licencia se vuelven a comprobar en el paquete instalado y lockfile.
Tamaño de bundle real se registra en QA; no se copian cifras teóricas como medición propia.
