# Administrador ROSH — Sprint 5, S5-10

2026-11-02. Renovación basada en las dos referencias visuales entregadas por el
cliente: menú lateral, barra superior, indicadores, gráfico y tablas sobre superficies
blancas. Se conserva el azul-violeta corporativo `#4B1C71` y la tipografía de la empresa.
La implementación usa los componentes y funciones propios; no incorpora una plantilla
externa ni módulos que ROSH no tiene.

## Navegación y pantallas

El menú agrupa Operación, Contenido y Administración. Producto permanece como una
sola ficha con inventario. Conciliación y Confirmaciones aparecen subordinadas a Pagos.
Nuestra historia conserva su editor de textos e imágenes. También están disponibles
Pedidos, Clientes, Envíos, Reseñas, Contactos, Configuración, Lanzamiento y Respaldo.
Las rutas antiguas de categorías, productos e inventario mantienen sus redirecciones.

La barra superior busca clientes por nombre, correo o celular usando el directorio
existente. El nombre e iniciales corresponden a la sesión actual. Ver tienda y Cerrar
sesión usan sus destinos y acciones reales. En móvil, un diálogo modal contiene el
menú: cierra con su botón, Escape, el fondo o al navegar, y restaura el scroll anterior.

El estilo compartido se aplica únicamente dentro del administrador: formularios,
confirmaciones, tablas, tarjetas, estados vacíos y pantallas de detalle. Las tablas
anchas se desplazan dentro de su contenedor; no desplazan horizontalmente toda la página.
Los controles de permisos y las acciones de pagos, pedidos y guardado se conservan.

## Qué significan los datos

- Períodos de 7, 30 o 90 días, incluido el día actual según la hora de Perú.
- Ventas confirmadas: suma exacta del total de pedidos con estado actual Pagado,
  Preparando, Enviado o Entregado y `paidAt` dentro del período. Incluye envío; excluye
  cancelados y reembolsados. No representa utilidad, depósito bancario ni visitas.
- Gráfico: cantidad de esos pedidos por día. Los días sin actividad muestran cero.
  Ver datos por día ofrece las cantidades e importes exactos en tabla accesible.
- Pedidos recibidos y clientes nuevos: fecha de creación dentro del período.
- Stock: existencias actuales del único producto con SKU `ROSH-750`.
- Por atender: pagos por revisar, pedidos en proceso, reseñas pendientes y mensajes
  nuevos de toda la operación, sin límite del período. Cada tarjeta abre su módulo.
- Últimos pedidos: los seis más recientes, en todos los estados, con enlace a su ficha.

Se leen datos reales en una instantánea de PostgreSQL, sin caché entre peticiones.
No se añaden migraciones, servicios de analítica ni condiciones comerciales nuevas.
Un negocio sin ventas confirmadas muestra un estado vacío, sin cifras de demostración.

## Verificación

Pruebas de calendario peruano, rangos admitidos, días sin actividad y navegación.
Una prueba de integración aislada verifica centavos exactos, reembolsos, fecha de pago
y los límites del día. El navegador recorre los módulos existentes, los filtros,
búsqueda, cierre de sesión y restauración del scroll móvil. La batería existente
continúa verificando los guardados y los procesos de pedidos, pagos e inventario.
Las capturas locales con datos del negocio son evidencia privada y no se publican.
