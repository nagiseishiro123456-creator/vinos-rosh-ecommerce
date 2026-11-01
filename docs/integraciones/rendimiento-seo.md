# Rendimiento público e indexación

2026-10-31. Base 6bf021d. Sin dependencias nuevas ni migraciones.

## CSS y producto

El root layout conserva estilos comunes. Siete hojas exclusivas de administración se
importan desde su layout. Las reglas de botones, paneles y campos usadas también por
catálogo/cuenta/reseñas se separan en commerce-shared.css en su posición original de
cascada. No se garantiza descarga de CSS global al salir de un área por navegación SPA.

La ficha comparte getProductBySlug mediante una única referencia React cache entre
generateMetadata y el contenido. Es reutilización por petición, sin revalidate, caché
persistente o TTL para precio/stock. El checkout conserva lecturas y firma autoritativas.
Los tamaños de imagen reflejan la cuadrícula a 620/850 px y el límite de ancho del detalle.

## Política SEO

readSeoConfig distingue un origen configurado válido de la autorización de indexación.
Acepta origen HTTP/HTTPS sin credenciales, ruta base, consulta ni fragmento. Normaliza
la barra final. Un origen ausente/inválido no fabrica canonical ni sitemap público.
La base técnica de metadata usa localhost solo como fallback para que el desarrollo arranque.

Solo NODE_ENV=production, PREVIEW_MODE=false explícito y un origen HTTPS de dominio público
habilitan indexación. Loopback, IP literal, .localhost, .local y desarrollo permanecen
noindex. No se modifica ninguna variable de despliegue con este incremento.

Home y páginas públicas tienen canonical de ruta. Catálogo filtrado usa canonical /productos
y noindex; follow depende de la política general. La ficha usa título, descripción y
fotografía reales en Open Graph/Twitter. La imagen de fallback es el logo existente;
no se inventan ofertas, puntuaciones ni información comercial estructurada.

Layouts de cuenta, compra, pedidos, reseñas, autenticación y desarrollo aplican noindex,
nofollow y exclusión de archivo/snippet. Robots refleja la misma política y sitemap evita
consultar productos cuando el sitio no es indexable. Al publicar incluye /envios y solo
productos activos; un fallo de BD conserva únicamente las rutas estáticas.

## Auditoría de CI

Public assets trabaja solo con vinos_rosh_ci en un servicio efímero. Checkout de base y
candidato por SHA, installs/builds de producción independientes y una fixture común.
El origen HTTPS rosh.example.test es ficticio; los servidores escuchan solo en loopback.
No se consultan buscadores, redes sociales ni imágenes externas.

Por ruta: una solicitud de calentamiento, tres HTML, y descarga de los CSS/JS referenciados
por el documento inicial. Se registran bytes decodificados, bytes realmente transferidos,
archivos y mediana HTTP. Es presupuesto de recursos iniciales, no navegación de usuario,
LCP, CLS, INP ni puntuación Lighthouse. No incluye módulos que solo se cargan al interactuar.

El candidato no puede incluir selectores administrativos exclusivos. Si la base los
incluye, debe reducir CSS; en PR posteriores ya optimizados admite hasta 1024 bytes de
crecimiento para ruido menor y detecta regresiones mayores. Una ampliación justificada
del presupuesto se documenta con su evidencia. No se exige una reducción indefinida.

Además verifica canonical públicos, producto compartido, filtros noindex, cuatro páginas
privadas noindex en modo público, robots y sitemap. El workflow CI habitual mantiene
preview=true; ambos modos se comprueban sin cambiar un entorno real. Artefacto public-assets
con JSON y tabla conserva base/head y versiones; resultado final y métricas en el PR.
