# Nuestra historia — diseño y edición

2026-11-02 · Sprint 5, mejora S5-09.

Referencias del cliente: `rosh-nuestra-historia.zip` y `Rosh · Nuestra historia
(prototipo).pdf`. Se revisaron el handoff, la referencia HTML y las doce páginas del
PDF. La página `/nuestra-historia` adopta la lectura editorial, los tres capítulos,
las fotografías con arco/círculo/hoja, los filetes y los modos claro/oscuro del
prototipo. Reutiliza la cabecera real, las fuentes corporativas Cambria/Jane y el pie
compartido con la landing. La barra fija de accesos móviles se oculta en esta página
para no cubrir la lectura. El enlace de la botella abre `/#comprar`.

## Administrar contenido

Desde Panel → Nuestra historia (`/admin/historia`) se editan los 34 textos,
incluidos datos de la botella, etiquetas, párrafos, cita, ocasiones, cierre y pie.
Los destinos de navegación siguen apuntando a la compra y al contacto reales.
Variedad/cosecha y elaboración son opcionales: están vacíos y no aparecen en la
página hasta que el negocio los confirme. Los textos se presentan como texto plano.

Las cuatro fotos permiten reemplazo, descripción accesible, encuadre horizontal y
vertical (0–100 %) y restauración de la imagen original. Se admiten JPG, PNG y WebP
estáticos de hasta 6 MB/36 megapíxeles; el servidor verifica los bytes, corrige la
orientación, elimina metadatos y produce WebP de hasta 1600 px y 500 KB. Una foto
subida queda preparada: **Guardar historia e imágenes** publica el conjunto. El
editor muestra el estado de guardado, errores y cambios posteriores sin guardar.
Dos ediciones simultáneas requieren recargar la versión actual antes de sobrescribir.

## Datos y puesta en marcha

Migración aditiva: `20261102080000_editable_history` (n.º 19). Crear las tablas con
`prisma migrate deploy` antes de servir esta versión. No modifica productos, stock
ni pedidos. En una instalación nueva, el contenido predeterminado se muestra hasta
el primer guardado; no hay que ejecutar un seed para publicar el diseño.

`HistoryPage` conserva el documento y su revisión. `StoryImage` guarda los bytes
WebP en PostgreSQL, evitando depender del disco temporal del servidor. Cada imagen
tiene una URL inmutable `/api/story-images/{uuid}`; reemplazarla crea otra URL.
Las fotos sustituidas se conservan para no romper referencias existentes.
El respaldo SQL incluye ambas tablas. La exportación de negocio JSON pasa a versión
4 e incluye `historyPages` y `storyImages` (bytes en base64); no existe un importador
JSON automático. Para recuperar toda la base se usa el procedimiento SQL existente.

Fotos originales del ZIP, convertidas sin ampliación:

| Ubicación | Recurso de la aplicación |
| --- | --- |
| Cabecera | `public/media/rosh/history/foto-portada.webp` |
| La uva | `public/media/rosh/history/foto-uva.webp` |
| El zumo | `public/media/rosh/history/foto-zumo.webp` |
| La mesa | `public/media/rosh/history/foto-mesa.webp` |

## Verificación

TypeScript, ESLint y siete pruebas de contenido/preparación de imágenes pasan en
local. Revisión pública en 320, 390, 820 y 1440 px, claro/oscuro, sin desbordamiento;
FAQ y pie de la landing conservados. El editor real se revisa en 320, 390 y 1440 px
con guardado simulado, sin alterar contenido local. La CI usa una base aislada para
probar permisos, persistencia, conflicto de revisiones, respaldo de bytes y el
flujo real de subir/guardar/recargar desde navegador, en escritorio y móvil.
