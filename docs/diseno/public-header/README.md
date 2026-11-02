# Navbar público único — S5-11

2026-11-02. El navbar de la landing se convierte en el componente compartido
`SiteHeader`, también usado por `StoreHeader` en historia, envíos, contacto, FAQ,
carrito, compra, pedidos, cuenta y autenticación. El administrador conserva su menú.

La apariencia se define una sola vez en `src/app/public-header.css`: Cambria
corporativa, enlaces de 18.4 px, acceso de sesión de 16.8 px, altura de 84 px y
controles de 52 px en escritorio. Hasta 1100 px, altura de 64 px, logo de 100 px
y controles de 44 px. Se retiran los estilos duplicados y la barra inferior antigua.

En la landing se conserva el espacio de destino del logo animado y la transición
de superficie clara a violeta al recorrer la compra. Las páginas internas usan
una superficie clara legible, con los mismos controles y tipografía. En checkout
el mismo navbar permanece en el flujo para evitar cubrir los formularios.

## Rutas y comportamiento

- Logo e Inicio: `/#inicio`.
- Comprar: `/#comprar`, la sección real del producto único.
- Nuestra historia: `/nuestra-historia`.
- Envíos: `/envios`.
- Contacto: `/contacto`.
- Carrito: `/carrito` como alternativa nativa; un clic normal abre el panel compartido.
- Cuenta: `/mi-cuenta`; Administración: `/admin` para la sesión administradora.
- Acceso: `/iniciar-sesion`; cierre de sesión mediante la acción existente.
- Teléfono: el mismo dato administrable del negocio en todas las páginas; si no
  está configurado con un número válido, el icono abre Contacto.

El menú móvil ofrece Inicio, Comprar, Historia, Envíos, Contacto y el acceso de sesión.
Cierra al elegir una ruta, tocar fuera o presionar Escape. Los modificadores del
enlace del carrito conservan la navegación nativa. El panel del carrito conserva
su estado, cantidades y devolución del foco al botón que lo abrió.

Se adaptan los espacios de autenticación/historia y el aviso de analítica a las
alturas compartidas. Las preferencias de consentimiento mantienen su función.

## Verificación

Comparación de familia tipográfica, tamaños, peso, color, altura y controles entre
landing y páginas internas en 1440, 1100, 820, 390 y 320 px. Pruebas de rutas, menú,
carrito, navegación de Next.js entre páginas y cuenta autenticada. La batería
existente continúa verificando compra, sesión, carrito y animación de entrada.
