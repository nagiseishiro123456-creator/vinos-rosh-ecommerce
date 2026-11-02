# S5-07 — Segunda parte de la landing

2026-11-01, America/Lima. Continúa la portada de #27. Fuente: el PDF de segunda parte
(siete páginas revisadas visualmente) y rosh-landing-2.zip. HANDOFF.md conserva las
instrucciones del cliente; no autoriza publicar condiciones provisionales.

## Composición

Primera landing, degradado de 24vh y segunda sección sticky de 480vh. El logo decorativo
se vacía mientras una única botella compuesta se llena hasta 750 ml. La botella se mueve
al costado y aparece la compra; en móvil sube hasta 78px y reduce su tamaño al 74%.
Los elementos ocultos de compra son inert. Scroll reversible, un listener de scroll
compartido con la primera parte y RAF. Movimiento reducido: estado final sin altura
extendida. PNG original sin alteración; Jost y Lora locales con sus licencias.

## Configuración del único producto

En **Admin → Producto → Crear producto ROSH**, completar precio, descripción y origen,
stock e imagen; publicar únicamente cuando el cliente confirme esos datos. El SKU
reservado y único es **ROSH-750**. No se selecciona el primer registro ni se muestran
los ejemplos como producto oficial. El formulario nuevo comienza oculto. Si existe un
producto ROSH, la creación redirige a su edición. Los registros anteriores no se borran.
La descripción se presenta como Origen; precio y stock proceden del mismo registro.
Las modificaciones de stock mantienen la trazabilidad de updateProduct.

Sin producto oficial publicado: Próximamente, compra deshabilitada y origen pendiente;
no se usa S/189. No se publica la promesa provisional de envío nacional o pago seguro.
Comprar ahora añade de 1 a 12 unidades mediante los proveedores existentes y abre el
carrito; las verificaciones de disponibilidad y precio siguen siendo del servidor.

## Simplificación

El panel ofrece Producto (incluido inventario), sin tarjetas Categorías o Inventario.
Confirmaciones se abre desde Pagos e incluye retorno a Pagos. Las rutas anteriores de
categorías, productos e inventario administrativo llevan a Producto, previa autorización.
La pantalla pública de productos muestra solo ROSH, sin filtros o categorías. Las URLs
históricas de detalle y confirmaciones se conservan para pedidos y enlaces existentes.
Este incremento no rediseña visualmente todo el administrador ni borra datos históricos.

## Validación

Tipos y ESLint; dos nuevos casos de scroll reversible y seis anchos de referencia,
con capturas revisadas. Se corrige el tamaño de Próximamente y los botones a 320px.
La prueba SEO designa explícitamente el producto QA durante su escenario y restaura
su SKU. Baseline adaptado al catálogo singular. El presupuesto CSS de Inicio pasa de
92.000 a 102.000 bytes para incorporar esta segunda sección; otras rutas conservan
el margen anterior. La CI productiva completa debe verificar el candidato antes de main.

La CI inicial detectó dos regresiones de la adaptación: se mantenían dos columnas
dentro de una tarjeta de ancho máximo 380px, y la etiqueta implícita de un textarea
incorporaba su valor al nombre accesible. Se fija una sola columna y se separa
la etiqueta de Origen con htmlFor/id explícitos; se conservan las comprobaciones
de imagen responsive y edición real con stock auditado.


## S5-08: configuración única y textos editables

Admin → Producto presenta directamente la ficha, sin pasos de crear o editar otros
productos. Guarda stock, precio y textos de la landing (título, subtítulo, etiquetas,
botones, cata, maridaje, origen y pie). Las rutas administrativas antiguas redirigen
a la misma ficha. Se conservan los registros históricos sin mostrarlos como opciones.

Se puede guardar sin precio; se conserva como borrador y la compra permanece cerrada.
Para habilitar Comprar ahora hay que confirmar un precio positivo y activar Publicar
producto y habilitar compra. El stock cero muestra Agotado. La cantidad numérica admite
1–12 con botones y limita según existencias y lo que ya hay en el carrito. La operación
usa los proveedores existentes de invitado y cuenta; el servidor verifica precios y
reservas. Los textos guardados se reflejan al recargar la landing.

Migración aditiva 20261101210000_single_product_landing_content: JSONB opcional en
Product; los productos previos conservan su descripción/origen. Los respaldos de datos
y SQL incluyen el nuevo campo. No se inventa un precio ni se borra el historial.


## Confirmación de guardado

El aviso se muestra junto al botón al final del formulario. Mientras se procesa,
aparece Guardando y el botón queda deshabilitado. Tras confirmar el servidor se
muestra una marca de verificación con el resultado (guardado o borrador). Un recibo
por respuesta permite confirmar también guardados consecutivos. Al editar se oculta
la confirmación anterior; la validación nativa informa el campo que debe corregirse.
No se cambia la lógica de precio, publicación o inventario.
