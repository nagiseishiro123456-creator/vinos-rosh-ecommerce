# QA S5-06 — Landing original, un solo producto

## Ajuste S5-12 — Reaparición al entrar (2026-11-02)

Se reproduce el reporte del propietario: con la marca heredada de sessionStorage,
Inicio pasaba directamente a `final`; una sesión limpia sí reproducía la secuencia.
La presentación ahora se recuerda en memoria por documento. Una nueva entrada o
recarga reproduce la secuencia, incluso con la marca anterior; volver por navegación
interna conserva el estado final. No se modifica el HANDOFF original.

12/12 pruebas locales de escritorio/móvil aprobadas sobre la página real: cinco fases,
alineación, recarga, vuelta desde Historia con el mismo documento, Escape, #comprar,
movimiento reducido, almacenamiento bloqueado, ahorro de datos y ausencia de JS.
También pasan 4/4 pruebas del vertido/scroll tras saltar la entrada con Escape;
ya no dependen de la marca de sesión eliminada.
TypeScript y ESLint aprobados. No se modifican pagos, datos ni estilos del diseño.
La regresión de producción y comparación de recursos se registran en el PR del ajuste.

## Evidencia histórica de la entrega original

2026-11-01. Base main 12d4f4e (#26, CI #376: 311 servidor y 102 navegador).
El propietario descarta la primera pareja de archivos y autoriza exclusivamente los
originales inventariados en docs/diseno/landing-original/README.md. Después confirma
que la botella no debe redirigir y que los productos locales son solo ejemplos.

Se revisan visualmente los ocho tableros del PDF y la referencia funcional del ZIP.
La primera comprobación local detectó un frame de geometría que cancelaba la aparición
del logo; se separaron los frames de entrada y posicionamiento. Se comprueba expresamente
opacidad, tamaño centrado, viaje intermedio, orden botella/header y posición final.

Cuatro casos nuevos de navegador, en escritorio y móvil (ocho ejecuciones):

- Secuencia y capturas de los cinco estados; un solo logo; botella sin enlace; ausencia
  de tarjetas/carrusel; desbloqueo del documento y visita posterior sin repetir entrada.
- 1440/1024/820/390, posición del logo tras resize, ausencia de overflow, menú móvil
  con enlaces existentes y cierre por Escape con restitución de foco.
- Ahorro de datos y sessionStorage bloqueado: estado final utilizable, poster y ninguna
  solicitud al MP4. Movimiento reducido sin video automático.
- JavaScript deshabilitado: logo, botella y poster visibles y navegación de cuenta/carrito.

Se actualiza la expectativa del baseline de Inicio y la navegación de la regresión del
carrito: usa Nuestra historia, que es el enlace del diseño nuevo. La prueba mantiene
sus comprobaciones de modal, foco y restauración del scroll.

Tipado local aprobado después de reparar un paquete local @prisma/client ausente,
verificado contra la integridad del lock. Se reinició Next conservando una copia de
su caché de desarrollo con tipos inválidos. No se cambiaron dependencias, lock, migraciones
ni datos de desarrollo. La instalación local de Next es 16.3.8; la CI limpia utiliza
la versión fijada 16.4.2 y es la verificación de producción.

Capturas locales finales y métricas a cuatro anchos: sin errores de página ni overflow;
video listo y en reproducción. 4/4 pruebas locales aprobadas, incluidas reducción de
movimiento, menú, ahorro de datos y ausencia de JavaScript. Se esperan 110 ejecuciones
de navegador; resultados del candidato final en
el PR, junto a contratos SQL, restauración, build y Public assets.

La comparación de recursos admite un techo de Home de 92 000 bytes CSS por el diseño
solicitado; las otras rutas conservan el presupuesto anterior. No se presenta como
mejora de Core Web Vitals ni como aceptación comercial de ROSH.

El primer build de CI mostró 1 418 bytes CSS adicionales en rutas ajenas a Home,
por encima del margen existente de 1 024. Tailwind detectaba candidatos también en
la documentación técnica del handoff. Se limita su origen a `src` mediante
`@import "tailwindcss" source("../")`, sin cambiar reglas visuales compartidas ni
ampliar el presupuesto de las otras páginas. Referencia:
[detección de fuentes de Tailwind](https://tailwindcss.com/docs/detecting-classes-in-source-files#setting-your-base-path).
La captura baseline espera hasta diez segundos para respetar la entrada de 6,8 segundos.
El badge de la portada conserva `cartCount`, utilizado por la integración existente.
