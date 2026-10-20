# S2-05 — QA del carrito lateral (en curso)

Inicio: 2026-10-19 (America/Lima). Actualización: 2026-10-20.
Implementación conservada en [PR #13](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/pull/13), sobre #12.
[ADR 0008](../decisions/0008-carrito-lateral.md), registrado antes del código en `8ba1d6b…`.
No se declara terminado: pruebas de navegador y revisión de evidencia pendientes.

## Implementación

Panel modal compartido con página/contador; preview invitado único y snapshot de cuenta
obtenido en servidor con RepeatableRead y memoización por petición de React.
Comandos add/set/remove, comprobante transaccional, revisión y límites de stock/99/50.
Origin público, sesión/usuario esperado, UTF-8/JSON estricto, tamaño y rate limit.
Native forms ligados al usuario/UUID del render, con alternativa sin JS.
Motion 14.4.0 fijado, bajo demanda y solo entrada/salida, con movimiento reducido.

La revisión añade limpieza del snapshot al detectar otra cuenta, conservación del dueño
del comando incierto y rechazo de snapshots SSR de la misma revisión ya confirmada.
Cerrar el modal al navegar restaura estilos, sin desplazar la página nueva al scroll anterior.
Navegación/foco/visibilidad y señal sin datos privados revalidan el estado de cuenta.
La reserva revalida el layout para que el contador refleje el carrito consumido.

## Registro de ejecución

- Antes de la interrupción del entorno se ejecutaron 25 pruebas locales de estado/destino.
  El código reconstruido posteriormente requiere su propia CI; no hereda esa aprobación.
- `91bed44…`, [CI 39486615317](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39486615317):
  98/98 pruebas anteriores, 12 migraciones, cuatro contratos SQL, tipos/lint y producción
  sin hallazgos. Build compiló, pero el chequeo de rutas detectó dos href concatenados.
  Se tiparon explícitamente; no se ejecutó navegador ni se declaró evidencia aceptada.
- Esa ejecución resolvió el lock de Motion con npm 11.9.0/Node 22. Se conservaron los
  cuatro paquetes de Motion y seis metadatos opcionales empaquetados por npm.
  Ninguna entrada previa del lock cambió ni se eliminó. Se retiró el paso temporal:
  las siguientes ejecuciones usan `npm ci --include=dev`.
- `aba53bf…`, [CI 39487070269](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39487070269):
  **115/115 servidor**, 12 migraciones, cinco contratos SQL, tipos/lint/build y auditoría
  de producción aprobados. Ejecución cancelada al incorporar el flujo del panel; no
  equivale a aprobación de navegador.
- `04992db…`, [CI 39487865177](https://github.com/nagiseishiro123456-creator/vinos-rosh-ecommerce/actions/runs/39487865177):
  primera ejecución de 60 casos previstos con el panel; se sustituye por una cabecera
  con el caso adicional de cambio de cuenta y correcciones de privacidad/navegación.
  Resultados parciales se consultan en el run; no se dan por aprobados.

La cabecera siguiente prevé **116 servidor y 64 navegador**, sin atribuir resultados
hasta completarse. En CI se detiene tras cuatro fallos para acortar diagnóstico; una
ejecución aprobada debe ejecutar y superar todos los casos. No se añaden reintentos.

## Aceptación y evidencia pendientes

- PostgreSQL: sumas concurrentes, replay/otra huella, stock/99/50, rollback, aislamiento,
  revisión de unión y consumo al reservar. Contrato de migración sobre datos anteriores.
- Stores: respuesta perdida, UUID estable, respuestas antiguas, 401/cuenta distinta,
  limpieza de datos privados y revalidación entre pestañas.
- E2E 320/390/768/1440 px: vacío, invitado/cuenta, editar/eliminar, panel/página/contador,
  teclado/foco/Escape/scroll, normal/reduced motion, carga/guardado/red/stock/sesión,
  cambio real de cuenta y continuidad de checkout/reserva.
- Mantener regresiones anteriores, incluidos formularios de cuenta y reserva sin JS.
- PNG originales, manifiesto con commit/run/dimensiones/hashes y revisión visual.
  CI conserva artefacto completo y exporta copias exactas para inspección sin entorno local.
  Los datos de pruebas son sintéticos. No se modifican las 150 capturas históricas.
- Medición de chunks JS solicitados al abrir, tamaño bruto/gzip estimado; no afirmar CWV
  ni cobertura de otros navegadores/lector de pantalla/contraste sin ejecutarla.

Cierre: completar este QA, galería, arquitectura/backlog/progreso y checks de cabecera
antes de marcar #13 listo. Integración en S2-06; sin Render ni BD remota.
