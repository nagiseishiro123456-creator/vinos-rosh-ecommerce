# QA — Sprint 5, rendimiento y SEO

2026-10-31. Base 6bf021d. El propietario pide continuar y publicar en main con jose-israel.
El Home editorial local permanece fuera de este incremento; solo se añade metadata a
su archivo. La comparación de CI usa los árboles limpios publicados, sin ese diseño pendiente.

302/302 servidor locales en vinos_rosh_test y contratos SQL anteriores aprobados.
Ocho casos SEO nuevos: entorno explícito de publicación; orígenes ausentes/inválidos;
canonical; compartir producto; filtros/privacidad; preview; sitemap/cobertura; imágenes seguras.
Tipos y ESLint locales aprobados antes de publicar. No se añadieron migraciones ni paquetes.

Playwright nuevo en escritorio/móvil: metadata de producto, canonical sin seguimiento,
solicitud de imagen limitada al ancho real, tarjeta a 700 px, catálogo filtrado noindex,
metadatos/stock nuevos tras otra petición y 404 después de desactivar el producto.
Se esperan 98 ejecuciones de navegador sobre la suite previa de 94.

La medición inicial detecta imports CSS administrativos en el layout raíz y consultas
de producto separadas para metadata/contenido. El comparador Public assets registra
la base y el candidato exactos sobre builds productivos y fixture común. No se atribuyen
los tiempos de next dev ni el Home local al código publicado. La reducción real de CSS
y las comprobaciones de producción se validan en la CI del incremento; su resultado se
registra en el PR para no citar la CI de un commit anterior como prueba del nuevo código.

Revisar también capturas de cuenta/administración existentes por la extracción de reglas
compartidas. El código preserva su orden previo a overrides de cuenta. No se acredita
aceptación visual, lanzamiento indexable, ranking de búsqueda ni Core Web Vitals reales.
