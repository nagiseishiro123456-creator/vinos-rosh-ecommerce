# Evidencias — Sprint 1 / S1-01

Fecha: 2026-10-15 (America/Lima). Son capturas reales de navegador, sin retoques. El capturador carga imágenes
diferidas y desactiva temporalmente `content-visibility` al tomar la imagen larga;
no modifica el CSS de la aplicación. No contienen cuentas de clientes.

## Capturas locales del acceso

Código de la entrega inicial S1-01 (árbol `34d865ba23fbb1438f2dc785cdb641baf4c081f7`).
App compilada con Node 22.23.3/npm 11.9.0; assets preparados en salida standalone.
Chromium 153 headless, herramienta temporal de captura; escritorio 1440×1000 y viewport móvil 390×844.
Se verificó visualmente la presencia del logo, formulario y textos. No son capturas de Render.
La página de acceso se captura sin BD disponible; no se inicia sesión ni se comprueba autenticación.

- [Acceso escritorio](00-acceso-desktop-local.png)
- [Acceso móvil](00-acceso-mobile-local.png)

## Capturas de CI

El workflow genera Home, catálogo, producto ficticio de QA y acceso después de
comprobar PostgreSQL 16 conectado. Cada ejecución se identifica por su run y commit
en [QA](../../testing/sprint-01.md). Las capturas seleccionadas se conservan aquí junto a Git; el artefacto remoto
vence a los 14 días. `manifest.json` registra origen y SHA-256 de cada PNG.

| Pantalla | Escritorio | Móvil |
| --- | --- | --- |
| Home | [Imagen](ci-desktop-01-home.png) | [Imagen](ci-mobile-01-home.png) |
| Catálogo | [Imagen](ci-desktop-02-catalogo.png) | [Imagen](ci-mobile-02-catalogo.png) |
| Producto de QA | [Imagen](ci-desktop-03-producto-qa.png) | [Imagen](ci-mobile-03-producto-qa.png) |
| Acceso | [Imagen](ci-desktop-04-acceso.png) | [Imagen](ci-mobile-04-acceso.png) |

Los PNG son originales del artefacto, sin recomprimir. Los datos del producto son
sintéticos; se reutiliza una imagen existente del repositorio. La barra fija de
navegación móvil aparece en la posición del viewport inicial dentro de la captura larga.
