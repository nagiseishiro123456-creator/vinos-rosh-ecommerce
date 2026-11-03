# Sprint 5 — Rendimiento y SEO técnico

2026-10-31 (America/Lima), base main 6bf021d, después de integrar #24. El propietario
autoriza continuar y publicar los commits en main con jose-israel. Se conserva la pausa
del rediseño visual. No se comprometen puntos, fechas ni capacidad.

| Historia | Alcance de este incremento | Estado antes de publicar |
| --- | --- | --- |
| S5-01 | Medición reproducible de recursos públicos sobre dos builds de producción. | Comparador CI con base/head exactos, misma BD sintética y versiones registradas. |
| S5-02 | Reducir CSS administrativo público y corregir tamaños solicitados de imágenes. | Imports por área, controles compartidos conservados e indicaciones responsive ajustadas a 620/850 px. |
| S5-03 | Evitar la lectura duplicada de producto durante un mismo render. | React cache por petición, con regresión de metadatos/stock entre peticiones. |
| S5-04 | Canonical, compartir productos, indexación y sitemap coherentes. | Implementados; producción/preview cubiertos por políticas y comprobaciones HTTP. |
| S5-05 | Comparar resultados, integrar y presentar el incremento. | 302 servidor locales; CI completa y comparación productiva por registrar en el PR. |
| S5-06 | Mejorar la landing con el diseño original y un solo producto. | Retomado 2026-11-01; solo Inicio, botella sin enlace, recursos del cliente y regresión de navegación. |

Actualización 2026-11-01: el propietario retoma exclusivamente la landing con los
archivos originales definitivos. Se sustituye la alternativa editorial local anterior;
la empresa vende un único producto y la botella no redirige. El resto del sitio conserva
sus módulos. [Referencia y límites](../diseno/landing-original/README.md) · [Guía](../guia-landing-rosh.md).

## Hallazgos y objetivo

El layout raíz importaba siete hojas de administración en toda ruta. Parte de
admin-products.css también da formato a cuenta, reseñas y botones públicos: sus reglas
se conservan en el mismo orden antes de estilos de cuenta; las exclusivas pasan al layout
administrativo. Se mantiene apariencia y navegación. CSS global puede seguir cargado tras
navegar por SPA: la medición se refiere a una entrada inicial anónima a cada ruta.

Las tarjetas usaban 700/1100 px frente a la cuadrícula real 620/850, y la imagen de detalle
no tenía un ancho máximo en sizes. Metadatos y página consultaban el mismo producto.
Faltaban canonical por ruta, imagen/título de compartir por producto, cobertura en sitemap
y noindex independiente para rutas de compra/cuenta/autenticación en producción pública.

## Criterios y límites

- Dos checkouts limpios de base y candidato; producción con dependencias de cada commit
  y Node/npm fijados. Misma fixture aislada, puertos de loopback, sin solicitudes externas.
- Menos CSS inicial en las rutas públicas cuando la base contiene estilos administrativos;
  candidato sin esos selectores exclusivos. Reporte con bytes decodificados y transferidos.
- No almacenar precio o stock en caché entre peticiones ni relajar validación del checkout.
- Canonical sin filtros/seguimiento, metadatos de la ficha actual y sitemap con productos
  activos/cobertura. Sitio de desarrollo, preview o sin origen público válido no indexable.
- Cuenta, pedidos, carrito, checkout y autenticación mantienen noindex aun en publicación.
- Probar compra, cuenta y administración en tamaños existentes; pruebas específicas de
  imagen solicitada, cambios de metadatos/stock y producto desactivado.

Este incremento no mide Core Web Vitals reales ni asigna una puntuación Lighthouse.
Tiempos HTTP locales son observaciones de laboratorio; no se usan como umbral de aprobación.
Medición real de usuarios/dispositivos, red externa, seguimiento de buscadores, Motion y
aceptación del cliente quedan pendientes. No se activan pagos, correo, trackers ni despliegue.

[Contrato](../integraciones/rendimiento-seo.md) · [QA](../testing/sprint-05-rendimiento-seo.md)
· [Guía de prueba](../guia-prueba-sprint-05.md).


## S5-07 — Segunda landing y producto único (2026-11-01)

Scroll de llenado 0–750 ml, compra y detalles; precio y origen editables en Producto.
Categorías fuera de la navegación; inventario en Producto y confirmaciones desde Pagos.
[Alcance, configuración y QA](../diseno/landing-2/README.md).


## S5-08 — Producto único operativo y textos editables

Se elimina la creación/edición separada de productos en el administrador: sus rutas
antiguas redirigen a Producto. Una sola ficha permite guardar un borrador sin precio,
stock auditado, habilitación de compra y todos los textos de la segunda landing.
La compra requiere precio positivo confirmado, publicación y stock. Cantidad numérica
con botones y límites según existencias y selección actual, usando el carrito existente.
Migración aditiva: Product.landingContent JSONB nullable; los datos previos se conservan
y reciben textos predeterminados hasta guardar cambios.

## S5-09 — Nuestra historia editable (2026-11-02)

Se reemplaza Nuestra historia con el ZIP y el PDF entregados por el cliente:
lectura por capítulos, fotografías con formas editoriales y modo claro/oscuro.
Panel → Nuestra historia permite editar todos los textos, reemplazar las cuatro
imágenes y ajustar su encuadre. Se confirma el guardado y se protegen ediciones
simultáneas; las fotos se conservan en la base y en los respaldos.
[Diseño, datos y validación](../diseno/nuestra-historia/README.md).

## S5-10 — Renovación del administrador (2026-11-02)

Se adapta el panel a las referencias del cliente: menú lateral, barra superior,
tarjetas y tablas con la identidad ROSH. Solo incluye los módulos existentes;
Producto conserva la ficha única, y Confirmaciones/Conciliación quedan dentro de Pagos.
El resumen consulta ventas confirmadas, pedidos, clientes y stock reales, con períodos
7/30/90 días, gráfico por día y enlaces a los pendientes operativos. Se unifican las
pantallas de administración y su uso en móvil, manteniendo permisos y acciones.
[Alcance y definición de indicadores](../diseno/admin-workspace/README.md).

## S5-11 — Navbar público unificado (2026-11-02)

Se usa el navbar de la landing en todas las vistas de usuario, con un único
componente y una sola hoja de estilos. Se igualan fuente, tamaño, logo y controles;
se conectan inicio, compra, historia, envíos, contacto, carrito y sesión.
Se conserva la animación del logo y se ajustan los espacios de las páginas internas.
[Diseño y rutas](../diseno/public-header/README.md).

## S5-12 — Presentación al entrar a Inicio (2026-11-02)

El propietario reporta que ya no ve la animación al entrar. La marca persistente por
sesión la omitía después de la primera visita. Se sustituye por memoria del documento:
entrada/recarga reproduce el logo, viaje, botella y navegación; un regreso interno
no interrumpe la compra. Se mantienen movimiento reducido, salto y #comprar.
12 pruebas locales aprobadas; [reproducción y QA](../testing/s5-06-landing-original.md).
