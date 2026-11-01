# Probar la landing de un solo producto

1. Abre http://localhost:3000/ en una ventana privada. Primero aparece únicamente el
   logo ROSH; viaja al header, entra la botella y aparecen navegación y racimo.
2. Espera unos siete segundos. Debe verse el video dentro de las uvas, con tallo y hoja
   lilas por fuera. La botella conserva su transparencia y sombra.
3. Recarga en la misma sesión: debe mostrar directamente la composición final.
4. La botella es una presentación sin enlace: no abre productos, precios ni compra.
   Los artículos de ejemplo de administración no se alteraron.
5. Abre y cierra el carrito por X y Escape. Comprueba que puedes seguir navegando y
   que el contador conserva la selección existente.
6. Prueba Nuestra historia e Iniciar sesión. En móvil, abre el menú y ciérralo con
   Escape; el foco debe volver al botón. La cuenta autenticada muestra Mi cuenta.
7. Revisa anchos 1440, 1024, 820 y 390 px. En móvil la botella queda arriba y el racimo
   debajo. No debe aparecer desplazamiento horizontal.
8. Activa «Reducir movimiento» en el sistema/navegador y vuelve a entrar: no hay
   introducción, flotado o video automático. Con ahorro de datos se muestra la foto.
   Sin JavaScript siguen visibles logo, botella y foto, con enlaces de acceso/carrito.

La fuente, fotografías, video y capas están alojados en el proyecto. El racimo usa
el video original de respaldo; no se añadió una pantalla nueva de administración.
Este cambio corresponde a mejoras del Sprint 5 y no activa pagos ni correo.
