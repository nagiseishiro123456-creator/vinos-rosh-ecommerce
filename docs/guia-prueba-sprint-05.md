# Probar rendimiento y SEO — Sprint 5

2026-10-31. El aspecto de la tienda se conserva. El cambio reduce los recursos exclusivos
de administración que recibe una visita pública y prepara información correcta para buscadores
y enlaces compartidos. No activa la publicación ni cambia las condiciones de venta.

## Comprobar la tienda

1. Abre http://localhost:3000/productos y prueba búsqueda, filtros y enlace a una ficha.
2. Revisa imágenes en móvil/escritorio y entre 620 y 850 px; no deben cambiar las dimensiones
   de las tarjetas ni deformarse las fotografías al cargar.
3. Añade al carrito y recorre dirección/resumen con datos de prueba. Un cambio de stock
   debe verse en una visita nueva y seguir validándose antes de reservar.
4. Ingresa a Mi cuenta y a administración. Sus paneles, mensajes, campos y botones deben
   conservar su presentación, también al volver al catálogo.

## Comprobar metadata

En el HTML de una ficha, link rel=canonical apunta a su URL sin parámetros de seguimiento.
og:title, og:description, og:image y sus equivalentes Twitter corresponden a ese producto.
El catálogo con filtros conserva canonical /productos y noindex para esas variantes.

En desarrollo y preview, robots.txt bloquea indexación y sitemap.xml está vacío. Cuenta,
pedidos, compra y autenticación permanecen noindex incluso en la configuración pública.
La indexación de una publicación requiere el dominio HTTPS definitivo y PREVIEW_MODE=false
explícito en producción. Este trabajo no modifica esas variables del negocio.

## Evidencia para explicar al cliente

El PR contiene la comparación Public assets entre base y versión nueva: CSS inicial y
bytes transferidos en inicio, catálogo, producto y cobertura. El informe usa compilaciones
de producción y el mismo producto ficticio. No es una puntuación de velocidad ni una
medición de usuarios reales. La mejora de tiempos en dispositivos/redes reales requiere
su propia medición una vez exista el entorno definitivo.

«La tienda conserva su presentación y descarga menos estilos que solo necesita el panel
administrativo. Los enlaces de los productos llevan su propia información para compartir.
Las pantallas de cuenta y compra siguen excluidas de indexación.»

## Nuestra historia — mejora S5-09

1. Abre `/nuestra-historia`: revisa cabecera, datos, tres capítulos, cuatro fotos y
   enlaces finales. Comprueba también móvil y la preferencia claro/oscuro del sistema.
2. Entra como administrador a Panel → Nuestra historia (`/admin/historia`). Cambia
   el título y un párrafo, pulsa **Guardar historia e imágenes** y comprueba el
   mensaje con check. Recarga la página pública para ver los textos publicados.
3. En Fotografías, elige JPG, PNG o WebP de hasta 6 MB; espera «Foto preparada».
   Ajusta descripción y encuadre, guarda y comprueba la foto en la página pública.
   Recarga también el editor: debe conservar texto y foto. «Usar foto original»
   prepara la restauración; hay que guardar para aplicarla.
4. Vacía un título obligatorio e intenta guardar: debe enfocar el campo. Los
   campos de variedad/cosecha y elaboración pueden quedar vacíos; no muestran
   instrucciones provisionales al visitante.
5. Para comprobar conflictos, abre el editor en dos pestañas. Guarda en la primera
   e intenta guardar en la segunda: debe avisar de la edición más reciente.
   Copia tus cambios antes de volver a abrir la página y aplicarlos sobre esa versión.

Para el cliente: «En Nuestra historia puedes actualizar textos y fotos sin tocar
el código. Preparas los cambios, guardas y recibes la confirmación; al recargar la
página pública se ve la nueva versión.»

## Administrador renovado — mejora S5-10

1. Entra a `/admin` con una cuenta administradora. Revisa el resumen y cambia entre
   7, 30 y 90 días. Ventas, pedidos, clientes nuevos y el gráfico deben corresponder
   al período; el stock y las tareas pendientes reflejan el estado actual.
2. Abre Ver datos por día. Sin ventas confirmadas, el estado vacío y las filas con
   cero son correctos; no se cargan ventas de ejemplo. Un pedido cancelado o
   reembolsado no cuenta como venta confirmada.
3. Recorre el menú: Producto, Pedidos, Clientes, Pagos, Envíos, Nuestra historia,
   Reseñas, Contactos, Configuración, Lanzamiento y Respaldo. Confirmaciones y
   Conciliación están debajo de Pagos. Comprueba también las fichas de pedido/cliente.
4. Busca un cliente desde la barra superior: abre el directorio con el filtro aplicado.
   Las tarjetas del resumen y Por atender deben abrir el módulo correspondiente.
5. En móvil, abre el menú y ciérralo con X, Escape o el fondo; también debe cerrarse al
   elegir una sección. Luego comprueba que puedes seguir desplazando la página.
   Las tablas anchas se desplazan dentro de su propio recuadro.
6. Comprueba los guardados de Producto y Nuestra historia, la edición de una tarifa
   y su confirmación. Para pagos/pedidos, usa únicamente operaciones de prueba.
   Cerrar sesión debe volver a la tienda y retirar el acceso a la administración.

Para el cliente: «El resumen te muestra cómo va la tienda y qué necesita atención.
Desde el menú administras el único producto, sus existencias, los pedidos y el
contenido de la marca. Las cifras vienen de los pedidos reales del sistema.»

## Navbar público — mejora S5-11

1. Compara Inicio con Historia, Envíos, Contacto, Carrito, ingreso y Mi cuenta:
   fuente, tamaño de letras, logo y botones deben coincidir a igual ancho de pantalla.
2. En móvil abre el menú: Inicio vuelve arriba de la landing y Comprar abre su
   sección de compra; Historia, Envíos y Contacto abren sus páginas reales.
3. Prueba el carrito desde distintas páginas. Debe abrir el mismo panel, conservar
   cantidades y permitir seguir navegando después de cerrarlo.
4. Entra a tu cuenta y comprueba perfil, direcciones y cierre de sesión. En móvil,
   Cerrar sesión está dentro del menú; en escritorio está en el navbar.
