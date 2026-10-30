# Evidencia local de cobertura

2026-10-30, localhost:3000, Next development sobre 70f6dbc con cambios del incremento.
Navegador integrado, capturas JPEG de página completa. Ejemplos ficticios; no son tarifas
ni cobertura comercial de ROSH y no se cargaron en la base de desarrollo.

| Archivo | Estado | Viewport CSS |
| --- | --- | --- |
| 01-demo-cobertura.jpg | Tres ejemplos, incluido cero explícito | 1280×720 |
| 02-busqueda-zona.jpg | Búsqueda con mayúsculas mezcladas | 1280×720 |
| 03-sin-cobertura.jpg | Ninguna coincidencia | 1280×720 |
| 04-demo-movil.jpg | Resultados y controles móviles | 390×844 |

El navegador reserva 15 px de scrollbar en el JPG. La revisión de la página pública
real a 390 CSS midió clientWidth/scrollWidth 375, contenedor de x=14 a x=361, sin desborde.
Las pruebas privadas administrativas/de checkout generan sus propias capturas en CI;
no se atribuyen a estas imágenes de demostración.
