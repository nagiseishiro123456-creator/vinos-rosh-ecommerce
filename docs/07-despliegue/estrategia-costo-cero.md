# Estrategia de despliegue sin costos obligatorios

Última revisión: 2026-10-05

## Regla del proyecto

Vinos ROSH no incorporará servicios de pago obligatorios sin aprobación expresa del cliente. El código debe poder desarrollarse, probarse y demostrarse usando software open source y capas gratuitas.

## Estado actual

- Next.js / React / TypeScript: open source.
- PostgreSQL: open source y disponible localmente con Docker Compose.
- Prisma ORM: sin costo para el ORM usado por la aplicación.
- GitHub: repositorio y CI del proyecto dentro de la capa disponible de la cuenta.
- Pagos automáticos con Culqi: opcionales y desactivados.
- Yape / transferencia manual: flujo principal sin dependencia de una pasarela.
- Resend: integración opcional. Si no hay API key, el sistema no depende de este servicio para compilar ni iniciar.
- Cloudinary: opcional. Las imágenes pueden usar fuentes HTTPS permitidas mientras se define el almacenamiento definitivo.

## Desarrollo local: S/ 0 en software

La opción principal de desarrollo es:

1. Docker Desktop / Docker Engine.
2. PostgreSQL 16 mediante `docker compose`.
3. Node.js 22.
4. Aplicación Next.js ejecutada localmente.

No existe licencia de software obligatoria para este flujo.

## Imagen Docker portable

El repositorio contiene un `Dockerfile` multi-stage y Next.js genera salida `standalone`. Esto evita acoplar la aplicación a Vercel, Render u otro proveedor.

La misma imagen puede ejecutarse en cualquier infraestructura compatible con contenedores y una URL PostgreSQL.

## Publicación gratuita para pruebas

Las capas gratuitas de proveedores externos cambian con el tiempo y deben validarse antes de cada despliegue. A fecha 2026-10-05:

- Render dispone de web services gratuitos, pero su propia documentación indica que son para pruebas/hobby y no recomienda usarlos para producción crítica.
- Supabase ofrece PostgreSQL en plan Free con límites de uso y pausa por inactividad.

Por ello estas alternativas se consideran adecuadas para preview, QA o validación con el cliente, no como una promesa de infraestructura comercial con SLA.

## Producción real

La aplicación puede seguir siendo técnicamente gratuita si el cliente aporta infraestructura propia, pero electricidad, Internet, dominio, copias de seguridad y disponibilidad también son costos operativos aunque el software sea gratuito.

Antes del lanzamiento comercial se realizará una decisión explícita entre:

- aceptar las limitaciones de una capa gratuita;
- autoalojar la aplicación;
- o aprobar un presupuesto mínimo de infraestructura.

El sistema nunca activará automáticamente una opción de pago.

## Principio de arquitectura

Ningún módulo de dominio depende directamente de un proveedor comercial. PostgreSQL, autenticación, pedidos, inventario, pagos manuales y reseñas funcionan sin Culqi, Cloudinary o Resend.
